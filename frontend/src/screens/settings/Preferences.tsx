import React, { useState } from 'react';
import { View } from 'react-native';
import { errorMessage } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { space } from '../../theme';
import { Button, Card, Group, InfoNote, ListRow, SelectField, ToggleRow, useToast } from '../../ui';
import { SettingsPage } from './SettingsHome';

function useSet() {
  const { updateSettings } = useAuth();
  const toast = useToast();
  return (patch: any) => updateSettings(patch).catch((e) => toast.show(errorMessage(e), 'error'));
}

const FREQ: Record<string, string> = { realtime: 'Real-time', daily: 'Daily digest', weekly: 'Weekly digest', important: 'Only important' };

export function NotificationSettings({ navigation }: any) {
  const { settings } = useAuth();
  const set = useSet();
  if (!settings) return null;
  const n = settings.notifications;
  return (
    <SettingsPage active="notifications" title="Notifications" subtitle="Choose how and when we notify you.">
      <Group label="Channels">
        <View style={{ paddingHorizontal: 16 }}>
          <ToggleRow icon="notifications-outline" tint="amber" title="In-app notifications" description="Shown in the bell on Home." value={n.inApp} onChange={(v) => set({ notifications: { inApp: v } })} />
          <ToggleRow icon="phone-portrait-outline" tint="blue" title="Push notifications" description="On your phone when the app is installed." value={n.push} onChange={(v) => set({ notifications: { push: v } })} />
          <ToggleRow icon="mail-outline" tint="purple" title="Email" description="Important account and safety updates." value={n.email} onChange={(v) => set({ notifications: { email: v } })} last />
        </View>
      </Group>
      <Group label="What to notify me about">
        <View style={{ paddingHorizontal: 16 }}>
          <ToggleRow title="Interest requests" description="When someone is interested in you or accepts your interest" value={n.requests} onChange={(v) => set({ notifications: { requests: v } })} />
          <ToggleRow title="Messages" description="New chat messages" value={n.messages} onChange={(v) => set({ notifications: { messages: v } })} />
          <ToggleRow title="Journey updates" description="Stage completions and shared reflections" value={n.journey} onChange={(v) => set({ notifications: { journey: v } })} />
          <ToggleRow title="Family access" description="When a family member responds to your invitation" value={n.family} onChange={(v) => set({ notifications: { family: v } })} />
          <ToggleRow title="Safety & verification" description="Verification results and safety notices" value={n.safety} onChange={(v) => set({ notifications: { safety: v } })} last />
        </View>
      </Group>
      <Card padded={false}><ListRow icon="time-outline" tint="blue" title="Notification frequency" value={FREQ[n.frequency]} onPress={() => navigation.navigate('SettingOption', { key: 'notificationFrequency' })} last /></Card>
    </SettingsPage>
  );
}

const ALLOW: Record<string, string> = { everyone: 'Everyone', connections: 'My preferences', verified: 'Verified members', custom: 'Custom' };

export function ChatSettings({ navigation }: any) {
  const { settings } = useAuth();
  const set = useSet();
  if (!settings) return null;
  const c = settings.chat;
  return (
    <SettingsPage active="chat" title="Chat" subtitle="Message settings and chat behaviour.">
      <Card padded={false}>
        <ListRow icon="people-outline" tint="blue" title="Allow messages from" subtitle="Who can send you interest and start a conversation" value={ALLOW[c.allowMessagesFrom]} onPress={() => navigation.navigate('SettingOption', { key: 'allowMessagesFrom' })} />
        <View style={{ paddingHorizontal: 16 }}>
          <ToggleRow icon="checkmark-done-outline" tint="green" title="Read receipts" description="Show when you've read messages. Shown only when both people have this on." value={c.readReceipts} onChange={(v) => set({ chat: { readReceipts: v } })} />
          <ToggleRow icon="ellipsis-horizontal" tint="purple" title="Typing indicator" description="Saved preference." value={c.typingIndicator} onChange={(v) => set({ chat: { typingIndicator: v } })} last />
        </View>
      </Card>
      <InfoNote icon="lock-closed" text="Chats are only possible between connected members. Block or report anyone from the chat menu." style={{ marginTop: space.lg }} />
    </SettingsPage>
  );
}

export function CustomChatPrefs({ navigation }: any) {
  const { settings, updateSettings } = useAuth();
  const toast = useToast();
  const [c, setC] = useState<Record<string, any>>({ ...(settings?.chat.custom || {}) });
  const save = async () => {
    try { await updateSettings({ chat: { allowMessagesFrom: 'custom', custom: c } }); navigation.navigate('Result', { kind: 'settings' }); } catch (e) { toast.show(errorMessage(e), 'error'); }
  };
  return (
    <SettingsPage active="chat" title="Custom preferences" subtitle="Set specific criteria for who can message you." footer={<Button title="Save" onPress={save} />}>
      <SelectField label="Gender" icon="person-outline" value={c.gender} options={[{ value: 'my_preference', label: 'Matches my preference' }, { value: 'women', label: 'Women' }, { value: 'men', label: 'Men' }, { value: 'anyone', label: 'Anyone' }]} onChange={(v) => setC((s) => ({ ...s, gender: v }))} />
      <SelectField label="Age range" icon="calendar-outline" value={c.ageRange} options={[{ value: '18-30', label: '18 - 30 years' }, { value: '25-35', label: '25 - 35 years' }, { value: '30-40', label: '30 - 40 years' }, { value: 'any', label: 'Any' }]} onChange={(v) => setC((s) => ({ ...s, ageRange: v }))} />
      <SelectField label="Location" icon="location-outline" value={c.location} options={[{ value: '50', label: 'Within 50 km' }, { value: '100', label: 'Within 100 km' }, { value: '200', label: 'Within 200 km' }, { value: 'any', label: 'Anywhere' }]} onChange={(v) => setC((s) => ({ ...s, location: v }))} />
      <SelectField label="Education" icon="school-outline" value={c.education} options={[{ value: 'graduate', label: 'Graduate or above' }, { value: 'postgraduate', label: 'Postgraduate or above' }, { value: 'any', label: 'Any' }]} onChange={(v) => setC((s) => ({ ...s, education: v }))} />
      <SelectField label="Profession" icon="briefcase-outline" value={c.profession} options={[{ value: 'any', label: 'Any' }, { value: 'working', label: 'Working professional' }, { value: 'business', label: 'Business / self-employed' }]} onChange={(v) => setC((s) => ({ ...s, profession: v }))} />
      <Card padded={false} style={{ paddingHorizontal: 16 }}>
        <ToggleRow icon="shield-checkmark-outline" tint="blue" title="Verified members only" value={!!c.verifiedOnly} onChange={(v) => setC((s) => ({ ...s, verifiedOnly: v }))} />
        <ToggleRow icon="heart" tint="red" title="Only people I've interacted with" value={!!c.interactedOnly} onChange={(v) => setC((s) => ({ ...s, interactedOnly: v }))} last />
      </Card>
      <InfoNote text="You can set one or more criteria. Verified-only and interacted-only are applied to new interest requests." style={{ marginTop: space.lg }} />
    </SettingsPage>
  );
}

export function DiscoverySettings({ navigation }: any) {
  const { settings } = useAuth();
  const set = useSet();
  if (!settings) return null;
  const d = settings.discovery;
  const find: Record<string, string> = { everyone: 'Everyone', matching: 'Matching preferences', verified: 'Verified members', nobody: 'Nobody' };
  const age: Record<string, string> = { everyone: 'All ages', preferences: 'My preferences', custom: `${d.ageMin}-${d.ageMax}` };
  const dist: Record<string, string> = { city: 'My city', '50': '50 km', '100': '100 km', '200': '200 km', anywhere: 'Anywhere' };
  const sugg: Record<string, string> = { balanced: 'Balanced', values: 'Shared values', nearby: 'Nearby', new: 'Newest' };
  return (
    <SettingsPage active="discovery" title="Discovery Settings" subtitle="Manage how you appear and who you can discover.">
      <Card padded={false}>
        <View style={{ paddingHorizontal: 16 }}>
          <ToggleRow icon="eye-outline" tint="blue" title="Show my profile in Discover" description="Turn off to stop appearing in Discover." value={settings.privacy.showInDiscover} onChange={(v) => set({ privacy: { showInDiscover: v } })} />
          <ToggleRow icon="pause-circle-outline" tint="amber" title="Hide profile temporarily" description={d.hideProfile ? (d.hideUntil ? `Hidden until ${new Date(d.hideUntil).toLocaleDateString()}` : 'Hidden until you turn this off') : 'Take a break without deleting anything.'} value={d.hideProfile} onChange={(v) => set({ discovery: { hideProfile: v } })} last />
        </View>
        {d.hideProfile ? (
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <SelectField label="Hide for" value={d.hideDuration} options={[{ value: '24h', label: '24 hours' }, { value: '3d', label: '3 days' }, { value: '7d', label: '7 days' }, { value: 'until_turned_off', label: 'Until I turn it off' }]} onChange={(v) => set({ discovery: { hideDuration: v, hideProfile: true } })} />
          </View>
        ) : null}
      </Card>
      <Card padded={false} style={{ marginTop: space.lg }}>
        <ListRow icon="people-outline" tint="purple" title="People who can find me" value={find[d.peopleWhoCanFindMe]} onPress={() => navigation.navigate('SettingOption', { key: 'peopleWhoCanFindMe' })} />
        <ListRow icon="calendar-outline" tint="blue" title="Age range visibility" value={age[d.ageRangeVisibility]} onPress={() => navigation.navigate('SettingOption', { key: 'ageRangeVisibility' })} />
        <ListRow icon="navigate-outline" tint="green" title="Distance visibility" value={dist[d.distanceVisibility]} onPress={() => navigation.navigate('SettingOption', { key: 'distanceVisibility' })} />
        <ListRow icon="sparkles-outline" tint="amber" title="Profile suggestions" value={sugg[d.profileSuggestions]} onPress={() => navigation.navigate('SettingOption', { key: 'profileSuggestions' })} last />
      </Card>
    </SettingsPage>
  );
}
