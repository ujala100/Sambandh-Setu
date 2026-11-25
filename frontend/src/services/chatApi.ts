import AsyncStorage from '@react-native-async-storage/async-storage';
import { getActive, request, USE_MOCK } from './api';
import { delay } from './mockData';

// ---------- Setu Guide (app -> POST /guide/chat on backend) ----------
export type Intent = 'conversation_ideas' | 'help_me_understand' | 'next_steps' | 'privacy_safety';
export type GuideReply = {
  intent?: Intent; reply: string; questions?: string[]; topic?: string; chips?: string[];
  sources?: string[]; safety?: string | { status?: string; flags?: string[] } | null; fallback_used?: boolean;
};

export const QUICK_ACTIONS: { intent: Intent; label: string }[] = [
  { intent: 'conversation_ideas', label: 'Conversation ideas' },
  { intent: 'help_me_understand', label: 'Help me understand' },
  { intent: 'next_steps', label: 'Tips for next steps' },
  { intent: 'privacy_safety', label: 'Privacy & safety' },
];

const FALLBACK: GuideReply = {
  reply: "Setu Guide is currently preparing advice for your journey stage. Feel free to explore conversation starters or check back shortly.",
  fallback_used: true,
};

const NO_CONNECTION: GuideReply = {
  reply: 'Setu Guide works with your active connection. Connect with someone first, and I can help from there.',
};

export async function askGuide(p: {
  connectionId?: string; intent?: Intent; message?: string; topic?: string;
}): Promise<GuideReply> {
  let connId = p.connectionId;
  if (!connId) {
    const active = await getActive();
    connId = active[0]?.id;
  }
  if (!connId) return NO_CONNECTION;

  if (USE_MOCK) {
    await delay(600);
    return mockGuide(p);
  }

  try {
    const res = await request<GuideReply>('/guide/chat', {
      method: 'POST',
      body: JSON.stringify({
        connectionId: connId,
        ...(p.intent ? { intent: p.intent } : {}),
        ...(p.message ? { message: p.message } : {}),
      }),
    });
    return res;
  } catch (error) {
    console.warn('Setu Guide call notice:', error);
    return mockGuide(p);
  }
}

function mockGuide(p: { intent?: Intent; message?: string }): GuideReply {
  switch (p.intent) {
    case 'conversation_ideas':
      return {
        intent: p.intent,
        reply: 'Here are a few questions you could explore together at this stage:',
        questions: [
          'What is a typical relaxing weekend for you?',
          'How do you like to spend time with family and close friends?',
          'What is a personal goal you are excited about right now?',
        ],
        chips: ['Daily routines', 'Family values', 'Weekend hobbies'],
      };
    case 'help_me_understand':
      return {
        intent: p.intent,
        reply: 'At this stage, learning about each other’s everyday perspectives helps build comfort and clarity.',
        chips: ['Communication style', 'Shared values'],
      };
    case 'next_steps':
      return {
        intent: p.intent,
        reply: 'A great next step is to continue an open, relaxed chat and share what matters most to you.',
        chips: ['Explore reflections', 'Schedule a chat'],
      };
    case 'privacy_safety':
      return {
        intent: p.intent,
        reply: 'Your personal answers and details remain strictly private until you explicitly choose to share them.',
        chips: ['Privacy settings', 'Data sharing'],
      };
    default:
      return {
        reply: p.message ? `That is a thoughtful point. In relationship building, discussing "${p.message}" openly helps build mutual understanding.` : FALLBACK.reply,
      };
  }
}

// ---------- Chats ----------
export type ChatFilter = 'all' | 'active' | 'new' | 'muted';
export type ChatItem = {
  id: string; name: string; last: string;
  time: string;
  lastAt?: string;
  lastMine?: boolean;
  lastRead?: boolean;
  unread: number; online: boolean; muted: boolean; isNew: boolean;
  photo?: string;
};
export type Msg = { id: string; mine: boolean; text: string; time: string; status?: 'sending' | 'failed' };

export function formatChatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((day(now) - day(d)) / 86400000);
  if (days <= 0) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (days === 1) return 'Yesterday';
  if (days < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export async function getChats(filter: ChatFilter = 'all', query = ''): Promise<ChatItem[]> {
  if (USE_MOCK) {
    await delay(300);
    return [
      { id: 'ch1', name: 'Rohan Verma', last: 'Hi Aanya! Nice to connect with you.', time: 'Just now', unread: 1, online: true, muted: false, isNew: true },
    ];
  }

  try {
    const res = await request<{ chats: any[] }>(`/chats?filter=${filter}`);
    return (res.chats || []).map((c: any) => {
      const p = c.participant || {};
      const name = p.displayName || [p.firstName, p.lastName].filter(Boolean).join(' ') || p.username || 'Match';
      return {
        id: String(c.id),
        name,
        last: 'Connected on Sambandh Setu',
        time: c.lastMessageAt ? formatChatTime(c.lastMessageAt) : 'Recently',
        lastAt: c.lastMessageAt || undefined,
        unread: c.unreadCount || 0,
        online: true,
        muted: Boolean(c.muted),
        isNew: (c.unreadCount || 0) > 0,
        photo: p.avatarUrl || p.avatar || undefined,
      };
    });
  } catch {
    return [];
  }
}

const isValidChatId = (id: string) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);

export async function getMessages(chatId: string): Promise<Msg[]> {
  if (!isValidChatId(chatId)) {
    return [];
  }

  if (USE_MOCK) {
    await delay(200);
    return [
      { id: 'm1', mine: false, text: 'Hi Aanya! Nice to connect with you.', time: 'Just now' },
    ];
  }

  try {
    const res = await request<{ messages: any[] }>(`/chats/${chatId}/messages`);
    const rawUser = await AsyncStorage.getItem('setu_user');
    const myId = rawUser ? JSON.parse(rawUser)?.id : null;

    return (res.messages || []).map((m: any) => {
      const isMine = myId ? String(m.senderId) === String(myId) : Boolean(m.isReadByMe);
      return {
        id: String(m.id),
        mine: isMine,
        text: m.text,
        time: m.createdAt ? formatChatTime(m.createdAt) : '',
      };
    });
  } catch {
    return [];
  }
}

export async function sendMessage(chatId: string, text: string): Promise<Msg> {
  const localMsg: Msg = {
    id: `m_${Date.now()}`,
    mine: true,
    text,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  if (USE_MOCK || !isValidChatId(chatId)) {
    if (USE_MOCK) await delay(300);
    return localMsg;
  }

  try {
    const res = await request<{ message: any }>(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    return {
      id: String(res.message?.id || localMsg.id),
      mine: true,
      text: res.message?.text || text,
      time: res.message?.createdAt ? formatChatTime(res.message.createdAt) : localMsg.time,
    };
  } catch (err) {
    console.warn('sendMessage error, returned local optimistic message:', err);
    return localMsg;
  }
}

export async function markRead(chatId: string): Promise<void> {
  if (!USE_MOCK && isValidChatId(chatId)) {
    await request(`/chats/${chatId}/read`, { method: 'POST' }).catch(() => {});
  }
}
