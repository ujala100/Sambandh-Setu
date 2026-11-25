import React, { useEffect, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, shadow } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useLive } from '../context/LiveContext';
import { Avatar, Logo } from '../ui';
import { go, goTab, useCurrentRoute } from '../navigation/navRef';
import { greeting } from '../utils/format';

const NAV = [
  { key: 'Home', label: 'Home', icon: 'home-outline', active: 'home' },
  { key: 'Connections', label: 'Connections', icon: 'people-outline', active: 'people' },
  { key: 'Guide', label: 'Setu Guide', icon: 'infinite', active: 'infinite' },
  { key: 'Chats', label: 'Chat', icon: 'chatbubble-ellipses-outline', active: 'chatbubble-ellipses' },
  { key: 'Profile', label: 'Profile', icon: 'person-outline', active: 'person' },
] as const;

/** Which left-nav item is highlighted for each screen. */
const SECTION: Record<string, string> = {
  Admin: 'Admin',
  Home: 'Home', Notifications: 'Home',
  Connections: 'Connections', PersonProfile: 'Connections', Journey: 'Connections', Stage: 'Connections', Reflect: 'Connections',
  Guide: 'Guide', GuideChat: 'Guide',
  Chats: 'Chats', ChatThread: 'Chats', ChatProfile: 'Chats',
};

const webOnly: any = Platform.OS === 'web' ? { outlineStyle: 'none' } : null;

export function WebShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar onMenu={() => setCollapsed((c) => !c)} />
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <SideNav collapsed={collapsed} />
        <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
      </View>
    </View>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const { user } = useAuth();
  const { snapshot } = useLive();
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState(false);
  const unread = snapshot?.notifications.unread || 0;
  const staff = !!user && user.role !== 'member';

  const search = () => goTab('Connections', { tab: 'discover', q: q.trim() || undefined });

  return (
    <View style={styles.top}>
      <Pressable onPress={onMenu} accessibilityRole="button" accessibilityLabel="Toggle navigation" style={styles.iconBtn}><Ionicons name="menu" size={24} color={colors.text} /></Pressable>
      <Pressable onPress={() => goTab('Home')} accessibilityRole="link" accessibilityLabel="Sambandh Setu home" style={{ marginLeft: 8, marginRight: 32 }}><Logo /></Pressable>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.faint} />
        <TextInput value={q} onChangeText={setQ} onSubmitEditing={search} placeholder="Search by name, interests or location..." placeholderTextColor={colors.faint} style={[styles.searchInput, webOnly]} accessibilityLabel="Search people" returnKeyType="search" />
      </View>
      <View style={{ flex: 1 }} />
      <Pressable onPress={() => go('Notifications')} accessibilityRole="button" accessibilityLabel={unread ? `Notifications, ${unread} unread` : 'Notifications'} style={styles.iconBtn}>
        <Ionicons name="notifications-outline" size={23} color={colors.primary} />
        {unread ? <View style={styles.dot} /> : null}
      </Pressable>
      <View>
        <Pressable onPress={() => setMenu((m) => !m)} accessibilityRole="button" accessibilityLabel="Account menu" style={styles.me}>
          <Avatar uri={user?.photoUrl} name={user?.name} size={38} />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.greet}>{greeting()},</Text>
            <Text style={styles.meName}>{user?.firstName}</Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={colors.primary} style={{ marginLeft: 12 }} />
        </Pressable>
        {menu ? (
          <View style={styles.menu}>
            {[
              { label: 'My Profile', icon: 'person-outline', on: () => goTab('Profile') },
              { label: 'Settings', icon: 'settings-outline', on: () => go('Settings') },
              { label: 'Help & Support', icon: 'help-circle-outline', on: () => go('Help') },
              ...(staff ? [{ label: 'Team console', icon: 'shield-half-outline', on: () => go('Admin') }] : []),
              { label: 'Log out', icon: 'log-out-outline', on: () => go('Logout') },
            ].map((m) => (
              <Pressable key={m.label} onPress={() => { setMenu(false); m.on(); }} style={({ hovered }: any) => [styles.menuItem, hovered && { backgroundColor: colors.bg }]} accessibilityRole="menuitem">
                <Ionicons name={m.icon as any} size={18} color={m.label === 'Log out' ? colors.dangerStrong : colors.textSoft} />
                <Text style={[styles.menuText, m.label === 'Log out' && { color: colors.dangerStrong }]}>{m.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
      <Pressable onPress={() => go('Settings')} accessibilityRole="button" accessibilityLabel="Settings" style={[styles.iconBtn, { marginLeft: 12 }]}><Ionicons name="settings-outline" size={23} color={colors.text} /></Pressable>
    </View>
  );
}

function SideNav({ collapsed }: { collapsed: boolean }) {
  const route = useCurrentRoute();
  const { user } = useAuth();
  const { snapshot } = useLive();
  const staff = !!user && user.role !== 'member';
  const badge: Record<string, number> = { Chats: snapshot?.messages.unread || 0, Connections: snapshot?.requests.pending || 0 };
  const section = SECTION[route] || (route && route !== 'Main' ? 'Profile' : 'Home');
  return (
    <View style={[styles.side, collapsed && { width: 76 }]} accessibilityRole="navigation">
      <View style={{ gap: 6 }}>
        {NAV.map((n) => {
          const on = section === n.key;
          return (
            <Pressable key={n.key} onPress={() => goTab(n.key as any)} accessibilityRole="link" accessibilityLabel={n.label} accessibilityState={{ selected: on }}
              style={({ hovered }: any) => [styles.navItem, on && styles.navOn, hovered && !on && { backgroundColor: colors.primarySoft }, collapsed && { justifyContent: 'center', paddingHorizontal: 0 }]}>
              <Ionicons name={(on ? n.active : n.icon) as any} size={n.key === 'Guide' ? 24 : 21} color={on ? '#fff' : n.key === 'Guide' ? colors.primary : colors.text} />
              {!collapsed ? <Text style={[styles.navText, on && { color: '#fff' }]}>{n.label}</Text> : null}
              {badge[n.key] ? <View style={[styles.count, on && { backgroundColor: '#fff' }]}><Text style={[styles.countText, on && { color: colors.primary }]}>{badge[n.key] > 99 ? '99+' : badge[n.key]}</Text></View> : null}
            </Pressable>
          );
        })}
        {staff ? (
          <Pressable onPress={() => go('Admin')} accessibilityRole="link" accessibilityLabel="Team console" accessibilityState={{ selected: route === 'Admin' }}
            style={({ hovered }: any) => [styles.navItem, { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, borderRadius: 0 }, route === 'Admin' && styles.navOn, hovered && route !== 'Admin' && { backgroundColor: colors.primarySoft }, collapsed && { justifyContent: 'center', paddingHorizontal: 0 }]}>
            <Ionicons name="shield-half-outline" size={21} color={route === 'Admin' ? '#fff' : colors.text} />
            {!collapsed ? <Text style={[styles.navText, route === 'Admin' && { color: '#fff' }]}>Team console</Text> : null}
          </Pressable>
        ) : null}
      </View>
      <View style={{ flex: 1 }} />
      {!collapsed ? (
        <View style={{ alignItems: 'center' }}>
          <Pressable onPress={() => go('GuideChat')} accessibilityRole="button" accessibilityLabel="Ask Setu Guide" style={({ hovered }: any) => [styles.ask, hovered && { borderColor: colors.primaryLine }]}>
            <Text style={styles.askText}>Ask Setu Guide</Text>
            <View style={styles.askIcon}><Ionicons name="happy-outline" size={20} color="#fff" /></View>
          </Pressable>
          <Text style={styles.motto}>Meaningful connections begin with shared values.</Text>
          <Image source={require('../../assets/illustrations/leaf.png')} style={{ width: 150, height: 130, opacity: 0.9 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { height: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border, zIndex: 20 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  search: { width: 520, maxWidth: '38%' as any, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F1F4F9', borderRadius: radius.input, paddingHorizontal: 14, height: 42 },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.text, height: 40 },
  dot: { position: 'absolute', top: 9, right: 11, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.dangerStrong, borderWidth: 1.5, borderColor: '#fff' },
  me: { flexDirection: 'row', alignItems: 'center', marginLeft: 12, paddingHorizontal: 6, minHeight: 44 },
  greet: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.muted },
  meName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  menu: { position: 'absolute', top: 54, right: 0, width: 220, backgroundColor: '#fff', borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, paddingVertical: 6, ...shadow.modal },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, minHeight: 44 },
  menuText: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  side: { width: 236, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: colors.border, paddingHorizontal: 16, paddingVertical: 20 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 48, paddingHorizontal: 16, borderRadius: radius.input },
  navOn: { backgroundColor: colors.primary },
  navText: { fontFamily: fonts.medium, fontSize: 15, color: colors.text, flex: 1 },
  count: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  countText: { fontFamily: fonts.bold, fontSize: 11, color: '#fff' },
  ask: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 40, paddingLeft: 18, paddingRight: 6, height: 54, borderWidth: 1, borderColor: colors.border, ...shadow.elevated },
  askText: { fontFamily: fonts.bold, fontSize: 14, color: colors.navy, marginRight: 10 },
  askIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  motto: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.textSoft, textAlign: 'center', marginTop: 18, paddingHorizontal: 8 },
});
