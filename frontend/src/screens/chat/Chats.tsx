import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatItem, Chats as Api } from '../../api';
import { useLoad } from '../../hooks/useAsync';
import { useLayout } from '../../hooks/useLayout';
import { useLiveRefresh } from '../../context/LiveContext';
import { colors, fonts, radius, space } from '../../theme';
import { Avatar, EmptyState, ErrorState, FilterPills, IconButton, Screen, SkeletonList } from '../../ui';
import { chatStamp } from '../../utils/format';

type Filter = 'all' | 'active' | 'new' | 'muted';

/** "Chat" tab: conversations with connected members. */
export default function Chats({ navigation }: any) {
  const { wide } = useLayout();
  const { data, error, loading, reload, refreshing, refresh } = useLoad(() => Api.list());
  useLiveRefresh((s) => [s.messages.latest, s.messages.unread], reload);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const items = useMemo(() => (data?.items || []).filter((c) => {
    if (q && !c.person.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === 'active') return c.connectionStatus === 'active' && !!c.lastMessage;
    if (filter === 'new') return !c.lastMessage || c.unread > 0;
    if (filter === 'muted') return c.muted;
    return true;
  }), [data, filter, q]);

  return (
    <Screen variant="none" tab refreshing={refreshing} onRefresh={refresh} maxWidth={760}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: space.md }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} accessibilityRole="header">Chat</Text>
          <Text style={styles.sub}>Meaningful conversations for a brighter tomorrow.</Text>
        </View>
        <IconButton icon="search" label="Search chats" onPress={() => setSearching((s) => !s)} />
        {!wide ? <IconButton icon="notifications-outline" label="Notifications" onPress={() => navigation.navigate('Notifications')} /> : null}
      </View>
      {searching ? (
        <View style={styles.search}>
          <Ionicons name="search" size={16} color={colors.faint} />
          <TextInput value={q} onChangeText={setQ} autoFocus placeholder="Search by name" placeholderTextColor={colors.faint} style={[styles.searchInput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]} accessibilityLabel="Search chats" />
        </View>
      ) : null}
      <FilterPills value={filter} onChange={setFilter} options={[{ key: 'all', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'new', label: 'New' }, { key: 'muted', label: 'Muted' }]} />
      <View style={{ marginTop: space.lg }}>
        {loading && !data ? <SkeletonList rows={5} /> : error && !data ? <ErrorState message={error} onRetry={reload} /> : !items.length ? (
          <EmptyState icon="chatbubble-ellipses-outline" tint="green" title={data?.items.length ? 'No chats here' : 'No conversations yet'} text={data?.items.length ? 'Try a different filter.' : 'When both of you express mutual interest, your private conversation unlocks here.'} action={data?.items.length ? undefined : 'Explore Discover'} onAction={() => navigation.navigate('Connections', { tab: 'discover' })} />
        ) : (
          <View style={styles.list}>
            {items.map((c, i) => <ChatRow key={c.id} c={c} first={i === 0} onPress={() => navigation.navigate('ChatThread', { chatId: c.id })} />)}
          </View>
        )}
      </View>
    </Screen>
  );
}

function ChatRow({ c, first, onPress }: { c: ChatItem; first: boolean; onPress: () => void }) {
  const preview = c.lastMessage ? `${c.lastMessage.mine ? 'You: ' : ''}${c.lastMessage.text}` : `You're connected. Say hello to ${c.person.name}.`;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${c.person.name}. ${c.unread ? `${c.unread} unread. ` : ''}${preview}`}
      style={({ hovered }: any) => [styles.row, !first && styles.border, hovered && { backgroundColor: colors.bg }]}>
      <Avatar uri={c.person.photoUrl} name={c.person.name} size={52} online={c.person.online} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[styles.name, c.unread > 0 && { fontFamily: fonts.bold }]} numberOfLines={1}>{c.person.name}</Text>
          {c.muted ? <Ionicons name="notifications-off-outline" size={14} color={colors.faint} accessibilityLabel="Muted" /> : null}
          {c.connectionStatus === 'paused' ? <Text style={styles.paused}>Paused</Text> : null}
        </View>
        <Text style={[styles.preview, c.unread > 0 && { color: colors.text }]} numberOfLines={1}>{preview}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text style={styles.time}>{chatStamp(c.lastMessage?.at || c.createdAt)}</Text>
        {c.unread > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{c.unread}</Text></View> : c.lastMessage?.mine && c.lastMessage.read ? <Ionicons name="checkmark-done" size={16} color={colors.primary} accessibilityLabel="Read" /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.bold, fontSize: 28, color: colors.text },
  sub: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, paddingHorizontal: 12, height: 44, marginBottom: space.md },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.text, height: 42 },
  list: { backgroundColor: '#fff', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 76 },
  border: { borderTopWidth: 1, borderTopColor: colors.border },
  name: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.text, flexShrink: 1 },
  preview: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.muted, marginTop: 3 },
  time: { fontFamily: fonts.regular, fontSize: 12, color: colors.faint },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { fontFamily: fonts.bold, fontSize: 11, color: '#fff' },
  paused: { fontFamily: fonts.medium, fontSize: 11, color: '#A8752A', backgroundColor: colors.warningSoft, paddingHorizontal: 6, borderRadius: 6 },
});
