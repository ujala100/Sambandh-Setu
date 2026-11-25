import React, { useState } from 'react';
import { Image, Platform, Share, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Family, FamilyMember as Member, errorMessage } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useLoad } from '../../hooks/useAsync';
import { colors, fonts, space } from '../../theme';
import { Avatar, Button, Card, ConfirmDialog, EmptyState, ErrorState, IconTile, InfoNote, ListRow, Loading, PhoneField, ResultView, Screen, SelectField, StatusDot, TextField, ToggleRow, useToast } from '../../ui';
import { ActionMenu } from '../../components/People';
import { SettingsPage } from './SettingsHome';

const PERMS = [
  { key: 'basicProfile', title: 'Basic profile details', text: 'Name, age, education, location', icon: 'person-circle-outline' },
  { key: 'photos', title: 'Photos', text: 'Your profile photo', icon: 'image-outline' },
  { key: 'partnerPreferences', title: 'Partner preferences', text: 'Your preference criteria', icon: 'heart-outline' },
  { key: 'communicationSupport', title: 'Communication support', text: 'Lets them see that interest requests exist (optional)', icon: 'chatbox-outline' },
] as const;

/** Family Access: intro when empty, member list otherwise. */
export function FamilyAccess({ navigation }: any) {
  const { data, error, loading, reload } = useLoad(() => Family.list());
  const toast = useToast();
  const [remove, setRemove] = useState<Member | null>(null);
  const resend = async (m: Member) => {
    try { const r = await Family.resend(m.id); await shareLink(r.link, m.relationship); toast.show(r.delivered ? 'Invitation email sent again' : 'New invitation link ready', 'info'); } catch (e) { toast.show(errorMessage(e), 'error'); }
  };
  const doRemove = async () => {
    if (!remove) return;
    try { await Family.remove(remove.id); setRemove(null); navigation.navigate('Result', { kind: 'familyRemoved' }); } catch (e) { toast.show(errorMessage(e), 'error'); }
  };
  if (loading && !data) return <SettingsPage active="privacy" title="Family Access"><Loading /></SettingsPage>;
  if (error && !data) return <SettingsPage active="privacy" title="Family Access"><ErrorState message={error} onRetry={reload} /></SettingsPage>;
  const items = data?.items || [];
  if (!items.length) {
    return (
      <SettingsPage active="privacy" title="Family Access" subtitle="Allow trusted family members to view selected parts of your profile and support your journey." footer={<Button title="Add family member" onPress={() => navigation.navigate('FamilyAdd')} />}>
        <Image source={require('../../../assets/illustrations/family-trio.png')} style={{ width: 220, height: 140, alignSelf: 'center', marginVertical: space.lg }} resizeMode="contain" accessibilityIgnoresInvertColors />
        <Card padded={false}>
          <ListRow icon="checkmark-outline" tint="blue" title="Share selected profile information" subtitle="Let your trusted family members view limited details." />
          <ListRow icon="shield-checkmark-outline" tint="green" title="Keep control" subtitle="You choose what to share and can change it anytime." />
          <ListRow icon="people-outline" tint="amber" title="Build trust and support" subtitle="Your family can support you in a safe and respectful way." last />
        </Card>
      </SettingsPage>
    );
  }
  return (
    <SettingsPage active="privacy" title="Family Access" subtitle="Manage the family members who can view your profile.">
      <View style={{ gap: 10 }}>
        {items.map((m) => (
          <Card key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} onPress={() => navigation.navigate('FamilyMember', { memberId: m.id })} accessibilityLabel={`${m.relationship}, ${m.status}`}>
            <IconTile name="person" round size={44} tint="blue" />
            <View style={{ flex: 1 }}><Text style={styles.name}>{m.relationship}</Text><StatusDot status={m.status === 'active' ? 'active' : 'pending'} /></View>
            {m.status === 'pending' ? <Button title="Resend" variant="secondary" size="sm" full={false} onPress={() => resend(m)} /> : null}
            <ActionMenu actions={[
              { label: 'Manage access', icon: 'options-outline', onPress: () => navigation.navigate('FamilyMember', { memberId: m.id }) },
              ...(m.status === 'pending' ? [{ label: 'Share invitation link again', icon: 'link-outline' as const, onPress: () => resend(m) }] : []),
              { label: 'Remove', icon: 'trash-outline', danger: true, onPress: () => setRemove(m) },
            ]} />
          </Card>
        ))}
        <Card onPress={() => navigation.navigate('FamilyAdd')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} accessibilityLabel="Add Family Member">
          <IconTile name="add" round size={40} tint="blue" /><Text style={[styles.name, { color: colors.primary }]}>Add Family Member</Text>
        </Card>
      </View>
      <InfoNote icon="shield-checkmark" text="Only people you trust should have access to your profile. You can remove access anytime." style={{ marginTop: space.lg }} />
      <ConfirmDialog visible={!!remove} destructive icon="trash-outline" title="Remove Family Member?" message="They will no longer be able to view your profile information or support you on Sambandh Setu." confirmLabel="Remove" onCancel={() => setRemove(null)} onConfirm={doRemove} />
    </SettingsPage>
  );
}

async function shareLink(link: string, relationship: string) {
  const message = `I'd like you to see parts of my Sambandh Setu profile. Open this invitation: ${link}`;
  if (Platform.OS === 'web') {
    const nav: any = globalThis.navigator;
    if (nav?.share) { try { await nav.share({ title: 'Sambandh Setu family invitation', text: message, url: link }); return; } catch { /* fall back to copy */ } }
    await Clipboard.setStringAsync(link);
    return;
  }
  await Share.share({ message, title: `Invitation for ${relationship}` });
}

export function FamilyAdd({ navigation }: any) {
  return (
    <SettingsPage active="privacy" title="Add Family Member" subtitle="Choose how you want to add a family member.">
      <Card padded={false}>
        <ListRow icon="link-outline" title="Send Invite Link" subtitle="Share a secure link with your family member." onPress={() => navigation.navigate('FamilyInviteForm', { method: 'link' })} />
        <ListRow icon="call-outline" title="Invite via Phone Number" subtitle="Send the invitation from your phone by SMS or WhatsApp." onPress={() => navigation.navigate('FamilyInviteForm', { method: 'phone' })} />
        <ListRow icon="mail-outline" title="Invite via Email" subtitle="Send an invitation via email." onPress={() => navigation.navigate('FamilyInviteForm', { method: 'email' })} last />
      </Card>
      <InfoNote icon="shield-checkmark" text="Only people you trust should have access to your profile. You can remove access anytime." style={{ marginTop: space.lg }} />
    </SettingsPage>
  );
}

export function FamilyInviteForm({ route, navigation }: any) {
  const method: 'link' | 'phone' | 'email' = route.params?.method || 'link';
  const { config } = useAuth();
  const toast = useToast();
  const { data } = useLoad(() => Family.list(), [], { onFocus: false });
  const [relationship, setRelationship] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [perms, setPerms] = useState<Record<string, boolean>>({ basicProfile: true, photos: true, partnerPreferences: true, communicationSupport: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ link: string; delivered: boolean } | null>(null);
  const send = async () => {
    if (!relationship) return setError('Select the relationship');
    setBusy(true); setError(null);
    try {
      const r = await Family.invite({ method, relationship, contact: method === 'link' ? undefined : contact.replace(method === 'phone' ? /\D/g : /\s/g, ''), message, permissions: perms });
      setSent({ link: r.link, delivered: r.delivered });
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  if (sent) {
    return (
      <Screen variant="none" title="Invitation Sent" maxWidth={560} centerContent>
        <ResultView tone="blue" icon="paper-plane" title={sent.delivered ? 'Invitation Sent' : 'Invitation Ready'}
          message={sent.delivered ? "We've emailed a family access invitation." : method === 'phone' ? 'Send this link to their phone by SMS or WhatsApp. SMS from Sambandh Setu is not available yet.' : 'Share this secure link with your family member.'}
          primary={{ label: 'Share link', onPress: () => shareLink(sent.link, relationship).then(() => toast.show(Platform.OS === 'web' ? 'Link copied' : 'Shared', 'info')) }}
          secondary={{ label: 'Done', onPress: () => navigation.navigate('FamilyAccess') }}>
          <Card tone="tint"><Text selectable style={styles.link}>{sent.link}</Text></Card>
        </ResultView>
      </Screen>
    );
  }
  const title = method === 'phone' ? 'Invite via Phone Number' : method === 'email' ? 'Invite via Email' : 'Send Invite Link';
  return (
    <SettingsPage active="privacy" title={title} subtitle={method === 'link' ? 'Create a secure link to share with your family member.' : "Enter your family member's details to send an invitation."}
      footer={<View style={{ gap: 8 }}>{error ? <InfoNote tone="red" icon="alert-circle" text={error} /> : null}<Button title={method === 'link' ? 'Create Invite Link' : 'Send Invite'} onPress={send} loading={busy} /></View>}>
      {method === 'phone' ? <PhoneField label="Phone Number" required value={contact} onChangeText={setContact} /> : null}
      {method === 'email' ? <TextField label="Email address" required value={contact} onChangeText={setContact} autoCapitalize="none" keyboardType="email-address" icon="mail-outline" helper={config.emailCodes ? undefined : 'Email sending is not switched on yet, so you will get a link to send yourself.'} /> : null}
      <SelectField label="Relationship" required value={relationship} options={data?.relationships || ['Mother', 'Father', 'Elder Sister', 'Elder Brother', 'Other']} onChange={setRelationship} placeholder="Select relationship" />
      <TextField label="Personal message" optional multiline value={message} onChangeText={(t) => setMessage(t.slice(0, 250))} counter={250} placeholder="You can add a short message to let them know why you're inviting them." />
      <Text style={styles.h}>Information they can see</Text>
      <Card padded={false} style={{ paddingHorizontal: 16, marginBottom: space.lg }}>
        {PERMS.map((p, i) => <ToggleRow key={p.key} icon={p.icon as any} title={p.title} description={p.text} value={!!perms[p.key]} onChange={(v) => setPerms((s) => ({ ...s, [p.key]: v }))} last={i === PERMS.length - 1} />)}
      </Card>
      <InfoNote icon="shield-checkmark" text="Only people you trust should have access to your profile. You can remove access anytime." />
    </SettingsPage>
  );
}

/** "Manage Access (Permissions)" for one family member. */
export function FamilyMember({ route, navigation }: any) {
  const id = route.params?.memberId;
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(() => Family.list());
  const m = data?.items.find((x) => x.id === id);
  const [perms, setPerms] = useState<Record<string, boolean> | null>(null);
  const [remove, setRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const current = perms || m?.permissions || {};
  const save = async () => {
    setBusy(true);
    try { await Family.update(id, current); toast.show('Access updated'); navigation.goBack(); } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setBusy(false); }
  };
  if (loading && !data) return <SettingsPage active="privacy" title="Manage Access"><Loading /></SettingsPage>;
  if (!m) return <SettingsPage active="privacy" title="Manage Access"><ErrorState title="Family member not found" message={error} onRetry={reload} /></SettingsPage>;
  return (
    <SettingsPage active="privacy" title="Manage Access" footer={<Button title="Save Changes" onPress={save} loading={busy} />}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: space.lg }}>
        <Avatar name={m.relationship} size={44} />
        <View style={{ flex: 1 }}><Text style={styles.name}>{m.relationship}</Text><StatusDot status={m.status === 'active' ? 'active' : 'pending'} /></View>
        <ActionMenu actions={[{ label: 'Remove family member', icon: 'trash-outline', danger: true, onPress: () => setRemove(true) }]} />
      </Card>
      <Text style={styles.h}>Information they can see</Text>
      <Card padded={false} style={{ paddingHorizontal: 16 }}>
        {PERMS.map((p, i) => <ToggleRow key={p.key} icon={p.icon as any} title={p.title} value={!!current[p.key]} onChange={(v) => setPerms({ ...current, [p.key]: v })} last={i === PERMS.length - 1} />)}
      </Card>
      <InfoNote text="You can update these settings anytime." style={{ marginTop: space.lg }} />
      <ConfirmDialog visible={remove} destructive icon="trash-outline" title="Remove Family Member?" message="They will no longer be able to view your profile information or support you on Sambandh Setu." confirmLabel="Remove"
        onCancel={() => setRemove(false)} onConfirm={async () => { await Family.remove(id); setRemove(false); navigation.navigate('Result', { kind: 'familyRemoved' }); }} />
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  h: { fontFamily: fonts.semibold, fontSize: 13, letterSpacing: 0.3, color: colors.muted, marginBottom: 8 },
  link: { fontFamily: fonts.medium, fontSize: 13, color: colors.primary },
});

export { EmptyState };
