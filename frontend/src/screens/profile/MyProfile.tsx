import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { MeApi, errorMessage } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useLayout } from '../../hooks/useLayout';
import { colors, fonts, radius, space } from '../../theme';
import { Avatar, Button, Card, IconButton, InfoNote, KeyValue, ListRow, ProgressBar, Screen, StatePill, Tag, UnderlineTabs, useToast } from '../../ui';
import { LIFESTYLE, LIFESTYLE_ORDER, PREFERENCES, PREFERENCE_ORDER, INTENTS } from '../../content/forms';
import { summarise } from '../../components/SchemaForm';
import { cmToFeet } from '../../utils/format';
import { pickImage } from '../../utils/image';

function usePhoto() {
  const { refresh } = useAuth();
  const toast = useToast();
  return async () => {
    try {
      const d = await pickImage();
      if (!d) return;
      await MeApi.uploadPhoto(d);
      await refresh();
      toast.show('Profile photo updated');
    } catch (e) { toast.show(errorMessage(e), 'error'); }
  };
}

/** "My Profile" (App user profile main page / Web User profile main page). */
export function MyProfile({ navigation }: any) {
  const { user, settings } = useAuth();
  const { wide } = useLayout();
  const changePhoto = usePhoto();
  if (!user) return null;
  const p = user.profile;
  const facts = [
    ['calendar-outline', p.age ? `${p.age} years` : '—', 'Age', 'blue'],
    ['person-outline', p.gender || '—', 'Gender', 'pink'],
    ['resize-outline', p.heightCm ? cmToFeet(p.heightCm) : '—', 'Height', 'blue'],
    ['school-outline', p.education || '—', 'Education', 'green'],
    ['briefcase-outline', p.profession || '—', 'Profession', 'amber'],
  ] as const;
  const verified = user.verification.identity?.status === 'verified';
  const completeness = Math.max(0, Math.min(100, user.completeness.percent));
  const ringCircumference = 2 * Math.PI * 26;
  const rail = (
    <>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={styles.ring}>
            <Svg width={60} height={60} viewBox="0 0 60 60" style={StyleSheet.absoluteFill}>
              <Circle cx={30} cy={30} r={26} fill="none" stroke={colors.border} strokeWidth={5} />
              <Circle
                cx={30}
                cy={30}
                r={26}
                fill="none"
                stroke={colors.primary}
                strokeWidth={5}
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringCircumference * (1 - completeness / 100)}
                strokeLinecap="round"
                rotation={-90}
                origin="30,30"
              />
            </Svg>
            <Text style={styles.ringText}>{Math.round(completeness)}%</Text>
          </View>
          <View style={{ flex: 1 }}><Text style={styles.h}>Profile completeness</Text><Text style={styles.small}>Complete your profile to get better matches.</Text></View>
        </View>
        <ProgressBar value={user.completeness.percent} style={{ marginVertical: 12 }} />
        {user.completeness.missing.slice(0, 4).map((m) => (
          <Pressable key={m.key} onPress={() => openMissing(navigation, m.key)} style={styles.todo} accessibilityRole="button">
            <Ionicons name="ellipse-outline" size={18} color={colors.faint} /><Text style={[styles.body, { flex: 1 }]}>{m.label}</Text><Ionicons name="chevron-forward" size={16} color={colors.faint} />
          </Pressable>
        ))}
        {!user.completeness.missing.length ? <View style={styles.todo}><Ionicons name="checkmark-circle" size={18} color={colors.navy} /><Text style={styles.body}>Your profile is complete</Text></View> : null}
      </Card>
      <Card padded={false}>
        <View style={{ padding: 16, paddingBottom: 4, flexDirection: 'row', gap: 10, alignItems: 'center' }}><Ionicons name="shield" size={20} color={colors.primary} /><View><Text style={styles.h}>Privacy & Safety</Text><Text style={styles.small}>Your safety is our priority.</Text></View></View>
        <ListRow icon="shield-checkmark-outline" title="Verification" value={verified ? 'Verified' : user.verification.identity?.status === 'in_review' ? 'In review' : 'Not verified'} onPress={() => navigation.navigate('Verification')} />
        <ListRow icon="eye-outline" title="Profile visibility" value={settings?.privacy.whoCanSeeProfile === 'everyone' ? 'Everyone' : settings?.privacy.whoCanSeeProfile === 'connected' ? 'Connections only' : 'Preferred matches'} onPress={() => navigation.navigate('SettingOption', { key: 'whoCanSeeProfile' })} />
        <ListRow icon="id-card-outline" title="Information sharing" subtitle="Control what you share" onPress={() => navigation.navigate('ProfileSharing')} last />
      </Card>
    </>
  );
  return (
    <Screen variant="none" tab aside={wide ? rail : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: space.lg }}>
        <View style={{ flex: 1 }}><Text style={styles.title} accessibilityRole="header">My Profile</Text><Text style={styles.sub}>Manage your profile and share what matters to you.</Text></View>
        {!wide ? <IconButton icon="settings-outline" label="Settings" onPress={() => navigation.navigate('Settings')} /> : null}
      </View>
      <Card>
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <Pressable onPress={changePhoto} accessibilityRole="button" accessibilityLabel={user.photoUrl ? 'Change profile photo' : 'Add profile photo'}>
            <Avatar uri={user.photoUrl} name={user.name} size={wide ? 128 : 96} rounded />
            <View style={styles.cam}><Ionicons name="camera" size={14} color={colors.primary} /></View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.name}>{user.firstName}{p.age ? `, ${p.age}` : ''}</Text>
              {verified ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} accessibilityLabel="Verified" /> : null}
              <Pressable onPress={() => navigation.navigate('EditPersonal')} accessibilityRole="button" accessibilityLabel="Edit personal information" hitSlop={8}><Ionicons name="pencil" size={16} color={colors.primary} /></Pressable>
            </View>
            {p.profession ? <View style={styles.meta}><Ionicons name="briefcase-outline" size={14} color={colors.muted} /><Text style={styles.metaText}>{p.profession}</Text></View> : null}
            {p.location ? <View style={styles.meta}><Ionicons name="location-outline" size={14} color={colors.muted} /><Text style={styles.metaText}>{p.location}</Text></View> : null}
            <View style={{ marginTop: 8 }}><StatePill state={settings?.discovery.hideProfile ? 'paused' : 'active'} label={settings?.discovery.hideProfile ? 'Profile Hidden' : 'Profile Active'} /></View>
          </View>
        </View>
        <Pressable onPress={() => navigation.navigate('EditAbout')} style={styles.quote} accessibilityRole="button" accessibilityLabel="Edit your introduction">
          <Text style={styles.quoteMark}>“</Text>
          <Text style={[styles.body, { flex: 1, fontStyle: 'italic' }]}>{p.bio || 'Add a short introduction about yourself.'}</Text>
          <Ionicons name="pencil" size={15} color={colors.primary} />
        </Pressable>
        <View style={styles.facts}>
          {facts.map(([icon, v, l, t]) => (
            <View key={l} style={styles.fact}>
              <View style={[styles.factIcon, { backgroundColor: colors.tint[t].bg }]}><Ionicons name={icon} size={15} color={colors.tint[t].fg} /></View>
              <View style={{ flexShrink: 1 }}><Text style={styles.factV} numberOfLines={1}>{v}</Text><Text style={styles.small}>{l}</Text></View>
            </View>
          ))}
        </View>
      </Card>
      <Card style={{ marginTop: space.lg }} tone="soft">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name="trail-sign-outline" size={18} color={colors.primary} /><Text style={[styles.h, { flex: 1 }]}>My Journey</Text><Pressable onPress={() => navigation.navigate('Connections', { tab: 'active' })} accessibilityRole="link"><Text style={styles.link}>See all →</Text></Pressable></View>
        <Text style={[styles.body, { marginTop: 6 }]}>{INTENTS.find((i) => i.value === p.intent)?.text || 'Currently exploring meaningful connections at my own pace.'} Open to conversations with like-minded individuals.</Text>
      </Card>
      {!wide ? (
        <>
          <Card padded={false} style={{ marginTop: space.lg }}>
            <ListRow icon="person-outline" title="View My Profile" onPress={() => navigation.navigate('MyProfileTabs', { tab: 'about' })} />
            <ListRow icon="create-outline" title="Edit Profile" onPress={() => navigation.navigate('EditAbout')} />
            <ListRow icon="options-outline" title="Partner Preferences" onPress={() => navigation.navigate('MyProfileTabs', { tab: 'preferences' })} />
            <ListRow icon="shield-outline" title="Privacy & Safety" onPress={() => navigation.navigate('PrivacyVisibility')} />
            <ListRow icon="shield-checkmark-outline" title="Verification" value={verified ? 'Verified' : undefined} onPress={() => navigation.navigate('Verification')} />
            <ListRow icon="settings-outline" title="Settings" onPress={() => navigation.navigate('Settings')} last />
          </Card>
          <View style={{ marginTop: space.lg }}>{rail}</View>
        </>
      ) : (
        <Card style={{ marginTop: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}><Ionicons name="flash-outline" size={18} color={colors.primary} /><Text style={styles.h}>Quick actions</Text></View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {[['person-outline', 'View My Profile', () => navigation.navigate('MyProfileTabs', { tab: 'about' })], ['create-outline', 'Edit Profile', () => navigation.navigate('EditAbout')], ['options-outline', 'Partner Preferences', () => navigation.navigate('MyProfileTabs', { tab: 'preferences' })], ['shield-outline', 'Privacy & Visibility', () => navigation.navigate('PrivacyVisibility')], ['shield-checkmark-outline', 'Verification', () => navigation.navigate('Verification')], ['settings-outline', 'Settings', () => navigation.navigate('Settings')]].map(([i, t, fn]: any) => (
              <Pressable key={t} onPress={fn} style={({ hovered }: any) => [styles.quick, hovered && { borderColor: colors.primaryLine }]} accessibilityRole="button"><Ionicons name={i} size={16} color={colors.primary} /><Text style={styles.quickText}>{t}</Text><Ionicons name="chevron-forward" size={14} color={colors.faint} /></Pressable>
            ))}
          </View>
        </Card>
      )}
    </Screen>
  );
}

function openMissing(navigation: any, key: string) {
  const map: Record<string, [string, any?]> = {
    photo: ['EditAbout'], basics: ['EditPersonal'], career: ['EditAbout'], about: ['EditAbout'], interests: ['EditAbout'], values: ['EditAbout'],
    lifestyle: ['MyProfileTabs', { tab: 'lifestyle' }], family: ['FamilyEdit'], preferences: ['PreferencesReview'], privacy: ['PrivacyVisibility'],
  };
  const [screen, params] = map[key] || ['EditAbout'];
  navigation.navigate(screen, params);
}

type Tab = 'about' | 'lifestyle' | 'family' | 'preferences';

/** Own profile tabs (About / Lifestyle / Family / Preferences). */
export function MyProfileTabs({ route, navigation }: any) {
  const { user } = useAuth();
  const { wide } = useLayout();
  const [tab, setTabState] = useState<Tab>(route.params?.tab || 'about');
  const setTab = (t: Tab) => { setTabState(t); navigation.setParams({ tab: t }); };
  if (!user) return null;
  const p = user.profile;
  const Edit = ({ onPress }: { onPress: () => void }) => <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Edit" hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Ionicons name="pencil" size={15} color={colors.primary} /><Text style={styles.link}>Edit</Text></Pressable>;
  const head = (t: string, icon: any, onEdit: () => void) => <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}><Ionicons name={icon} size={18} color={colors.primary} /><Text style={[styles.h, { flex: 1 }]}>{t}</Text><Edit onPress={onEdit} /></View>;

  return (
    <Screen title={`${user.firstName}${p.age ? `, ${p.age}` : ''}`} variant="center" back="Main" maxWidth={900}>
      <UnderlineTabs value={tab} onChange={setTab} options={[{ key: 'about', label: 'About' }, { key: 'lifestyle', label: 'Lifestyle' }, { key: 'family', label: 'Family' }, { key: 'preferences', label: 'Preferences' }]} style={{ marginBottom: space.lg }} />
      {tab === 'about' ? (
        <View style={{ gap: space.lg }}>
          <Card>{head('About Me', 'person-outline', () => navigation.navigate('EditAbout'))}<Text style={styles.body}>{p.bio || 'Add a short introduction.'}</Text></Card>
          <Card>
            {head('Basic Details', 'id-card-outline', () => navigation.navigate('EditPersonal'))}
            <KeyValue label="Age" value={p.age ? `${p.age} years` : ''} />
            <KeyValue label="Gender" value={p.gender} />
            <KeyValue label="Height" value={p.heightCm ? `${cmToFeet(p.heightCm)} (${p.heightCm} cm)` : ''} />
            <KeyValue label="Marital Status" value={p.maritalStatus} />
            <KeyValue label="Location" value={p.location} />
            <KeyValue label="Languages" value={p.languages.join(', ')} last />
          </Card>
          <Card>{head('Education & Career', 'school-outline', () => navigation.navigate('EditAbout'))}<KeyValue label="Education" value={p.education} /><KeyValue label="Profession" value={p.profession} last /></Card>
          <Card>{head('Values & Interests', 'heart-outline', () => navigation.navigate('EditAbout'))}<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{[...p.values, ...p.interests].map((v) => <Tag key={v} label={v} />)}{!p.values.length && !p.interests.length ? <Text style={styles.small}>Not added yet</Text> : null}</View></Card>
        </View>
      ) : null}
      {tab === 'lifestyle' ? (
        <View style={{ gap: space.lg }}>
          <Card padded={false}>
            <View style={{ padding: 16, paddingBottom: 6 }}><Text style={styles.h}>Lifestyle & Interests</Text></View>
            {LIFESTYLE_ORDER.filter((k) => k !== 'routine').map((k, i, arr) => {
              const d = LIFESTYLE[k];
              return <ListRow key={k} icon={d.icon as any} tint={d.tint as any} title={d.title} subtitle={summarise(p.lifestyle?.[k]) || 'Tap to add'} onPress={() => navigation.navigate('LifestyleEdit', { section: k })} last={i === arr.length - 1} />;
            })}
          </Card>
          <Card>
            {head('Daily Routine', 'time-outline', () => navigation.navigate('LifestyleEdit', { section: 'routine' }))}
            <KeyValue label="Wake up" value={p.lifestyle?.routine?.wakeUp} />
            <KeyValue label="Work" value={p.lifestyle?.routine?.hours} />
            <KeyValue label="Evening" value={(p.lifestyle?.routine?.evening || []).join(', ')} />
            <KeyValue label="Weekends" value={(p.lifestyle?.routine?.weekends || []).join(', ')} last />
          </Card>
          <Card>{head('Values & Outlook', 'sparkles-outline', () => navigation.navigate('EditAbout'))}<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{p.values.map((v) => <Tag key={v} label={v} tone="slate" />)}</View></Card>
        </View>
      ) : null}
      {tab === 'family' ? (
        <View style={{ gap: space.lg }}>
          <Card>
            {head('Family Background', 'people-outline', () => navigation.navigate('FamilyEdit'))}
            {['father:Father', 'mother:Mother', 'familyType:Family Type', 'siblings:Siblings', 'religion:Religion', 'caste:Caste', 'subCaste:Sub-caste (Optional)', 'location:Location', 'values:Family Values'].map((x, i, arr) => { const [k, l] = x.split(':'); return <KeyValue key={k} label={l} value={p.family?.[k]} last={i === arr.length - 1} />; })}
          </Card>
          {p.family?.note ? <InfoNote icon="home-outline" text={p.family.note} /> : null}
          <Card>
            {head('Family Involvement Preference', 'person-outline', () => navigation.navigate('FamilyEdit'))}
            <KeyValue label="Preferred Stage" value={p.family?.involvement?.preferredStage} />
            <KeyValue label="Family Meeting" value={p.family?.involvement?.meeting} last />
          </Card>
          <InfoNote icon="lock-closed" text="Family details are private unless you turn on Family details in Settings > Privacy & Visibility > Profile information sharing." />
        </View>
      ) : null}
      {tab === 'preferences' ? (
        <View style={{ gap: space.lg }}>
          <Card tone="soft" style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={styles.prefIcon}><Ionicons name="person-outline" size={22} color={colors.primary} /></View>
            <View style={{ flex: 1 }}><Text style={styles.h}>My Partner Preferences</Text><Text style={styles.small}>Help us show more relevant profiles. You can update them anytime.</Text></View>
          </Card>
          <View style={wide ? { flexDirection: 'row', flexWrap: 'wrap', gap: 16 } : { gap: 12 }}>
            {PREFERENCE_ORDER.map((k) => {
              const d = PREFERENCES[k];
              const v = p.preferences?.[k] || {};
              return (
                <Card key={k} style={wide ? { width: '48.5%' as any } : undefined} hoverStyle={{ backgroundColor: colors.primarySoft, borderColor: colors.primaryLine }} onPress={() => navigation.navigate('PreferencesEdit', { section: k })} accessibilityLabel={`${d.title}. Edit`}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[styles.factIcon, { backgroundColor: colors.tint[d.tint as keyof typeof colors.tint].bg }]}><Ionicons name={d.icon as any} size={16} color={colors.tint[d.tint as keyof typeof colors.tint].fg} /></View>
                    <View style={{ flex: 1 }}><Text style={styles.h}>{d.title}</Text><Text style={styles.small}>{d.subtitle}</Text></View>
                    <Ionicons name="pencil" size={15} color={colors.primary} />
                  </View>
                  <Text style={[styles.body, { marginTop: 8 }]}>{summarise(v, 5) || 'Not set yet'}</Text>
                </Card>
              );
            })}
          </View>
          <InfoNote icon="lock-closed" text="Your preferences are private. They are only used to suggest relevant profiles." />
          <Button title="Review all preferences" variant="secondary" onPress={() => navigation.navigate('PreferencesReview')} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.bold, fontSize: 28, color: colors.text },
  sub: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  h: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 20, color: colors.textSoft },
  small: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  link: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  name: { fontFamily: fonts.bold, fontSize: 22, color: colors.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  metaText: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.muted },
  cam: { position: 'absolute', right: -4, bottom: -4, width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  quote: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: colors.bgTint, borderRadius: radius.card, padding: 12, marginTop: space.lg, borderWidth: 1, borderColor: colors.border },
  quoteMark: { fontFamily: fonts.bold, fontSize: 22, color: colors.primary, lineHeight: 24 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: space.lg },
  fact: { flexGrow: 1, flexBasis: '30%' as any, minWidth: 120, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: 10 },
  factIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  factV: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  ring: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  ringText: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  todo: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 },
  quick: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, minHeight: 40, flexBasis: '31%' as any, flexGrow: 1 },
  quickText: { fontFamily: fonts.medium, fontSize: 13, color: colors.text, flex: 1 },
  prefIcon: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
});
