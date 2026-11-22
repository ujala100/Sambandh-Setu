import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, shadow } from '../theme';
import { useLayout } from '../hooks/useLayout';

const ICONS: Record<string, { on: any; off: any; label: string }> = {
  Home: { on: 'home', off: 'home-outline', label: 'Home' },
  Connections: { on: 'people', off: 'people-outline', label: 'Connections' },
  Guide: { on: 'infinite', off: 'infinite', label: 'Setu Guide' },
  Chats: { on: 'chatbubble-ellipses', off: 'chatbubble-ellipses-outline', label: 'Chat' },
  Profile: { on: 'person', off: 'person-outline', label: 'Profile' },
};

/**
 * Floating 5-slot footer ("06 · Finalized Footer Navigation"): equal widths, Trust Blue active
 * circle, Setu Guide as the horizontal 8 in the middle. Hidden on desktop (left navigation instead).
 */
export default function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { wide } = useLayout();
  if (wide) return null;
  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <View style={styles.bar} accessibilityRole="tablist">
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const meta = ICONS[route.name];
          const guide = route.name === 'Guide';
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={meta.label}
              onPress={() => {
                const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !e.defaultPrevented) navigation.navigate(route.name as never);
              }}
              style={styles.slot}
            >
              <View style={[styles.circle, guide && !focused && styles.guideIdle, focused && styles.active]}>
                <Ionicons name={focused ? meta.on : meta.off} size={guide ? 26 : 22} color={focused ? '#fff' : guide ? colors.primary : colors.text} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  bar: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 36, height: 68, width: '100%' as any, maxWidth: 460, paddingHorizontal: 8, alignItems: 'center', borderWidth: 1, borderColor: '#EEF2F7', ...shadow.elevated },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 64 },
  circle: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  guideIdle: { backgroundColor: colors.primarySoft },
  active: { backgroundColor: colors.primary, ...shadow.button },
});
