import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Production web uses the same-origin API on Vercel. Local web development uses the API
 * server on port 5000; other native/LAN builds can set EXPO_PUBLIC_API_URL explicitly.
 */
const rawEnvUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');
const envUrl = rawEnvUrl
  ? (/\/api(?:\/v1)?$/.test(rawEnvUrl) ? rawEnvUrl : `${rawEnvUrl}/api`)
  : undefined;
const isLocalWeb = Platform.OS === 'web' && typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const localWebApiUrl = isLocalWeb
  ? `${window.location.protocol}//${window.location.hostname}:5000/api`
  : undefined;
export const API_BASE = envUrl || localWebApiUrl || (Platform.OS === 'web' ? '/api' : 'https://sambandh-setu.vercel.app/api');

/** Absolute origin for relative asset URLs such as /api/photos/... */
const apiOrigin = API_BASE.startsWith('http') ? API_BASE.replace(/\/api(\/v1)?$/, '') : '';
export const assetUrl = (u?: string | null) => (!u ? undefined : u.startsWith('http') || u.startsWith('data:') ? u : `${apiOrigin}${u}`);

const TOKEN_KEY = 'setu.session';
let memoryToken: string | null = null;

export const tokenStore = {
  async get() {
    if (memoryToken) return memoryToken;
    try { memoryToken = await AsyncStorage.getItem(TOKEN_KEY); } catch { memoryToken = null; }
    return memoryToken;
  },
  async set(token: string) {
    memoryToken = token;
    try { await AsyncStorage.setItem(TOKEN_KEY, token); } catch { /* private mode: keep in memory */ }
  },
  async clear() {
    memoryToken = null;
    try { await AsyncStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
  },
};

export class ApiError extends Error {
  status: number;
  code: string;
  details: any[];
  constructor(status: number, code: string, message: string, details: any[] = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
  get field(): string | undefined {
    return this.details?.find((d) => d && d.field)?.field;
  }
}

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };

export async function request<T = any>(method: string, path: string, body?: unknown, { timeoutMs = 20000 } = {}): Promise<T> {
  const token = await tokenStore.get();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e: any) {
    throw new ApiError(0, 'NETWORK', e?.name === 'AbortError' ? 'The request took too long. Please try again.' : 'You seem to be offline. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }
  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new ApiError(res.status, 'INVALID_RESPONSE', 'The server returned an invalid response. Please try again.');
  }
  if (!res.ok) {
    const err = json?.error || {};
    if (res.status === 401 && token && onUnauthorized) onUnauthorized();
    throw new ApiError(res.status, err.code || 'ERROR', err.message || 'Something went wrong. Please try again.', err.details || []);
  }
  return (json && json.data !== undefined ? json.data : json) as T;
}

export const api = {
  get: <T = any>(p: string) => request<T>('GET', p),
  post: <T = any>(p: string, b?: unknown) => request<T>('POST', p, b ?? {}),
  put: <T = any>(p: string, b?: unknown) => request<T>('PUT', p, b ?? {}),
  patch: <T = any>(p: string, b?: unknown) => request<T>('PATCH', p, b ?? {}),
  del: <T = any>(p: string, b?: unknown) => request<T>('DELETE', p, b),
};

export const errorMessage = (e: unknown, fallback = 'Something went wrong. Please try again.') =>
  e instanceof ApiError ? e.message : e instanceof Error && e.message ? e.message : fallback;

export const qs = (params: Record<string, any>) => {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
};
