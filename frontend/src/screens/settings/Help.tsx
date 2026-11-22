import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Safety, errorMessage } from '../../api';
import { colors, fonts, radius, space } from '../../theme';
import { Button, Card, Group, InfoNote, ListRow, RadioRow, SelectField, TextField, useToast } from '../../ui';
import { SettingsPage } from './SettingsHome';
import { FAQS, SAFETY_RESOURCES } from '../../content/articles';

export function Help({ navigation }: any) {
  return (
    <SettingsPage active="help" title="Help & Support" subtitle="FAQs, contact us, and support resources.">
      <Card padded={false}>
        <ListRow icon="help-circle-outline" tint="green" title="FAQs" subtitle="Answers to common questions" onPress={() => navigation.navigate('FAQs')} />
        <ListRow icon="chatbubbles-outline" tint="blue" title="Contact Support" subtitle="Send a message to our support team" onPress={() => navigation.navigate('ContactSupport')} />
        <ListRow icon="bug-outline" tint="orange" title="Report a Problem" subtitle="Tell us when something isn't working" onPress={() => navigation.navigate('ReportProblem')} last />
      </Card>
      <Group label="Safety" style={{ marginTop: space.xl }}>
        <ListRow icon="shield-checkmark-outline" tint="red" title="Safety Resources" subtitle="Meeting safely, scams, helplines" onPress={() => navigation.navigate('SafetyResources')} />
        <ListRow icon="people-outline" tint="purple" title="Community Guidelines" subtitle="How we keep Sambandh Setu respectful" onPress={() => navigation.navigate('Info', { slug: 'community-guidelines' })} />
        <ListRow icon="flag-outline" tint="amber" title="Report & Safety" subtitle="Report a user or content" onPress={() => navigation.navigate('ReportSafety')} last />
      </Group>
    </SettingsPage>
  );
}

export function FAQs({ navigation }: any) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <SettingsPage active="help" title="FAQs" subtitle="Answers to common questions.">
      <Card padded={false}>
        {FAQS.map((f, i) => (
          <View key={f.q} style={i > 0 ? styles.border : undefined}>
            <Pressable onPress={() => setOpen(open === i ? null : i)} style={styles.q} accessibilityRole="button" accessibilityState={{ expanded: open === i }}>
              <Text style={styles.qText}>{f.q}</Text>
              <Ionicons name={open === i ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
            </Pressable>
            {open === i ? <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}><Text style={styles.a}>{f.a}</Text><Pressable onPress={() => navigation.navigate('FAQDetail', { index: i })}><Text style={styles.link}>Open full answer</Text></Pressable></View> : null}
          </View>
        ))}
      </Card>
      <InfoNote icon="chatbubbles-outline" text="Still need help? Contact our support team." style={{ marginTop: space.lg }}>
        <Button title="Contact Support" variant="text" size="sm" full={false} onPress={() => navigation.navigate('ContactSupport')} />
      </InfoNote>
    </SettingsPage>
  );
}

export function FAQDetail({ route, navigation }: any) {
  const f = FAQS[Number(route.params?.index) || 0];
  return (
    <SettingsPage active="help" title={f.q} footer={<Button title="Was this helpful? Contact support" variant="secondary" onPress={() => navigation.navigate('ContactSupport')} />}>
      <Card><Text style={styles.a}>{f.a}</Text></Card>
    </SettingsPage>
  );
}

const SUPPORT = ['Account & Login', 'Profile & Verification', 'Connections & Chat', 'Setu Guide', 'Privacy & Safety', 'Payments & Billing', 'Other'];
const PROBLEMS = ["Something isn't working", 'App is slow or crashing', 'Problem with my profile', 'Problem with chat or connections', 'Problem with verification', 'Other'];

function TicketForm({ kind, navigation }: { kind: 'support' | 'problem'; navigation: any }) {
  const toast = useToast();
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = kind === 'support' ? SUPPORT : PROBLEMS;
  const submit = async () => {
    setError(null);
    if (!category) return setError(kind === 'support' ? 'Choose a category' : 'Choose an issue type');
    if (message.trim().length < 10) return setError('Please describe it in at least 10 characters');
    setBusy(true);
    try {
      const r = await Safety.ticket({ kind, category, subject, message: message.trim() });
      navigation.navigate('Result', { kind, message: `${kind === 'support' ? "We've received your message" : "We've received your report"}. Reference ${r.reference}. We'll reply by email.` });
    } catch (e) { setError(errorMessage(e)); toast.show(errorMessage(e), 'error'); } finally { setBusy(false); }
  };
  return (
    <SettingsPage active="help" title={kind === 'support' ? 'Contact Support' : 'Report a Problem'} subtitle={kind === 'support' ? "We're here to help. Tell us what you need." : "Tell us what's not working and we'll look into it."}
      footer={<View style={{ gap: 8 }}>{error ? <InfoNote tone="red" icon="alert-circle" text={error} /> : null}<Button title="Submit" onPress={submit} loading={busy} /></View>}>
      <SelectField label={kind === 'support' ? 'Support category' : 'Issue type'} required value={category} options={list} onChange={setCategory} placeholder="Select" />
      {kind === 'support' ? <TextField label="Subject" optional value={subject} onChangeText={setSubject} maxLength={120} /> : null}
      <TextField label="Message" required multiline value={message} onChangeText={(t) => setMessage(t.slice(0, 1000))} counter={1000} placeholder={kind === 'support' ? 'How can we help?' : 'What happened? What did you expect?'} />
      <InfoNote icon="mail-outline" text="We'll reply to the email address on your account." />
    </SettingsPage>
  );
}

export const ContactSupport = (p: any) => <TicketForm kind="support" {...p} />;
export const ReportProblem = (p: any) => <TicketForm kind="problem" {...p} />;

export function SafetyResources({ navigation }: any) {
  return (
    <SettingsPage active="help" title="Safety Resources" subtitle="Practical guidance to stay safe.">
      <Card padded={false}>
        {SAFETY_RESOURCES.map((r, i) => <ListRow key={r.slug} icon={r.icon as any} tint={r.tint as any} title={r.title} subtitle={r.text} onPress={() => navigation.navigate('Info', { slug: r.slug })} last={i === SAFETY_RESOURCES.length - 1} />)}
      </Card>
      <InfoNote tone="red" icon="call" title="In immediate danger?" text="Call 112 for emergency help." style={{ marginTop: space.lg }} />
    </SettingsPage>
  );
}

export function About({ navigation }: any) {
  const version = Constants.expoConfig?.version || '1.0.0';
  return (
    <SettingsPage active="about" title="About Sambandh Setu" subtitle="Find with purpose. Connect with trust.">
      <Card style={{ marginBottom: space.lg }}>
        <Text style={styles.a}>Sambandh Setu is a relationship platform for people who are ready for meaningful, value-aligned connections, with an eight-stage journey you move through together, private reflection, optional family involvement and a guide that suggests but never decides.</Text>
        <Text style={[styles.small, { marginTop: 10 }]}>Version {version}</Text>
      </Card>
      <Card padded={false}>
        <ListRow icon="information-circle-outline" tint="blue" title="Our approach" onPress={() => navigation.navigate('Info', { slug: 'about' })} />
        <ListRow icon="document-text-outline" tint="slate" title="Terms of Service" onPress={() => navigation.navigate('Info', { slug: 'terms' })} />
        <ListRow icon="shield-outline" tint="slate" title="Privacy Policy" onPress={() => navigation.navigate('Info', { slug: 'privacy-policy' })} />
        <ListRow icon="people-outline" tint="slate" title="Community Guidelines" onPress={() => navigation.navigate('Info', { slug: 'community-guidelines' })} last />
      </Card>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  border: { borderTopWidth: 1, borderTopColor: colors.border },
  q: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, minHeight: 56 },
  qText: { flex: 1, fontFamily: fonts.semibold, fontSize: 14.5, color: colors.text },
  a: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: colors.textSoft },
  link: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary, marginTop: 8 },
  small: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted },
});

export { RadioRow, radius };
