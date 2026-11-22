import React from 'react';
import { Image, Pressable, StyleProp, StyleSheet, Text, TextProps, TextStyle, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, fonts, radius, shadow, space, TintName, type } from '../theme';
import { assetUrl } from '../api/client';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, size = 20, color = colors.text, style }: { name: IconName; size?: number; color?: string; style?: any }) {
  return <Ionicons name={name} size={size} color={color} style={style} />;
}

/** Rounded square (or circle) with a soft tint behind an icon. */
export function IconTile({ name, tint = 'blue', size = 40, iconSize, round, style }: { name: IconName; tint?: TintName; size?: number; iconSize?: number; round?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = colors.tint[tint];
  return (
    <View style={[{ width: size, height: size, borderRadius: round ? size / 2 : Math.round(size * 0.28), backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Ionicons name={name} size={iconSize ?? Math.round(size * 0.5)} color={t.fg} />
    </View>
  );
}

type Variant = keyof typeof type;
export function Txt({ variant = 'body', color, center, style, children, ...rest }: TextProps & { variant?: Variant; color?: string; center?: boolean; style?: StyleProp<TextStyle> }) {
  return (
    <Text {...rest} style={[type[variant] as TextStyle, color ? { color } : null, center ? { textAlign: 'center' } : null, style]}>
      {children}
    </Text>
  );
}

/** Two people and a heart: the Sambandh Setu mark. */
export function LogoMark({ size = 36, color = colors.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityLabel="Sambandh Setu">
      <Circle cx={16.5} cy={17} r={5.2} fill={color} />
      <Circle cx={31.5} cy={17} r={5.2} fill={color} />
      <Path d="M6 35.5a10.5 10.5 0 0 1 21 0z" fill={color} />
      <Path d="M21 35.5a10.5 10.5 0 0 1 21 0z" fill={color} />
      <Path d="M24 39.5s-5.6-3.4-5.6-7.1a3 3 0 0 1 5.6-1.4 3 3 0 0 1 5.6 1.4c0 3.7-5.6 7.1-5.6 7.1z" fill="#E5484D" stroke="#FFFFFF" strokeWidth={1.4} />
    </Svg>
  );
}

export function Logo({ tagline = true, size = 36, serif = false }: { tagline?: boolean; size?: number; serif?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityRole="header">
      <LogoMark size={size} />
      <View>
        <Text style={{ fontFamily: serif ? fonts.display : fonts.bold, fontSize: serif ? 20 : 18, color: serif ? colors.navy : colors.primary, lineHeight: 22 }}>Sambandh Setu</Text>
        {tagline ? <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: colors.muted, marginTop: 1 }}>Find with purpose. Connect with trust.</Text> : null}
      </View>
    </View>
  );
}

export function Card({ children, style, onPress, padded = true, accessibilityLabel, tone = 'surface' }: {
  children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; padded?: boolean; accessibilityLabel?: string; tone?: 'surface' | 'soft' | 'tint';
}) {
  const base = [styles.card, padded && styles.cardPad, tone === 'soft' && styles.cardSoft, tone === 'tint' && styles.cardTint, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={({ pressed, hovered }: any) => [base, (pressed || hovered) && styles.cardHover]}>
      {children}
    </Pressable>
  );
}

export function Avatar({ uri, name, size = 44, online, rounded = false, style }: { uri?: string | null; name?: string; size?: number; online?: boolean; rounded?: boolean; style?: StyleProp<ViewStyle> }) {
  const initials = (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?';
  const r = rounded ? Math.round(size * 0.18) : size / 2;
  const src = assetUrl(uri || undefined);
  return (
    <View style={[{ width: size, height: size }, style]}>
      {src ? (
        <Image source={{ uri: src }} style={{ width: size, height: size, borderRadius: r, backgroundColor: colors.primarySoft }} accessibilityLabel={name ? `${name}'s photo` : 'Photo'} />
      ) : (
        <View style={{ width: size, height: size, borderRadius: r, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={name}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: Math.max(11, size * 0.36), color: colors.primary }}>{initials}</Text>
        </View>
      )}
      {online ? <View style={[styles.online, { width: Math.max(10, size * 0.24), height: Math.max(10, size * 0.24), borderRadius: size }]} accessibilityLabel="Online" /> : null}
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: colors.border }, style]} />;
}

export function Row({ children, gap = space.sm, style, wrap }: { children: React.ReactNode; gap?: number; style?: StyleProp<ViewStyle>; wrap?: boolean }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, wrap && { flexWrap: 'wrap' }, style]}>{children}</View>;
}

export function Spacer({ h = space.lg }: { h?: number }) {
  return <View style={{ height: h }} />;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  cardPad: { padding: space.lg },
  cardSoft: { backgroundColor: colors.primarySoft, borderColor: colors.primaryLine, shadowOpacity: 0 },
  cardTint: { backgroundColor: colors.bgTint, borderColor: colors.border, shadowOpacity: 0 },
  cardHover: { borderColor: colors.primaryLine },
  online: { position: 'absolute', right: 0, bottom: 0, backgroundColor: colors.online, borderWidth: 2, borderColor: '#fff' },
});
