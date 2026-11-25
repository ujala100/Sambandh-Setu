import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Platform, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, space, TintName } from '../theme';
import { Button } from './Button';
import type { IconName } from './Basics';

/** Inline notice with semantic color tones. */
export function InfoNote({ title, text, icon = 'information-circle', tone = 'blue', style, children }: { title?: string; text?: string; icon?: IconName; tone?: 'blue' | 'pink' | 'green' | 'amber' | 'red'; style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  const map = {
    blue: { bg: colors.primarySoft, icon: colors.primary, line: colors.primaryLine, text: colors.primary },
    pink: { bg: colors.primarySoft, icon: colors.primaryText, line: colors.primaryLine, text: colors.primaryText },
    green: { bg: colors.successSoft, icon: colors.navy, line: '#D3E5D6', text: colors.success },
    amber: { bg: colors.warningSoft, icon: '#A8752A', line: '#F1DDBB', text: '#7A5418' },
    red: { bg: colors.dangerSoft, icon: colors.danger, line: '#F3C9C9', text: colors.danger },
  } as const;
  const { bg, icon: iconColor, line, text: textColor } = map[tone];
  return (
    <View style={[styles.note, { backgroundColor: bg, borderColor: line }, style]}>
      <Ionicons name={icon} size={20} color={iconColor} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        {title ? <Text style={[styles.noteTitle, { color: textColor }]}>{title}</Text> : null}
        {text ? <Text style={styles.noteText}>{text}</Text> : null}
        {children}
      </View>
    </View>
  );
}

/** "11 · Feedback & System States": zero placeholder dead-ends. */
export function EmptyState({ icon = 'chatbubble-ellipses-outline', title, text, action, onAction, tint = 'slate', actionTone, style }: { icon?: IconName; title: string; text?: string; action?: string; onAction?: () => void; tint?: TintName; actionTone?: 'pink' | 'green'; style?: any }) {
  const t = colors.tint[tint];
  return (
    <View style={[styles.empty, style]}>
      <View style={[styles.emptyIcon, { backgroundColor: t.bg }]}><Ionicons name={icon} size={24} color={t.fg} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {text ? <Text style={styles.emptyText}>{text}</Text> : null}
      {action && onAction ? <Button title={action} variant="secondary" size="sm" full={false} tone={actionTone} onPress={onAction} style={{ marginTop: space.md, alignSelf: 'center' }} /> : null}
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
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[{ height, width: width as any, borderRadius: r, backgroundColor: colors.bgTint, opacity: pulse }, style]} />;
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
  interest_received: { label: 'Interested in you', fg: colors.primaryText, bg: colors.primarySoft, icon: 'heart' },
  mutual: { label: 'Mutual Connection', fg: colors.success, bg: colors.successSoft },
  waiting: { label: 'Waiting for response', fg: colors.muted, bg: colors.bgTint, icon: 'time-outline' },
  paused: { label: 'Paused', fg: '#A8752A', bg: colors.warningSoft, icon: 'pause' },
  closed: { label: 'Closed', fg: colors.danger, bg: colors.dangerSoft },
  locked: { label: 'Locked', fg: colors.faint, bg: colors.bgTint, icon: 'lock-closed' },
  current: { label: 'Current', fg: colors.primary, bg: colors.primarySoft },
  completed: { label: 'Completed', fg: colors.success, bg: colors.successSoft, icon: 'checkmark' },
  in_review: { label: 'In review', fg: '#A8752A', bg: colors.warningSoft, icon: 'time-outline' },
  verified: { label: 'Verified', fg: colors.success, bg: colors.successSoft, icon: 'checkmark-circle' },
  needs_action: { label: 'Needs action', fg: colors.danger, bg: colors.dangerSoft, icon: 'alert-circle' },
  active: { label: 'Active', fg: colors.success, bg: colors.successSoft },
  pending: { label: 'Pending', fg: '#A8752A', bg: colors.warningSoft },
  online: { label: 'Online', fg: colors.success, bg: colors.successSoft },
};

/** State pill from "07 & 08 · Relationship & Setu Journey States". */
export function StatePill({ state, label }: { state: keyof typeof PILL | string; label?: string }) {
  const p = PILL[state] || { label: label || state, fg: colors.primary, bg: colors.primarySoft };
  const iconColor = p.bg === colors.successSoft ? colors.navy : p.fg;
  return (
    <View style={[styles.pill, { backgroundColor: p.bg }]}>
      {p.icon ? <Ionicons name={p.icon} size={11} color={iconColor} style={{ marginRight: 4 }} /> : null}
      <Text style={[styles.pillText, { color: p.fg }]}>{label || p.label}</Text>
    </View>
  );
}

export function StatusDot({ status, label }: { status: 'active' | 'pending' | 'connected'; label?: string }) {
  const c = status === 'pending' ? colors.warning : colors.success;
  const dot = status === 'pending' ? colors.warning : colors.mint;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
      <Text style={{ fontFamily: fonts.medium, fontSize: 12.5, color: c }}>{label || (status === 'pending' ? 'Pending' : status === 'connected' ? 'Connected' : 'Active')}</Text>
    </View>
  );
}

export function ProgressBar({ value, height = 6, style }: { value: number; height?: number; style?: any }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={[{ height, borderRadius: height, backgroundColor: colors.border, overflow: 'hidden' }, style]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}>
      <View style={{ width: `${pct}%` as any, height, borderRadius: height, backgroundColor: colors.primary }} />
    </View>
  );
}

/** Segmented step bar used by onboarding ("Step 3 of 5"). */
export function StepBar({ step, total, activeColor = colors.primary }: { step: number; total: number; activeColor?: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`Step ${step} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i < step ? activeColor : Platform.OS === 'web' ? '#DCE3EC' : colors.border }} />)}
    </View>
  );
}

/** Success illustration: check in a soft circle with confetti dots. */
export function SuccessMark({ tone = 'green', icon = 'checkmark', size = 120 }: { tone?: 'green' | 'blue' | 'red' | 'amber'; icon?: IconName; size?: number }) {
  const fg = { green: '#16A36A', blue: colors.primary, red: colors.dangerStrong, amber: '#C98A12' }[tone];
  const bg = { green: '#DDF5EA', blue: Platform.OS === 'web' ? '#E1EBFC' : colors.primarySoft, red: '#FCE3E3', amber: '#FBEFD5' }[tone];
  const dots = [[-8, 20, '#F59E0B'], [size + 2, 30, colors.primary], [10, size - 4, '#EC4899'], [size - 10, size + 2, '#10B981'], [size / 2, -14, colors.primary], [-14, size / 2 + 10, '#8B5CF6']] as const;
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
