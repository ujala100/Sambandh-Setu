import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Connections, Family, Person, Requests, Safety, errorMessage } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useLoad } from '../../hooks/useAsync';
import { colors, fonts, radius, space } from '../../theme';
import { Avatar, Button, Card, CheckRow, ConfirmDialog, EmptyState, ErrorState, Group, InfoNote, ListRow, Loading, RadioRow, StepBar, TextField, ToggleRow, useToast } from '../../ui';
import { SettingsPage } from './SettingsHome';
import { formatDate } from '../../utils/format';
import { pickImage } from '../../utils/image';

export function PrivacyVisibility({ navigation }: any) {
  const { settings, updateSettings } = useAuth();
  const toast = useToast();
  const { data: blocks } = useLoad(() => Safety.blocks());
  const { data: fam } = useLoad(() => Family.list());
  useEffect(() => { if (settings && !settings.privacy.reviewed) updateSettings({ privacy: { reviewed: true } }).catch(() => {}); }, []);
  const set = (patch: any) => updateSettings(patch).catch((e) => toast.show(errorMessage(e), 'error'));
  if (!settings) return null;
  const who = { everyone: 'Everyone', matching: 'Matched users', connected: 'Connections only', selected: 'Selected people' }[settings.privacy.whoCanSeeProfile] || '';
  return (
    <SettingsPage active="privacy" title="Privacy & Visibility" subtitle="Control who can see your profile and how you appear on Sambandh Setu.">
      <Group label="Profile visibility">
        <View style={{ paddingHorizontal: 16 }}>
          <ToggleRow icon="people-outline" title="Show my profile in Discover" description="Your profile will appear to people matching your preferences." value={settings.privacy.showInDiscover} onChange={(v) => set({ privacy: { showInDiscover: v } })} />
        </View>
        <ListRow icon="eye-outline" title="Who can see my profile?" subtitle="People matching my preferences" value={who} onPress={() => navigation.navigate('SettingOption', { key: 'whoCanSeeProfile' })} />
        <View style={{ paddingHorizontal: 16 }}>
          <ToggleRow icon="link-outline" title="Allow connection requests" description="Let others send you interest or connection requests." value={settings.privacy.allowConnectionRequests} onChange={(v) => set({ privacy: { allowConnectionRequests: v } })} last />
        </View>
      </Group>
      <Group label="Online status">
        <View style={{ paddingHorizontal: 16 }}>
          <ToggleRow icon="wifi-outline" title="Show online status" description="Let your connections know when you're active." value={settings.privacy.showOnlineStatus} onChange={(v) => set({ privacy: { showOnlineStatus: v } })} />
          <ToggleRow icon="checkmark-done-outline" title="Show read status" description="Let others know when you read their messages." value={settings.chat.readReceipts} onChange={(v) => set({ chat: { readReceipts: v } })} last />
        </View>
      </Group>
      <Group label="Sharing & access">
        <ListRow icon="person-circle-outline" title="Profile information sharing" subtitle="Control what information is visible to others." value={settings.privacy.sharing.family ? 'Custom' : 'Basic info only'} onPress={() => navigation.navigate('ProfileSharing')} />
        <ListRow icon="home-outline" title="Family access" subtitle="Allow trusted family members to view your profile." value={fam?.items.filter((m) => m.status === 'active').length ? `${fam.items.filter((m) => m.status === 'active').length} active` : 'Off'} onPress={() => navigation.navigate('FamilyAccess')} last />
      </Group>
      <Group label="Safety">
        <ListRow icon="ban-outline" tint="red" title="Blocked Users" subtitle="Manage accounts you've blocked." value={blocks ? `${blocks.items.length} blocked` : undefined} onPress={() => navigation.navigate('BlockedUsers')} />
        <ListRow icon="flag-outline" tint="purple" title="Report & Safety" subtitle="Report a user, content, or suspicious activity." onPress={() => navigation.navigate('ReportSafety')} last />
      </Group>
      <InfoNote icon="shield-checkmark" title="Your privacy matters" text="You can change these settings anytime to control your experience on Sambandh Setu." />
    </SettingsPage>
  );
}

const SHARING = [['name', 'Name'], ['age', 'Age'], ['location', 'Location'], ['education', 'Education'], ['profession', 'Profession'], ['family', 'Family details'], ['contact', 'Contact information'], ['photos', 'Photos'], ['religion', 'Religion & community']] as const;

export function ProfileSharing({ navigation }: any) {
  const { settings, updateSettings } = useAuth();
  const toast = useToast();
  const [v, setV] = useState<Record<string, boolean>>({ ...(settings?.privacy.sharing || {}) });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await updateSettings({ privacy: { sharing: v } }); navigation.navigate('Result', { kind: 'visibility', message: 'Your profile information sharing has been updated.' }); } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setBusy(false); }
  };
  return (
    <SettingsPage active="privacy" title="Profile Information Sharing" subtitle="Choose what information is visible to others." footer={<Button title="Save Changes" onPress={save} loading={busy} />}>
      <Card padded={false} style={{ paddingHorizontal: 16 }}>
        {SHARING.map(([k, label], i) => <ToggleRow key={k} title={label} value={!!v[k]} onChange={(on) => setV((s) => ({ ...s, [k]: on }))} last={i === SHARING.length - 1}
          description={k === 'contact' ? 'Email and phone, only to people you are connected with.' : k === 'family' ? 'Off by default.' : k === 'name' ? 'When off, only your first initial is shown.' : undefined} />)}
      </Card>
      <InfoNote text="Connected people always see your photos. Private Reflect answers and verification documents are never shown." style={{ marginTop: space.lg }} />
    </SettingsPage>
  );
}

export function BlockedUsers({ navigation }: any) {
  const { data, error, loading, reload } = useLoad(() => Safety.blocks());
  const [target, setTarget] = useState<{ userId: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const unblock = async () => {
    if (!target) return;
    setBusy(true);
    try { await Safety.unblock(target.userId); setTarget(null); navigation.navigate('Result', { kind: 'unblocked' }); } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setBusy(false); }
  };
  return (
    <SettingsPage active="blocked" title="Blocked Users" subtitle="Manage people you've blocked.">
      {loading && !data ? <Loading /> : error && !data ? <ErrorState message={error} onRetry={reload} /> : !data?.items.length ? (
        <Card><EmptyState icon="ban-outline" tint="slate" title="No blocked users" text="People you block won't be able to see your profile or contact you." /></Card>
      ) : (
        <View style={{ gap: 10 }}>
          {data.items.map((b) => (
            <Card key={b.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar name={b.name} size={44} />
              <View style={{ flex: 1 }}><Text style={styles.name}>{b.name}</Text><Text style={styles.small}>Blocked on {formatDate(b.blockedAt)}</Text></View>
              <Button title="Unblock" variant="secondary" size="sm" full={false} onPress={() => setTarget(b)} />
            </Card>
          ))}
        </View>
      )}
      <ConfirmDialog visible={!!target} icon="person-outline" tint="blue" title="Unblock User?" message={`Are you sure you want to unblock ${target?.name}? They will be able to view your profile and send connection requests again.`}
        confirmLabel="Unblock User" busy={busy} onCancel={() => setTarget(null)} onConfirm={unblock} />
    </SettingsPage>
  );
}

export function ReportSafety({ navigation }: any) {
  return (
    <SettingsPage active="privacy" title="Report & Safety" subtitle="Help keep Sambandh Setu safe for everyone.">
      <Card padded={false}>
        <ListRow icon="person-outline" tint="purple" title="Report a user" subtitle="Report someone for behaviour that concerns you." onPress={() => navigation.navigate('ReportFlow', { contentType: 'user' })} />
        <ListRow icon="flag-outline" tint="orange" title="Report content" subtitle="Report a message, photo, profile information, or other content." onPress={() => navigation.navigate('ReportFlow', { contentType: 'message' })} last />
      </Card>
      <Group label="Safety" style={{ marginTop: space.xl }}>
        <ListRow icon="ban-outline" tint="red" title="Block someone" subtitle="Prevent a user from contacting or interacting with you." onPress={() => navigation.navigate('ReportFlow', { contentType: 'user', blockOnly: true })} />
        <ListRow icon="book-outline" tint="green" title="Safety resources" subtitle="Tips for meeting safely and spotting scams." onPress={() => navigation.navigate('SafetyResources')} last />
      </Group>
      <InfoNote icon="shield-checkmark" title="Need urgent help?" text="If you feel unsafe or threatened, call 112. Tele-MANAS (14416) offers free 24x7 support. Women Helpline: 181.">
        <Button title="See all helplines" variant="text" size="sm" full={false} onPress={() => navigation.navigate('Info', { slug: 'safety-helplines' })} />
      </InfoNote>
    </SettingsPage>
  );
}

const USER_REASONS = ['Inappropriate behaviour', 'Harassment or unwanted contact', 'Fake or misleading profile', 'Scam or suspicious activity', 'Offensive or abusive content', 'Safety concern', 'Other'];
const CONTENT_REASONS = ['Harassment or abuse', 'Inappropriate content', 'Spam', 'Scam or fraud', 'Misleading information', 'Safety concern', 'Other'];

/** Report a User / Report Content → Additional Details → Report Submitted. Also used for "Block someone". */
export function ReportFlow({ route, navigation }: any) {
  const toast = useToast();
  const contentType: string = route.params?.contentType || 'user';
  const blockOnly = !!route.params?.blockOnly;
  const [who, setWho] = useState<{ id: string; name: string } | null>(route.params?.userId ? { id: route.params.userId, name: route.params.name || 'this member' } : null);
  const [step, setStep] = useState(who ? 1 : 0);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: people } = useLoad(async () => {
    const [c, r] = await Promise.all([Connections.list(), Requests.list()]);
    const map = new Map<string, Person>();
    [...c.active, ...c.paused, ...c.closed].forEach((x) => map.set(x.person.id, x.person));
    [...r.received, ...r.sent].forEach((x) => map.set(x.person.id, x.person));
    return [...map.values()];
  }, [], { onFocus: false });
  const reasons = contentType === 'user' ? USER_REASONS : CONTENT_REASONS;

  const addImage = async () => {
    try { const d = await pickImage({ square: false, maxSize: 1280 }); if (d) setImages((s) => [...s, d].slice(0, 5)); } catch (e) { toast.show(errorMessage(e), 'error'); }
  };
  const submit = async () => {
    setBusy(true); setError(null);
    try {
      if (blockOnly && who) { await Safety.block(who.id); toast.show(`${who.name} has been blocked`); navigation.navigate('BlockedUsers'); return; }
      await Safety.report({ userId: who?.id, contentType, reason, details, images, alsoBlock });
      navigation.navigate('Result', { kind: 'report' });
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };

  const title = step === 0 ? (blockOnly ? 'Block someone' : contentType === 'user' ? 'Report a User' : 'Report Content') : step === 1 ? (contentType === 'user' ? 'Report a User' : 'Report Content') : 'Additional Details';
  const sub = step === 0 ? 'Choose the person.' : step === 1 ? (contentType === 'user' ? "Tell us what's happening. Your report is confidential." : 'Tell us what content you want to report.') : 'Provide more information to help us review your report.';
  const footer = step === 0 ? null : step === 1 ? (blockOnly ? <Button title="Block" variant="danger" onPress={submit} loading={busy} /> : <Button title="Continue" onPress={() => (reason ? setStep(2) : setError('Choose a reason'))} />) : <Button title="Submit report" onPress={submit} loading={busy} />;

  return (
    <SettingsPage active="privacy" title={title} subtitle={sub} onBack={step > (route.params?.userId ? 1 : 0) ? () => setStep(step - 1) : undefined} footer={<View style={{ gap: 8 }}>{error ? <InfoNote tone="red" icon="alert-circle" text={error} /> : null}{footer}</View>}>
      {!blockOnly ? <View style={{ marginBottom: space.lg }}><StepBar step={step + 1} total={3} /></View> : null}
      {step === 0 ? (
        !people ? <Loading /> : !people.length ? <EmptyState icon="people-outline" title="No one to choose yet" text="You can report anyone from their profile or chat using the ⋮ menu." /> : (
          <Card padded={false}>
            {people.map((p, i) => <ListRow key={p.id} title={p.name} subtitle={p.location} right={<Avatar uri={p.photoUrl} name={p.name} size={38} />} onPress={() => { setWho({ id: p.id, name: p.name }); setStep(1); }} last={i === people.length - 1} />)}
          </Card>
        )
      ) : null}
      {step >= 1 && who ? (
        <Card padded={false} style={{ marginBottom: space.lg }}>
          <ListRow title={who.name} subtitle="View profile" right={<Avatar name={who.name} size={38} />} onPress={() => navigation.navigate('PersonProfile', { userId: who.id })} last />
        </Card>
      ) : null}
      {step === 1 && blockOnly ? <InfoNote tone="amber" icon="ban-outline" text={`${who?.name} won't be able to see your profile or contact you. Pending requests are withdrawn and an active connection is paused.`} /> : null}
      {step === 1 && !blockOnly ? (
        <View>
          <Text style={styles.h}>{contentType === 'user' ? 'Why are you reporting this user?' : 'Why are you reporting this content?'}</Text>
          {reasons.map((r) => <RadioRow key={r} label={r} selected={reason === r} onPress={() => { setReason(r); setError(null); }} />)}
        </View>
      ) : null}
      {step === 2 ? (
        <View>
          <TextField label="Additional details" optional multiline value={details} onChangeText={(t) => setDetails(t.slice(0, 500))} counter={500} placeholder="Tell us what happened..." />
          <Card tone="tint">
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 }}><Ionicons name="information-circle" size={18} color={colors.primary} /><Text style={styles.small}>You can also add screenshots to support your report.</Text></View>
            <Pressable onPress={addImage} style={styles.drop} accessibilityRole="button" accessibilityLabel="Add images" disabled={images.length >= 5}>
              <Ionicons name="image-outline" size={24} color={colors.primary} />
              <Text style={styles.name}>Add images <Text style={styles.small}>(optional)</Text></Text>
              <Text style={styles.small}>JPG or PNG, up to 5 images</Text>
            </Pressable>
            {images.length ? <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>{images.map((src, i) => (
              <Pressable key={i} onPress={() => setImages((s) => s.filter((_, j) => j !== i))} accessibilityLabel={`Remove image ${i + 1}`}><Image source={{ uri: src }} style={{ width: 64, height: 64, borderRadius: 8 }} /></Pressable>
            ))}</View> : null}
          </Card>
          {who ? <CheckRow label={`Also block ${who.name}`} checked={alsoBlock} onPress={() => setAlsoBlock((b) => !b)} style={{ marginTop: space.lg }} /> : null}
        </View>
      ) : null}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  name: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.text },
  small: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted },
  h: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text, marginBottom: 12 },
  drop: { alignItems: 'center', gap: 4, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primaryLine, borderRadius: radius.card, padding: 18, backgroundColor: '#fff' },
});
