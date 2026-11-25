import { api, qs } from './client';

export * from './client';

// ---------- Types ----------

export type Profile = {
  dateOfBirth: string | null;
  age: number | null;
  gender: string;
  heightCm: number | null;
  maritalStatus: string;
  location: string;
  education: string;
  profession: string;
  bio: string;
  intent: string;
  avatarPhotoId: string | null;
  profileStatus: string;
  languages: string[];
  interests: string[];
  values: string[];
  lifestyle: Record<string, any>;
  family: Record<string, any>;
  preferences: Record<string, any>;
  communication: Record<string, any>;
};

export type VerificationItem = { status: 'in_review' | 'verified' | 'needs_action'; docType: string; updatedAt: string };

export type Me = {
  id: string;
  name: string;
  firstName: string;
  email: string;
  phone: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  onboardingCompleted: boolean;
  status: string;
  role: string;
  hasPassword: boolean;
  createdAt: string;
  photoUrl: string | null;
  profile: Profile;
  completeness: { percent: number; missing: { key: string; label: string }[] };
  verification: Partial<Record<'identity' | 'professional' | 'additional', VerificationItem>>;
};

export type Settings = {
  privacy: { showInDiscover: boolean; whoCanSeeProfile: string; allowConnectionRequests: boolean; showOnlineStatus: boolean; showReadStatus: boolean; reviewed: boolean; sharing: Record<string, boolean> };
  discovery: { peopleWhoCanFindMe: string; ageRangeVisibility: string; ageMin: number; ageMax: number; distanceVisibility: string; profileSuggestions: string; hideProfile: boolean; hideDuration: string; hideUntil: string };
  notifications: Record<string, any>;
  chat: { allowMessagesFrom: string; readReceipts: boolean; typingIndicator: boolean; mediaSharing: boolean; custom: Record<string, any> };
  guide: { enabled: boolean; useChatContext: boolean; usePrivateReflections: boolean; accessProfile: boolean; accessPreferences: boolean; accessJourney: boolean; sensitiveTopics: boolean; saveHistory: boolean; tone: string };
  ai: { personalization: boolean; improveService: boolean; retention: string };
  app: { language: string; appearance: string };
};

export type AuthConfig = { emailCodes: boolean; smsCodes: boolean; googleSignIn: boolean; passwordRules: string };

export type Person = {
  id: string;
  name: string;
  age: number | null;
  location: string;
  profession: string;
  education: string;
  bio: string;
  interests: string[];
  values: string[];
  photoUrl: string | null;
  verified: boolean;
  online: boolean;
  bookmarked: boolean;
  /** Why the recommender suggested this person (Discover only). */
  reasons?: string[];
};

export type PersonProfile = Person & {
  relation: 'connected' | 'request_sent' | 'request_received' | 'closed' | 'none';
  heightCm: number | null;
  maritalStatus: string;
  intent: string;
  languages: string[];
  lifestyle: Record<string, any>;
  communication: Record<string, any>;
  religion: { religion: string; caste: string } | null;
  family: Record<string, any> | null;
  familyShared: boolean;
  relocation: string;
  income: string;
  contact: { email: string; phone: string } | null;
  memberSince: string;
  connectionId: string | null;
  requestId: string | null;
  chatId: string | null;
  stage: string | null;
};

export type RequestItem = { id: string; person: Person; message: string; createdAt: string };

export type ConnectionItem = {
  id: string;
  person: Person;
  status: 'active' | 'paused' | 'closed';
  stage: string;
  stageIndex: number;
  stageTitle: string;
  pausedAt: string | null;
  pausedByMe: boolean;
  closedAt: string | null;
  createdAt: string;
  chatId: string | null;
  lastMessageAt: string | null;
};

export type Stage = { key: string; title: string; short: string; description: string; index: number; status: 'completed' | 'current' | 'locked'; myDone: boolean; partnerDone: boolean };
export type Journey = { connection: ConnectionItem; stages: Stage[]; currentStage: string; progress: { completed: number; total: number; percent: number } };
export type StageContent = { key: string; title: string; short: string; description: string; index: number; meaning: string; suggestions: { title: string; text: string }[]; activities: string[]; resources: string[] };

export type Question = {
  key: string; category: string; type: 'single' | 'multi' | 'scale' | 'text'; prompt: string; hint: string; why: string;
  options?: string[]; max?: number; min?: number; minLabel?: string; maxLabel?: string; maxLength?: number;
};
export type Answer = { value: any; otherText: string; sharing: 'keep_private' | 'share' | 'share_later'; updatedAt?: string };
export type ReflectData = {
  stage: string; questions: Question[]; answers: Record<string, Answer>; total: number; completed: boolean;
  partner: { id: string; name: string; answered: number; completed: boolean; answers: Record<string, { shared: boolean; value?: any; otherText?: string }> };
};

export type ChatItem = {
  id: string; connectionId: string; connectionStatus: string; stage: string; stageTitle: string; person: Person;
  lastMessage: { text: string; at: string; mine: boolean; read: boolean } | null; unread: number; muted: boolean; createdAt: string;
};
export type Message = { id: string; text: string; at: string; mine: boolean; read?: boolean };

export type NotificationItem = { id: string; type: string; refId: string | null; actorId: string | null; title: string; body: string; target: string; payload: any; createdAt: string; read: boolean };

export type HomeData = {
  firstName: string; photoUrl: string | null; activeCount: number; hasPreferences: boolean; preferencesSummary: string;
  current: null | { connectionId: string; chatId: string | null; person: Person; stage: string; stageTitle: string; journey: Journey };
  attention: { key: string; icon: string; title: string; description: string; target: string; connectionId?: string }[];
  completeness: Me['completeness'];
  stages: { key: string; title: string; short: string }[];
};

export type GuideReply = { intent: string; reply: string; title?: string; questions: string[]; chips: string[]; sources: string[]; safety: { status: string; flags: string[] }; fallback_used: boolean; conversationId: string | null; stage: string };

export type FamilyMember = { id: string; relationship: string; method: 'link' | 'phone' | 'email'; contact: string; status: 'pending' | 'active'; permissions: Record<string, boolean>; acceptedAt: string | null; createdAt: string };

export type Verification = { id: string; type: string; docType: string; status: 'in_review' | 'verified' | 'needs_action'; details: any; reviewerNote: string; createdAt: string; updatedAt: string };

// ---------- Endpoints ----------

type Session = { token: string; user: Me };

export const Auth = {
  config: () => api.get<AuthConfig>('/auth/config'),
  signup: (b: { fullName: string; email: string; phone?: string; password: string; acceptTerms: boolean }) =>
    api.post<Session & { verification: { required: boolean; sent: boolean } }>('/auth/signup', b),
  login: (identifier: string, password: string) => api.post<Session & { reactivated: boolean }>('/auth/login', { identifier, password }),
  requestLoginCode: (email: string) => api.post('/auth/login/code', { email }),
  loginWithCode: (email: string, code: string) => api.post<Session>('/auth/login/verify', { email, code }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (email: string, code: string, newPassword: string) => api.post<Session>('/auth/reset-password', { email, code, newPassword }),
  verifyEmail: (code: string) => api.post<Session>('/auth/verify-email', { code }),
  resendEmailCode: () => api.post('/auth/verify-email/resend'),
  changePassword: (currentPassword: string, newPassword: string) => api.post<Session>('/auth/change-password', { currentPassword, newPassword }),
  logout: (everywhere = false) => api.post('/auth/logout', { everywhere }),
};

export const MeApi = {
  get: () => api.get<{ user: Me; settings: Settings }>('/me'),
  updateAccount: (b: Record<string, any>) => api.patch<{ user: Me }>('/me/account', b),
  updateProfile: (b: Record<string, any>) => api.patch<{ user: Me }>('/me/profile', b),
  uploadPhoto: (dataUrl: string) => api.post<{ photoUrl: string }>('/me/photo', { dataUrl }),
  removePhoto: () => api.del('/me/photo'),
  settings: () => api.get<{ settings: Settings }>('/me/settings'),
  updateSettings: (patch: Record<string, any>) => api.patch<{ settings: Settings }>('/me/settings', patch),
  completeOnboarding: () => api.post<{ user: Me }>('/me/onboarding/complete'),
  requestEmailChange: (newEmail: string, password: string) => api.post<{ sentTo: string }>('/me/email/change', { newEmail, password }),
  confirmEmailChange: (code: string) => api.post<{ user: Me }>('/me/email/confirm', { code }),
  updatePhone: (phone: string | null) => api.patch<{ user: Me; smsVerification: boolean }>('/me/phone', { phone }),
  exportData: () => api.get<any>('/me/export'),
  requestDeleteCode: () => api.post('/me/delete/code'),
  deactivate: (b: { password?: string; code?: string }) => api.post('/me/deactivate', b),
  deleteAccount: (b: { password?: string; code?: string }) => api.del('/me', { ...b, confirm: 'DELETE' }),
};

export const Home = { get: () => api.get<HomeData>('/home') };

export type DiscoverQuery = { q?: string; page?: number; sort?: string; ageMin?: number; ageMax?: number; location?: string; education?: string; profession?: string; verifiedOnly?: boolean };
export const People = {
  discover: (query: DiscoverQuery = {}) => api.get<{ items: Person[]; newProfiles: Person[]; page: number; total: number; totalPages: number }>(`/discover${qs(query)}`),
  get: (id: string) => api.get<PersonProfile>(`/people/${id}`),
  bookmark: (id: string, on: boolean) => (on ? api.post(`/people/${id}/bookmark`) : api.del(`/people/${id}/bookmark`)),
  bookmarks: () => api.get<{ items: Person[] }>('/bookmarks'),
  skip: (id: string) => api.post(`/people/${id}/skip`),
};

export const Requests = {
  list: () => api.get<{ received: RequestItem[]; sent: RequestItem[] }>('/requests'),
  send: (recipientId: string, message?: string) => api.post<{ id: string }>('/requests', { recipientId, message }),
  accept: (id: string) => api.post<{ connectionId: string; chatId: string }>(`/requests/${id}/accept`),
  decline: (id: string) => api.post(`/requests/${id}/decline`),
  withdraw: (id: string) => api.del(`/requests/${id}`),
};

export const Connections = {
  list: () => api.get<{ active: ConnectionItem[]; paused: ConnectionItem[]; closed: ConnectionItem[] }>('/connections'),
  get: (id: string) => api.get<ConnectionItem>(`/connections/${id}`),
  pause: (id: string) => api.post(`/connections/${id}/pause`),
  resume: (id: string) => api.post(`/connections/${id}/resume`),
  close: (id: string) => api.post(`/connections/${id}/close`),
  journey: (id: string) => api.get<Journey>(`/connections/${id}/journey`),
  stage: (key: string) => api.get<StageContent>(`/stages/${key}`),
  completeStage: (id: string, stage: string) => api.post<{ advanced: boolean; waitingForPartner: boolean; journey: Journey }>(`/connections/${id}/stages/${stage}/complete`),
  reflect: (id: string, stage = 'reflect') => api.get<ReflectData>(`/connections/${id}/reflect${qs({ stage })}`),
  saveAnswer: (id: string, key: string, b: { value: any; otherText?: string; sharing: string; stage?: string }) => api.put<{ answered: number; total: number }>(`/connections/${id}/reflect/answers/${key}${qs({ stage: b.stage })}`, b),
  updateSharing: (id: string, sharing: Record<string, string>, stage = 'reflect') => api.post(`/connections/${id}/reflect/sharing`, { sharing, stage }),
};

export const Chats = {
  list: () => api.get<{ items: ChatItem[] }>('/chats'),
  messages: (id: string, before?: string) => api.get<{ items: Message[]; hasMore: boolean }>(`/chats/${id}/messages${qs({ before })}`),
  send: (id: string, text: string) => api.post<Message>(`/chats/${id}/messages`, { text }),
  read: (id: string) => api.post(`/chats/${id}/read`),
  mute: (id: string, muted: boolean) => api.put(`/chats/${id}/mute`, { muted }),
  profile: (id: string) => api.get<{ chatId: string; connectionId: string; connectionStatus: string; person: Person; stage: string; stageTitle: string; connectedOn: string; lastActive: string | null; sharedInterests: string[]; muted: boolean }>(`/chats/${id}/profile`),
};

export const Notifications = {
  list: () => api.get<{ items: NotificationItem[]; unread: number }>('/notifications'),
  unread: () => api.get<{ unread: number }>('/notifications/unread-count'),
  read: (id: string) => api.post(`/notifications/${id}/read`),
  readAll: () => api.post('/notifications/read-all'),
};

export const Safety = {
  blocks: () => api.get<{ items: { userId: string; name: string; blockedAt: string }[] }>('/blocks'),
  block: (userId: string) => api.post('/blocks', { userId }),
  unblock: (userId: string) => api.del(`/blocks/${userId}`),
  report: (b: { userId?: string; contentType?: string; contentRef?: string; reason: string; details?: string; images?: string[]; alsoBlock?: boolean }) => api.post<{ id: string }>('/reports', b),
  ticket: (b: { kind: 'support' | 'problem'; category: string; subject?: string; message: string }) => api.post<{ id: string; reference: string }>('/support/tickets', b),
};

export const Family = {
  list: () => api.get<{ items: FamilyMember[]; relationships: string[] }>('/family'),
  invite: (b: { method: 'link' | 'phone' | 'email'; relationship: string; contact?: string; message?: string; permissions?: Record<string, boolean> }) =>
    api.post<{ member: FamilyMember; link: string; delivered: boolean }>('/family/invites', b),
  update: (id: string, permissions: Record<string, boolean>) => api.patch<{ member: FamilyMember }>(`/family/${id}`, { permissions }),
  remove: (id: string) => api.del(`/family/${id}`),
  resend: (id: string) => api.post<{ link: string; delivered: boolean }>(`/family/${id}/resend`),
  invitation: (token: string) => api.get<any>(`/family/invitations/${token}`),
  accept: (token: string) => api.post<any>(`/family/invitations/${token}/accept`),
  decline: (token: string) => api.post<any>(`/family/invitations/${token}/decline`),
};

export const VerificationApi = {
  status: () => api.get<{ identity: Verification | null; professional: Verification | null; additional: Verification | null; history: Verification[]; docTypes: Record<string, string[]> }>('/verification'),
  submit: (b: { type: string; docType: string; images: string[]; details?: Record<string, string> }) => api.post<Verification>('/verification', b),
  withdraw: (id: string) => api.del(`/verification/${id}`),
};

export const Guide = {
  chat: (b: { message?: string; intent?: string; connectionId?: string | null; conversationId?: string | null }) => api.post<GuideReply>('/guide/chat', b),
  conversations: () => api.get<{ items: { id: string; title: string; topic: string; connectionId: string | null; messageCount: number; createdAt: string; updatedAt: string }[] }>('/guide/conversations'),
  conversation: (id: string) => api.get<{ id: string; title: string; topic: string; createdAt: string; messages: { id: string; role: 'user' | 'guide'; text: string; title?: string; questions?: string[]; at: string }[] }>(`/guide/conversations/${id}`),
  deleteConversation: (id: string) => api.del(`/guide/conversations/${id}`),
  clearAll: () => api.del('/guide/conversations'),
};

// ---------- Live features & realtime ----------

export type FeatureKey = 'signups' | 'discover' | 'chat' | 'reflect' | 'setu_guide' | 'family_access' | 'verification' | 'photo_uploads' | 'realtime_stream' | 'maintenance' | 'announcement';
export type FeatureState = {
  features: Record<FeatureKey, boolean>;
  announcement: { text: string; tone: 'info' | 'success' | 'warning' } | null;
  maintenance: { message: string } | null;
  version: string;
};
export type RealtimeSnapshot = {
  notifications: { unread: number; latest: string | null };
  messages: { unread: number; latest: string | null };
  requests: { pending: number };
  features: { version: string };
  announcement: FeatureState['announcement'];
  maintenance: FeatureState['maintenance'];
  at: string;
  transport: 'stream' | 'poll';
};

export const FeaturesApi = {
  get: () => api.get<FeatureState>('/features'),
  poll: () => api.get<RealtimeSnapshot>('/realtime/poll'),
};

// ---------- Team console ----------

export type AdminMe = { role: string; roleName: string; permissions: string[]; via: string };
export type AdminRole = { key: string; name: string; description: string; builtIn: boolean; locked: boolean; permissions: string[]; members: number; grantable: boolean };
export type AdminFeature = { key: FeatureKey; name: string; group: string; description: string; configFields: string[]; enabled: boolean; rollout: number; roles: string[]; config: Record<string, string>; updatedAt: string | null };
export type AdminMember = { id: string; name: string; email: string; status: string; role: string; age: number | null; location: string; profession: string; onboardingCompleted: boolean; emailVerified: boolean; verified: boolean; createdAt: string; lastActiveAt: string | null };
export type RecMetrics = { days: number; counts: Record<string, number>; rates: { viewRate: number | null; interestRate: number | null; skipRate: number | null; acceptanceRate: number | null } };

export const AdminApi = {
  me: () => api.get<AdminMe>('/admin/me'),
  claim: (key: string) => api.post<{ role: string }>('/admin/claim', { key }),
  overview: () => api.get<any>('/admin/overview'),
  analytics: (days = 14) => api.get<{ days: number; rows: { day: string; signups: number; requests: number; accepted: number; messages: number; impressions: number }[]; recommendations: RecMetrics }>(`/admin/analytics?days=${days}`),
  verifications: (status = 'in_review') => api.get<{ items: any[] }>(`/admin/verifications?status=${status}`),
  verificationDocs: (id: string) => api.get<{ docs: string[] }>(`/admin/verifications/${id}/docs`),
  decideVerification: (id: string, status: 'verified' | 'needs_action', note?: string) => api.post(`/admin/verifications/${id}/decision`, { status, note }),
  reports: (status = 'open') => api.get<{ items: any[] }>(`/admin/reports?status=${status}`),
  reportImages: (id: string) => api.get<{ images: string[] }>(`/admin/reports/${id}/images`),
  closeReport: (id: string, action: 'none' | 'suspend', note?: string) => api.post(`/admin/reports/${id}/close`, { action, note }),
  tickets: (status = 'open') => api.get<{ items: any[] }>(`/admin/tickets?status=${status}`),
  closeTicket: (id: string, reply?: string, note?: string) => api.post(`/admin/tickets/${id}/close`, { reply, note }),
  members: (q: { q?: string; status?: string; role?: string; page?: number }) => api.get<{ items: AdminMember[]; page: number; total: number; totalPages: number }>(`/admin/members${qs(q)}`),
  member: (id: string) => api.get<any>(`/admin/members/${id}`),
  suspend: (id: string, note?: string) => api.post(`/admin/members/${id}/suspend`, { note }),
  reactivate: (id: string) => api.post(`/admin/members/${id}/reactivate`),
  setRole: (id: string, role: string) => api.post(`/admin/members/${id}/role`, { role }),
  roles: () => api.get<{ roles: AdminRole[]; permissions: { key: string; label: string }[] }>('/admin/roles'),
  createRole: (b: { key: string; name: string; description?: string; permissions: string[] }) => api.post<AdminRole>('/admin/roles', b),
  updateRole: (key: string, b: { name?: string; description?: string; permissions?: string[] }) => api.patch<AdminRole>(`/admin/roles/${key}`, b),
  deleteRole: (key: string) => api.del(`/admin/roles/${key}`),
  features: () => api.get<{ features: AdminFeature[]; roles: { key: string; name: string }[] }>('/admin/features'),
  updateFeature: (key: string, b: Partial<Pick<AdminFeature, 'enabled' | 'rollout' | 'roles' | 'config'>>) => api.patch<AdminFeature>(`/admin/features/${key}`, b),
  recommender: () => api.get<{ weights: Record<string, number>; tuning: Record<string, number>; defaults: { weights: Record<string, number>; tuning: Record<string, number> }; labels: Record<string, string>; metrics: RecMetrics }>('/admin/recommendations'),
  updateRecommender: (b: { weights?: Record<string, number>; tuning?: Record<string, number>; reset?: boolean }) => api.patch('/admin/recommendations', b),
  audit: () => api.get<{ items: { id: string; action: string; refId: string | null; target: string | null; note: string; actor: string; createdAt: string }[] }>('/admin/audit'),
};
