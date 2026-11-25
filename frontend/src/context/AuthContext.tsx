import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Auth, AuthConfig, Me, MeApi, Settings, setUnauthorizedHandler, tokenStore } from '../api';

type AuthState = {
  ready: boolean;
  user: Me | null;
  settings: Settings | null;
  config: AuthConfig;
  /** Stores a session returned by sign-up / login. */
  startSession: (token: string, user: Me) => Promise<void>;
  refresh: () => Promise<Me | null>;
  setUser: (u: Me) => void;
  updateSettings: (patch: Record<string, any>) => Promise<Settings>;
  signOut: (everywhere?: boolean) => Promise<void>;
};

const DEFAULT_CONFIG: AuthConfig = { emailCodes: false, smsCodes: false, googleSignIn: false, passwordRules: 'Use at least 8 characters with a letter, a number and a special character.' };

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<Me | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [config, setConfig] = useState<AuthConfig>(DEFAULT_CONFIG);
  const mounted = useRef(true);

  const clear = useCallback(async () => {
    await tokenStore.clear();
    if (mounted.current) {
      setUser(null);
      setSettings(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    const token = await tokenStore.get();
    if (!token) {
      setUser(null);
      return null;
    }
    try {
      const r = await MeApi.get();
      setUser(r.user);
      setSettings(r.settings);
      return r.user;
    } catch (e: any) {
      if (e?.status === 401) await clear();
      return null;
    }
  }, [clear]);

  useEffect(() => {
    mounted.current = true;
    setUnauthorizedHandler(() => { clear(); });
    Promise.all([refresh(), Auth.config().then(setConfig).catch(() => {})]).finally(() => setReady(true));
    return () => { mounted.current = false; };
  }, [refresh, clear]);

  const startSession = useCallback(async (token: string, u: Me) => {
    await tokenStore.set(token);
    setUser(u);
    try {
      const r = await MeApi.settings();
      setSettings(r.settings);
    } catch { /* loaded later */ }
  }, []);

  const updateSettings = useCallback(async (patch: Record<string, any>) => {
    const r = await MeApi.updateSettings(patch);
    setSettings(r.settings);
    return r.settings;
  }, []);

  const signOut = useCallback(async (everywhere = false) => {
    try { await Auth.logout(everywhere); } catch { /* token may already be invalid */ }
    await clear();
  }, [clear]);

  const value = useMemo(() => ({ ready, user, settings, config, startSession, refresh, setUser, updateSettings, signOut }),
    [ready, user, settings, config, startSession, refresh, updateSettings, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
