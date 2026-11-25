import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { API_BASE, errorMessage, FeatureKey, FeatureState, FeaturesApi, RealtimeSnapshot, tokenStore } from '../api';
import { useAuth } from './AuthContext';

/**
 * Live state from the server: feature flags (switched by admins), the announcement banner,
 * maintenance mode, and a realtime snapshot (unread notifications, messages, pending requests).
 *
 * On the web the app keeps a streaming connection (Server-Sent Events over fetch, so the session
 * header is sent); native apps, or the web when "Live updates" is off, poll every 15 seconds.
 */
type Live = {
  features: Record<FeatureKey, boolean>;
  announcement: FeatureState['announcement'];
  maintenance: FeatureState['maintenance'];
  snapshot: RealtimeSnapshot | null;
  transport: 'stream' | 'poll' | 'off';
  on: (key: FeatureKey) => boolean;
  refreshFeatures: () => Promise<void>;
};

const ALL_ON = {
  signups: true, discover: true, chat: true, reflect: true, setu_guide: true, family_access: true, verification: true,
  photo_uploads: true, realtime_stream: true, maintenance: false, announcement: false,
} as Record<FeatureKey, boolean>;

const isFeatureKey = (key: string): key is FeatureKey => Object.prototype.hasOwnProperty.call(ALL_ON, key);

const Ctx = createContext<Live>({
  features: ALL_ON, announcement: null, maintenance: null, snapshot: null, transport: 'off',
  on: () => true, refreshFeatures: async () => {},
});

const POLL_MS = 15000;

export function LiveProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<FeatureState>({ features: ALL_ON, announcement: null, maintenance: null, version: '' });
  const [snapshot, setSnapshot] = useState<RealtimeSnapshot | null>(null);
  const [transport, setTransport] = useState<'stream' | 'poll' | 'off'>('off');
  const versionRef = useRef('');
  const featureRefreshFailed = useRef(false);

  const refreshFeatures = useCallback(async () => {
    try {
      const f = await FeaturesApi.get();
      if (!f || typeof f !== 'object') {
        if (!featureRefreshFailed.current) console.warn('Feature API returned an invalid response; retaining the last known feature flags.');
        featureRefreshFailed.current = true;
        return;
      }

      const receivedFeatures: Partial<Record<FeatureKey, boolean>> = {};
      if (f.features && typeof f.features === 'object' && !Array.isArray(f.features)) {
        for (const [key, enabled] of Object.entries(f.features)) {
          if (isFeatureKey(key) && typeof enabled === 'boolean') receivedFeatures[key] = enabled;
        }
      } else {
        if (!featureRefreshFailed.current) console.warn('Feature API response is missing its feature map; retaining the last known feature flags.');
        featureRefreshFailed.current = true;
        return;
      }

      featureRefreshFailed.current = false;
      if (typeof f.version === 'string') versionRef.current = f.version;
      setState((prev) => ({
        ...prev,
        ...f,
        features: { ...prev.features, ...receivedFeatures },
      }));
    } catch (error) {
      if (!featureRefreshFailed.current) console.warn(`Feature API refresh failed; retaining the last known feature flags. ${errorMessage(error)}`);
      featureRefreshFailed.current = true;
    }
  }, []);

  // Feature flags: on start, on sign-in/out, and every minute as a safety net.
  useEffect(() => {
    refreshFeatures();
    const t = setInterval(refreshFeatures, 60000);
    return () => clearInterval(t);
  }, [user?.id, user?.role, refreshFeatures]);

  const applySnapshot = useCallback((s: RealtimeSnapshot) => {
    setSnapshot(s);
    setState((prev) => ({ ...prev, announcement: s.announcement, maintenance: s.maintenance }));
    if (s.features?.version && s.features.version !== versionRef.current) refreshFeatures();
  }, [refreshFeatures]);

  // Realtime: stream on the web when allowed, otherwise poll.
  const streamAllowed = Platform.OS === 'web' && state.features?.realtime_stream === true;
  useEffect(() => {
    if (!user) { setTransport('off'); setSnapshot(null); return; }
    let stopped = false;
    let timer: any = null;
    const controller = new AbortController();

    const poll = async () => {
      if (stopped) return;
      try { applySnapshot(await FeaturesApi.poll()); } catch { /* try again next tick */ }
      if (!stopped) timer = setTimeout(poll, POLL_MS);
    };

    const stream = async () => {
      let failures = 0;
      while (!stopped) {
        try {
          const token = await tokenStore.get();
          const res = await fetch(`${API_BASE}/realtime/stream`, { headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' }, signal: controller.signal });
          if (!res.ok || !res.body || !(res.body as any).getReader) throw new Error(`stream ${res.status}`);
          setTransport('stream');
          failures = 0;
          const reader = (res.body as any).getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          while (!stopped) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let idx;
            while ((idx = buffer.indexOf('\n\n')) >= 0) {
              const block = buffer.slice(0, idx);
              buffer = buffer.slice(idx + 2);
              const event = /^event: (.+)$/m.exec(block)?.[1];
              const data = /^data: (.+)$/m.exec(block)?.[1];
              if (event === 'update' && data) {
                try { applySnapshot(JSON.parse(data)); } catch { /* ignore a malformed event */ }
              }
            }
          }
        } catch (e: any) {
          if (stopped || e?.name === 'AbortError') return;
          failures += 1;
          if (failures >= 3) { setTransport('poll'); poll(); return; }
          await new Promise((r) => setTimeout(r, 2000 * failures));
        }
      }
    };

    if (streamAllowed) stream();
    else { setTransport('poll'); poll(); }

    // Catch up immediately when the app comes back to the foreground.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') FeaturesApi.poll().then(applySnapshot).catch(() => {});
    });
    return () => {
      stopped = true;
      controller.abort();
      clearTimeout(timer);
      sub.remove();
    };
  }, [user?.id, streamAllowed, applySnapshot]);

  const value = useMemo<Live>(() => ({
    features: state.features,
    announcement: state.announcement,
    maintenance: state.maintenance,
    snapshot,
    transport,
    on: (key) => state.features[key] !== false,
    refreshFeatures,
  }), [state, snapshot, transport, refreshFeatures]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useLive = () => useContext(Ctx);
export const useFeature = (key: FeatureKey) => useContext(Ctx).features[key] !== false;

/**
 * Calls `onChange` whenever the selected part of the realtime snapshot changes
 * (for example: reload the chat list when a new message arrives).
 */
export function useLiveRefresh(select: (s: RealtimeSnapshot) => unknown, onChange: () => void) {
  const { snapshot } = useContext(Ctx);
  const key = snapshot ? JSON.stringify(select(snapshot)) : '';
  const first = useRef(true);
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => {
    if (!key) return;
    if (first.current) { first.current = false; return; }
    cb.current();
  }, [key]);
}
