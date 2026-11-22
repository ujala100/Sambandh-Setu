import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, shadow } from '../theme';
import { useLayout } from '../hooks/useLayout';
import type { IconName } from './Basics';

type Variant = 'primary' | 'secondary' | 'outline' | 'text' | 'danger' | 'dangerOutline' | 'ghost';

/**
 * Buttons from "03 · Buttons": Primary (Trust Blue fill), Secondary (soft blue tint), Outlined,
 * Text link, plus a destructive variant used by delete/remove confirmations.
 * Pill-shaped on phones (App designs), 10px radius on desktop (Web designs).
 */
export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, arrow, size = 'md', full = true, style, accessibilityLabel }: {
  title: string; onPress?: () => void; variant?: Variant; loading?: boolean; disabled?: boolean; icon?: IconName; arrow?: boolean;
  size?: 'sm' | 'md' | 'lg'; full?: boolean; style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
  const { wide } = useLayout();
  const isDisabled = disabled || loading;
  const v = VARIANTS[variant];
  const h = size === 'sm' ? 38 : size === 'lg' ? 54 : 48;
  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      style={({ pressed, hovered }: any) => [
        styles.base,
        { minHeight: Math.max(44, h), borderRadius: wide ? radius.input : radius.pill, paddingHorizontal: size === 'sm' ? 14 : 20 },
        full ? { alignSelf: 'stretch' } : { alignSelf: 'flex-start' },
        v.box,
        (hovered || pressed) && !isDisabled && v.hover,
        isDisabled && (variant === 'primary' ? styles.disabledPrimary : styles.disabled),
        variant === 'primary' && !isDisabled && !wide && shadow.button,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={v.text} style={{ marginRight: 8 }} size="small" /> : icon ? <Ionicons name={icon} size={18} color={isDisabled && variant === 'primary' ? '#fff' : v.text} style={{ marginRight: 8 }} /> : null}
      <Text style={[styles.text, { color: isDisabled && variant !== 'primary' ? colors.faint : v.text, fontSize: size === 'sm' ? 13 : 15 }]} numberOfLines={1}>{title}</Text>
      {arrow ? <Ionicons name="arrow-forward" size={17} color={v.text} style={{ marginLeft: 8 }} /> : null}
    </Pressable>
  );
}

export function TextLink({ title, onPress, color = colors.primary, size = 14, style, icon, arrow }: { title: string; onPress?: () => void; color?: string; size?: number; style?: any; icon?: IconName; arrow?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" hitSlop={8} style={({ hovered }: any) => [{ flexDirection: 'row', alignItems: 'center', minHeight: 32 }, hovered && { opacity: 0.8 }, style]}>
      {icon ? <Ionicons name={icon} size={size + 2} color={color} style={{ marginRight: 6 }} /> : null}
      <Text style={{ fontFamily: fonts.semibold, fontSize: size, color }}>{title}</Text>
      {arrow ? <Ionicons name="arrow-forward" size={size} color={color} style={{ marginLeft: 4 }} /> : null}
    </Pressable>
  );
}

/** Circular 40px icon button ("Icon Button" row in the design system). */
export function IconButton({ icon, onPress, label, size = 40, color = colors.text, badge, style, bg }: { icon: IconName; onPress?: () => void; label: string; size?: number; color?: string; badge?: boolean; style?: any; bg?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={4}
      style={({ hovered, pressed }: any) => [{ width: Math.max(44, size), height: Math.max(44, size), borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }, (hovered || pressed) && { backgroundColor: colors.primarySoft }, style]}>
      <Ionicons name={icon} size={Math.round(size * 0.55)} color={color} />
      {badge ? <View style={styles.badge} /> : null}
    </Pressable>
  );
}

export function ButtonRow({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[{ flexDirection: 'row', gap: 12 }, style]}>{React.Children.map(children, (c) => (c ? <View style={{ flex: 1 }}>{c}</View> : null))}</View>;
}

const VARIANTS: Record<Variant, { box: any; hover: any; text: string }> = {
  primary: { box: { backgroundColor: colors.primary }, hover: { backgroundColor: colors.primaryHover }, text: '#FFFFFF' },
  secondary: { box: { backgroundColor: colors.primarySoft }, hover: { backgroundColor: '#DCE8FF' }, text: colors.primary },
  outline: { box: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary }, hover: { backgroundColor: colors.primarySoft }, text: colors.primary },
  ghost: { box: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, hover: { borderColor: colors.primaryLine }, text: colors.text },
  text: { box: { backgroundColor: 'transparent' }, hover: { backgroundColor: colors.primarySoft }, text: colors.primary },
  danger: { box: { backgroundColor: colors.dangerStrong }, hover: { backgroundColor: '#BF2F2F' }, text: '#FFFFFF' },
  dangerOutline: { box: { backgroundColor: colors.surface, borderWidth: 1, borderColor: '#F3C9C9' }, hover: { backgroundColor: colors.dangerSoft }, text: colors.dangerStrong },
};

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.semibold },
  disabledPrimary: { backgroundColor: '#B9CDEE' },
  disabled: { opacity: 0.6 },
  badge: { position: 'absolute', top: 9, right: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.dangerStrong, borderWidth: 1.5, borderColor: '#fff' },
});
