import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors, fonts, radius, shadow, space } from '../theme';
import { useLayout } from '../hooks/useLayout';
import { Button, IconName, Logo } from '../ui';

export const AUTH_APP_PALETTE = {
  background: '#F8F5E9',
  surface: '#FFFDF7',
  text: '#263B31',
  label: '#294237',
  border: '#D8DDD2',
  focusBorder: colors.primary,
  placeholder: '#849188',
  icon: '#668073',
  helper: '#627067',
  heading: '#173F32',
  body: '#5C6E63',
  gradient: { start: '#FBF8EE', middle: colors.bgTint, end: colors.primarySoft },
};

export function MarketingHeader({ active = 'Home' }: { active?: string }) {
  const nav = useNavigation<any>();
  const { width } = useLayout();
  const links = [['Home', 'top'], ['How it works', 'how'], ['Features', 'features'], ['Our Approach', 'approach'], ['About Us', 'about']];
  return (
    <View style={styles.header}>
      <Pressable onPress={() => nav.navigate('Landing')} accessibilityRole="link" accessibilityLabel="Sambandh Setu home"><Logo /></Pressable>
      {width >= 1100 ? (
        <View style={styles.links} accessibilityRole="navigation">
          {links.map(([label, section]) => (
            <Pressable key={label} onPress={() => nav.navigate('Landing', { section })} accessibilityRole="link" style={[styles.link, active === label && styles.linkOn]}>
              <Text style={[styles.linkText, active === label && { color: colors.primary, fontFamily: fonts.semibold }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      ) : <View style={{ flex: 1 }} />}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button title="Login" variant="outline" full={false} size="sm" onPress={() => nav.navigate('Login')} style={{ minWidth: 110 }} />
        <Button title="Get started" full={false} size="sm" arrow onPress={() => nav.navigate('SignUp')} style={{ minWidth: 130 }} />
      </View>
    </View>
  );
}

type Point = { icon: IconName; title: string; text: string };

/**
 * Sign-in / sign-up / onboarding frame. Desktop: marketing header, illustrated panel with the
 * headline on the left, white form card on the right. Phone: the App screens (no illustration).
 */
export function AuthLayout({ eyebrow, heading, highlight, intro, points, steps, currentStep, children, onBack, mobileTitle, mobileSubtitle, footer, cardMax = 480, mobilePalette, mobileLogo }: {
  eyebrow?: string; heading: string; highlight?: string; intro?: string; points?: Point[]; steps?: { title: string; text: string }[]; currentStep?: number;
  children: React.ReactNode; onBack?: () => void; mobileTitle?: string; mobileSubtitle?: string; footer?: React.ReactNode; cardMax?: number;
  mobilePalette?: {
    background?: string;
    heading?: string;
    body?: string;
    icon?: string;
    gradient?: { start: string; middle: string; end: string };
  };
  mobileLogo?: boolean;
}) {
  const { wide } = useLayout();
  if (!wide) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: mobilePalette?.background || colors.bgTint }} edges={['top', 'left', 'right', 'bottom']}>
        {mobilePalette?.gradient ? (
          <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="authMobileBackgroundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor={mobilePalette.gradient.start} />
                <Stop offset="55%" stopColor={mobilePalette.gradient.middle} />
                <Stop offset="100%" stopColor={mobilePalette.gradient.end} />
              </LinearGradient>
              <RadialGradient id="authMobilePinkGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.22" />
                <Stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id="authMobileGreenGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#4C8A70" stopOpacity="0.18" />
                <Stop offset="100%" stopColor="#4C8A70" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#authMobileBackgroundGradient)" />
            <Circle cx="92%" cy="14%" r="190" fill="url(#authMobilePinkGlow)" />
            <Circle cx="8%" cy="86%" r="190" fill="url(#authMobileGreenGlow)" />
          </Svg>
        ) : null}
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: space.lg, minHeight: 44, position: 'relative' }}>
            {onBack ? (
              <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} style={{ position: 'absolute', left: 0, top: 0, width: 44, height: 44, justifyContent: 'center' }}>
                <Ionicons name="arrow-back" size={24} color={mobilePalette?.icon || colors.text} />
              </Pressable>
            ) : null}
            {mobileLogo ? (
              <View style={styles.mobileBranding}>
                <Image source={require('../../assets/brand-logo.png')} style={styles.mobileBrandingLogo} resizeMode="contain" accessibilityLabel="Sambandh Setu logo" />
                <Text style={styles.mobileBrandingName}>Sambandh Setu</Text>
              </View>
            ) : !onBack ? <Logo tagline={false} serif size={32} /> : null}
          </View>
          {mobileTitle !== '' ? (
            <View style={{ marginBottom: space.xl }}>
              <Text style={[styles.mTitle, mobilePalette?.heading && { color: mobilePalette.heading }]} accessibilityRole="header">{mobileTitle || `${heading}${highlight ? ` ${highlight}` : ''}`}</Text>
              {mobileSubtitle || intro ? <Text style={[styles.mSub, mobilePalette?.body && { color: mobilePalette.body }]}>{mobileSubtitle || intro}</Text> : null}
            </View>
          ) : null}
          {children}
          {footer}
        </ScrollView>
      </SafeAreaView>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: '#EEF3FB' }}>
      <MarketingHeader />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={styles.split}>
          <View style={styles.panel}>
            <View style={styles.sky} />
            <Image source={require('../../assets/illustrations/auth-scene.jpg')} style={styles.scene} resizeMode="cover" accessibilityIgnoresInvertColors />
            <View style={styles.panelText}>
              {onBack ? (
                <Pressable onPress={onBack} style={styles.backPill} accessibilityRole="button" accessibilityLabel="Back">
                  <Ionicons name="arrow-back" size={15} color={colors.primary} /><Text style={styles.backText}>Back</Text>
                </Pressable>
              ) : null}
              {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
              <Text style={styles.heading} accessibilityRole="header">
                {heading}{highlight ? <Text style={styles.highlight}>{`\n${highlight}`}</Text> : null}
              </Text>
              {intro ? <Text style={styles.intro}>{intro}</Text> : null}
              {points ? (
                <View style={{ gap: 18, marginTop: 28 }}>
                  {points.map((p) => (
                    <View key={p.title} style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                      <View style={styles.pointIcon}><Ionicons name={p.icon} size={20} color={colors.primary} /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pointTitle}>{p.title}</Text>
                        <Text style={styles.pointText}>{p.text}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
              {steps ? (
                <View style={{ gap: 14, marginTop: 28 }}>
                  {steps.map((s, i) => {
                    const on = i + 1 === currentStep;
                    const done = currentStep !== undefined && i + 1 < currentStep;
                    return (
                      <View key={s.title} style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                        <View style={[styles.stepNum, on && { backgroundColor: colors.primary, borderColor: colors.primary }, done && { borderColor: colors.primary }]}>
                          {done ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : <Text style={[styles.stepNumText, on && { color: '#fff' }]}>{i + 1}</Text>}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.pointTitle, on && { color: colors.primary }]}>{s.title}</Text>
                          <Text style={styles.pointText}>{s.text}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
          </View>
          <View style={styles.formSide}>
            <View style={[styles.card, { maxWidth: cardMax }]}>{children}</View>
            {footer}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { height: 76, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 36, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border, gap: 24 },
  links: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  link: { paddingHorizontal: 12, minHeight: 44, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  linkOn: { borderBottomColor: colors.primary },
  linkText: { fontFamily: fonts.medium, fontSize: 15, color: colors.textSoft },
  split: { flex: 1, flexDirection: 'row', minHeight: 720 },
  panel: { flex: 1.15, overflow: 'hidden', backgroundColor: '#DCE9F8' },
  sky: { ...StyleSheet.absoluteFill, backgroundColor: '#E4EEFA' },
  scene: { position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%' as any, aspectRatio: 1.4 },
  panelText: { padding: 48, paddingTop: 56, maxWidth: 640 },
  backPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: radius.pill, paddingHorizontal: 14, height: 34, marginBottom: 24, borderWidth: 1, borderColor: colors.primaryLine },
  backText: { fontFamily: fonts.medium, fontSize: 13, color: colors.primary },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 12.5, letterSpacing: 0.8, color: colors.textSoft, marginBottom: 12 },
  heading: { fontFamily: fonts.bold, fontSize: 46, lineHeight: 54, color: colors.text, letterSpacing: -0.5 },
  highlight: { color: colors.primary, textDecorationLine: 'underline', textDecorationColor: '#9DBBEA' },
  intro: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 27, color: colors.textSoft, marginTop: 18, maxWidth: 540 },
  pointIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' },
  pointTitle: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.text },
  pointText: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.textSoft, marginTop: 1 },
  stepNum: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1.5, borderColor: '#D6E2F3', alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  formSide: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  card: { width: '100%' as any, backgroundColor: '#fff', borderRadius: 18, padding: 34, ...shadow.elevated },
  mobileBranding: { alignItems: 'center', justifyContent: 'center' },
  mobileBrandingLogo: { width: 34, height: 34 },
  mobileBrandingName: { fontFamily: fonts.display, fontSize: 12, color: '#173F32' },
  mTitle: { fontFamily: fonts.display, fontSize: 28, lineHeight: 36, color: colors.navy },
  mSub: { fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 22, color: colors.muted, marginTop: 8 },
});
