import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { errorMessage } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { colors, fonts, space, TintName } from '../../theme';
import { Button, Card, CheckItem, IconTile, InfoNote, RadioRow, ResultView, Screen, SelectField, useToast } from '../../ui';
import { ARTICLES } from '../../content/articles';
import { SettingsPage } from './SettingsHome';

type OptionDef = {
  title: string; subtitle: string; path: string; active: string;
  options: { value: string; label: string; description?: string; icon?: any }[];
  note?: string; result?: string; extra?: 'ageRange';
};

/** Every single-choice setting screen from the designs, driven by this table. */
export const OPTION_SCREENS: Record<string, OptionDef> = {
  notificationFrequency: {
    title: 'Notification frequency', subtitle: 'Choose how often you receive notifications.', path: 'notifications.frequency', active: 'notifications', result: 'notifications',
    options: [
      { value: 'realtime', label: 'Real-time', description: 'Get notified immediately when there are new updates.', icon: 'flash-outline' },
      { value: 'daily', label: 'Daily digest', description: 'Receive one summary each day with important updates.', icon: 'calendar-outline' },
      { value: 'weekly', label: 'Weekly digest', description: 'Receive one summary each week with important updates.', icon: 'calendar-number-outline' },
      { value: 'important', label: 'Only important', description: 'Receive only critical updates such as security alerts and key activity.', icon: 'notifications-outline' },
    ],
    note: 'You are in control. You can change this setting anytime from the Notifications page.',
  },
  whoCanSeeProfile: {
    title: 'Who can see my profile?', subtitle: 'Choose who can view your profile in Discover.', path: 'privacy.whoCanSeeProfile', active: 'privacy', result: 'visibility',
    options: [
      { value: 'everyone', label: 'Everyone', description: 'Anyone on Sambandh Setu' },
      { value: 'matching', label: 'People matching my preferences', description: 'Only profiles that meet your preferences' },
      { value: 'connected', label: 'Connected people only', description: 'Only people you have accepted' },
      { value: 'selected', label: 'Selected people', description: 'Only people you send interest to or connect with' },
    ],
    note: 'You can change this setting anytime from Privacy & Visibility.',
  },
  peopleWhoCanFindMe: {
    title: 'People who can find me', subtitle: 'Choose who can discover your profile.', path: 'discovery.peopleWhoCanFindMe', active: 'discovery', result: 'settings',
    options: [
      { value: 'everyone', label: 'Everyone', description: 'All members can find you in Discover.' },
      { value: 'matching', label: 'People matching my preferences', description: 'Only people who fit your partner preferences.' },
      { value: 'verified', label: 'Verified members only', description: 'Only members with a verified identity.' },
      { value: 'nobody', label: 'Nobody', description: 'You will not appear in Discover. You can still send interest.' },
    ],
  },
  ageRangeVisibility: {
    title: 'Age range visibility', subtitle: 'Choose which age groups can see you in Discover.', path: 'discovery.ageRangeVisibility', active: 'discovery', result: 'settings', extra: 'ageRange',
    options: [
      { value: 'everyone', label: 'All ages', description: 'Members of any age can see you.' },
      { value: 'preferences', label: 'Use my partner preferences', description: 'Follow the age range in your partner preferences.' },
      { value: 'custom', label: 'Custom range', description: 'Choose a specific age range.' },
    ],
  },
  distanceVisibility: {
    title: 'Distance visibility', subtitle: 'Choose how far away people can be to see you.', path: 'discovery.distanceVisibility', active: 'discovery', result: 'settings',
    options: [
      { value: 'city', label: 'My city only', description: 'Only people who list the same city.' },
      { value: '50', label: 'Within 50 km', description: 'Saved for nearby matching.' },
      { value: '100', label: 'Within 100 km', description: 'Saved for nearby matching.' },
      { value: '200', label: 'Within 200 km', description: 'Saved for nearby matching.' },
      { value: 'anywhere', label: 'Anywhere', description: 'People from any location can see you.' },
    ],
    note: 'Distance uses the city on your profile. We never use your device location.',
  },
  profileSuggestions: {
    title: 'Profile suggestions', subtitle: 'Choose how profiles are ordered in your Discover.', path: 'discovery.profileSuggestions', active: 'discovery', result: 'settings',
    options: [
      { value: 'balanced', label: 'Balanced', description: 'A mix of shared values, interests and location.' },
      { value: 'values', label: 'Shared values first', description: 'People whose values overlap with yours.' },
      { value: 'nearby', label: 'Nearby first', description: 'People in your city first.' },
      { value: 'new', label: 'Newest members first', description: 'People who joined most recently.' },
    ],
  },
  allowMessagesFrom: {
    title: 'Allow messages from', subtitle: 'Choose who can send you interest and start a conversation.', path: 'chat.allowMessagesFrom', active: 'chat', result: 'settings',
    options: [
      { value: 'everyone', label: 'Everyone', description: 'Any member who can see your profile.' },
      { value: 'connections', label: 'My preferences', description: 'Members who can see your profile under your privacy settings.' },
      { value: 'verified', label: 'Verified members only', description: 'Only members with a verified identity.' },
      { value: 'custom', label: 'Custom preferences', description: 'Set specific criteria.' },
    ],
  },
  language: {
    title: 'Language', subtitle: 'Choose your preferred language.', path: 'app.language', active: 'language',
    options: [['en-IN', 'English (India)'], ['hi-IN', 'हिन्दी (Hindi)'], ['te-IN', 'తెలుగు (Telugu)'], ['ta-IN', 'தமிழ் (Tamil)'], ['kn-IN', 'ಕನ್ನಡ (Kannada)'], ['ml-IN', 'മലയാളം (Malayalam)'], ['mr-IN', 'मराठी (Marathi)'], ['bn-IN', 'বাংলা (Bengali)']].map(([value, label]) => ({ value, label })),
    note: 'The app is in English today. Your choice is saved and will be used as translations become available.',
  },
  appearance: {
    title: 'Appearance', subtitle: 'Choose light or dark mode.', path: 'app.appearance', active: 'appearance',
    options: [{ value: 'light', label: 'Light', icon: 'sunny-outline' }, { value: 'dark', label: 'Dark', icon: 'moon-outline' }, { value: 'system', label: 'Use device setting', icon: 'phone-portrait-outline' }],
    note: 'Sambandh Setu currently uses the light theme. Your choice is saved for when dark mode is available.',
  },
  aiRetention: {
    title: 'AI history retention', subtitle: 'How long Setu Guide keeps your conversation history.', path: 'ai.retention', active: 'ai', result: 'settings',
    options: [{ value: 'strict', label: 'Until I delete it', description: 'Keep history until you delete it.' }, { value: '30d', label: '30 days', description: 'Saved preference for automatic clean-up.' }, { value: '90d', label: '90 days', description: 'Saved preference for automatic clean-up.' }],
  },
  guideTone: {
    title: 'Guide tone', subtitle: 'How Setu Guide should speak with you.', path: 'guide.tone', active: 'guide', result: 'settings',
    options: [{ value: 'empathetic', label: 'Empathetic', description: 'Warm and encouraging.' }, { value: 'gentle', label: 'Gentle', description: 'Soft and patient.' }, { value: 'direct', label: 'Direct', description: 'Clear and to the point.' }],
  },
};

const getPath = (obj: any, path: string) => path.split('.').reduce((o, k) => o?.[k], obj);
const makePatch = (path: string, value: any) => path.split('.').reverse().reduce((acc, k) => ({ [k]: acc }), value as any);

export function SettingOption({ route, navigation }: any) {
  const key = route.params?.key as string;
  const def = OPTION_SCREENS[key];
  const { settings, updateSettings } = useAuth();
  const toast = useToast();
  const [value, setValue] = useState<string>(getPath(settings, def?.path || '') || '');
  const [ageMin, setAgeMin] = useState(String(settings?.discovery.ageMin || 21));
  const [ageMax, setAgeMax] = useState(String(settings?.discovery.ageMax || 40));
  const [busy, setBusy] = useState(false);
  if (!def) return <Screen title="Settings" back="Settings"><InfoNote text="This setting does not exist." /></Screen>;
  const save = async () => {
    setBusy(true);
    try {
      let patch = makePatch(def.path, value);
      if (def.extra === 'ageRange' && value === 'custom') patch = { discovery: { ageRangeVisibility: 'custom', ageMin: Number(ageMin), ageMax: Number(ageMax) } };
      await updateSettings(patch);
      if (key === 'allowMessagesFrom' && value === 'custom') return navigation.navigate('CustomChatPrefs');
      if (def.result) navigation.navigate('Result', { kind: def.result });
      else { toast.show('Saved'); navigation.goBack(); }
    } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setBusy(false); }
  };
  const ages = Array.from({ length: 43 }, (_, i) => String(18 + i));
  return (
    <SettingsPage active={def.active} title={def.title} subtitle={def.subtitle} footer={<Button title={key === 'whoCanSeeProfile' ? 'Continue' : 'Save'} onPress={save} loading={busy} />}>
      {def.options.map((o) => <RadioRow key={o.value} label={o.label} description={o.description} icon={o.icon} selected={value === o.value} onPress={() => setValue(o.value)} />)}
      {def.extra === 'ageRange' && value === 'custom' ? (
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
          <View style={{ flex: 1 }}><SelectField label="From" value={ageMin} options={ages} onChange={setAgeMin} /></View>
          <View style={{ flex: 1 }}><SelectField label="To" value={ageMax} options={ages} onChange={setAgeMax} /></View>
        </View>
      ) : null}
      {def.note ? <InfoNote icon="information-circle" text={def.note} style={{ marginTop: space.md }} /> : null}
    </SettingsPage>
  );
}

const RESULTS: Record<string, { title: string; message: string; tone?: any; icon?: any; primary: [string, string, any?]; secondary?: [string, string, any?] }> = {
  notifications: { title: 'Notification preferences updated', message: 'Your notification frequency has been saved.', primary: ['Done', 'NotificationSettings'] },
  visibility: { title: 'Profile visibility updated', message: 'Your profile will now be shown according to your new setting.', primary: ['Done', 'PrivacyVisibility'] },
  settings: { title: 'Settings updated', message: 'Your changes have been saved.', primary: ['Done', 'Settings'] },
  guide: { title: 'Settings Updated', message: 'Your Setu Guide settings have been saved.', primary: ['Done', 'GuideSettings'] },
  sensitive: { title: 'Sensitive Topic Guidance Enabled', message: 'Setu Guide can now provide guidance on sensitive topics when you ask.', primary: ['Done', 'SensitiveTopics'] },
  report: { title: 'Report Submitted', message: 'Thank you for helping keep Sambandh Setu safe. Our team will review your report and take appropriate action.', tone: 'blue', icon: 'shield-checkmark', primary: ['Done', 'Main'], secondary: ['Back to Report & Safety', 'ReportSafety'] },
  support: { title: 'Message sent', message: "We've received your message. Our support team will reply by email.", primary: ['Done', 'Help'] },
  problem: { title: 'Report Submitted', message: 'Thanks for letting us know. Our team will look into it.', primary: ['Done', 'Help'] },
  unblocked: { title: 'User Unblocked', message: 'This user has been unblocked successfully.', primary: ['Done', 'Settings'], secondary: ['Back to Blocked Users', 'BlockedUsers'] },
  familyAdded: { title: 'Invitation Sent', message: "We've created a family access invitation.", tone: 'blue', icon: 'paper-plane', primary: ['Done', 'FamilyAccess'], secondary: ['Add Another Member', 'FamilyAdd'] },
  familyRemoved: { title: 'Family Member Removed', message: 'This family member no longer has access to your profile.', primary: ['Done', 'PrivacyVisibility'], secondary: ['Back to Family Access', 'FamilyAccess'] },
  emailUpdated: { title: 'Email Address Updated', message: 'Your email address has been changed successfully.', primary: ['Back to Account', 'Account'] },
  phoneUpdated: { title: 'Phone Number Updated', message: 'Your phone number has been saved.', primary: ['Back to Account', 'Account'] },
  passwordUpdated: { title: 'Password updated', message: 'Your password was changed. You have been signed out on other devices.', primary: ['Done', 'PasswordSecurity'] },
  dataRequested: { title: 'Data Request Submitted', message: 'Your data file has been prepared and downloaded to this device.', primary: ['Done', 'ManageAccount'] },
  verificationSubmitted: { title: 'Verification in progress', message: "We're reviewing your information. You'll be notified once your verification is complete. You can keep using the app while we review.", tone: 'amber', icon: 'time', primary: ['Done', 'Verification'] },
};

export function Result({ route, navigation }: any) {
  const r = RESULTS[route.params?.kind] || RESULTS.settings;
  const go = ([, screen, params]: [string, string, any?]) => navigation.navigate(screen, params);
  return (
    <Screen variant="none" title={r.title} maxWidth={560} centerContent>
      <ResultView title={r.title} message={route.params?.message || r.message} tone={r.tone || 'green'} icon={r.icon}
        primary={{ label: r.primary[0], onPress: () => go(r.primary) }} secondary={r.secondary ? { label: r.secondary[0], onPress: () => go(r.secondary!) } : undefined} />
    </Screen>
  );
}

/** Static help / policy page. Works signed in or out. */
export function Info({ route }: any) {
  const a = ARTICLES[route.params?.slug] || ARTICLES.about;
  const { user } = useAuth();
  const Page: any = user ? SettingsPage : Screen;
  return (
    <Page title={a.title} subtitle={a.subtitle} back={user ? 'Settings' : 'Landing'} maxWidth={760}>
      {a.icon ? <IconTile name={a.icon as any} tint={(a.tint as TintName) || 'blue'} size={52} style={{ marginBottom: space.lg }} /> : null}
      <Card>
        {a.sections.map((s, i) => (
          <View key={i} style={{ marginBottom: i < a.sections.length - 1 ? space.lg : 0 }}>
            {s.heading ? <Text style={styles.h}>{s.heading}</Text> : null}
            {s.body ? <Text style={styles.body}>{s.body}</Text> : null}
            {s.bullets?.map((b) => <CheckItem key={b} text={b} tone={s.tone === 'red' ? 'red' : 'blue'} />)}
          </View>
        ))}
      </Card>
      {a.note ? <InfoNote text={a.note} style={{ marginTop: space.lg }} /> : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  h: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.text, marginBottom: 8 },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: colors.textSoft, marginBottom: 8 },
});

export { Ionicons };
