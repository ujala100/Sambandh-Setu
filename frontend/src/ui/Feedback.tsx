import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, space, TintName } from '../theme';
import { Button } from './Button';
import type { IconName } from './Basics';

/** Soft blue info box ("You are in control", "Your privacy matters"). */
export function InfoNote({ title, text, icon = 'information-circle', tone = 'blue', style, children }: { title?: string; text?: string; icon?: IconName; tone?: 'blue' | 'green' | 'amber' | 'red'; style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  const map = { blue: [colors.primarySoft, colors.primary, colors.primaryLine], green: [colors.successSoft, '#0F9F6E', '#BFEBD9'], amber: [colors.warningSoft, '#A8752A', '#F1DDBB'], red: [colors.dangerSoft, colors.danger, '#F3C9C9'] } as const;
  const [bg, fg, line] = map[tone];
  return (
    <View style={[styles.note, { backgroundColor: bg, borderColor: line }, style]}>
      <Ionicons name={icon} size={20} color={fg} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        {title ? <Text style={[styles.noteTitle, { color: fg }]}>{title}</Text> : null}
        {text ? <Text style={styles.noteText}>{text}</Text> : null}
        {children}
      </View>
    </View>
  );
}

/** "11 · Feedback & System States": zero placeholder dead-ends. */
export function EmptyState({ icon = 'chatbubble-ellipses-outline', title, text, action, onAction, tint = 'slate', style }: { icon?: IconName; title: string; text?: string; action?: string; onAction?: () => void; tint?: TintName; style?: any }) {
  const t = colors.tint[tint];
  return (
    <View style={[styles.empty, style]}>
      <View style={[styles.emptyIcon, { backgroundColor: t.bg }]}><Ionicons name={icon} size={24} color={t.fg} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {text ? <Text style={styles.emptyText}>{text}</Text> : null}
      {action && onAction ? <Button title={action} variant="secondary" size="sm" full={false} onPress={onAction} style={{ marginTop: space.md, alignSelf: 'center' }} /> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry, title = 'Unable to load' }: { message?: string | null; onRetry?: () => void; title?: string }) {
  return <EmptyState icon="alert-circle-outline" tint="red" title={title} text={message || 'Please check your network connection or try again.'} action={onRetry ? 'Retry now' : undefined} onAction={onRetry} />;
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <View style={{ padding: space.xxl, alignItems: 'center' }} accessibilityLabel={label}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export function Skeleton({ height = 16, width = '100%', radius: r = 8, style }: { height?: number; width?: number | string; radius?: number; style?: any }) {
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[{ height, width: width as any, borderRadius: r, backgroundColor: '#E6ECF4', opacity: pulse }, style]} />;
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.skelCard}>
          <Skeleton height={48} width={48} radius={24} />
          <View style={{ flex: 1, gap: 8 }}><Skeleton height={14} width="60%" /><Skeleton height={12} width="85%" /></View>
        </View>
      ))}
    </View>
  );
}

const PILL: Record<string, { label: string; fg: string; bg: string; icon?: IconName }> = {
  interest_sent: { label: 'Interest Sent', fg: colors.primary, bg: colors.primarySoft },
  interest_received: { label: 'Interested in you', fg: '#C2416B', bg: '#FDEBF2', icon: 'heart' },
  mutual: { label: 'Mutual Connection', fg: '#0F9F6E', bg: colors.successSoft },
  waiting: { label: 'Waiting for response', fg: colors.muted, bg: '#F1F5F9', icon: 'time-outline' },
  paused: { label: 'Paused', fg: '#A8752A', bg: colors.warningSoft, icon: 'pause' },
  closed: { label: 'Closed', fg: colors.danger, bg: colors.dangerSoft },
  locked: { label: 'Locked', fg: colors.faint, bg: '#F1F5F9', icon: 'lock-closed' },
  current: { label: 'Current', fg: colors.primary, bg: colors.primarySoft },
  completed: { label: 'Completed', fg: '#0F9F6E', bg: colors.successSoft, icon: 'checkmark' },
  in_review: { label: 'In review', fg: '#A8752A', bg: colors.warningSoft, icon: 'time-outline' },
  verified: { label: 'Verified', fg: '#0F9F6E', bg: colors.successSoft, icon: 'checkmark-circle' },
  needs_action: { label: 'Needs action', fg: colors.danger, bg: colors.dangerSoft, icon: 'alert-circle' },
  active: { label: 'Active', fg: '#0F9F6E', bg: colors.successSoft },
  pending: { label: 'Pending', fg: '#A8752A', bg: colors.warningSoft },
  online: { label: 'Online', fg: '#0F9F6E', bg: colors.successSoft },
};

/** State pill from "07 & 08 · Relationship & Setu Journey States". */
export function StatePill({ state, label }: { state: keyof typeof PILL | string; label?: string }) {
  const p = PILL[state] || { label: label || state, fg: colors.primary, bg: colors.primarySoft };
  return (
    <View style={[styles.pill, { backgroundColor: p.bg }]}>
      {p.icon ? <Ionicons name={p.icon} size={11} color={p.fg} style={{ marginRight: 4 }} /> : null}
      <Text style={[styles.pillText, { color: p.fg }]}>{label || p.label}</Text>
    </View>
  );
}

export function StatusDot({ status, label }: { status: 'active' | 'pending' | 'connected'; label?: string }) {
  const c = status === 'pending' ? colors.warning : colors.success;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} />
      <Text style={{ fontFamily: fonts.medium, fontSize: 12.5, color: c }}>{label || (status === 'pending' ? 'Pending' : status === 'connected' ? 'Connected' : 'Active')}</Text>
    </View>
  );
}

export function ProgressBar({ value, height = 6, style }: { value: number; height?: number; style?: any }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={[{ height, borderRadius: height, backgroundColor: '#E2E8F0', overflow: 'hidden' }, style]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}>
      <View style={{ width: `${pct}%` as any, height, borderRadius: height, backgroundColor: colors.primary }} />
    </View>
  );
}

/** Segmented step bar used by onboarding ("Step 3 of 5"). */
export function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`Step ${step} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i < step ? colors.primary : '#DCE3EC' }} />)}
    </View>
  );
}

/** Success illustration: check in a soft circle with confetti dots. */
export function SuccessMark({ tone = 'green', icon = 'checkmark', size = 120 }: { tone?: 'green' | 'blue' | 'red' | 'amber'; icon?: IconName; size?: number }) {
  const fg = { green: '#16A36A', blue: colors.primary, red: colors.dangerStrong, amber: '#C98A12' }[tone];
  const bg = { green: '#DDF5EA', blue: '#E1EBFC', red: '#FCE3E3', amber: '#FBEFD5' }[tone];
  const dots = [[-8, 20, '#F59E0B'], [size + 2, 30, '#2C67C5'], [10, size - 4, '#EC4899'], [size - 10, size + 2, '#10B981'], [size / 2, -14, '#2C67C5'], [-14, size / 2 + 10, '#8B5CF6']] as const;
  return (
    <View style={{ width: size, height: size, alignSelf: 'center', marginVertical: space.xl }}>
      {dots.map(([x, y, c], i) => <View key={i} style={{ position: 'absolute', left: x, top: y, width: 7, height: 7, borderRadius: i % 2 ? 2 : 4, backgroundColor: c, transform: [{ rotate: `${i * 25}deg` }] }} />)}
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: size * 0.56, height: size * 0.56, borderRadius: size, backgroundColor: fg, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={size * 0.3} color="#fff" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', gap: 10, borderRadius: radius.card, borderWidth: 1, padding: 14 },
  noteTitle: { fontFamily: fonts.semibold, fontSize: 13.5, marginBottom: 2 },
  noteText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.textSoft },
  empty: { alignItems: 'center', paddingVertical: space.xl, paddingHorizontal: space.lg },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: space.md },
  emptyTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text, textAlign: 'center' },
  emptyText: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 20, color: colors.muted, textAlign: 'center', marginTop: 6, maxWidth: 340 },
  skelCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: radius.card, padding: 14, borderWidth: 1, borderColor: colors.border },
  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { fontFamily: fonts.semibold, fontSize: 11.5 },
});
