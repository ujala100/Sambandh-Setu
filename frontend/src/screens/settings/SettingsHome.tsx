import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useLayout } from '../../hooks/useLayout';
import { colors, fonts, radius, space, TintName } from '../../theme';
import { Group, IconName, ListRow, Screen, StatePill, Txt } from '../../ui';
import { maskPhone } from '../../utils/format';

type Item = { key: string; route: string; params?: any; icon: IconName; tint: TintName; title: string; subtitle: string; value?: (ctx: any) => string | undefined; badge?: (ctx: any) => React.ReactNode };

const GROUPS: { label: string; icon: IconName; items: Item[] }[] = [
  { label: 'Account', icon: 'person-outline', items: [
    { key: 'account', route: 'Account', icon: 'person-outline', tint: 'blue', title: 'Account', subtitle: 'Personal information, phone & email' },
    { key: 'security', route: 'PasswordSecurity', icon: 'lock-closed-outline', tint: 'purple', title: 'Password & Security', subtitle: 'Change password, security settings' },
  ] },
  { label: 'Privacy & Safety', icon: 'notifications-outline', items: [
    { key: 'privacy', route: 'PrivacyVisibility', icon: 'eye-outline', tint: 'blue', title: 'Privacy & Visibility', subtitle: 'Control who can see your profile', badge: ({ settings }) => <StatePill state="x" label={settings?.privacy.whoCanSeeProfile === 'everyone' ? 'Visible to everyone' : settings?.privacy.whoCanSeeProfile === 'connected' ? 'Visible to connections' : 'Visible to preferred matches'} /> },
    { key: 'blocked', route: 'BlockedUsers', icon: 'ban-outline', tint: 'red', title: 'Blocked Users', subtitle: 'Manage blocked accounts' },
    { key: 'verification', route: 'Verification', icon: 'checkmark-circle-outline', tint: 'green', title: 'Verification', subtitle: 'View your verification status', badge: ({ user }) => user?.verification.identity?.status === 'verified' ? <StatePill state="verified" label="Verified Profile" /> : null },
  ] },
  { label: 'Setu & AI', icon: 'bookmark-outline', items: [
    { key: 'guide', route: 'GuideSettings', icon: 'sparkles-outline', tint: 'purple', title: 'Setu Guide', subtitle: 'Manage your AI companion settings' },
    { key: 'ai', route: 'AIPrivacy', icon: 'hardware-chip-outline', tint: 'blue', title: 'AI & Privacy', subtitle: 'Control what AI can access' },
  ] },
  { label: 'Preferences', icon: 'options-outline', items: [
    { key: 'notifications', route: 'NotificationSettings', icon: 'notifications-outline', tint: 'amber', title: 'Notifications', subtitle: 'Manage your notification preferences', value: ({ settings }) => settings ? [settings.notifications.push && 'Push', settings.notifications.email && 'Email'].filter(Boolean).join(' + ') || 'Off' : undefined },
    { key: 'chat', route: 'ChatSettings', icon: 'chatbox-outline', tint: 'blue', title: 'Chat', subtitle: 'Chat settings and privacy', value: ({ settings }) => settings ? `Read receipts: ${settings.chat.readReceipts ? 'On' : 'Off'}` : undefined },
    { key: 'discovery', route: 'DiscoverySettings', icon: 'compass-outline', tint: 'purple', title: 'Discovery Settings', subtitle: 'Manage how you appear and who you can discover' },
    { key: 'language', route: 'SettingOption', params: { key: 'language' }, icon: 'globe-outline', tint: 'purple', title: 'Language', subtitle: 'Choose your preferred language', value: () => 'English (India)' },
    { key: 'appearance', route: 'SettingOption', params: { key: 'appearance' }, icon: 'moon-outline', tint: 'slate', title: 'Appearance', subtitle: 'Light or dark mode', value: ({ settings }) => (settings?.app.appearance === 'dark' ? 'Dark' : settings?.app.appearance === 'system' ? 'System' : 'Light') },
  ] },
  { label: 'Support & Legal', icon: 'help-circle-outline', items: [
    { key: 'help', route: 'Help', icon: 'help-circle-outline', tint: 'green', title: 'Help & Support', subtitle: 'FAQs, contact us, and support resources' },
    { key: 'about', route: 'About', icon: 'information-circle-outline', tint: 'purple', title: 'About Sambandh Setu', subtitle: 'Version, terms, privacy policy' },
  ] },
];

/** Settings list. Full page on phones; left column on desktop settings pages. */
export function SettingsMenu({ active, compact, query = '' }: { active?: string; compact?: boolean; query?: string }) {
  const nav = useNavigation<any>();
  const { user, settings } = useAuth();
  const ctx = { user, settings };
  const q = query.trim().toLowerCase();
  return (
    <View>
      {GROUPS.map((g) => {
        const items = g.items.filter((i) => !q || `${i.title} ${i.subtitle}`.toLowerCase().includes(q));
        if (!items.length) return null;
        return (
          <Group key={g.label} label={g.label} style={compact ? { marginBottom: space.lg } : undefined}>
            {items.map((i, idx) => (
              <ListRow key={i.key} icon={i.icon} tint={i.tint} title={i.title} subtitle={i.subtitle} selected={active === i.key}
                value={compact ? undefined : i.value?.(ctx)} badge={compact ? undefined : i.badge?.(ctx)}
                onPress={() => nav.navigate(i.route, i.params)} last={idx === items.length - 1} />
            ))}
          </Group>
        );
      })}
      {user && user.role !== 'member' ? (
        <Group label="Team" style={compact ? { marginBottom: space.lg } : undefined}>
          <ListRow icon="shield-half-outline" tint="purple" title="Team console" subtitle={compact ? undefined : 'Reviews, members, roles, live features, recommendations'} onPress={() => nav.navigate('Admin')} last />
        </Group>
      ) : null}
      <Group>
        <ListRow icon="log-out-outline" title="Log Out" subtitle={compact ? undefined : 'Safely log out of your current session'} danger onPress={() => nav.navigate('Logout')} last />
      </Group>
    </View>
  );
}

/** Wrapper for every settings sub-page: adds the settings column on desktop. */
export function SettingsPage({ active, ...props }: React.ComponentProps<typeof Screen> & { active?: string }) {
  const { wide } = useLayout();
  return (
    <Screen back="Settings" maxWidth={780} {...props}
      sidebar={wide ? (
        <View>
          <Txt variant="caption" style={{ marginBottom: 4 }}>Home  ›  Settings</Txt>
          <Txt variant="title">Settings</Txt>
          <Txt variant="caption" style={{ marginBottom: space.lg }}>Manage your account, privacy, & preferences.</Txt>
          <SettingsMenu active={active} compact />
        </View>
      ) : undefined} />
  );
}

export function Settings({ navigation }: any) {
  const { user } = useAuth();
  const { wide } = useLayout();
  const [q, setQ] = useState('');
  return (
    <Screen title="Settings" subtitle="Manage your account, privacy, AI guide, and app preferences." back="Main" maxWidth={820} breadcrumb={wide ? ['Home', 'Settings'] : undefined}
      headerRight={wide ? (
        <View style={styles.search}>
          <Ionicons name="search" size={16} color={colors.faint} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search settings..." placeholderTextColor={colors.faint} style={[styles.searchInput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]} accessibilityLabel="Search settings" />
        </View>
      ) : undefined}>
      {user ? (
        <Pressable onPress={() => navigation.navigate('Account')} style={styles.me} accessibilityRole="button" accessibilityLabel="Account details">
          <View style={{ flex: 1 }}>
            <Text style={styles.meName}>{user.name}</Text>
            <Text style={styles.meSub}>{user.email}{user.phone ? `  ·  ${maskPhone(user.phone)}` : ''}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.faint} />
        </Pressable>
      ) : null}
      <SettingsMenu query={q} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: -8 }}>
        <Pressable onPress={() => navigation.navigate('Deactivate')} accessibilityRole="link"><Text style={styles.foot}>Deactivate account</Text></Pressable>
        <Pressable onPress={() => navigation.navigate('DeleteAccount')} accessibilityRole="link"><Text style={styles.foot}>Delete account permanently</Text></Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 260, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, paddingHorizontal: 12, height: 40 },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 13.5, color: colors.text, height: 38 },
  me: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: space.xl },
  meName: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  meSub: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  foot: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.faint, paddingVertical: 8 },
});
