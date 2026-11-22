import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MeApi, assetUrl, errorMessage } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { colors, fonts, radius, space } from '../../theme';
import { Button, ButtonRow, Card, Chip, ChipGroup, InfoNote, OptionTile, RadioRow, ResultView, Screen, SelectField, StepBar, TextField, TextLink, ToggleRow, useToast } from '../../ui';
import { SchemaFields, summarise } from '../../components/SchemaForm';
import { BUILDER, EDUCATION, INTENTS, LANGUAGES, LIFESTYLE, OCCUPATIONS, PREFERENCES, PREFERENCE_ORDER, VALUE_OPTIONS } from '../../content/forms';
import { pickImage } from '../../utils/image';
import { useLayout } from '../../hooks/useLayout';

const INTEREST_OPTIONS = ['Travel', 'Reading', 'Music', 'Movies', 'Cooking', 'Photography', 'Art', 'Fitness', 'Nature', 'Cricket', 'Yoga', 'Dance', 'Gaming', 'Tech', 'Spirituality', 'Volunteering', 'Food', 'Writing'];

/** Edit Profile: photo, introduction, career, languages, interests, values, intent. */
export function EditAbout({ navigation }: any) {
  const { user, refresh, setUser } = useAuth();
  const toast = useToast();
  const p = user!.profile;
  const [f, setF] = useState({ bio: p.bio, education: p.education, profession: p.profession, languages: p.languages, interests: p.interests, values: p.values, intent: p.intent });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: any) => setF((s) => ({ ...s, [k]: v }));
  const photo = async () => {
    try { const d = await pickImage(); if (!d) return; await MeApi.uploadPhoto(d); await refresh(); toast.show('Photo updated'); } catch (e) { toast.show(errorMessage(e), 'error'); }
  };
  const removePhoto = async () => { await MeApi.removePhoto(); await refresh(); toast.show('Photo removed', 'info'); };
  const save = async () => {
    setBusy(true); setError(null);
    try {
      const r = await MeApi.updateProfile({ ...f, intent: f.intent || undefined });
      setUser(r.user); toast.show('Profile saved'); navigation.goBack();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <Screen title="Edit Profile" subtitle="Keep your profile up to date." back="Main" maxWidth={720}
      footer={<View style={{ gap: 8 }}>{error ? <InfoNote tone="red" icon="alert-circle" text={error} /> : null}<ButtonRow><Button title="Cancel" variant="ghost" onPress={() => navigation.goBack()} /><Button title="Save changes" onPress={save} loading={busy} /></ButtonRow></View>}>
      <Card style={{ alignItems: 'center', marginBottom: space.lg }}>
        <Pressable onPress={photo} accessibilityRole="button" accessibilityLabel="Change photo">
          {user!.photoUrl ? <Image source={{ uri: assetUrl(user!.photoUrl) }} style={styles.photo} /> : <View style={[styles.photo, styles.noPhoto]}><Ionicons name="camera-outline" size={28} color={colors.primary} /></View>}
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
          <TextLink title={user!.photoUrl ? 'Change Photo' : 'Add Photo'} onPress={photo} />
          {user!.photoUrl ? <TextLink title="Remove" color={colors.dangerStrong} onPress={removePhoto} /> : null}
        </View>
        <Text style={styles.small}>JPG, PNG or WebP. A clear photo helps people get to know you.</Text>
      </Card>
      <TextField label="About yourself" multiline value={f.bio} onChangeText={(v) => set('bio', v.slice(0, 300))} counter={300} placeholder="Share a few things about yourself" />
      <SelectField label="Education" value={f.education} options={EDUCATION} onChange={(v) => set('education', v)} icon="school-outline" />
      <SelectField label="Profession" value={f.profession} options={OCCUPATIONS} onChange={(v) => set('profession', v)} icon="briefcase-outline" />
      <SelectField label="Looking for" value={f.intent} options={INTENTS.map((i) => ({ value: i.value, label: i.label, description: i.text }))} onChange={(v) => set('intent', v)} icon="heart-outline" />
      <Text style={styles.label}>Languages you speak</Text>
      <ChipGroup options={LANGUAGES} value={f.languages} onChange={(v) => set('languages', v)} style={{ marginBottom: space.xl }} />
      <Text style={styles.label}>Interests</Text>
      <ChipGroup options={Array.from(new Set([...INTEREST_OPTIONS, ...f.interests]))} value={f.interests} onChange={(v) => set('interests', v)} style={{ marginBottom: space.xl }} />
      <Text style={styles.label}>Values</Text>
      <ChipGroup options={Array.from(new Set([...VALUE_OPTIONS.map(([v]) => v), ...f.values]))} value={f.values} onChange={(v) => set('values', v)} />
      <TextLink title="Edit name, date of birth, height and other personal information" icon="create-outline" size={13} style={{ marginTop: space.xl }} onPress={() => navigation.navigate('EditPersonal')} />
    </Screen>
  );
}

/** Lifestyle editors (food 1-8, music, movies, travel, fitness, routine, hobbies). */
export function LifestyleEdit({ route, navigation }: any) {
  const section = route.params?.section as keyof typeof LIFESTYLE;
  const def = LIFESTYLE[section] || LIFESTYLE.food;
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [values, setValues] = useState<Record<string, any>>(user?.profile.lifestyle?.[section] || {});
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const s = def.steps[step];
  const last = step === def.steps.length - 1;
  const save = async () => {
    setBusy(true);
    try {
      const r = await MeApi.updateProfile({ lifestyle: { [section]: values } });
      setUser(r.user); toast.show(`${def.title} saved`);
      navigation.navigate('MyProfileTabs', { tab: 'lifestyle' });
    } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setBusy(false); }
  };
  return (
    <Screen title={s.title} subtitle={s.subtitle} back="Main" onBack={step ? () => setStep(step - 1) : undefined} maxWidth={760}
      footer={<ButtonRow><Button title="Back" variant="outline" onPress={() => (step ? setStep(step - 1) : navigation.goBack())} /><Button title={last ? (def.steps.length > 1 ? 'Submit' : 'Save & Continue') : 'Next'} onPress={() => (last ? save() : setStep(step + 1))} loading={busy} /></ButtonRow>}>
      {def.steps.length > 1 ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: space.lg }}><View style={{ flex: 1 }}><StepBar step={step + 1} total={def.steps.length} /></View><Text style={styles.small}>{step + 1}/{def.steps.length}</Text></View> : null}
      <SchemaFields step={s} values={values} onChange={(k, v) => setValues((o) => ({ ...o, [k]: v }))} />
      {s.summary ? <Card tone="tint"><Text style={styles.h}>Summary</Text><Text style={[styles.body, { marginTop: 4 }]}>{summarise(values, 8) || 'Nothing selected yet'}</Text></Card> : null}
    </Screen>
  );
}

/** Partner preference sections ("user preference 1-6"). Next walks through all sections, then Review. */
export function PreferencesEdit({ route, navigation }: any) {
  const section = (route.params?.section || 'basic') as keyof typeof PREFERENCES;
  const def = PREFERENCES[section];
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [values, setValues] = useState<Record<string, any>>(user?.profile.preferences?.[section] || {});
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const s = def.steps[step];
  const lastStep = step === def.steps.length - 1;
  const idx = PREFERENCE_ORDER.indexOf(section as any);
  const persist = async () => {
    const r = await MeApi.updateProfile({ preferences: { [section]: values } });
    setUser(r.user);
  };
  const next = async (exit = false) => {
    if (!lastStep && !exit) return setStep(step + 1);
    setBusy(true);
    try {
      await persist();
      if (exit || idx === PREFERENCE_ORDER.length - 1) navigation.navigate('PreferencesReview');
      else navigation.replace('PreferencesEdit', { section: PREFERENCE_ORDER[idx + 1] });
    } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setBusy(false); }
  };
  return (
    <Screen title={s.title} subtitle={s.subtitle} back="Main" variant="large" maxWidth={720}
      footer={<View style={{ gap: 6 }}><Button title="Next" onPress={() => next()} loading={busy} /><TextLink title="Save & Exit" style={{ alignSelf: 'center' }} onPress={() => next(true)} /></View>}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: space.lg }}>
        <View style={{ flex: 1 }}><StepBar step={idx + 1} total={PREFERENCE_ORDER.length} /></View>
        <Text style={styles.small}>{idx + 1}/{PREFERENCE_ORDER.length}</Text>
      </View>
      <SchemaFields step={s} values={values} onChange={(k, v) => setValues((o) => ({ ...o, [k]: v }))} />
    </Screen>
  );
}

/** "Review Preferences" then "Preferences Saved!". */
export function PreferencesReview({ navigation }: any) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const prefs = user?.profile.preferences || {};
  const rows: [string, string, string][] = [
    ['Age Range', prefs.basic?.ageMin && prefs.basic?.ageMax ? `${prefs.basic.ageMin} – ${prefs.basic.ageMax} years` : '', 'basic'],
    ['Height', prefs.basic?.height, 'basic'],
    ['Location', prefs.basic?.location, 'basic'],
    ['Education', prefs.basic?.education, 'basic'],
    ['Profession', prefs.basic?.profession, 'basic'],
    ['Marital Status', prefs.basic?.maritalStatus, 'basic'],
    ['Lifestyle', summarise(prefs.lifestyle, 3), 'lifestyle'],
    ['Family', summarise(prefs.family, 3), 'family'],
    ['Values', summarise(prefs.values, 3), 'values'],
    ['Additional', summarise(prefs.additional, 3), 'additional'],
  ];
  if (saved) {
    return (
      <Screen variant="none" title="Preferences saved" maxWidth={560} centerContent>
        <ResultView image={require('../../../assets/illustrations/prefs-saved.png')} title="Preferences Saved!" message="We'll use your preferences to show more relevant profiles. You can update them anytime."
          primary={{ label: 'Explore Profiles', arrow: true, onPress: () => navigation.navigate('Main', { screen: 'Connections', params: { tab: 'discover' } }) }}
          secondary={{ label: 'View My Profile', onPress: () => navigation.navigate('MyProfileTabs', { tab: 'preferences' }) }} />
      </Screen>
    );
  }
  return (
    <Screen title="Review Preferences" subtitle="Here is a summary of your preferences. You can edit anytime." back="Main" variant="center" maxWidth={720}
      footer={<Button title="Save Preferences" onPress={() => setSaved(true)} />}>
      <Card padded={false}>
        {rows.map(([label, value, section], i) => (
          <Pressable key={label} onPress={() => navigation.navigate('PreferencesEdit', { section })} accessibilityRole="button" accessibilityLabel={`${label}: ${value || 'Not set'}. Edit`} style={[styles.reviewRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <Text style={styles.reviewLabel}>{label}</Text>
            <Text style={styles.reviewValue}>{value || 'Not set'}</Text>
            <Ionicons name="pencil" size={15} color={colors.primary} />
          </Pressable>
        ))}
      </Card>
      <InfoNote icon="lock-closed" text="Your preferences are private. They are only used to suggest relevant profiles." style={{ marginTop: space.lg }} />
    </Screen>
  );
}

/** Family background + involvement preference + sharing switch. */
export function FamilyEdit({ navigation }: any) {
  const { user, setUser, settings, updateSettings } = useAuth();
  const toast = useToast();
  const fam = user?.profile.family || {};
  const [f, setF] = useState<Record<string, any>>({ ...fam, involvement: fam.involvement || {} });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((s) => ({ ...s, [k]: v }));
  const save = async () => {
    setBusy(true);
    try { const r = await MeApi.updateProfile({ family: f }); setUser(r.user); toast.show('Family details saved'); navigation.goBack(); } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setBusy(false); }
  };
  return (
    <Screen title="Family Background" subtitle="Share as much or as little as you like." back="Main" maxWidth={720}
      footer={<ButtonRow><Button title="Cancel" variant="ghost" onPress={() => navigation.goBack()} /><Button title="Save" onPress={save} loading={busy} /></ButtonRow>}>
      <TextField label="Father" value={f.father || ''} onChangeText={(v) => set('father', v)} placeholder="e.g. Businessman" maxLength={60} />
      <TextField label="Mother" value={f.mother || ''} onChangeText={(v) => set('mother', v)} placeholder="e.g. Homemaker" maxLength={60} />
      <SelectField label="Family Type" value={f.familyType || ''} options={['Nuclear Family', 'Joint Family', 'Extended Family']} onChange={(v) => set('familyType', v)} />
      <TextField label="Siblings" value={f.siblings || ''} onChangeText={(v) => set('siblings', v)} placeholder="e.g. Younger brother (studying)" maxLength={80} />
      <TextField label="Religion" optional value={f.religion || ''} onChangeText={(v) => set('religion', v)} maxLength={40} />
      <TextField label="Caste / Community" optional value={f.caste || ''} onChangeText={(v) => set('caste', v)} maxLength={40} />
      <TextField label="Sub-caste" optional value={f.subCaste || ''} onChangeText={(v) => set('subCaste', v)} maxLength={40} />
      <TextField label="Family Location" value={f.location || ''} onChangeText={(v) => set('location', v)} maxLength={60} />
      <SelectField label="Family Values" value={f.values || ''} options={['Traditional', 'Traditional with modern outlook, respect, togetherness', 'Moderate', 'Liberal']} onChange={(v) => set('values', v)} />
      <TextField label="A note about your family" optional multiline value={f.note || ''} onChangeText={(v) => set('note', v.slice(0, 200))} counter={200} placeholder="e.g. My family is supportive of my choices and values open communication." />
      <SelectField label="Preferred stage for family involvement" value={f.involvement?.preferredStage || ''} options={['From the beginning', 'After mutual understanding', 'Once we are both sure']} onChange={(v) => set('involvement', { ...f.involvement, preferredStage: v })} />
      <SelectField label="Family meeting" value={f.involvement?.meeting || ''} options={['Open to meeting family when both are comfortable', 'After a few conversations', 'Only at the decision stage']} onChange={(v) => set('involvement', { ...f.involvement, meeting: v })} />
      <Card padded={false} style={{ paddingHorizontal: 16 }}>
        <ToggleRow title="Show family details on my profile" description="Off by default. When on, people who can see your profile can see these details." value={!!settings?.privacy.sharing.family} onChange={(v) => updateSettings({ privacy: { sharing: { family: v } } }).catch(() => {})} last />
      </Card>
    </Screen>
  );
}

/** Optional builder after onboarding (App "Keep in mind", "type of partner", "enjoy", "imp in relation", lifestyle). */
export function ProfileBuilder({ route, navigation }: any) {
  const step = Math.max(0, Math.min(5, Number(route.params?.step) || 0));
  const { user, setUser } = useAuth();
  const toast = useToast();
  const { wide } = useLayout();
  const p = user!.profile;
  const [hoping, setHoping] = useState<string>(p.lifestyle?.builder?.hoping || '');
  const [enjoy, setEnjoy] = useState<string[]>(p.interests || []);
  const [matters, setMatters] = useState<string[]>(p.values || []);
  const [style, setStyle] = useState<string>(p.lifestyle?.builder?.style || '');
  const [live, setLive] = useState<string>(p.lifestyle?.builder?.live || '');
  const [career, setCareer] = useState<string>(p.lifestyle?.builder?.career || '');
  const go = (n: number) => (n > 5 ? finish() : navigation.setParams({ step: n }));
  const finish = async () => {
    try {
      const r = await MeApi.updateProfile({ interests: enjoy, values: matters, lifestyle: { builder: { hoping, style, live, career } } });
      setUser(r.user); toast.show('Profile updated');
    } catch (e) { toast.show(errorMessage(e), 'error'); }
    navigation.navigate('Main', { screen: 'Home' });
  };
  const footer = step === 0 ? <Button title="Got it" onPress={() => go(1)} /> : (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <TextLink title="Skip for now" onPress={() => go(step + 1)} />
      <Button title={step === 5 ? 'Finish' : 'Continue'} full={false} onPress={() => go(step + 1)} style={{ minWidth: 150 }} />
    </View>
  );
  return (
    <Screen title="" variant="large" back="Main" onBack={step ? () => go(step - 1) : undefined} maxWidth={640} footer={footer}>
      {step > 0 ? <View style={{ marginBottom: space.lg }}><StepBar step={step} total={5} /></View> : null}
      {step === 0 ? (
        <View>
          <View style={styles.bulb}><Ionicons name="bulb-outline" size={26} color={colors.primary} /></View>
          <Text style={[styles.serif, { textAlign: 'center' }]}>Keep in Mind</Text>
          {[['lock-closed-outline', 'Your preferences are private.', 'They are only used to suggest relevant profiles.'], ['funnel-outline', 'You can change anytime.', 'Update your preferences whenever you like.'], ['people-outline', 'These are just preferences.', 'You will still have full control over who you connect with.']].map(([i, t, d]) => (
            <Card key={t} tone="soft" style={{ flexDirection: 'row', gap: 14, alignItems: 'center', marginTop: 12 }}><Ionicons name={i as any} size={24} color={colors.primary} /><View style={{ flex: 1 }}><Text style={styles.h}>{t}</Text><Text style={styles.body}>{d}</Text></View></Card>
          ))}
        </View>
      ) : null}
      {step === 1 ? (<View><Text style={styles.serif}>What are you hoping to build with a partner?</Text><View style={{ height: 16 }} />{BUILDER.hoping.map((o) => <RadioRow key={o} label={o} selected={hoping === o} onPress={() => setHoping(o)} />)}</View>) : null}
      {step === 2 ? (
        <View>
          <Text style={styles.serif}>What do you enjoy?</Text>
          <Text style={[styles.body, { marginBottom: 16 }]}>Choose the things you genuinely enjoy. There are no right answers.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{BUILDER.enjoy.map(([v, icon]) => <View key={v} style={{ width: wide ? '31.5%' : '31%' } as any}><OptionTile label={v} icon={icon as any} selected={enjoy.includes(v)} onPress={() => setEnjoy(enjoy.includes(v) ? enjoy.filter((x) => x !== v) : [...enjoy, v])} /></View>)}</View>
        </View>
      ) : null}
      {step === 3 ? (<View><Text style={styles.serif}>What matters to you in a relationship?</Text><Text style={[styles.body, { marginBottom: 16 }]}>Choose up to 5.</Text><ChipGroup options={BUILDER.matters} value={matters} onChange={setMatters} max={5} /></View>) : null}
      {step === 4 ? (<View><Text style={styles.serif}>How would you describe your lifestyle?</Text><View style={{ height: 16 }} />{BUILDER.lifestyle.map((o) => <RadioRow key={o} label={o} selected={style === o} onPress={() => setStyle(o)} />)}</View>) : null}
      {step === 5 ? (
        <View>
          <Text style={styles.serif}>Lifestyle preferences</Text>
          <Text style={[styles.h, { marginTop: 16, marginBottom: 8 }]}>Where would you ideally like to live?</Text>
          {BUILDER.live.map((o) => <RadioRow key={o} label={o} selected={live === o} onPress={() => setLive(o)} />)}
          <Text style={[styles.h, { marginTop: 16, marginBottom: 8 }]}>How important is career growth to you?</Text>
          {BUILDER.career.map((o) => <RadioRow key={o} label={o} selected={career === o} onPress={() => setCareer(o)} />)}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { width: 110, height: 110, borderRadius: 55, backgroundColor: colors.primarySoft },
  noPhoto: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary },
  small: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 4, textAlign: 'center' },
  label: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.text, marginBottom: 10 },
  h: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 20, color: colors.muted },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  reviewLabel: { width: 120, fontFamily: fonts.semibold, fontSize: 13.5, color: colors.navy },
  reviewValue: { flex: 1, fontFamily: fonts.regular, fontSize: 13.5, color: colors.textSoft },
  serif: { fontFamily: fonts.display, fontSize: 26, lineHeight: 34, color: colors.navy },
  bulb: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12 },
});
