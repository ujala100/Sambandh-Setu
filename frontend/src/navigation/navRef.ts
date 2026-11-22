import { createNavigationContainerRef } from '@react-navigation/native';
import { useSyncExternalStore } from 'react';

export const navigationRef = createNavigationContainerRef<any>();

let current = '';
const listeners = new Set<() => void>();

/** Called from NavigationContainer.onStateChange / onReady. */
export function syncCurrentRoute() {
  const name = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name || '' : '';
  if (name !== current) {
    current = name;
    listeners.forEach((l) => l());
  }
}

/** Name of the focused screen, for the desktop navigation highlight. */
export function useCurrentRoute() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => current,
    () => current,
  );
}

export function go(name: string, params?: any) {
  if (navigationRef.isReady()) (navigationRef as any).navigate(name, params);
}

export function goTab(tab: 'Home' | 'Connections' | 'Guide' | 'Chats' | 'Profile', params?: any) {
  go('Main', { screen: tab, params });
}
