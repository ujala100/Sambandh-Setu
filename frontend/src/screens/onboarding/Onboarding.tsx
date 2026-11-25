import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MeApi, assetUrl, errorMessage } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { AUTH_APP_PALETTE, AuthLayout } from '../../layout/AuthLayout';
import { colors, fonts, radius, space } from '../../theme';
import { useLayout } from '../../hooks/useLayout';
import { Button, ButtonRow, CheckRow, Chip, DateField, InfoNote, OptionTile, RadioRow, ResultView, SelectField, StepBar, TextField, TextLink } from '../../ui';
import { CITIES, COMM_CHANNELS, COMM_CONFLICT, COMM_STYLES, EDUCATION, GENDERS, INTENTS, LANGUAGES, OCCUPATIONS, VALUE_OPTIONS } from '../../content/forms';
import { pickImage } from '../../utils/image';
import { ProfileSection } from '../../components/ProfileSection';

const STEPS = [
  { title: 'Basic Profile', text: 'Tell us about yourself' },
  { title: 'Relationship Intent', text: "Let us know what you're looking for" },
  { title: 'Values & Priorities', text: 'Share what matters to you' },
  { title: 'Partner Preferences', text: 'Choose your preferences (optional)' },
  { title: 'Communication Style', text: 'Tell us how you communicate' },
  { title: 'Review & Complete', text: 'Take a final look before you begin' },
];
const PANEL: Record<number, { heading: string; highlight: string; intro: string }> = {
  1: { heading: "Let's create", highlight: 'your profile', intro: 'Share a few details about yourself. This helps us understand you better and show more relevant connections.' },
  2: { heading: 'What are you', highlight: 'looking for?', intro: 'Tell us about your relationship intentions so we can suggest better matches and guidance.' },
  3: { heading: 'What matters', highlight: 'to you?', intro: 'Share the values that are most important to you in a relationship.' },
  4: { heading: 'Tell us your', highlight: 'partner preferences', intro: 'Help us understand what you are looking for. These preferences help us suggest more relevant matches.' },
  5: { heading: 'How do you', highlight: 'like to communicate?', intro: 'Tell us about your communication style. This helps us suggest compatible matches and better guidance.' },
  6: { heading: 'Review and complete', highlight: 'your profile', intro: "Take a final look at the information you've shared. You can edit any section before completing your profile." },
};
const AGES = Array.from({ length: 43 }, (_, i) => String(18 + i));

export function Onboarding({ navigation, route }: any) {
  const { user, setUser } = useAuth();
  const { wide } = useLayout();
  const pink = !wide;
  const fieldPalette = pink ? AUTH_APP_PALETTE : undefined;
  const step = Math.min(6, Math.max(1, Number(route.params?.step) || 1));
  const p = user!.profile;
  const [f, setF] = useState(() => ({
    fullName: user!.name || '', dateOfBirth: p.dateOfBirth || '', gender: p.gender || '', location: p.location || '', education: p.education || '',
    profession: p.profession || '', bio: p.bio || '', languages: p.languages || [], intent: p.intent || '', values: p.values || [],
    prefs: { ageMin: p.preferences?.basic?.ageMin, ageMax: p.preferences?.basic?.ageMax, height: p.preferences?.basic?.height || '', education: p.preferences?.basic?.education || '', profession: p.preferences?.basic?.profession || '', location: p.preferences?.basic?.location || '', relocate: p.preferences?.additional?.relocation || '', familyType: p.preferences?.family?.familyType || '', lifestyle: (p.preferences?.lifestyle?.tags as string[]) || [] },
    channels: p.communication?.channels || [], styles: p.communication?.styles || [], conflict: p.communication?.conflict || [],
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(user!.photoUrl);
  const set = (k: string, v: any) => { setF((s) => ({ ...s, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };
  const setPref = (k: string, v: any) => setF((s) => ({ ...s, prefs: { ...s.prefs, [k]: v } }));
  const toggle = (k: 'values' | 'channels' | 'styles' | 'conflict' | 'languages', v: string) => set(k, (f[k] as string[]).includes(v) ? (f[k] as string[]).filter((x) => x !== v) : [...(f[k] as string[]), v]);
  const go = (n: number) => navigation.setParams({ step: n });

  useEffect(() => { setError(null); }, [step]);

  const choosePhoto = async () => {
    try {
      const dataUrl = await pickImage();
      if (!dataUrl) return;
      setBusy(true);
      const r = await MeApi.uploadPhoto(dataUrl);
      setPhoto(r.photoUrl);
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };

  const save = async () => {
    setError(null);
    const e: Record<string, string> = {};
    if (step === 1) {
      if (f.fullName.trim().length < 2) e.fullName = 'Enter your full name';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(f.dateOfBirth)) e.dateOfBirth = 'Enter your date of birth as DD/MM/YYYY';
      if (!f.gender) e.gender = 'Select your gender';
      if (!f.location) e.location = 'Select your city';
      if (!f.education) e.education = 'Select your education';
      if (!f.profession) e.profession = 'Select your occupation';
      if (f.bio.trim().length < 20) e.bio = 'Write at least 20 characters about yourself';
    }
    if (step === 2 && !f.intent) e.intent = 'Choose one option';
    if (step === 3 && f.values.length < 2) e.values = 'Choose at least two values';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      let r: any;
      if (step === 1) {
        await MeApi.updateAccount({ fullName: f.fullName.trim(), dateOfBirth: f.dateOfBirth, gender: f.gender, location: f.location });
        r = await MeApi.updateProfile({ education: f.education, profession: f.profession, bio: f.bio.trim(), location: f.location, languages: f.languages });
      } else if (step === 2) r = await MeApi.updateProfile({ intent: f.intent });
      else if (step === 3) r = await MeApi.updateProfile({ values: f.values });
      else if (step === 4) {
        const P = f.prefs;
        r = await MeApi.updateProfile({ preferences: {
          basic: { ...(P.ageMin ? { ageMin: Number(P.ageMin) } : {}), ...(P.ageMax ? { ageMax: Number(P.ageMax) } : {}), height: P.height, education: P.education, profession: P.profession, location: P.location },
          family: { familyType: P.familyType }, additional: { relocation: P.relocate }, lifestyle: { tags: P.lifestyle },
        } });
      } else if (step === 5) r = await MeApi.updateProfile({ communication: { channels: f.channels, styles: f.styles, conflict: f.conflict } });
      if (r?.user) setUser({ ...r.user, onboardingCompleted: false });
      if (step < 6) go(step + 1);
    } catch (err: any) {
      if (err?.field) setErrors({ [err.field]: err.message }); else setError(errorMessage(err));
    } finally { setBusy(false); }
  };

  const panel = PANEL[step];
  const actions = (
    <View style={{ marginTop: space.lg }}>
      {error ? <InfoNote tone="red" icon="alert-circle" text={error} style={{ marginBottom: space.lg }} /> : null}
      {step === 6 ? (
        <ButtonRow>
          <Button title="Back" variant="outline" tone={pink ? 'green' : undefined} onPress={() => go(5)} />
          <Button title="Complete Profile" arrow tone={pink ? 'pink' : undefined} onPress={() => navigation.navigate('OnboardingDone')} />
        </ButtonRow>
      ) : step === 1 ? (
        <Button title="Save & Continue" arrow tone={pink ? 'pink' : undefined} onPress={save} loading={busy} />
      ) : (
        <ButtonRow>
          <Button title="Back" variant="outline" tone={pink ? 'green' : undefined} onPress={() => go(step - 1)} />
          <Button title={step === 4 && !Object.values(f.prefs).some((v) => (Array.isArray(v) ? v.length : v)) ? 'Skip for now' : 'Save & Continue'} arrow tone={pink ? 'pink' : undefined} onPress={save} loading={busy} />
        </ButtonRow>
      )}
    </View>
  );

  return (
    <AuthLayout heading={panel.heading} highlight={panel.highlight} intro={panel.intro} steps={STEPS} currentStep={step}
      onBack={step > 1 ? () => go(step - 1) : undefined} mobileTitle="" mobileLogo mobilePalette={pink ? AUTH_APP_PALETTE : undefined} cardMax={step === 3 || step === 5 ? 620 : 560}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: space.lg }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.stepLabel}>Step {step} of 6</Text>
          <View style={{ maxWidth: 260, marginTop: 8 }}><StepBar step={step} total={6} activeColor={pink ? colors.primary : undefined} /></View>
          <Text style={[styles.title, pink && styles.titlePink]} accessibilityRole="header">{step === 6 ? 'Review your profile' : STEPS[step - 1].title}{step === 4 ? <Text style={styles.optional}> (Optional)</Text> : null}</Text>
          <Text style={[styles.sub, pink && styles.subPink]}>{['Tell us a bit about yourself.', 'What are you looking for on Sambandh Setu?', 'Select the values that are important to you. You can choose multiple options.', 'Let us know your preferences. This helps us suggest more compatible matches.', 'Select the options that best describe your communication style. You can choose multiple options.', 'Please check your information. You can edit any section if needed.'][step - 1]}</Text>
        </View>
        {step === 1 ? (
          <Pressable onPress={choosePhoto} style={[styles.photo, pink && styles.photoPink]} accessibilityRole="button" accessibilityLabel={photo ? 'Change photo' : 'Add a photo'}>
            {photo ? <Image source={{ uri: assetUrl(photo) }} style={{ width: 84, height: 84, borderRadius: 42 }} /> : (
              <><Ionicons name="camera-outline" size={22} color={pink ? colors.primaryText : colors.primary} /><Text style={[styles.photoText, pink && styles.photoTextPink]}>Add a photo</Text></>
            )}
          </Pressable>
        ) : null}
      </View>

      {step === 1 ? (
        <View>
          <ProfileSection pink={pink} icon="person-outline" title="Personal details" subtitle="Start with the essentials. You can update these later." decoration={pink ? 'hearts' : undefined} decorationPosition="topRight">
            <View style={wide ? styles.two : undefined}>
              <View style={wide ? styles.col : undefined}><TextField label="Full Name" required icon="person-outline" value={f.fullName} onChangeText={(v) => set('fullName', v)} placeholder="Your full name" error={errors.fullName} palette={fieldPalette} /></View>
              <View style={wide ? styles.col : undefined}><DateField label="Date of Birth" required value={f.dateOfBirth} onChange={(v) => set('dateOfBirth', v)} error={errors.dateOfBirth} palette={fieldPalette} /></View>
            </View>
            <View style={wide ? styles.two : undefined}>
              <View style={wide ? styles.col : undefined}><SelectField label="Gender" required icon="male-female-outline" value={f.gender} options={GENDERS} onChange={(v) => set('gender', v)} placeholder="Select gender" error={errors.gender} palette={fieldPalette} /></View>
              <View style={wide ? styles.col : undefined}><SelectField label="Location" required icon="location-outline" value={f.location} options={CITIES} onChange={(v) => set('location', v)} placeholder="Select your city" error={errors.location} palette={fieldPalette} /></View>
            </View>
          </ProfileSection>
          <ProfileSection pink={pink} icon="school-outline" title="Education and work" subtitle="Share a little about your background.">
            <View style={wide ? styles.two : undefined}>
              <View style={wide ? styles.col : undefined}><SelectField label="Education" required icon="school-outline" value={f.education} options={EDUCATION} onChange={(v) => set('education', v)} placeholder="Select your education" error={errors.education} palette={fieldPalette} /></View>
              <View style={wide ? styles.col : undefined}><SelectField label="Occupation" required icon="briefcase-outline" value={f.profession} options={OCCUPATIONS} onChange={(v) => set('profession', v)} placeholder="Select your occupation" error={errors.profession} palette={fieldPalette} /></View>
            </View>
          </ProfileSection>
          <ProfileSection pink={pink} icon="chatbubble-ellipses-outline" title="Your story" subtitle="A short introduction can make the first conversation easier." decoration={pink ? 'story' : undefined} decorationPosition="topRight">
            <TextField label="About Yourself" required multiline value={f.bio} onChangeText={(v) => set('bio', v.slice(0, 300))} counter={300} placeholder="Share a few things about yourself, your interests, and what makes you, you..." error={errors.bio} palette={fieldPalette} />
            <Text style={styles.fieldLabel}>Languages you speak</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{LANGUAGES.map((l) => <Chip key={l} label={l} pink={pink} selected={f.languages.includes(l)} onPress={() => toggle('languages', l)} />)}</View>
          </ProfileSection>
        </View>
      ) : null}

      {step === 2 ? (
        <View>
          <ProfileSection pink={pink} icon="heart-outline" title="Relationship intent" subtitle="Choose the kind of connection you hope to build.">
            {INTENTS.map((i) => <RadioRow key={i.value} label={i.label} description={i.text} icon={i.icon as any} tint={pink ? colors.primaryText : colors.dangerStrong} pink={pink} selected={f.intent === i.value} onPress={() => set('intent', i.value)} />)}
            {errors.intent ? <Text style={styles.err}>{errors.intent}</Text> : null}
          </ProfileSection>
          <InfoNote tone={pink ? 'green' : 'blue'} icon="shield-checkmark" title="Why we ask this?" text="Your intent helps us suggest more relevant matches, content, and guidance throughout your journey." />
        </View>
      ) : null}

      {step === 3 ? (
        <View>
          <ProfileSection pink={pink} icon="leaf-outline" title="Values and priorities" subtitle="Choose the values that are most important to you. Select at least two.">
            <View style={styles.grid}>
              {VALUE_OPTIONS.map(([v, icon]) => (
                <View key={v} style={{ width: wide ? '31.5%' : '48%' } as any}>
                  <CheckRow label={v} icon={icon as any} pink={pink} checked={f.values.includes(v)} onPress={() => toggle('values', v)} style={{ marginBottom: 0 }} />
                </View>
              ))}
            </View>
            {errors.values ? <Text style={styles.err}>{errors.values}</Text> : null}
          </ProfileSection>
          <InfoNote tone={pink ? 'green' : 'blue'} text="There are no right or wrong answers. Your values help us understand what matters most to you." style={{ marginTop: space.lg }} />
        </View>
      ) : null}

      {step === 4 ? (
        <View>
          <ProfileSection pink={pink} icon="people-outline" title="Partner preferences" subtitle="Optional preferences help us suggest more compatible matches.">
            <View style={styles.two}>
              <View style={styles.col}><SelectField label="Age from" value={f.prefs.ageMin ? String(f.prefs.ageMin) : ''} options={AGES} onChange={(v) => setPref('ageMin', Number(v))} placeholder="Min age" icon="person-outline" palette={fieldPalette} /></View>
              <View style={styles.col}><SelectField label="Age to" value={f.prefs.ageMax ? String(f.prefs.ageMax) : ''} options={AGES} onChange={(v) => setPref('ageMax', Number(v))} placeholder="Max age" palette={fieldPalette} /></View>
            </View>
            <View style={styles.two}>
              <View style={styles.col}><SelectField label="Education" value={f.prefs.education} options={['Any', 'Graduate or above', "Master's or above", 'Doctorate']} onChange={(v) => setPref('education', v)} placeholder="Any" icon="school-outline" palette={fieldPalette} /></View>
              <View style={styles.col}><SelectField label="Profession" value={f.prefs.profession} options={['Any', 'Working Professional', 'Business / Self-employed', 'Government / Public sector', 'Doctor / Healthcare', 'Engineer / Technology']} onChange={(v) => setPref('profession', v)} placeholder="Any" icon="briefcase-outline" palette={fieldPalette} /></View>
            </View>
            <View style={styles.two}>
              <View style={styles.col}><SelectField label="Height" value={f.prefs.height} options={["Any", "5'0\" or above", "5'2\" or above", "5'4\" or above", "5'6\" or above", "5'8\" or above"]} onChange={(v) => setPref('height', v)} placeholder="Any" icon="resize-outline" palette={fieldPalette} /></View>
              <View style={styles.col}><SelectField label="Location Preference" value={f.prefs.location} options={['Open to any location', 'Same city', 'Same state', 'India only']} onChange={(v) => setPref('location', v)} placeholder="Open to any location" icon="location-outline" palette={fieldPalette} /></View>
            </View>
          </ProfileSection>
          <ProfileSection pink={pink} icon="home-outline" title="Family and lifestyle" subtitle="These optional details can help align expectations.">
            <View style={styles.two}>
              <View style={styles.col}><SelectField label="Family Background" value={f.prefs.familyType} options={['Any', 'Nuclear Family', 'Joint Family']} onChange={(v) => setPref('familyType', v)} placeholder="Any" icon="home-outline" palette={fieldPalette} /></View>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Willing to Relocate</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{['Yes', 'No', 'Open'].map((x) => <Chip key={x} label={x} pink={pink} selected={f.prefs.relocate === x} onPress={() => setPref('relocate', x)} />)}</View>
              </View>
            </View>
            <Text style={styles.fieldLabel}>Lifestyle Preferences</Text>
            <View style={styles.grid}>
              {['Non-smoker', 'Non-drinker', 'Vegetarian', 'Open to all'].map((x) => (
                <View key={x} style={{ width: '48%' } as any}><CheckRow label={x} pink={pink} checked={f.prefs.lifestyle.includes(x)} onPress={() => setPref('lifestyle', f.prefs.lifestyle.includes(x) ? f.prefs.lifestyle.filter((y) => y !== x) : [...f.prefs.lifestyle, x])} style={{ marginBottom: 0 }} /></View>
              ))}
            </View>
          </ProfileSection>
          <InfoNote tone={pink ? 'green' : 'blue'} text="These preferences are optional. You can always update them later. We respect your choices and will suggest matches accordingly." style={{ marginTop: space.lg }} />
        </View>
      ) : null}

      {step === 5 ? (
        <View>
          <ProfileSection pink={pink} icon="chatbubbles-outline" title="Communication preferences" subtitle="Let us know how you prefer to connect.">
            <Text style={styles.fieldLabel}>I usually prefer to communicate through:</Text>
            <View style={styles.grid}>{COMM_CHANNELS.map(([v, icon]) => <View key={v} style={{ width: wide ? '23.5%' : '48%' } as any}><OptionTile label={v} icon={icon as any} pink={pink} compact selected={f.channels.includes(v)} onPress={() => toggle('channels', v)} /></View>)}</View>
          </ProfileSection>
          <ProfileSection pink={pink} icon="chatbubble-ellipses-outline" title="Your communication style" subtitle="Select the options that best describe you.">
            <View style={styles.grid}>{COMM_STYLES.map(([v, icon]) => <View key={v} style={{ width: '48%' } as any}><CheckRow label={v} icon={icon as any} pink={pink} checked={f.styles.includes(v)} onPress={() => toggle('styles', v)} style={{ marginBottom: 0 }} /></View>)}</View>
          </ProfileSection>
          <ProfileSection pink={pink} icon="heart-outline" title="Handling disagreements" subtitle="How do you prefer to work through conflict?">
            <View style={styles.grid}>{COMM_CONFLICT.map(([v, icon]) => <View key={v} style={{ width: wide ? '31.5%' : '100%' } as any}><CheckRow label={v} icon={icon as any} pink={pink} checked={f.conflict.includes(v)} onPress={() => toggle('conflict', v)} style={{ marginBottom: 0 }} /></View>)}</View>
          </ProfileSection>
          <InfoNote tone={pink ? 'green' : 'blue'} text="Your communication style helps us suggest compatible matches and provide personalised guidance for a healthier relationship journey." style={{ marginTop: space.lg }} />
        </View>
      ) : null}

      {step === 6 ? <Review f={f} onEdit={go} pink={pink} /> : null}
      {actions}
    </AuthLayout>
  );
}

function Review({ f, onEdit, pink = false }: { f: any; onEdit: (n: number) => void; pink?: boolean }) {
  const intent = INTENTS.find((i) => i.value === f.intent);
  const age = f.dateOfBirth ? (() => { const d = new Date(f.dateOfBirth); const n = new Date(); let a = n.getFullYear() - d.getFullYear(); if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--; return a; })() : null;
  const rows = [
    { step: 1, icon: 'person-outline', title: 'Basic Profile', lines: [[f.fullName, age ? `${age} years` : '', f.gender].filter(Boolean).join(', '), `${f.education} · ${f.profession}`, f.location] },
    { step: 2, icon: 'heart-outline', title: 'Relationship Intent', lines: [intent?.label || 'Not set', intent?.text || ''] },
    { step: 3, icon: 'leaf-outline', title: 'Values & Priorities', lines: [f.values.slice(0, 4).join(', ') + (f.values.length > 4 ? ` +${f.values.length - 4} more` : '')] },
    { step: 4, icon: 'options-outline', title: 'Partner Preferences', lines: [[f.prefs.ageMin && f.prefs.ageMax ? `Age: ${f.prefs.ageMin} - ${f.prefs.ageMax} years` : '', f.prefs.location, f.prefs.relocate ? `Willing to relocate: ${f.prefs.relocate}` : ''].filter(Boolean).join(' | ') || 'Not set (optional)'] },
    { step: 5, icon: 'chatbubbles-outline', title: 'Communication Style', lines: [f.channels.join(', ') || 'Not set', [...f.styles, ...f.conflict].slice(0, 3).join(' | ')] },
  ];
  return (
    <ProfileSection pink={pink} icon="list-outline" title="Review your profile" subtitle="Check your answers and edit any section before you finish.">
      {rows.map((r) => (
        <View key={r.title} style={styles.reviewRow}>
          <View style={[styles.reviewIcon, pink && styles.reviewIconPink]}><Ionicons name={r.icon as any} size={18} color={pink ? colors.primaryText : colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.reviewTitle}>{r.title}</Text>
            {r.lines.filter(Boolean).map((l, i) => <Text key={i} style={styles.reviewLine}>{l}</Text>)}
          </View>
          <Pressable onPress={() => onEdit(r.step)} accessibilityRole="button" accessibilityLabel={`Edit ${r.title}`} hitSlop={8} style={{ padding: 6 }}><Ionicons name="pencil" size={17} color={pink ? colors.primaryText : colors.primary} /></Pressable>
        </View>
      ))}
      <InfoNote tone={pink ? 'green' : 'blue'} icon="shield-checkmark" title="Your information is safe and secure with us." text="We use this information only to suggest compatible matches." style={{ marginTop: space.md }} />
    </ProfileSection>
  );
}

/** "Profile Completed!" / "Your Sambandh profile is ready!" */
export function OnboardingDone({ navigation }: any) {
  const { setUser } = useAuth();
  const { wide } = useLayout();
  const [done, setDone] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { MeApi.completeOnboarding().then((r) => setDone(r.user)).catch((e) => setError(errorMessage(e))); }, []);
  const finish = (screen: string, params?: any) => {
    if (!done) return;
    setUser(done);
    setTimeout(() => navigation.navigate('Main', { screen, params }), 0);
  };
  const items = [
    { icon: 'people', tint: colors.tint.blue, title: 'Get compatible matches', text: "We'll suggest profiles that align with your preferences." },
    { icon: 'shield-checkmark', tint: colors.tint.purple, title: 'Your privacy matters', text: 'Your information is safe and secure with us.' },
    { icon: 'heart', tint: colors.tint.pink, title: 'Take the next step', text: 'Explore profiles, connect, and start your journey.' },
  ];
  return (
    <AuthLayout heading="You're" highlight="all set!" intro="Thank you for sharing your preferences. We're excited to help you find meaningful connections on Sambandh Setu." mobileTitle="">
      <ResultView tone="blue" title={wide ? 'Profile Completed!' : 'Your Sambandh profile is ready!'} message="Your profile has been created successfully. We'll now suggest compatible matches based on your preferences, values, and relationship goals."
        primary={done ? { label: 'Explore Matches', onPress: () => finish('Connections', { tab: 'discover' }), arrow: true } : undefined}
        secondary={done ? { label: 'Go to Dashboard', onPress: () => finish('Home') } : undefined}>
        {error ? <InfoNote tone="red" icon="alert-circle" text={error} /> : !done ? <Text style={{ textAlign: 'center', color: colors.muted }}>Finishing up…</Text> : (
          <View style={{ gap: 10 }}>
            {items.map((i) => (
              <View key={i.title} style={[styles.doneItem, { backgroundColor: i.tint.bg }]}>
                <View style={styles.doneIcon}><Ionicons name={i.icon as any} size={18} color={i.tint.fg} /></View>
                <View style={{ flex: 1 }}><Text style={styles.reviewTitle}>{i.title}</Text><Text style={styles.reviewLine}>{i.text}</Text></View>
              </View>
            ))}
            <TextLink title="Build my profile further (lifestyle, family, preferences)" size={13} style={{ alignSelf: 'center' }} onPress={() => { if (done) { setUser(done); setTimeout(() => navigation.navigate('ProfileBuilder', { step: 0 }), 0); } }} />
          </View>
        )}
      </ResultView>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  stepLabel: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.muted },
  title: { fontFamily: fonts.bold, fontSize: 25, color: colors.text, marginTop: 14 },
  titlePink: { color: '#173F32' },
  optional: { fontFamily: fonts.regular, fontSize: 16, color: colors.muted },
  sub: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 20, color: colors.muted, marginTop: 4 },
  subPink: { color: '#5C6E63' },
  photo: { width: 88, height: 88, borderRadius: 44, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  photoPink: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  photoText: { fontFamily: fonts.medium, fontSize: 11, color: colors.primary, marginTop: 4 },
  photoTextPink: { color: colors.primaryText },
  two: { flexDirection: 'row', gap: 14 },
  col: { flex: 1 },
  fieldLabel: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.text, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  err: { fontFamily: fonts.medium, fontSize: 12, color: colors.danger, marginVertical: 8 },
  reviewRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  reviewIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  reviewIconPink: { backgroundColor: colors.primarySoft },
  reviewTitle: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.text },
  reviewLine: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  doneItem: { flexDirection: 'row', gap: 12, alignItems: 'center', borderRadius: radius.card, padding: 14 },
  doneIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
});
