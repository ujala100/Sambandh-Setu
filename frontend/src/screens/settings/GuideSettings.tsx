import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Guide, errorMessage } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useLoad } from '../../hooks/useAsync';
import { colors, fonts, radius, space } from '../../theme';
import { Button, Card, ConfirmDialog, EmptyState, ErrorState, Group, InfoNote, ListRow, Loading, ToggleRow, useToast } from '../../ui';
import { SettingsPage } from './SettingsHome';
import { formatDate, formatTime, timeAgo } from '../../utils/format';

function useSetting() {
  const { updateSettings } = useAuth();
  const toast = useToast();
  return (patch: any) => updateSettings(patch).catch((e) => toast.show(errorMessage(e), 'error'));
}

export function GuideSettings({ navigation }: any) {
  const { settings } = useAuth();
  const set = useSetting();
  if (!settings) return null;
  const g = settings.guide;
  return (
    <SettingsPage active="guide" title="Setu Guide" subtitle="Manage your AI companion and get personalised guidance.">
      <Image source={require('../../../assets/illustrations/guide-robot.png')} style={{ width: 110, height: 100, alignSelf: 'flex-end', marginTop: -70, marginBottom: 8 }} resizeMode="contain" />
      <Card padded={false} style={{ paddingHorizontal: 16 }}>
        <ToggleRow icon="sparkles-outline" tint="purple" title="Setu Guide" description="Your personal guidance companion" value={g.enabled} onChange={(v) => set({ guide: { enabled: v } })} last />
      </Card>
      <Group style={{ marginTop: space.lg }}>
        <ListRow icon="lock-open-outline" tint="blue" title="What Setu Guide can access" subtitle="Profile information, preferences, journey data" onPress={() => navigation.navigate('GuideAccess')} />
        <View style={{ paddingHorizontal: 16 }}>
          <ToggleRow icon="chatbox-ellipses-outline" tint="green" title="Use chat context" description="Allow Setu Guide to understand your chats for better suggestions" value={g.useChatContext} onChange={(v) => set({ guide: { useChatContext: v } })} />
          <ToggleRow icon="flash-outline" tint="purple" title="Use private reflections" description="Allow Setu Guide to use your private reflections for guidance" value={g.usePrivateReflections} onChange={(v) => set({ guide: { usePrivateReflections: v } })} />
          <ToggleRow icon="save-outline" tint="teal" title="Save conversation history" description="Keep your Setu Guide chats so you can read them again" value={g.saveHistory} onChange={(v) => set({ guide: { saveHistory: v } })} last />
        </View>
        <ListRow icon="list-outline" tint="blue" title="AI conversation history" subtitle="View or delete your Setu Guide chats" onPress={() => navigation.navigate('GuideHistory')} />
        <ListRow icon="warning-outline" tint="purple" title="Sensitive topics" subtitle="Manage AI guidance for sensitive topics" value={g.sensitiveTopics ? 'On' : 'Off'} onPress={() => navigation.navigate('SensitiveTopics')} />
        <ListRow icon="chatbubbles-outline" tint="amber" title="Guide tone" subtitle="How Setu Guide speaks with you" value={g.tone[0].toUpperCase() + g.tone.slice(1)} onPress={() => navigation.navigate('SettingOption', { key: 'guideTone' })} last />
      </Group>
      <InfoNote icon="shield-checkmark" title="Your privacy matters" text="Setu Guide only uses the information you allow. You can change these settings anytime." />
    </SettingsPage>
  );
}

const ACCESS = [
  ['accessProfile', 'Profile information', 'Basic profile details, interests, lifestyle preferences', 'person-outline', 'blue'],
  ['accessPreferences', 'Partner preferences', 'Your match preferences', 'heart-outline', 'amber'],
  ['accessJourney', 'Journey data', 'Onboarding progress, saved preferences, engagement patterns', 'home-outline', 'green'],
] as const;

export function GuideAccess() {
  const { settings } = useAuth();
  const set = useSetting();
  if (!settings) return null;
  const g = settings.guide;
  return (
    <SettingsPage active="guide" title="What Setu Guide can access" subtitle="By default, all optional access is turned off. You can choose what information to allow.">
      <Card padded={false} style={{ paddingHorizontal: 16 }}>
        {ACCESS.map(([k, t, d, icon, tint], i) => <ToggleRow key={k} icon={icon as any} tint={tint as any} title={t} description={d} value={!!(g as any)[k]} onChange={(v) => set({ guide: { [k]: v } })} last={i === ACCESS.length - 1} />)}
      </Card>
      <Text style={styles.over}>NOT INCLUDED BY DEFAULT</Text>
      <Card padded={false} style={{ paddingHorizontal: 16 }}>
        <ToggleRow icon="chatbox-outline" tint="green" title="Chat context" description="Use chats to give better suggestions" value={g.useChatContext} onChange={(v) => set({ guide: { useChatContext: v } })} />
        <ToggleRow icon="shield-half-outline" tint="purple" title="Private reflections" description="Use your private reflections for guidance" value={g.usePrivateReflections} onChange={(v) => set({ guide: { usePrivateReflections: v } })} last />
      </Card>
      <InfoNote text="You can turn each access option on anytime. Setu Guide only uses the information you allow." style={{ marginTop: space.lg }} />
    </SettingsPage>
  );
}

export function GuideHistory({ navigation }: any) {
  const { data, error, loading, reload, setData } = useLoad(() => Guide.conversations());
  const toast = useToast();
  const [del, setDel] = useState<string | null>(null);
  const [clear, setClear] = useState(false);
  const remove = async () => { if (!del) return; await Guide.deleteConversation(del); setData((d) => d && { items: d.items.filter((x) => x.id !== del) }); setDel(null); toast.show('Conversation deleted', 'info'); };
  const clearAll = async () => { await Guide.clearAll(); setData({ items: [] }); setClear(false); toast.show('History cleared', 'info'); };
  return (
    <SettingsPage active="guide" title="AI Conversation History" subtitle="View or delete your Setu Guide chats." headerRight={data?.items.length ? <Button title="Clear all" variant="dangerOutline" size="sm" full={false} onPress={() => setClear(true)} /> : undefined}>
      {loading && !data ? <Loading /> : error && !data ? <ErrorState message={error} onRetry={reload} /> : !data?.items.length ? (
        <Card><EmptyState icon="chatbubbles-outline" tint="purple" title="No conversations yet" text="Your Setu Guide chats will appear here while 'Save conversation history' is on." action="Chat with Setu Guide" onAction={() => navigation.navigate('GuideChat')} /></Card>
      ) : (
        <Card padded={false}>
          {data.items.map((c, i) => (
            <ListRow key={c.id} icon="chatbubble-ellipses-outline" tint="purple" title={c.title} subtitle={`${timeAgo(c.updatedAt)} · ${c.messageCount} messages`} onPress={() => navigation.navigate('GuideConversation', { id: c.id })} last={i === data.items.length - 1}
              right={<Button title="Delete" variant="text" size="sm" full={false} onPress={() => setDel(c.id)} />} />
          ))}
        </Card>
      )}
      {!clear && data?.items.length && false ? null : null}
      <ConfirmDialog visible={!!del} destructive icon="trash-outline" title="Delete conversation?" message="This conversation will be permanently deleted." confirmLabel="Delete" onCancel={() => setDel(null)} onConfirm={remove} />
      <ConfirmDialog visible={clear} destructive icon="trash-outline" title="Clear all conversation history?" message="All your Setu Guide conversations will be permanently deleted. This cannot be undone." confirmLabel="Clear all" onCancel={() => setClear(false)} onConfirm={clearAll} />
    </SettingsPage>
  );
}

export function GuideConversation({ route, navigation }: any) {
  const id = route.params?.id;
  const { data, error, loading, reload } = useLoad(() => Guide.conversation(id), [id]);
  const [del, setDel] = useState(false);
  return (
    <SettingsPage active="guide" title={data?.title || 'Conversation'} subtitle={data ? `${formatDate(data.createdAt)}` : undefined}
      footer={data ? <Button title="Delete conversation" variant="dangerOutline" onPress={() => setDel(true)} /> : undefined}>
      {loading && !data ? <Loading /> : error && !data ? <ErrorState message={error} onRetry={reload} /> : data ? (
        <View style={{ gap: 12 }}>
          {data.messages.map((m) => (
            <View key={m.id} style={[styles.bubble, m.role === 'user' ? styles.user : styles.guide]}>
              <Text style={[styles.text, m.role === 'user' && { color: '#fff' }]}>{m.text}</Text>
              {m.questions?.length ? <View style={{ marginTop: 8, gap: 4 }}>{m.questions.map((q) => <Text key={q} style={styles.text}>• {q}</Text>)}</View> : null}
              <Text style={[styles.time, m.role === 'user' && { color: '#DCE7FB' }]}>{formatTime(m.at)}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <ConfirmDialog visible={del} destructive icon="trash-outline" title="Delete conversation?" message="This conversation will be permanently deleted." confirmLabel="Delete" onCancel={() => setDel(false)} onConfirm={async () => { await Guide.deleteConversation(id); setDel(false); navigation.navigate('GuideHistory'); }} />
    </SettingsPage>
  );
}

export function SensitiveTopics({ navigation }: any) {
  const { settings, updateSettings } = useAuth();
  const [confirm, setConfirm] = useState(false);
  if (!settings) return null;
  const on = settings.guide.sensitiveTopics;
  return (
    <SettingsPage active="guide" title="Sensitive topics" subtitle="By default, guidance on sensitive topics is turned off.">
      <Card padded={false} style={{ paddingHorizontal: 16 }}>
        <ToggleRow icon="sparkles-outline" tint="purple" title="Get guidance on sensitive topics" description={on ? 'On' : 'Off by default.'} value={on} onChange={(v) => (v ? setConfirm(true) : updateSettings({ guide: { sensitiveTopics: false } }))} last />
      </Card>
      <Card padded={false} style={{ marginTop: space.lg }}>
        <ListRow icon="shield-outline" tint="purple" title="What are sensitive topics?" subtitle="Examples and how we handle them" onPress={() => navigation.navigate('Info', { slug: 'sensitive-what' })} />
        <ListRow icon="heart-outline" tint="pink" title="How it works" subtitle="How Setu Guide provides guidance on sensitive topics" onPress={() => navigation.navigate('Info', { slug: 'sensitive-how' })} />
        <ListRow icon="shield-half-outline" tint="amber" title="Safety & support" subtitle="Important information and support resources" onPress={() => navigation.navigate('SafetyResources')} last />
      </Card>
      <InfoNote icon="shield-checkmark" title="Your privacy is always protected" text="You can choose whether to get guidance on sensitive topics. You can change this setting anytime." style={{ marginTop: space.lg }} />
      <ConfirmDialog visible={confirm} icon="sparkles-outline" tint="purple" title="Enable guidance on sensitive topics?" message="Setu Guide will offer gentle suggestions when you ask about topics like religion, money, health or family expectations. It never judges or decides for you."
        confirmLabel="Enable" onCancel={() => setConfirm(false)} onConfirm={async () => { await updateSettings({ guide: { sensitiveTopics: true } }); setConfirm(false); navigation.navigate('Result', { kind: 'sensitive' }); }} />
    </SettingsPage>
  );
}

export function AIPrivacy({ navigation }: any) {
  const { settings } = useAuth();
  const set = useSetting();
  if (!settings) return null;
  return (
    <SettingsPage active="ai" title="AI & Privacy" subtitle="Control what AI can access, how long it remembers, and how it learns.">
      <Card padded={false} style={{ paddingHorizontal: 16 }}>
        <ToggleRow icon="person-outline" tint="blue" title="Personalised suggestions" description="Use the information you allow to tailor Setu Guide's suggestions." value={settings.ai.personalization} onChange={(v) => set({ ai: { personalization: v } })} />
        <ToggleRow icon="analytics-outline" tint="purple" title="Help improve Sambandh Setu" description="Share anonymous feedback signals about Setu Guide answers. Off by default." value={settings.ai.improveService} onChange={(v) => set({ ai: { improveService: v } })} last />
      </Card>
      <Group label="Learn more" style={{ marginTop: space.lg }}>
        <ListRow icon="shield-checkmark-outline" tint="blue" title="Data Usage & Privacy" subtitle="Overview of how AI uses information" onPress={() => navigation.navigate('Info', { slug: 'ai-data-usage' })} />
        <ListRow icon="git-network-outline" tint="purple" title="How Your Data Is Used" onPress={() => navigation.navigate('Info', { slug: 'ai-how-used' })} />
        <ListRow icon="eye-off-outline" tint="red" title="What Data Is Not Used" onPress={() => navigation.navigate('Info', { slug: 'ai-not-used' })} />
        <ListRow icon="lock-closed-outline" tint="green" title="Data Storage & Security" onPress={() => navigation.navigate('Info', { slug: 'ai-storage' })} />
        <ListRow icon="heart-outline" tint="pink" title="Our Commitment" onPress={() => navigation.navigate('Info', { slug: 'ai-commitment' })} />
        <ListRow icon="options-outline" tint="amber" title="Your Controls" onPress={() => navigation.navigate('Info', { slug: 'ai-controls' })} last />
      </Group>
      <Card padded={false}>
        <ListRow icon="time-outline" tint="slate" title="History retention" value={settings.ai.retention === 'strict' ? 'Until deleted' : settings.ai.retention === '30d' ? '30 days' : '90 days'} onPress={() => navigation.navigate('SettingOption', { key: 'aiRetention' })} />
        <ListRow icon="sparkles-outline" tint="purple" title="Setu Guide settings" onPress={() => navigation.navigate('GuideSettings')} last />
      </Card>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  over: { fontFamily: fonts.semibold, fontSize: 11.5, letterSpacing: 0.8, color: colors.muted, marginTop: space.xl, marginBottom: 8 },
  bubble: { maxWidth: '88%' as any, borderRadius: 14, padding: 12 },
  user: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  guide: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  text: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.text },
  time: { fontFamily: fonts.regular, fontSize: 11, color: colors.faint, marginTop: 4, alignSelf: 'flex-end' },
});

export { radius };
