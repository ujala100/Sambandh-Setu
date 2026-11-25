import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Family, errorMessage, assetUrl } from '../../api';
import { colors, fonts, radius, space } from '../../theme';
import { Button, Card, ErrorState, IconTile, KeyValue, Loading, Screen, Tag, Txt, ResultView } from '../../ui';

const PERMS = [
  { key: 'basicProfile', title: 'Basic profile details', text: 'Name, age, education, location', icon: 'person-circle-outline' },
  { key: 'photos', title: 'Photos', text: 'Selected photos', icon: 'image-outline' },
  { key: 'partnerPreferences', title: 'Partner preferences', text: 'Preference criteria', icon: 'shield-outline' },
  { key: 'communicationSupport', title: 'Communication support', text: 'Help with managing interest requests (optional)', icon: 'chatbox-outline' },
] as const;

/**
 * The family member's side of Family Access ("Family Access Invitation" and
 * "Family Access Permissions Preview"). Works without an account.
 */
export default function FamilyInvite({ route, navigation }: any) {
  const token: string = route.params?.token || '';
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'invite' | 'preview' | 'declined'>('invite');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Family.invitation(token).then((d) => { setData(d); if (d.status === 'active') setStep('preview'); }).catch((e) => setError(errorMessage(e)));
  }, [token]);

  const respond = async (accept: boolean) => {
    setBusy(true);
    try {
      if (accept) { setData(await Family.accept(token)); setStep('preview'); }
      else { await Family.decline(token); setStep('declined'); }
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };

  if (error) return <Screen title="Family Access Invitation" variant="center"><ErrorState title="This invitation is not available" message={error} /></Screen>;
  if (!data) return <Screen title="Family Access Invitation" variant="center"><Loading /></Screen>;
  if (step === 'declined') {
    return <Screen variant="none" title="Invitation declined"><ResultView tone="blue" icon="close" title="Invitation declined" message={`We've let ${data.ownerFirstName} know. You can close this page.`} /></Screen>;
  }

  if (step === 'invite') {
    return (
      <Screen variant="none" title="Family Access Invitation" maxWidth={560} centerContent footer={
        <View style={{ gap: 10 }}>
          <Button title="Accept Invitation" onPress={() => respond(true)} loading={busy} />
          <Button title="Decline" variant="ghost" onPress={() => respond(false)} />
        </View>
      }>
        <View style={{ alignItems: 'center', marginTop: space.xl }}>
          <IconTile name="link" size={84} round tint="blue" />
          <Txt variant="display" center style={{ marginTop: space.lg }}>Family Access Invitation</Txt>
          <Txt variant="body" center color={colors.muted} style={{ marginTop: 6 }}>You've been invited to view a profile on Sambandh Setu.</Txt>
        </View>
        <Card style={{ marginTop: space.xl }}>
          <KeyValue label="Invited by" value={data.ownerFirstName} />
          <KeyValue label="Relationship" value={data.relationship} />
          <KeyValue label="Access level" value="Selected information" last />
        </Card>
        {data.message ? <Card tone="tint" style={{ marginTop: space.md }}><Txt variant="caption">Their note</Txt><Txt variant="body" style={{ marginTop: 4 }}>"{data.message}"</Txt></Card> : null}
        <Txt variant="caption" center style={{ marginTop: space.lg }}>Family members can view what is shared. They cannot message anyone or change anything.</Txt>
      </Screen>
    );
  }

  const p = data.profile;
  return (
    <Screen variant="none" title="What you can see" maxWidth={640} centerContent>
      <Txt variant="display" center style={{ marginTop: space.lg }}>What will you be able to see?</Txt>
      <Txt variant="body" center color={colors.muted} style={{ marginTop: 6, marginBottom: space.xl }}>{data.ownerFirstName} has selected the following information to share with you.</Txt>
      <Card padded={false}>
        {PERMS.filter((x) => data.permissions?.[x.key]).map((x, i, arr) => (
          <View key={x.key} style={[styles.perm, i < arr.length - 1 && styles.border]}>
            <IconTile name={x.icon as any} size={38} tint="blue" />
            <View style={{ flex: 1 }}><Text style={styles.permTitle}>{x.title}</Text><Text style={styles.permText}>{x.text}</Text></View>
          </View>
        ))}
      </Card>
      {p ? (
        <Card style={{ marginTop: space.lg }}>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: space.md }}>
            {data.photoUrl ? <Image source={{ uri: assetUrl(data.photoUrl) }} style={{ width: 72, height: 72, borderRadius: 14 }} accessibilityLabel={`${p.name}'s photo`} /> : null}
            <View style={{ flex: 1 }}>
              <Txt variant="title">{p.name}{p.age ? `, ${p.age}` : ''}</Txt>
              <Txt variant="caption">{[p.profession, p.location].filter(Boolean).join(' · ')}</Txt>
            </View>
          </View>
          {p.bio ? <Txt variant="body" style={{ marginBottom: space.md }}>"{p.bio}"</Txt> : null}
          <KeyValue label="Education" value={p.education} />
          <KeyValue label="Languages" value={(p.languages || []).join(', ')} last />
          {(p.values || []).length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.md }}>{p.values.map((v: string) => <Tag key={v} label={v} />)}</View> : null}
        </Card>
      ) : null}
      {data.partnerPreferences?.basic ? (
        <Card style={{ marginTop: space.lg }}>
          <Txt variant="section" style={{ marginBottom: 8 }}>Partner preferences</Txt>
          {data.partnerPreferences.basic.ageMin ? <KeyValue label="Age range" value={`${data.partnerPreferences.basic.ageMin} - ${data.partnerPreferences.basic.ageMax} years`} /> : null}
          <KeyValue label="Education" value={data.partnerPreferences.basic.education} />
          <KeyValue label="Location" value={data.partnerPreferences.basic.location} last />
        </Card>
      ) : null}
      <Txt variant="caption" center style={{ marginTop: space.xl }}>{data.ownerFirstName} can change or remove this access at any time.</Txt>
      <Button title="Learn about Sambandh Setu" variant="text" onPress={() => navigation.navigate('Info', { slug: 'about' })} style={{ marginTop: space.md }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  perm: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  border: { borderBottomWidth: 1, borderBottomColor: colors.border },
  permTitle: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.text },
  permText: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  note: { borderRadius: radius.card },
});
