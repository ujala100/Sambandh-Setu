import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '../theme';

/** Segmented control (Connections: Discover / Requests / Active). */
export function Segmented<T extends string>({ options, value, onChange, style }: { options: { key: T; label: string; count?: number }[]; value: T; onChange: (k: T) => void; style?: any }) {
  return (
    <View style={[styles.seg, style]} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={({ hovered }: any) => [styles.segItem, on && styles.segOn, hovered && !on && { backgroundColor: '#EEF2F8' }]}>
            <Text style={[styles.segText, on && { color: '#fff' }]}>{o.label}{o.count ? ` (${o.count})` : ''}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Underlined tabs (profile: Overview / About / Lifestyle / Family). */
export function UnderlineTabs<T extends string>({ options, value, onChange, style }: { options: { key: T; label: string }[]; value: T; onChange: (k: T) => void; style?: any }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.ulWrap, style]} contentContainerStyle={{ gap: 4 }} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.ulItem, on && styles.ulOn]}>
            <Text style={[styles.ulText, on && { color: colors.primary, fontFamily: fonts.semibold }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Small filter pills (Chat: All / Active / New / Muted). */
export function FilterPills<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (k: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.pill, on && styles.pillOn]}>
            <Text style={[styles.pillText, on && { color: '#fff' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', backgroundColor: '#E9EEF5', borderRadius: radius.pill, padding: 4, gap: 4 },
  segItem: { flex: 1, minHeight: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  segOn: { backgroundColor: colors.primary },
  segText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textSoft },
  ulWrap: { borderBottomWidth: 1, borderBottomColor: colors.border, flexGrow: 0 },
  ulItem: { paddingHorizontal: 12, minHeight: 44, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  ulOn: { borderBottomColor: colors.primary },
  ulText: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.muted },
  pill: { borderRadius: radius.pill, paddingHorizontal: 16, minHeight: 34, justifyContent: 'center', backgroundColor: '#EEF2F8' },
  pillOn: { backgroundColor: colors.primary },
  pillText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSoft },
});
