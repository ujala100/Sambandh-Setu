import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts, space } from '../theme';
import { useLayout } from '../hooks/useLayout';

type Props = {
  title?: string;
  subtitle?: string;
  /** true = go back; string = route to open when there is no history (e.g. after a page refresh). */
  back?: boolean | string;
  onBack?: () => void;
  /** 'large' = back arrow then big title (App settings screens); 'center' = title centred in the bar. */
  variant?: 'large' | 'center' | 'none';
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Right rail on desktop. */
  aside?: React.ReactNode;
  asideOnMobile?: boolean;
  asideWidth?: number;
  /** Left column on desktop (Settings menu). */
  sidebar?: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  /** Max width of the main column on desktop. */
  maxWidth?: number;
  bg?: string;
  /** Screen sits above the floating tab bar on phones. */
  tab?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  breadcrumb?: string[];
  centerContent?: boolean;
};

export function useGoBack(fallback?: string) {
  const nav = useNavigation<any>();
  return () => {
    if (nav.canGoBack()) nav.goBack();
    else nav.navigate(fallback || 'Main');
  };
}

export function Screen({ title, subtitle, back, onBack, variant = 'large', headerRight, children, footer, aside, asideOnMobile, asideWidth, sidebar, scroll = true, padded = true, maxWidth, bg = colors.bg, tab, refreshing, onRefresh, breadcrumb, centerContent }: Props) {
  const { wide, gutter } = useLayout();
  const goBack = useGoBack(typeof back === 'string' ? back : undefined);
  const handleBack = onBack || goBack;
  const refresh = onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined;

  if (wide) {
    const main = (
      <View style={{ flex: 1, minWidth: 0, maxWidth: maxWidth || (aside ? 900 : sidebar ? 760 : 1000) }}>
        {breadcrumb ? <Text style={styles.crumbs}>{breadcrumb.join('  ›  ')}</Text> : null}
        {title && variant !== 'none' ? (
          <View style={styles.wideHead}>
            {back || onBack ? (
              <Pressable onPress={handleBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} style={styles.wideBack}>
                <Ionicons name="arrow-back" size={22} color={colors.text} />
              </Pressable>
            ) : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.wideTitle} accessibilityRole="header">{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            {headerRight}
          </View>
        ) : null}
        {children}
        {footer ? <View style={{ marginTop: space.xl }}>{footer}</View> : null}
      </View>
    );
    const body = (
      <View style={[styles.wideRow, centerContent && { justifyContent: 'center' }]}>
        {sidebar ? <View style={styles.sidebar}>{sidebar}</View> : null}
        {main}
        {aside ? <View style={[styles.aside, asideWidth ? { width: asideWidth } : null]}>{aside}</View> : null}
      </View>
    );
    if (!scroll) return <View style={{ flex: 1, backgroundColor: bg, padding: padded ? gutter : 0 }}>{body}</View>;
    return (
      <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={{ padding: padded ? gutter : 0, paddingBottom: 48 }} refreshControl={refresh} keyboardShouldPersistTaps="handled">
        {body}
      </ScrollView>
    );
  }

  const showBar = variant !== 'none' && (back || onBack || variant === 'center' || headerRight);
  const content = (
    <>
      {variant === 'large' && title ? (
        <View style={{ marginBottom: space.lg }}>
          <Text style={styles.largeTitle} accessibilityRole="header">{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
      {children}
      {aside && asideOnMobile ? <View style={{ marginTop: space.xl }}>{aside}</View> : null}
    </>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top', 'left', 'right']}>
      {showBar ? (
        <View style={[styles.bar, variant === 'large' && { minHeight: 44 }]}>
          {back || onBack ? (
            <Pressable onPress={handleBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} style={styles.barBtn}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </Pressable>
          ) : <View style={{ width: 8 }} />}
          {variant === 'center' ? (
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.centerTitle} numberOfLines={1} accessibilityRole="header">{title}</Text>
              {subtitle ? <Text style={[styles.subtitle, { marginTop: 0, fontSize: 12 }]} numberOfLines={1}>{subtitle}</Text> : null}
            </View>
          ) : <View style={{ flex: 1 }} />}
          <View style={{ minWidth: 44, alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'flex-end' }}>{headerRight}</View>
        </View>
      ) : null}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: padded ? gutter : 0, paddingTop: showBar ? (variant === 'large' ? 0 : 4) : padded ? gutter : 0, paddingBottom: tab ? 120 : 32, flexGrow: 1 }} refreshControl={refresh} keyboardShouldPersistTaps="handled">
            {content}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, padding: padded ? gutter : 0, paddingTop: showBar ? (variant === 'large' ? 0 : 4) : padded ? gutter : 0 }}>{content}</View>
        )}
        {footer ? <View style={[styles.footer, tab && { paddingBottom: 110 }]}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Sticky-free page section header used inside wide layouts and cards. */
export function PageIntro({ title, subtitle, style }: { title: string; subtitle?: string; style?: any }) {
  return (
    <View style={[{ marginBottom: space.lg }, style]}>
      <Text style={styles.largeTitle}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 8 },
  barBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  centerTitle: { fontFamily: fonts.semibold, fontSize: 17, color: colors.text },
  largeTitle: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 31, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 20, color: colors.muted, marginTop: 4 },
  footer: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20, backgroundColor: 'transparent', gap: 10 },
  wideRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 24, width: '100%' as any, maxWidth: 1320, alignSelf: 'center' },
  wideHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: space.xl },
  wideBack: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  wideTitle: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 34, color: colors.text },
  crumbs: { fontFamily: fonts.medium, fontSize: 12, color: colors.faint, marginBottom: 8 },
  sidebar: { width: 300 },
  aside: { width: 320, gap: 16 },
});
