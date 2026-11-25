import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '../theme';

export type StageLite = { key: string; title: string; short?: string; status: 'completed' | 'current' | 'locked' };

/** Horizontal stepper: checked circles, a ringed current stage, empty future stages. */
export function JourneyStepper({ stages, compact, showDesc = true, activeColor = colors.mint }: { stages: StageLite[]; compact?: boolean; showDesc?: boolean; activeColor?: string }) {
  return (
    <View style={{ flexDirection: 'row' }} accessibilityLabel={`Journey: ${stages.map((s) => `${s.title} ${s.status}`).join(', ')}`}>
      {stages.map((s, i) => {
        const done = s.status === 'completed';
        const cur = s.status === 'current';
        const size = compact ? 18 : 28;
        return (
          <View key={s.key} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' as any }}>
              <View style={[styles.line, { backgroundColor: i === 0 ? 'transparent' : done || cur ? activeColor : colors.border }]} />
              <View style={[{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' },
                done ? { backgroundColor: activeColor } : cur ? { borderWidth: compact ? 2 : 3, borderColor: activeColor, backgroundColor: '#fff' } : { borderWidth: 2, borderColor: colors.borderStrong, backgroundColor: '#fff' }]}>
                {done ? <Ionicons name="checkmark" size={size * 0.6} color="#fff" /> : cur ? <View style={{ width: size * 0.4, height: size * 0.4, borderRadius: size, backgroundColor: activeColor }} /> : null}
              </View>
              <View style={[styles.line, { backgroundColor: i === stages.length - 1 ? 'transparent' : done ? activeColor : colors.border }]} />
            </View>
            <Text style={[styles.label, compact && { fontSize: 8.5, letterSpacing: -0.2 }, cur && { color: activeColor, fontFamily: fonts.semibold }]} numberOfLines={2}>{s.title}</Text>
            {showDesc && !compact && s.short ? <Text style={styles.desc} numberOfLines={3}>{s.short}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

/** Small progress dots under a connection ("Setu: Understand ●●○○○○"). */
export function StageDots({ index, total = 8, color = colors.primary }: { index: number; total?: number; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }} accessibilityLabel={`Stage ${index + 1} of ${total}`}>
      {Array.from({ length: Math.min(total, 6) }).map((_, i) => (
        <View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: i <= index ? color : '#fff', borderWidth: 1, borderColor: i <= index ? color : colors.borderStrong }} />
      ))}
    </View>
  );
}

/** Vertical stage list ("Your Journey with Rohan"). */
export function StageList({ stages, onOpen }: { stages: (StageLite & { index?: number; myDone?: boolean; partnerDone?: boolean })[]; onOpen?: (key: string) => void }) {
  return (
    <View>
      {stages.map((s, i) => {
        const done = s.status === 'completed';
        const cur = s.status === 'current';
        const body = (
          <>
            <View style={{ alignItems: 'center', width: 34 }}>
              <View style={[styles.node, done && { backgroundColor: colors.mint, borderColor: colors.mint }, cur && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                {done ? <Ionicons name="checkmark" size={16} color="#fff" /> : <Text style={[styles.nodeNum, cur && { color: '#fff' }]}>{i + 1}</Text>}
              </View>
              {i < stages.length - 1 ? <View style={[styles.vline, done && { backgroundColor: colors.mint }]} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: 18 }}>
              <Text style={[styles.stageTitle, cur && { color: colors.primary }, s.status === 'locked' && { color: colors.textSoft }]}>{s.title}</Text>
              {s.short ? <Text style={styles.stageShort}>{s.short}</Text> : null}
              {cur && (s.myDone || s.partnerDone) ? (
                <Text style={styles.waiting}>{s.myDone ? 'You completed this stage. Waiting for your partner.' : 'Your partner completed this stage.'}</Text>
              ) : null}
            </View>
            <Text style={[styles.status, done && { color: colors.success }, cur && { color: colors.primary }]}>{done ? 'Completed' : cur ? 'Current' : 'Locked'}</Text>
            {cur && onOpen ? <Ionicons name="chevron-forward" size={18} color={colors.primary} style={{ marginLeft: 6 }} /> : null}
          </>
        );
        if (cur && onOpen) {
          return <Pressable key={s.key} onPress={() => onOpen(s.key)} accessibilityRole="button" accessibilityLabel={`${s.title}, current stage. Open`} style={[styles.stageRow, styles.stageCur]}>{body}</Pressable>;
        }
        return <View key={s.key} style={styles.stageRow}>{body}</View>;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flex: 1, height: 2 },
  label: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.text, marginTop: 6, textAlign: 'center' },
  desc: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, textAlign: 'center', marginTop: 2, paddingHorizontal: 4, lineHeight: 15 },
  stageRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 8, paddingTop: 10, borderRadius: radius.card },
  stageCur: { backgroundColor: colors.primarySoft },
  node: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: colors.borderStrong, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  nodeNum: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  vline: { width: 2, flex: 1, minHeight: 18, backgroundColor: colors.border, marginTop: 2 },
  stageTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  stageShort: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted, marginTop: 2, lineHeight: 18 },
  waiting: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary, marginTop: 4 },
  status: { fontFamily: fonts.medium, fontSize: 12, color: colors.faint, marginTop: 6 },
});
