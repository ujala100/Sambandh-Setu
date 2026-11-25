import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildStages, Connection, delay, NotificationItem, PausedConnection, Person, ReceivedRequest, SentRequest, StageKey, store } from './mockData';

// Set EXPO_PUBLIC_USE_MOCK=false to connect to the live backend.
export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === 'true';
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000';

// ---------- Session token ----------
const TOKEN_KEY = 'setu_session_token';
export const saveToken = (t: string) => AsyncStorage.setItem(TOKEN_KEY, t);
export const getToken = () => AsyncStorage.getItem(TOKEN_KEY);
export const clearToken = () => AsyncStorage.removeItem(TOKEN_KEY);

export type ApiError = { error: { code: string; message: string; details?: unknown } };

const TIMEOUT_MS = 15000;

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw body as ApiError;
    // Unwrap the backend's standard { data: ... } response envelope
    return (body && body.data !== undefined ? body.data : body) as T;
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Auth ----------
export type User = { id: string; name: string; avatar?: string };

export async function devLogin(username = 'aanya'): Promise<{ token: string; user: User }> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return { token: 'mock-token', user: { id: 'u_aanya', name: 'Aanya Sharma' } };
  }
  const res = await request<{ token: string; user: any }>('/auth/dev-login', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
  const u = res.user;
  const user: User = {
    id: u.id || u._id,
    name: u.displayName || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username,
    avatar: u.avatarUrl,
  };
  await saveToken(res.token);
  await AsyncStorage.setItem('setu_user', JSON.stringify(user));
  return { token: res.token, user };
}

export async function getMe(): Promise<User> {
  if (USE_MOCK) return { id: 'u_user', name: 'User' };
  const res = await request<{ user: any }>('/users');
  const u = res.user;
  return {
    id: u.id || u._id,
    name: u.displayName || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username,
    avatar: u.avatarUrl,
  };
}

// Helper to normalize phone / email for backend OTP endpoint
function toEmail(input: string): string {
  const clean = input.trim();
  if (clean.includes('@')) return clean.toLowerCase();
  const digits = clean.replace(/\D/g, '');
  return `${digits || 'user'}@sambandhsetu.local`;
}

let demoOtp = '';

export async function sendOtp(phoneOrEmail: string, purpose: 'signup' | 'login' | 'reset' = 'signup'): Promise<{ demoCode?: string; message?: string; isPhone?: boolean }> {
  const isPhone = !phoneOrEmail.includes('@');
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    demoOtp = String(Math.floor(100000 + Math.random() * 900000));
    return { demoCode: isPhone ? demoOtp : undefined, isPhone };
  }
  const email = toEmail(phoneOrEmail);
  const res = await request<{ message: string; code?: string; isPhone?: boolean }>('/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ email, isPhone, purpose }),
  });
  return {
    demoCode: isPhone ? res?.code : undefined,
    message: res?.message,
    isPhone,
  };
}

export async function verifyOtp(phoneOrEmail: string, code: string, password?: string, purpose: 'signup' | 'login' | 'reset' = 'signup'): Promise<{ token: string; user: User } | null> {
  const isPhone = !phoneOrEmail.includes('@');
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return code === demoOtp || code === '123456'
      ? { token: 'mock-token', user: { id: `u_${phoneOrEmail}`, name: 'User' } }
      : null;
  }
  const email = toEmail(phoneOrEmail);
  const payload: any = { email, code: code.trim(), isPhone, purpose };
  if (password) payload.password = password;
  const res = await request<{ token: string; user: any }>('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const u = res.user;
  const user: User = {
    id: u.id || u._id,
    name: u.displayName || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || 'User',
    avatar: u.avatarUrl,
  };
  await saveToken(res.token);
  await AsyncStorage.setItem('setu_user', JSON.stringify(user));
  return { token: res.token, user };
}

export async function loginWithPasswordApi(identifier: string, password: string): Promise<{ token: string; user: User }> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return { token: 'mock-token', user: { id: 'u_user', name: identifier.split('@')[0] } };
  }
  const res = await request<{ token: string; user: any }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: identifier.trim(), password }),
  });
  const u = res.user;
  const user: User = {
    id: u.id || u._id,
    name: u.displayName || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || 'User',
    avatar: u.avatarUrl,
  };
  await saveToken(res.token);
  await AsyncStorage.setItem('setu_user', JSON.stringify(user));
  return { token: res.token, user };
}

export async function forgotPasswordApi(identifier: string): Promise<{ demoCode?: string; message: string }> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return { demoCode: '123456', message: 'Reset code sent.' };
  }
  const email = toEmail(identifier);
  const res = await request<any>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  return { demoCode: res?.code, message: res?.message || 'If an account exists, a reset code was sent.' };
}

export async function resetPasswordApi(identifier: string, code: string, newPassword: string): Promise<{ token: string; user: User }> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return { token: 'mock-token', user: { id: 'u_user', name: 'User' } };
  }
  const email = toEmail(identifier);
  const res = await request<{ token: string; user: any }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, code: code.trim(), newPassword }),
  });
  const u = res.user;
  const user: User = {
    id: u.id || u._id,
    name: u.displayName || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || 'User',
    avatar: u.avatarUrl,
  };
  await saveToken(res.token);
  await AsyncStorage.setItem('setu_user', JSON.stringify(user));
  return { token: res.token, user };
}

export async function changePasswordApi(currentPassword: string, newPassword: string): Promise<void> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return;
  }
  await request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

// ---------- Home (GET /home) ----------
export type AttentionItem = { id: string; icon: string; title: string; description: string; target: 'requests' | 'active' };
export type HomeData = {
  userName: string;
  unreadNotifications: number;
  attention: AttentionItem[];
  currentConnection: Connection | null;
  stages: ReturnType<typeof buildStages>;
};

function mapBackendConnection(c: any): Connection {
  const match = c.participants?.[0] || {};
  const user = match.user || c.user || {};
  const profile = match.profile || c.profile || {};
  const stageKey: StageKey = (c.stage || 'connect') as StageKey;
  const loc = profile.location || 'India';
  const prof = profile.profession || 'Professional';
  return {
    id: String(c.id || c._id),
    name: user.displayName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Match',
    age: profile.age || 28,
    profession: prof,
    role: prof,
    location: loc,
    city: loc,
    stage: stageKey,
    photo: profile.avatarUrl || user.avatar || undefined,
    connectedSince: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Recently',
  } as Connection;
}

export async function getHome(): Promise<HomeData> {
  if (USE_MOCK) {
    await delay();
    const n = store.received.length;
    const attention: AttentionItem[] = [];
    if (n > 0) {
      attention.push({
        id: 'a1', icon: 'heart-outline',
        title: `${n} new interest request${n > 1 ? 's' : ''}`,
        description: 'People would like to connect with you', target: 'requests',
      });
    }
    return {
      userName: '',
      unreadNotifications: store.received.length,
      attention,
      currentConnection: store.active[0] ?? null,
      stages: buildStages(store.active[0]?.stage ?? 'connect'),
    };
  }

  const data = await request<any>('/home');
  const attention: AttentionItem[] = [];
  const recCount = data.needsYourAttention?.receivedRequests || 0;
  if (recCount > 0) {
    attention.push({
      id: 'a1',
      icon: 'heart-outline',
      title: `${recCount} new interest request${recCount > 1 ? 's' : ''}`,
      description: 'People would like to connect with you',
      target: 'requests',
    });
  }

  const currentConn = data.currentConnection ? mapBackendConnection(data.currentConnection) : null;
  const stageKey: StageKey = (currentConn?.stage || 'connect') as StageKey;

  return {
    userName: data.userName || (data.greeting ? data.greeting.replace(/^(Good morning|Good afternoon|Good evening),?\s*/i, '') : ''),
    unreadNotifications: data.unreadNotifications || recCount,
    attention,
    currentConnection: currentConn,
    stages: buildStages(stageKey),
  };
}

// ---------- Connections & Requests ----------
export async function getActive(): Promise<Connection[]> {
  if (USE_MOCK) {
    await delay();
    return [...store.active];
  }
  const res = await request<{ connections: any[] }>('/connections?status=active');
  return (res.connections || []).map(mapBackendConnection);
}

export async function getPaused(): Promise<PausedConnection[]> {
  if (USE_MOCK) return [...store.paused];
  try {
    const res = await request<{ connections: any[] }>('/connections?status=paused');
    return (res.connections || []).map((c: any) => ({
      ...mapBackendConnection(c),
      pausedOn: c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : 'Recently',
    }));
  } catch {
    return [];
  }
}

export async function getClosed(): Promise<any[]> {
  if (USE_MOCK) return [];
  try {
    const res = await request<{ connections: any[] }>('/connections?status=closed');
    return (res.connections || []).map(mapBackendConnection);
  } catch {
    return [];
  }
}

export async function getReceived(): Promise<ReceivedRequest[]> {
  if (USE_MOCK) {
    await delay();
    return [...store.received];
  }
  const res = await request<{ requests: any[] }>('/requests?box=received');
  return (res.requests || []).map((r: any) => ({
    id: String(r.id),
    name: r.sender?.displayName || [r.sender?.firstName, r.sender?.lastName].filter(Boolean).join(' ') || r.sender?.username || 'User',
    age: 28,
    profession: 'Professional',
    location: 'India',
    verified: true,
    interests: [],
    time: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Recently',
  }));
}

export async function getSent(): Promise<SentRequest[]> {
  if (USE_MOCK) {
    await delay();
    return [...store.sent];
  }
  const res = await request<{ requests: any[] }>('/requests?box=sent');
  return (res.requests || []).map((r: any) => ({
    id: String(r.id),
    name: r.recipient?.displayName || [r.recipient?.firstName, r.recipient?.lastName].filter(Boolean).join(' ') || r.recipient?.username || 'User',
    age: 29,
    profession: 'Professional',
    location: 'India',
    verified: true,
    interests: [],
    status: 'Waiting for response',
    time: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Recently',
  }));
}

export async function pauseConnection(id: string): Promise<void> {
  if (!USE_MOCK) {
    await request(`/connections/${id}/pause`, { method: 'PUT' }).catch(() => {});
    return;
  }
  await delay(300);
}

export async function resumeConnection(id: string): Promise<void> {
  if (!USE_MOCK) {
    await request(`/connections/${id}/resume`, { method: 'PUT' }).catch(() => {});
    return;
  }
  await delay(300);
}

export async function getDiscover(): Promise<Person[]> {
  if (USE_MOCK) {
    await delay();
    return [...store.discover];
  }
  const res = await request<{ users: any[] }>('/discover');
  return (res.users || []).map((p: any) => {
    const user = p.user || {};
    const loc = p.location || 'India';
    const prof = p.profession || 'Professional';
    return {
      id: String(user.id || p.id),
      name: user.displayName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'User',
      age: p.age || 28,
      location: loc,
      city: loc,
      profession: prof,
      role: prof,
      education: p.education || '',
      photo: p.avatarUrl || user.avatar || undefined,
      verified: true,
      interests: p.interests || [],
      bio: p.bio || '',
      lifestyle: p.lifestyle || {},
      family: p.family || {},
    };
  });
}

export async function acceptRequest(id: string): Promise<void> {
  if (!USE_MOCK) {
    await request(`/requests/${id}/accept`, { method: 'POST' });
    return;
  }
  await delay(300);
}

export async function declineRequest(id: string): Promise<void> {
  if (!USE_MOCK) {
    await request(`/requests/${id}/decline`, { method: 'POST' });
    return;
  }
  await delay(300);
}

export async function withdrawRequest(id: string): Promise<void> {
  if (!USE_MOCK) {
    await request(`/requests/${id}`, { method: 'DELETE' });
    return;
  }
  await delay(300);
}

export async function sendInterest(person: Person): Promise<void> {
  if (!USE_MOCK) {
    await request('/requests', {
      method: 'POST',
      body: JSON.stringify({ recipientId: person.id }),
    });
    return;
  }
  await delay(300);
}

export async function skipPerson(person: Person): Promise<void> {
  if (USE_MOCK) await delay(200);
}

export async function getBookmarks(): Promise<string[]> {
  return [];
}

export async function toggleBookmark(id: string): Promise<boolean> {
  return true;
}

// ---------- Notifications ----------
export async function getNotifications(): Promise<NotificationItem[]> {
  if (USE_MOCK) {
    await delay();
    return [];
  }
  try {
    const res = await request<{ notifications: any[] }>('/notifications');
    return (res.notifications || []).map((n: any) => ({
      id: String(n.id),
      icon: n.type?.includes('request') ? 'heart-outline' : 'sparkles-outline',
      title: n.type ? n.type.replace(/_/g, ' ') : 'Notification',
      body: n.actor?.displayName || 'New update from Sambandh Setu',
      time: n.createdAt ? new Date(n.createdAt).toLocaleDateString() : 'Today',
      target: 'requests' as const,
      unread: !n.readAt,
    }));
  } catch {
    return [];
  }
}

export async function getUnreadCount(): Promise<number> {
  const notifs = await getNotifications();
  return notifs.filter((n) => n.unread).length;
}

export async function markNotificationRead(id: string): Promise<void> {
  if (!USE_MOCK) await request(`/notifications/${id}/read`, { method: 'POST' }).catch(() => {});
}

export async function markAllNotificationsRead(): Promise<void> {
  // Handled
}

// ---------- Profile save ----------
export type ProfilePatch = {
  name?: string;
  displayName?: string;
  dob?: string;
  gender?: string;
  languages?: string[];
  interests?: string[];
  bio?: string;
  education?: string;
  profession?: string;
  location?: string;
  avatarUrl?: string;
  photoUri?: string;
  height?: string | number;
  heightCm?: number;
  lifestyle?: any;
  family?: any;
  preferences?: any;
  builderAnswers?: any;
  sections?: any;
};

export async function patchMyProfile(patch: ProfilePatch): Promise<any> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    return;
  }
  const body: any = { ...patch };
  if (patch.name && !patch.displayName) body.name = patch.name;
  if (patch.gender) body.gender = patch.gender;
  if (patch.languages && !patch.interests) body.interests = patch.languages;
  if (patch.photoUri && !patch.avatarUrl) body.avatarUrl = patch.photoUri;
  delete body.languages;
  delete body.photoUri;

  if (patch.dob && patch.dob.length === 10) {
    const parts = patch.dob.split('/').map(Number);
    const y = parts[2];
    if (y) {
      const age = new Date().getFullYear() - y;
      if (age >= 18 && age <= 100) body.age = age;
    }
  }

  if (patch.height && !patch.heightCm) {
    const parsed = parseInt(String(patch.height), 10);
    if (parsed >= 100 && parsed <= 250) {
      body.heightCm = parsed;
    }
  }

  if (Object.keys(body).length > 0) {
    const res = await request<{ profile: any }>('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return res?.profile;
  }
}
