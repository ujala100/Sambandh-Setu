import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FeatureKey } from '../api';
import { useLive } from '../context/LiveContext';
import { colors, fonts } from '../theme';
import { EmptyState, Screen } from '../ui';

/** Announcement and maintenance messages set live from the team console. */
export function LiveBanner() {
  const { announcement, maintenance } = useLive();
  if (!announcement && !maintenance) return null;
  return (
    <View accessibilityLiveRegion="polite">
      {maintenance ? (
        <View style={[styles.bar, { backgroundColor: colors.warningSoft, borderBottomColor: '#F1DDBB' }]}>
          <Ionicons name="construct-outline" size={16} color="#A8752A" />
          <Text style={[styles.text, { color: '#7A5418' }]}>{maintenance.message}</Text>
        </View>
      ) : null}
      {announcement ? (
        <View style={[styles.bar, announcement.tone === 'success' ? { backgroundColor: colors.successSoft, borderBottomColor: '#D3E5D6' } : announcement.tone === 'warning' ? { backgroundColor: colors.warningSoft, borderBottomColor: '#F1DDBB' } : { backgroundColor: colors.primarySoft, borderBottomColor: colors.primaryLine }]}>
          <Ionicons name={announcement.tone === 'warning' ? 'alert-circle-outline' : announcement.tone === 'success' ? 'checkmark-circle-outline' : 'megaphone-outline'} size={16} color={announcement.tone === 'warning' ? '#A8752A' : announcement.tone === 'success' ? colors.navy : colors.primary} />
          <Text style={styles.text}>{announcement.text}</Text>
        </View>
      ) : null}
    </View>
  );
}

const NAMES: Partial<Record<FeatureKey, string>> = {
  chat: 'Chat', setu_guide: 'Setu Guide', reflect: 'Reflect', family_access: 'Family Access', verification: 'Verification',
  discover: 'Discover', signups: 'New sign-ups',
};

/** Shown in place of a screen whose feature is switched off. */
export function FeaturePaused({ feature, inline }: { feature: FeatureKey; inline?: boolean }) {
  const name = NAMES[feature] || 'This feature';
  const body = <EmptyState icon="pause-circle-outline" tint="amber" title={`${name} is paused for now`} text="The Sambandh Setu team has switched this off for a short while. Everything you saved is safe. Please check back soon." />;
  if (inline) return body;
  return <Screen title={name} back="Main">{body}</Screen>;
}

/** Wraps a screen component so it shows FeaturePaused while the feature is off. Define at module level. */
export function gated<P extends object>(Component: React.ComponentType<P>, feature: FeatureKey) {
  function Gated(props: P) {
    const { on } = useLive();
    return on(feature) ? <Component {...props} /> : <FeaturePaused feature={feature} />;
  }
  Gated.displayName = `Gated(${feature})`;
  return Gated;
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 9, borderBottomWidth: 1 },
  text: { fontFamily: fonts.medium, fontSize: 13, color: colors.text, flexShrink: 1, textAlign: 'center' },
});
