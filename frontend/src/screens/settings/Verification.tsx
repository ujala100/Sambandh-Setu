import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Verification as V, VerificationApi, errorMessage } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useLoad } from '../../hooks/useAsync';
import { colors, fonts, radius, space } from '../../theme';
import { Button, Card, CheckItem, ErrorState, InfoNote, ListRow, Loading, RadioRow, ResultView, Screen, StatePill, StepBar, TextField, useToast } from '../../ui';
import { SettingsPage } from './SettingsHome';
import { formatDate, formatTime } from '../../utils/format';
import { pickImage } from '../../utils/image';

const TYPES = {
  identity: { title: 'Identity verification', text: 'Verify your identity with a government ID.', icon: 'shield-checkmark-outline', tint: 'blue', recommended: true },
  professional: { title: 'Professional verification', text: 'Verify your professional information (e.g., education or employment).', icon: 'school-outline', tint: 'purple' },
  additional: { title: 'Additional verification', text: 'Optionally verify more information to build trust.', icon: 'checkmark-done-outline', tint: 'green' },
} as const;

/** Verification (Main): status of each type and entry points. */
export function Verification({ navigation }: any) {
  const { data, error, loading, reload } = useLoad(() => VerificationApi.status());
  return (
    <SettingsPage active="verification" title="Verification" subtitle="Verify your profile for more trust and safety.">
      {loading && !data ? <Loading /> : error && !data ? <ErrorState message={error} onRetry={reload} /> : data ? (
        <>
          <Card padded={false}>
            {(Object.keys(TYPES) as (keyof typeof TYPES)[]).map((k, i) => {
              const t = TYPES[k];
              const v = data[k];
              return (
                <ListRow key={k} icon={t.icon as any} tint={t.tint as any} title={t.title} subtitle={v ? `${v.docType} · submitted ${formatDate(v.createdAt)}` : t.text}
                  badge={v ? <StatePill state={v.status} /> : 'recommended' in t ? <StatePill state="x" label="Recommended" /> : undefined}
                  onPress={() => navigation.navigate('VerificationFlow', { type: k })} last={i === 2} />
              );
            })}
          </Card>
          <ListRow icon="information-circle-outline" tint="slate" title="About verification" subtitle="What verification means and how your documents are protected" onPress={() => navigation.navigate('Info', { slug: 'about-verification' })} />
          <InfoNote icon="lock-closed" text="Your documents are encrypted in transit, reviewed only by our team, never shown to other members and deleted when you delete your account." style={{ marginTop: space.md }} />
        </>
      ) : null}
    </SettingsPage>
  );
}

/**
 * One verification type: intro → choose document → upload → review → in progress / verified / needs action.
 */
export function VerificationFlow({ route, navigation }: any) {
  const type: keyof typeof TYPES = route.params?.type || 'identity';
  const { user } = useAuth();
  const toast = useToast();
  const { data, reload, loading } = useLoad(() => VerificationApi.status());
  const existing: V | null = data?.[type] || null;
  const [step, setStep] = useState(0);
  const [docType, setDocType] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [details, setDetails] = useState({ fullName: user?.name || '', dateOfBirth: user?.profile.dateOfBirth || '', idLast4: '', address: user?.profile.location || '', organisation: '', role: user?.profile.profession || '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = TYPES[type];
  const docs = data?.docTypes?.[type] || [];
  const twoSides = type === 'identity' && ['Aadhaar Card', 'Driving License', 'Voter ID'].includes(docType);

  if (loading && !data) return <SettingsPage active="verification" title={t.title}><Loading /></SettingsPage>;

  // Existing request: show its state.
  if (existing) {
    if (existing.status === 'verified') {
      return (
        <Screen variant="none" title="Verified" maxWidth={560} centerContent>
          <ResultView tone="green" title={type === 'identity' ? 'Identity verified!' : 'Verification complete!'} message="Your verification is complete. This helps build trust in the Sambandh Setu community." primary={{ label: 'Done', onPress: () => navigation.navigate('Verification') }}>
            <Text style={styles.h}>What this unlocks</Text>
            <CheckItem text="Verified badge on your profile" /><CheckItem text="More trust from other members" /><CheckItem text="People who only accept verified members can contact you" />
          </ResultView>
        </Screen>
      );
    }
    if (existing.status === 'needs_action') {
      return (
        <Screen variant="none" title="Action needed" maxWidth={560} centerContent>
          <ResultView tone="red" icon="alert" title="Action needed" message="We couldn't verify your details with the current document."
            primary={{ label: 'Try again', onPress: async () => { await VerificationApi.withdraw(existing.id); reload(); } }} secondary={{ label: 'Contact support', onPress: () => navigation.navigate('ContactSupport') }}>
            <Card style={{ backgroundColor: colors.dangerSoft, borderColor: '#F3C9C9' }}>
              <Text style={[styles.h, { color: colors.danger }]}>{existing.reviewerNote ? 'Reviewer note' : 'Possible reasons'}</Text>
              {existing.reviewerNote ? <Text style={styles.body}>{existing.reviewerNote}</Text> : ['The image is unclear or blurry', 'The document is expired', 'The details do not match', 'The document type is not accepted'].map((r) => <CheckItem key={r} text={r} tone="red" />)}
            </Card>
          </ResultView>
        </Screen>
      );
    }
    return (
      <SettingsPage active="verification" title="Verification in progress" subtitle="We're reviewing your information.">
        <Image source={require('../../../assets/illustrations/id-card.png')} style={{ width: 220, height: 130, alignSelf: 'center', marginVertical: space.lg }} resizeMode="contain" />
        <Card>
          {[['Document uploaded', `${formatDate(existing.createdAt)}, ${formatTime(existing.createdAt)}`, 'done'], ['Under review', 'Our team is verifying your information.', 'current'], ['Verification complete', '', 'todo']].map(([title, sub, state], i) => (
            <View key={title} style={{ flexDirection: 'row', gap: 12, marginBottom: i < 2 ? 16 : 0 }}>
              <Ionicons name={state === 'done' ? 'checkmark-circle' : state === 'current' ? 'radio-button-on' : 'ellipse-outline'} size={22} color={state === 'todo' ? colors.faint : state === 'done' ? colors.navy : colors.primary} />
              <View><Text style={styles.name}>{title}</Text>{sub ? <Text style={styles.small}>{sub}</Text> : null}</View>
            </View>
          ))}
        </Card>
        <InfoNote text="You'll be notified once your verification is complete. You can continue using the app while we review." style={{ marginTop: space.lg }} />
      </SettingsPage>
    );
  }

  const addImage = async () => {
    try { const d = await pickImage({ square: false, maxSize: 1600 }); if (d) setImages((s) => [...s, d].slice(0, 2)); } catch (e) { toast.show(errorMessage(e), 'error'); }
  };
  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const d: Record<string, string> = { fullName: details.fullName };
      if (type === 'identity') Object.assign(d, { dateOfBirth: details.dateOfBirth, idLast4: details.idLast4 });
      if (type === 'professional') Object.assign(d, { organisation: details.organisation, role: details.role });
      if (type === 'additional') Object.assign(d, { address: details.address });
      await VerificationApi.submit({ type, docType, images, details: d });
      navigation.navigate('Result', { kind: 'verificationSubmitted' });
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };

  const steps = ['Select document type', 'Upload document', 'Review details'];
  const next = () => {
    setError(null);
    if (step === 1 && !docType) return setError('Choose a document type');
    if (step === 2 && (!images.length || (twoSides && images.length < 2))) return setError(twoSides ? 'Upload both the front and back' : 'Upload a clear photo of the document');
    setStep(step + 1);
  };

  return (
    <SettingsPage active="verification" title={step === 0 ? t.title : steps[step - 1]} subtitle={step === 0 ? 'Verify your details to build trust and have a safer experience on Sambandh Setu.' : undefined}
      onBack={step ? () => setStep(step - 1) : undefined}
      footer={<View style={{ gap: 8 }}>{error ? <InfoNote tone="red" icon="alert-circle" text={error} /> : null}{step < 3 ? <Button title="Continue" onPress={next} disabled={step === 2 && !images.length} /> : <Button title="Submit for verification" onPress={submit} loading={busy} />}</View>}>
      {step > 0 ? <View style={{ marginBottom: space.lg }}><StepBar step={step} total={3} /></View> : null}
      {step === 0 ? (
        <>
          <Image source={require('../../../assets/illustrations/id-card.png')} style={{ width: 220, height: 130, alignSelf: 'center', marginBottom: space.lg }} resizeMode="contain" />
          <Text style={styles.h}>What you'll need</Text>
          <Text style={[styles.small, { marginBottom: 10 }]}>{type === 'identity' ? 'A government-issued ID such as:' : type === 'professional' ? 'One of these documents:' : 'Any of these documents:'}</Text>
          {docs.map((d) => <CheckItem key={d} text={d} />)}
          <View style={{ marginTop: space.md, gap: 8 }}>
            <View style={styles.row}><Ionicons name="lock-closed-outline" size={16} color={colors.muted} /><Text style={styles.small}>Your information is secure and will only be used for verification.</Text></View>
            <View style={styles.row}><Ionicons name="eye-off-outline" size={16} color={colors.muted} /><Text style={styles.small}>It will not be shared with other users.</Text></View>
          </View>
        </>
      ) : null}
      {step === 1 ? (
        <>
          {docs.map((d) => <RadioRow key={d} label={d} selected={docType === d} onPress={() => setDocType(d)} />)}
          <InfoNote text="Make sure your document is valid, not expired, and the details are clearly visible." style={{ marginTop: space.md }} />
        </>
      ) : null}
      {step === 2 ? (
        <>
          <Text style={[styles.body, { marginBottom: space.lg }]}>Upload clear photos of your {docType}{twoSides ? ' (front and back)' : ''}.</Text>
          {(twoSides ? ['Front side', 'Back side'] : ['Document']).map((label, i) => (
            <Pressable key={label} onPress={addImage} disabled={!!images[i] || images.length !== i} style={styles.drop} accessibilityRole="button" accessibilityLabel={`Upload ${label}`}>
              {images[i] ? <Image source={{ uri: images[i] }} style={{ width: '100%' as any, height: 140, borderRadius: 8 }} resizeMode="cover" /> : (
                <><Ionicons name="card-outline" size={28} color={colors.primary} /><Text style={styles.name}>{label}</Text><Text style={styles.small}>Tap to upload a photo (JPG or PNG)</Text></>
              )}
            </Pressable>
          ))}
          {images.length ? <Button title="Remove photos and start again" variant="text" size="sm" onPress={() => setImages([])} /> : null}
          <Text style={[styles.h, { marginTop: space.md }]}>Photo tips</Text>
          {['Ensure the text is clearly visible', 'Avoid glare or blur', 'Show the full document', 'Use a well-lit environment'].map((x) => <CheckItem key={x} text={x} />)}
        </>
      ) : null}
      {step === 3 ? (
        <>
          <Text style={[styles.body, { marginBottom: space.lg }]}>Check the information. It must match your document.</Text>
          <TextField label="Full name (as on document)" value={details.fullName} onChangeText={(v) => setDetails((s) => ({ ...s, fullName: v }))} />
          {type === 'identity' ? <TextField label="Last 4 digits of the ID number" value={details.idLast4} onChangeText={(v) => setDetails((s) => ({ ...s, idLast4: v.replace(/\D/g, '').slice(0, 4) }))} keyboardType="number-pad" placeholder="1234" helper="We only store the last 4 digits." /> : null}
          {type === 'professional' ? <><TextField label="Organisation / institution" value={details.organisation} onChangeText={(v) => setDetails((s) => ({ ...s, organisation: v }))} /><TextField label="Role / degree" value={details.role} onChangeText={(v) => setDetails((s) => ({ ...s, role: v }))} /></> : null}
          {type === 'additional' ? <TextField label="City, State" value={details.address} onChangeText={(v) => setDetails((s) => ({ ...s, address: v }))} /> : null}
          <InfoNote text="Make sure the details match your document. Incorrect information may delay verification." />
        </>
      ) : null}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  h: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text, marginBottom: 6 },
  name: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.textSoft },
  small: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted, flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  drop: { alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 130, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primaryLine, backgroundColor: colors.bgTint, borderRadius: radius.card, padding: 16, marginBottom: 12 },
});
