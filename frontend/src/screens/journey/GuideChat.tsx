import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Connections, Guide, GuideReply, errorMessage } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useLayout } from '../../hooks/useLayout';
import { colors, fonts, radius, shadow, space } from '../../theme';
import { Card, InfoNote, ListRow, Screen, useToast } from '../../ui';
import { formatTime } from '../../utils/format';

type Msg = { id: string; role: 'user' | 'guide'; text: string; at: string; reply?: GuideReply; welcome?: boolean };
const CHIPS = [
  { label: 'Conversation ideas', intent: 'conversation_ideas', icon: 'chatbubble-ellipses-outline' },
  { label: 'Help me understand', intent: 'help_me_understand', icon: 'book-outline' },
  { label: 'Tips for next steps', intent: 'next_steps', icon: 'sparkles-outline' },
  { label: 'Privacy & safety', intent: 'privacy_safety', icon: 'shield-checkmark-outline' },
] as const;

export default function GuideChat({ route, navigation }: any) {
  const { settings } = useAuth();
  const { wide } = useLayout();
  const toast = useToast();
  const [connectionId, setConnectionId] = useState<string | null>(route.params?.connectionId || null);
  const [partner, setPartner] = useState<string>('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(route.params?.conversationId || null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const scroller = useRef<any>(null);
  const started = useRef(false);

  useEffect(() => {
    (async () => {
      let name = '';
      try {
        if (connectionId) name = (await Connections.get(connectionId)).person.name;
        else {
          const list = await Connections.list();
          if (list.active[0]) { setConnectionId(list.active[0].id); name = list.active[0].person.name; }
        }
      } catch { /* general guidance */ }
      setPartner(name);
      setMessages([{ id: 'welcome', role: 'guide', welcome: true, at: new Date().toISOString(), text: `Hi! I'm Setu Guide. I'm here to support you with guidance, conversation ideas and helpful insights${name ? ` as you get to know ${name} better` : ''}.` }]);
      if (route.params?.intent && !started.current) { started.current = true; send(undefined, route.params.intent); }
    })();
  }, []);

  useEffect(() => { setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 50); }, [messages.length]);

  const send = async (message?: string, intent?: string) => {
    const body = (message ?? text).trim();
    if (!body && !intent) return;
    const label = body || CHIPS.find((c) => c.intent === intent)?.label || '';
    setText('');
    setMessages((m) => [...m, { id: `u${Date.now()}`, role: 'user', text: label, at: new Date().toISOString() }]);
    setBusy(true);
    try {
      const r = await Guide.chat({ message: body || undefined, intent: body ? undefined : intent, connectionId, conversationId });
      if (r.conversationId) setConversationId(r.conversationId);
      setMessages((m) => [...m, { id: `g${Date.now()}`, role: 'guide', text: r.reply, at: new Date().toISOString(), reply: r }]);
    } catch (e) {
      setMessages((m) => [...m, { id: `e${Date.now()}`, role: 'guide', text: errorMessage(e, 'Setu Guide could not answer right now. Please try again.'), at: new Date().toISOString() }]);
    } finally { setBusy(false); }
  };

  const copy = async (q: string) => { await Clipboard.setStringAsync(q); toast.show('Question copied', 'info'); };

  const disabled = settings && !settings.guide.enabled;
  const aside = (
    <>
      <Card padded={false}>
        <View style={{ padding: 16, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name="location-outline" size={16} color={colors.primary} /><Text style={styles.h}>Helpful shortcuts</Text></View>
        <ListRow icon="chatbubbles-outline" title="Explore conversation starters" subtitle="Get topic ideas tailored to your stage of the journey." onPress={() => send(undefined, 'conversation_ideas')} />
        <ListRow icon="document-text-outline" title="Reflect on your journey" subtitle="Understand your preferences and track your progress." onPress={() => (connectionId ? navigation.navigate('Journey', { connectionId }) : navigation.navigate('Main', { screen: 'Guide' }))} />
        <ListRow icon="shield-checkmark-outline" title="Manage privacy & safety" subtitle="Learn about safety tips and control your experience." onPress={() => navigation.navigate('GuideSettings')} last />
      </Card>
      <InfoNote icon="lock-closed" text="You choose what to discuss and when. Setu Guide offers suggestions; you stay in control." />
    </>
  );

  const composer = (
    <View style={styles.composer}>
      <Pressable onPress={() => send(undefined, 'conversation_ideas')} style={styles.plus} accessibilityRole="button" accessibilityLabel="Suggest conversation ideas"><Ionicons name="add" size={22} color="#fff" /></Pressable>
      <View style={styles.inputWrap}>
        <TextInput value={text} onChangeText={setText} placeholder="Type a message..." placeholderTextColor={colors.faint} style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]} onSubmitEditing={() => send()} editable={!busy && !disabled} accessibilityLabel="Message Setu Guide" maxLength={500} returnKeyType="send" />
        <Pressable onPress={() => send()} disabled={!text.trim() || busy} accessibilityRole="button" accessibilityLabel="Send" hitSlop={8}><Ionicons name="send" size={20} color={text.trim() ? colors.primary : colors.faint} /></Pressable>
      </View>
    </View>
  );

  return (
    <Screen title="Chat with Setu Guide" subtitle={partner ? `Guidance for your journey with ${partner}` : 'Get personalised guidance, conversation ideas and helpful insights.'} variant="center" back="Main" scroll={false} padded={false} aside={wide ? aside : undefined} maxWidth={860}
      headerRight={<Pressable onPress={() => navigation.navigate('GuideHistory')} accessibilityRole="button" accessibilityLabel="Conversation history" style={{ padding: 10 }}><Ionicons name="time-outline" size={22} color={colors.text} /></Pressable>}>
      <View style={[{ flex: 1 }, wide && styles.wideCard]}>
        {wide ? <View style={styles.wideHead}><Text style={styles.title}>Chat with Setu Guide</Text><View style={styles.onlinePill}><View style={styles.dot} /><Text style={styles.onlineText}>Online</Text></View></View> : null}
        {disabled ? <InfoNote tone="amber" icon="power" title="Setu Guide is turned off" text="Turn it on in Settings > Setu Guide to chat." style={{ margin: 16 }} /> : null}
        <ScrollView ref={scroller} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 14 }}>
          {messages.map((m) => m.role === 'user' ? (
            <View key={m.id} style={styles.userBubble}><Text style={styles.userText}>{m.text}</Text><Text style={styles.userTime}>{formatTime(m.at)}</Text></View>
          ) : (
            <View key={m.id} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <View style={styles.bot}><Ionicons name="happy-outline" size={16} color={colors.primary} /></View>
              <View style={{ flex: 1, gap: 10 }}>
                <View style={styles.guideBubble}><Text style={styles.guideText}>{m.text}</Text><Text style={styles.time}>{formatTime(m.at)}</Text></View>
                {m.welcome ? (
                  <View style={styles.helpCard}>
                    <Text style={styles.h}>How can I help you today?</Text>
                    <View style={styles.chips}>{CHIPS.map((c) => (
                      <Pressable key={c.intent} onPress={() => send(undefined, c.intent)} style={({ hovered }: any) => [styles.chip, hovered && { borderColor: colors.primaryLine }]} accessibilityRole="button" disabled={busy || !!disabled}>
                        <Ionicons name={c.icon} size={15} color={colors.primary} /><Text style={styles.chipText}>{c.label}</Text>
                      </Pressable>
                    ))}</View>
                  </View>
                ) : null}
                {m.reply?.questions?.length ? (
                  <View style={styles.helpCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}><Ionicons name="book-outline" size={16} color={colors.primary} /><Text style={styles.h}>{m.reply.title || 'Questions you can explore'}</Text></View>
                    {(expanded[m.id] ? m.reply.questions : m.reply.questions.slice(0, 5)).map((q) => (
                      <View key={q} style={styles.qRow}>
                        <Text style={styles.bullet}>•</Text><Text style={[styles.guideText, { flex: 1 }]}>{q}</Text>
                        <Pressable onPress={() => copy(q)} accessibilityRole="button" accessibilityLabel="Copy question" hitSlop={8}><Ionicons name="copy-outline" size={16} color={colors.faint} /></Pressable>
                      </View>
                    ))}
                    <Pressable onPress={() => send(undefined, 'conversation_ideas')} style={{ alignSelf: 'center', marginTop: 6 }} accessibilityRole="button"><Text style={styles.link}>Show more questions →</Text></Pressable>
                  </View>
                ) : null}
              </View>
            </View>
          ))}
          {busy ? <View style={{ flexDirection: 'row', gap: 8 }}><View style={styles.bot}><Ionicons name="happy-outline" size={16} color={colors.primary} /></View><View style={styles.guideBubble}><Text style={styles.time}>Setu Guide is thinking…</Text></View></View> : null}
        </ScrollView>
        {composer}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wideCard: { backgroundColor: '#fff', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', minHeight: 640 },
  wideHead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontFamily: fonts.bold, fontSize: 19, color: colors.text },
  onlinePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.successSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.mint },
  onlineText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.success },
  h: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  bot: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  guideBubble: { alignSelf: 'flex-start', maxWidth: '92%' as any, backgroundColor: '#fff', borderRadius: 14, borderTopLeftRadius: 4, borderWidth: 1, borderColor: colors.border, padding: 12, ...shadow.card },
  guideText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.text },
  time: { fontFamily: fonts.regular, fontSize: 11, color: colors.faint, marginTop: 4, alignSelf: 'flex-end' },
  userBubble: { alignSelf: 'flex-end', maxWidth: '82%' as any, backgroundColor: colors.primary, borderRadius: 14, borderTopRightRadius: 4, padding: 12 },
  userText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: '#fff' },
  userTime: { fontFamily: fonts.regular, fontSize: 11, color: '#DCE7FB', marginTop: 4, alignSelf: 'flex-end' },
  helpCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 10, minHeight: 38, backgroundColor: colors.bgTint, flexGrow: 1, flexBasis: '45%' as any },
  chipText: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.text },
  qRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 6 },
  bullet: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary, lineHeight: 21 },
  link: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: '#fff' },
  plus: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bgTint, borderRadius: 24, paddingHorizontal: 14, minHeight: 44 },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 14.5, color: colors.text, paddingVertical: 10 },
});
