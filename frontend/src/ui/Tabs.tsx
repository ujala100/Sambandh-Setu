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
          <Pressable key={o.key} onPress={() => onChange(o.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={({ hovered }: any) => [styles.segItem, on && styles.segOn, hovered && !on && styles.segHover]}>
            {({ hovered }: any) => <Text style={[styles.segText, on && { color: '#fff' }, hovered && !on && { color: colors.primaryText }]}>{o.label}{o.count ? ` (${o.count})` : ''}</Text>}
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
            {({ hovered }: any) => <Text style={[styles.ulText, (on || hovered) && { color: colors.primary, fontFamily: fonts.semibold }]}>{o.label}</Text>}
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
          <Pressable key={o.key} onPress={() => onChange(o.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={({ hovered }: any) => [styles.pill, on && styles.pillOn, hovered && !on && styles.pillHover]}>
            {({ hovered }: any) => <Text style={[styles.pillText, on && { color: '#fff' }, hovered && !on && { color: colors.primaryText }]}>{o.label}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', backgroundColor: colors.greenSurface, borderRadius: radius.pill, padding: 4, gap: 4 },
  segItem: { flex: 1, minHeight: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  segOn: { backgroundColor: colors.primary },
  segHover: { backgroundColor: colors.primarySoft },
  segText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.navy },
  ulWrap: { borderBottomWidth: 1, borderBottomColor: colors.border, flexGrow: 0 },
  ulItem: { paddingHorizontal: 12, minHeight: 44, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  ulOn: { borderBottomColor: colors.primary },
  ulText: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.muted },
  pill: { borderRadius: radius.pill, paddingHorizontal: 16, minHeight: 34, justifyContent: 'center', backgroundColor: colors.greenSurface },
  pillHover: { backgroundColor: colors.primarySoft },
  pillOn: { backgroundColor: colors.primary },
  pillText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSoft },
});
