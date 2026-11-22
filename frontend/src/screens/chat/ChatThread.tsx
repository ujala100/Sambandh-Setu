import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Chats as Api, Message, errorMessage } from '../../api';
import { useLoad } from '../../hooks/useAsync';
import { useLayout } from '../../hooks/useLayout';
import { colors, fonts, radius, shadow, space } from '../../theme';
import { Avatar, Button, Card, ErrorState, IconButton, InfoNote, ListRow, Loading, Screen, StatePill, Tag, Txt, useGoBack, useToast } from '../../ui';
import { ActionMenu, useBlock } from '../../components/People';
import { dayLabel, formatDate, formatTime, timeAgo } from '../../utils/format';

const POLL_MS = 6000;

/** "inperson chat page" / "Chat Interface". Polls for new messages while open. */
export function ChatThread({ route, navigation }: any) {
  const chatId = route.params?.chatId;
  const { wide } = useLayout();
  const toast = useToast();
  const goBack = useGoBack('Main');
  const { data: info, reload: reloadInfo } = useLoad(() => Api.profile(chatId), [chatId]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scroller = useRef<any>(null);
  const block = useBlock(() => navigation.navigate('Main', { screen: 'Chats' }));

  const fetchLatest = useCallback(async () => {
    try {
      const r = await Api.messages(chatId);
      setMessages((old) => {
        const pending = old.filter((m) => m.id.startsWith('tmp'));
        return [...r.items, ...pending];
      });
      setHasMore((h) => h || r.hasMore);
      setError(null);
      Api.read(chatId).catch(() => {});
    } catch (e) { setError(errorMessage(e)); }
  }, [chatId]);

  useFocusEffect(useCallback(() => {
    fetchLatest();
    const t = setInterval(fetchLatest, POLL_MS);
    return () => clearInterval(t);
  }, [fetchLatest]));
  useEffect(() => { setTimeout(() => scroller.current?.scrollToEnd({ animated: false }), 60); }, [messages.length]);

  const loadOlder = async () => {
    if (!messages.length) return;
    const r = await Api.messages(chatId, messages[0].at);
    setMessages((m) => [...r.items, ...m]);
    setHasMore(r.hasMore);
  };

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setText('');
    const tmp: Message = { id: `tmp${Date.now()}`, text: body, at: new Date().toISOString(), mine: true };
    setMessages((m) => [...m, tmp]);
    setSending(true);
    try {
      const saved = await Api.send(chatId, body);
      setMessages((m) => m.map((x) => (x.id === tmp.id ? saved : x)));
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== tmp.id));
      setText(body);
      toast.show(errorMessage(e), 'error');
    } finally { setSending(false); }
  };

  const p = info?.person;
  const paused = info?.connectionStatus === 'paused';
  const menu = p ? (
    <ActionMenu actions={[
      { label: 'View profile', icon: 'person-outline', onPress: () => navigation.navigate('PersonProfile', { userId: p.id }) },
      { label: 'Chat profile', icon: 'information-circle-outline', onPress: () => navigation.navigate('ChatProfile', { chatId }) },
      { label: info?.muted ? 'Unmute notifications' : 'Mute notifications', icon: info?.muted ? 'notifications-outline' : 'notifications-off-outline', onPress: async () => { await Api.mute(chatId, !info?.muted); reloadInfo(); toast.show(info?.muted ? 'Notifications on' : 'Chat muted', 'info'); } },
      { label: 'Report', icon: 'flag-outline', onPress: () => navigation.navigate('ReportFlow', { userId: p.id, name: p.name, contentType: 'message' }) },
      { label: 'Block', icon: 'ban-outline', danger: true, onPress: () => block.ask(p.id, p.name) },
    ]} />
  ) : null;

  // Group by day.
  const groups: { day: string; items: Message[] }[] = [];
  for (const m of messages) {
    const d = dayLabel(m.at);
    if (!groups.length || groups[groups.length - 1].day !== d) groups.push({ day: d, items: [] });
    groups[groups.length - 1].items.push(m);
  }

  const body = (
    <View style={{ flex: 1, backgroundColor: wide ? '#fff' : colors.bg }}>
      <View style={styles.head}>
        {!wide ? <IconButton icon="arrow-back" label="Back" onPress={goBack} /> : null}
        <Pressable onPress={() => navigation.navigate('ChatProfile', { chatId })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }} accessibilityRole="button" accessibilityLabel="Open chat profile">
          <Avatar uri={p?.photoUrl} name={p?.name} size={40} online={p?.online} />
          <View>
            <Text style={styles.name}>{p?.name || ''}</Text>
            <Text style={styles.status}>{p?.online ? 'Online' : info?.lastActive ? `Active ${timeAgo(info.lastActive)}` : info?.stageTitle ? `Setu: ${info.stageTitle}` : ''}</Text>
          </View>
        </Pressable>
        {menu}
      </View>
      {info ? (
        <View style={styles.connected}>
          <Ionicons name="infinite" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}><Text style={styles.connT}>{paused ? 'This connection is paused' : "You're connected"}</Text><Text style={styles.connS}>{paused ? 'Resume the connection to send messages.' : 'Continue your Setu journey together.'}</Text></View>
          <Button title="View Journey" variant="outline" size="sm" arrow full={false} onPress={() => navigation.navigate('Journey', { connectionId: info.connectionId })} />
        </View>
      ) : null}
      <ScrollView ref={scroller} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 8 }}>
        {hasMore ? <Pressable onPress={loadOlder} style={{ alignSelf: 'center', padding: 8 }} accessibilityRole="button"><Text style={styles.link}>Load earlier messages</Text></Pressable> : null}
        {error && !messages.length ? <ErrorState message={error} onRetry={fetchLatest} /> : null}
        {!messages.length && !error ? <Text style={[styles.connS, { textAlign: 'center', marginTop: 24 }]}>Say hello to {p?.name || 'your connection'}. Take your time; there is no rush.</Text> : null}
        {groups.map((g) => (
          <View key={g.day} style={{ gap: 8 }}>
            <View style={styles.day}><Text style={styles.dayText}>{g.day}</Text></View>
            {g.items.map((m) => (
              <View key={m.id} style={[styles.msgRow, m.mine && { justifyContent: 'flex-end' }]}>
                {!m.mine ? <Avatar uri={p?.photoUrl} name={p?.name} size={28} /> : null}
                <View style={[styles.bubble, m.mine ? styles.mine : styles.theirs]}>
                  <Text style={[styles.msg, m.mine && { color: '#fff' }]}>{m.text}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: 4 }}>
                    <Text style={[styles.time, m.mine && { color: '#DCE7FB' }]}>{formatTime(m.at)}</Text>
                    {m.mine ? <Ionicons name={m.id.startsWith('tmp') ? 'time-outline' : m.read ? 'checkmark-done' : 'checkmark'} size={13} color="#DCE7FB" /> : null}
                  </View>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
      <View style={styles.composer}>
        <View style={styles.inputWrap}>
          <TextInput value={text} onChangeText={setText} placeholder={paused ? 'This connection is paused' : 'Type a message...'} placeholderTextColor={colors.faint} editable={!paused}
            style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]} onSubmitEditing={send} accessibilityLabel="Message" maxLength={2000} returnKeyType="send" blurOnSubmit={false} />
        </View>
        <Pressable onPress={send} disabled={!text.trim() || paused} style={[styles.send, (!text.trim() || paused) && { opacity: 0.5 }]} accessibilityRole="button" accessibilityLabel="Send message"><Ionicons name="send" size={18} color="#fff" /></Pressable>
      </View>
      {block.dialog}
    </View>
  );

  if (wide) {
    return (
      <Screen title="Chat" variant="none" scroll={false} maxWidth={900} aside={info ? <ChatSide info={info} navigation={navigation} /> : undefined}>
        <View style={styles.wideCard}>{body}</View>
      </Screen>
    );
  }
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'left', 'right', 'bottom']}>{body}</SafeAreaView>;
}

function ChatSide({ info, navigation }: { info: any; navigation: any }) {
  return (
    <>
      <Card>
        <Text style={styles.h}>Connection overview</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 6 }}><View style={styles.greenDot} /><Text style={[styles.connS, { color: colors.success }]}>{info.connectionStatus === 'active' ? 'Connected' : 'Paused'}</Text></View>
        <ListRow icon="infinite" title="Setu Journey" value={info.stageTitle} onPress={() => navigation.navigate('Journey', { connectionId: info.connectionId })} />
        <ListRow icon="calendar-outline" title="Connected on" value={formatDate(info.connectedOn)} last />
      </Card>
      {info.sharedInterests.length ? (
        <Card>
          <Text style={styles.h}>Shared interests</Text>
          <Text style={[styles.connS, { marginBottom: 8 }]}>Common interests help you find better conversations.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{info.sharedInterests.map((t: string) => <Tag key={t} label={t} />)}</View>
        </Card>
      ) : null}
    </>
  );
}

/** "chat profile page" / "Chat Profile Details". */
export function ChatProfile({ route, navigation }: any) {
  const chatId = route.params?.chatId;
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(() => Api.profile(chatId), [chatId]);
  const block = useBlock(() => navigation.navigate('Main', { screen: 'Chats' }));
  const toggleMute = async () => { if (!data) return; await Api.mute(chatId, !data.muted); toast.show(data.muted ? 'Notifications on' : 'Chat muted', 'info'); reload(); };
  return (
    <Screen title="Chat profile" back="Main" variant="center" maxWidth={720}>
      {loading && !data ? <Loading /> : error && !data ? <ErrorState message={error} onRetry={reload} /> : data ? (
        <View style={{ gap: space.lg }}>
          <Card style={{ alignItems: 'center' }}>
            <Avatar uri={data.person.photoUrl} name={data.person.name} size={96} online={data.person.online} />
            <Txt variant="title" style={{ marginTop: 10 }}>{data.person.name}{data.person.age ? `, ${data.person.age}` : ''}</Txt>
            <Txt variant="caption">{[data.person.profession, data.person.location?.split(',')[0]].filter(Boolean).join(' · ')}</Txt>
            <Pressable onPress={() => navigation.navigate('Journey', { connectionId: data.connectionId })} style={styles.connBox} accessibilityRole="button" accessibilityLabel={`Setu Journey, ${data.stageTitle}`}>
              <Ionicons name="infinite" size={24} color={colors.primary} />
              <View style={{ flex: 1 }}><Text style={styles.connT}>{data.connectionStatus === 'active' ? 'Connected' : 'Paused'}</Text><Text style={styles.connS}>Setu Journey · {data.stageTitle}</Text></View>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: space.md, alignSelf: 'stretch' }}>
              {[['search', 'Search Chat', () => navigation.goBack()], [data.muted ? 'notifications' : 'notifications-off-outline', data.muted ? 'Unmute' : 'Mute Notifications', toggleMute], ['flag-outline', 'Report', () => navigation.navigate('ReportFlow', { userId: data.person.id, name: data.person.name, contentType: 'message' })]].map(([icon, label, fn]: any) => (
                <Pressable key={label} onPress={fn} style={styles.action} accessibilityRole="button" accessibilityLabel={label}><Ionicons name={icon} size={20} color={colors.primary} /><Text style={styles.actionText}>{label}</Text></Pressable>
              ))}
            </View>
          </Card>
          <Card padded={false}>
            <ListRow icon="person-outline" title="View Profile" onPress={() => navigation.navigate('PersonProfile', { userId: data.person.id })} />
            <ListRow icon="infinite" title="Setu Journey" value={data.stageTitle} onPress={() => navigation.navigate('Journey', { connectionId: data.connectionId })} />
            <ListRow icon="heart-outline" title="Shared Interests" value={data.sharedInterests.slice(0, 3).join(', ') || 'None yet'} />
            <ListRow icon="settings-outline" title="Chat Settings" onPress={() => navigation.navigate('ChatSettings')} />
            <ListRow icon="ban-outline" title="Block" danger onPress={() => block.ask(data.person.id, data.person.name)} last />
          </Card>
          <InfoNote icon="lock-closed" text="Chats are private between the two of you. Setu Guide only reads them if you turn on 'Use chat context' in Settings." />
        </View>
      ) : null}
      {block.dialog}
    </Screen>
  );
}

const styles = StyleSheet.create({
  wideCard: { flex: 1, minHeight: 640, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', backgroundColor: '#fff' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: '#fff' },
  name: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  status: { fontFamily: fonts.regular, fontSize: 12, color: colors.success },
  connected: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 12, padding: 12, backgroundColor: '#fff', borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  connT: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  connS: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted },
  link: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  day: { alignSelf: 'center', backgroundColor: '#EEF2F7', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 3, marginVertical: 6 },
  dayText: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.muted },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bubble: { maxWidth: '76%' as any, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 9 },
  mine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  theirs: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  msg: { fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 21, color: colors.text },
  time: { fontFamily: fonts.regular, fontSize: 10.5, color: colors.faint },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: '#fff' },
  inputWrap: { flex: 1, backgroundColor: colors.bgTint, borderRadius: 24, paddingHorizontal: 16, minHeight: 44, justifyContent: 'center' },
  input: { fontFamily: fonts.regular, fontSize: 14.5, color: colors.text, paddingVertical: 10 },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  h: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  greenDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  connBox: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch', marginTop: space.lg, padding: 14, borderRadius: radius.card, borderWidth: 1, borderColor: colors.primaryLine, backgroundColor: colors.primarySoft },
  action: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border },
  actionText: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.text, textAlign: 'center' },
});
