import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, space, TintName } from '../theme';
import type { IconName } from './Basics';

/** Settings/menu row: icon tile, title, subtitle, optional value, chevron. */
export function ListRow({ icon, tint = 'blue', title, subtitle, value, onPress, danger, last, right, badge, selected }: {
  icon?: IconName; tint?: TintName; title: string; subtitle?: string; value?: string; onPress?: () => void; danger?: boolean; last?: boolean; right?: React.ReactNode; badge?: React.ReactNode; selected?: boolean;
}) {
  const t = colors.tint[danger ? 'red' : tint];
  const content = (
    <>
      {icon ? <View style={[styles.icon, { backgroundColor: t.bg }]}><Ionicons name={icon} size={19} color={t.fg} /></View> : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, danger && { color: colors.dangerStrong }, selected && { color: colors.primary }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, danger && { color: '#E07A7A' }]} numberOfLines={2}>{subtitle}</Text> : null}
        {badge ? <View style={{ marginTop: 6 }}>{badge}</View> : null}
      </View>
      {value ? <Text style={styles.value} numberOfLines={1}>{value}</Text> : null}
      {right}
      {onPress && !right ? <Ionicons name="chevron-forward" size={18} color={danger ? colors.dangerStrong : colors.faint} /> : null}
    </>
  );
  const style = [styles.row, !last && styles.border, selected && styles.selected];
  if (!onPress) return <View style={style}>{content}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={[title, subtitle, value].filter(Boolean).join('. ')}
      style={({ hovered, pressed }: any) => [...style, (hovered || pressed) && !selected && { backgroundColor: colors.bg }]}>
      {content}
    </Pressable>
  );
}

/** White rounded group of rows. */
export function Group({ children, style, label, action }: { children: React.ReactNode; style?: any; label?: string; action?: React.ReactNode }) {
  return (
    <View style={[{ marginBottom: space.xl }, style]}>
      {label ? (
        <View style={styles.groupHead}>
          <Text style={styles.groupLabel}>{label}</Text>
          {action}
        </View>
      ) : null}
      <View style={styles.group}>{children}</View>
    </View>
  );
}

export function SectionTitle({ title, icon, action, onAction, style, subtitle }: { title: string; icon?: IconName; action?: string; onAction?: () => void; style?: any; subtitle?: string }) {
  return (
    <View style={[styles.sectionRow, style]}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon ? <Ionicons name={icon} size={19} color={colors.primary} /> : null}
          <Text style={styles.section}>{title}</Text>
        </View>
        {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
      </View>
      {action && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="link" hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 32 }}>
          <Text style={styles.action}>{action}</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Label / value row used in profile details ("Father — Businessman"). */
export function KeyValue({ label, value, last, onPress }: { label: string; value?: string | null; last?: boolean; onPress?: () => void }) {
  const body = (
    <>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvValue}>{value || 'Not specified'}</Text>
      {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.faint} /> : null}
    </>
  );
  if (onPress) return <Pressable onPress={onPress} style={[styles.kv, !last && styles.kvBorder]} accessibilityRole="button" accessibilityLabel={`${label}: ${value || 'Not specified'}`}>{body}</Pressable>;
  return <View style={[styles.kv, !last && styles.kvBorder]}>{body}</View>;
}

/** Check list item ("Profile information", "Verified badge on your profile"). */
export function CheckItem({ text, tone = 'green', icon }: { text: string; tone?: 'green' | 'blue' | 'red'; icon?: IconName }) {
  const c = tone === 'green' ? colors.success : tone === 'red' ? colors.dangerStrong : colors.primary;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
      <Ionicons name={icon || (tone === 'red' ? 'ellipse' : 'checkmark-circle')} size={tone === 'red' ? 8 : 19} color={c} style={{ marginTop: tone === 'red' ? 7 : 1 }} />
      <Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: tone === 'red' ? colors.danger : colors.textSoft }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.lg, paddingVertical: 14, minHeight: 60, backgroundColor: 'transparent' },
  border: { borderBottomWidth: 1, borderBottomColor: colors.border },
  selected: { backgroundColor: colors.primarySoft, borderLeftWidth: 3, borderLeftColor: colors.primary },
  icon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted, marginTop: 2, lineHeight: 18 },
  value: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted, maxWidth: 170, marginLeft: 8 },
  group: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 },
  groupLabel: { fontFamily: fonts.semibold, fontSize: 11.5, letterSpacing: 0.8, color: colors.muted, textTransform: 'uppercase' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: space.md },
  section: { fontFamily: fonts.semibold, fontSize: 17, color: colors.text },
  sectionSub: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  action: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.primary },
  kv: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 12 },
  kvBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  kvLabel: { width: '38%' as any, fontFamily: fonts.regular, fontSize: 13.5, color: colors.muted },
  kvValue: { flex: 1, fontFamily: fonts.medium, fontSize: 13.5, color: colors.text },
});
