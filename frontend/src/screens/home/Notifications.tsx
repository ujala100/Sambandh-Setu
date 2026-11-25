import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NotificationItem, Notifications as Api } from '../../api';
import { useLoad } from '../../hooks/useAsync';
import { useLiveRefresh } from '../../context/LiveContext';
import { colors, fonts, radius, space } from '../../theme';
import { EmptyState, ErrorState, Screen, SkeletonList, TextLink } from '../../ui';
import { timeAgo } from '../../utils/format';

const ICON: Record<string, [any, keyof typeof colors.tint]> = {
  request_received: ['heart-outline', 'pink'], request_accepted: ['people-outline', 'green'], message: ['chatbubble-ellipses-outline', 'blue'],
  stage_completed: ['infinite', 'purple'], stage_advanced: ['flag-outline', 'purple'], reflection_shared: ['eye-outline', 'purple'],
  connection_paused: ['pause-circle-outline', 'amber'], connection_resumed: ['play-circle-outline', 'green'],
  family_accepted: ['people-circle-outline', 'teal'], family_declined: ['people-circle-outline', 'slate'], verification_update: ['shield-checkmark-outline', 'green'],
};

export default function Notifications({ navigation }: any) {
  const { data, error, loading, reload, refreshing, refresh, setData } = useLoad(() => Api.list());
  useLiveRefresh((s) => s.notifications.latest, reload);

  const open = async (n: NotificationItem) => {
    if (!n.read) { Api.read(n.id).catch(() => {}); setData((d) => d && { ...d, items: d.items.map((i) => (i.id === n.id ? { ...i, read: true } : i)) }); }
    if (n.target === 'requests') navigation.navigate('Main', { screen: 'Connections', params: { tab: 'requests' } });
    else if (n.target === 'chat' && n.refId) navigation.navigate('ChatThread', { chatId: n.refId });
    else if ((n.target === 'journey' || n.target === 'connection') && n.refId) navigation.navigate('Journey', { connectionId: n.refId });
    else if (n.target === 'family') navigation.navigate('FamilyAccess');
    else if (n.target === 'verification') navigation.navigate('Verification');
  };

  const readAll = async () => {
    await Api.readAll().catch(() => {});
    setData((d) => d && { ...d, unread: 0, items: d.items.map((i) => ({ ...i, read: true })) });
  };

  return (
    <Screen title="Notifications" subtitle="Updates about your requests, connections and journey." back="Main" refreshing={refreshing} onRefresh={refresh} maxWidth={760}
      headerRight={data?.unread ? <TextLink title="Mark all read" size={13} onPress={readAll} /> : undefined}>
      {loading && !data ? <SkeletonList rows={5} /> : error && !data ? <ErrorState message={error} onRetry={reload} /> : !data?.items.length ? (
        <EmptyState icon="notifications-outline" tint="blue" title="No notifications yet" text="When someone shows interest, accepts your request or moves your journey forward, you'll see it here." />
      ) : (
        <View style={styles.list}>
          {data.items.map((n, i) => {
            const [icon, tint] = ICON[n.type] || ['notifications-outline', 'blue'];
            return (
              <Pressable key={n.id} onPress={() => open(n)} accessibilityRole="button" accessibilityLabel={`${n.read ? '' : 'Unread. '}${n.title}. ${n.body}`}
                style={({ hovered }: any) => [styles.row, i > 0 && styles.border, !n.read && { backgroundColor: '#F5F9FF' }, hovered && { backgroundColor: colors.bg }]}>
                <View style={[styles.icon, { backgroundColor: colors.tint[tint].bg }]}><Ionicons name={icon} size={19} color={colors.tint[tint].fg} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, !n.read && { fontFamily: fonts.bold }]}>{n.title}</Text>
                  <Text style={styles.body}>{n.body}</Text>
                  <Text style={styles.time}>{timeAgo(n.createdAt)}</Text>
                </View>
                {!n.read ? <View style={styles.dot} /> : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: '#fff', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: space.lg },
  border: { borderTopWidth: 1, borderTopColor: colors.border },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  time: { fontFamily: fonts.regular, fontSize: 12, color: colors.faint, marginTop: 4 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary, marginTop: 6 },
});
