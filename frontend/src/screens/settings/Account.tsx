import React, { useState } from 'react';
import { Platform, Share, StyleSheet, Text, View } from 'react-native';
import { Auth, MeApi, errorMessage } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { colors, fonts, space } from '../../theme';
import { Avatar, Button, ButtonRow, Card, CheckItem, IconTile, ConfirmDialog, DateField, InfoNote, ListRow, OtpInput, PasswordField, PhoneField, RadioRow, ResultView, Screen, SelectField, StatePill, TextField, TextLink, useToast } from '../../ui';
import { SettingsPage } from './SettingsHome';
import { CITIES, GENDERS, HEIGHT_OPTIONS, MARITAL } from '../../content/forms';
import { formatDate, maskPhone } from '../../utils/format';

export function Account({ navigation }: any) {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <SettingsPage active="account" title="Account" subtitle="Manage your personal information and account details.">
      <Card padded={false} style={{ marginBottom: space.lg }}>
        <ListRow title={user.name} subtitle="View and edit your profile information" onPress={() => navigation.navigate('EditPersonal')} right={<Avatar uri={user.photoUrl} name={user.name} size={44} />} last />
      </Card>
      <Card padded={false}>
        <ListRow icon="person-outline" title="Edit Personal Information" subtitle="Name, date of birth, gender, marital status" onPress={() => navigation.navigate('EditPersonal')} />
        <ListRow icon="call-outline" title="Phone Number" subtitle={user.phone ? maskPhone(user.phone) : 'Not added'} onPress={() => navigation.navigate('PhoneNumber')} />
        <ListRow icon="mail-outline" title="Email Address" subtitle={user.email} badge={user.emailVerified ? <StatePill state="verified" label="Verified" /> : <StatePill state="pending" label="Not confirmed" />} onPress={() => navigation.navigate('EmailAddress')} />
        <ListRow icon="location-outline" title="Location" subtitle={user.profile.location || 'Manage your current location'} onPress={() => navigation.navigate('LocationSettings')} />
        <ListRow icon="settings-outline" title="Manage Account" subtitle="Download your data, deactivate account" onPress={() => navigation.navigate('ManageAccount')} last />
      </Card>
    </SettingsPage>
  );
}

export function EditPersonal({ navigation }: any) {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const p = user!.profile;
  const [f, setF] = useState({ fullName: user!.name, dateOfBirth: p.dateOfBirth || '', gender: p.gender, maritalStatus: p.maritalStatus, heightCm: p.heightCm ? String(p.heightCm) : '', location: p.location });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => { setF((s) => ({ ...s, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };
  const save = async () => {
    setBusy(true);
    try {
      const r = await MeApi.updateAccount({ fullName: f.fullName, dateOfBirth: f.dateOfBirth || undefined, gender: f.gender || undefined, maritalStatus: f.maritalStatus || undefined, heightCm: f.heightCm ? Number(f.heightCm) : undefined, location: f.location });
      setUser(r.user); toast.show('Personal information saved'); navigation.goBack();
    } catch (e: any) { if (e?.field) setErrors({ [e.field]: e.message }); else toast.show(errorMessage(e), 'error'); } finally { setBusy(false); }
  };
  return (
    <SettingsPage active="account" title="Edit Personal Information" subtitle="Keep your profile information up to date." breadcrumb={['Home', 'Settings', 'Account', 'Edit Personal Information']}
      footer={<ButtonRow><Button title="Cancel" variant="ghost" onPress={() => navigation.goBack()} /><Button title="Save changes" onPress={save} loading={busy} /></ButtonRow>}>
      <TextField label="Full name" required value={f.fullName} onChangeText={(v) => set('fullName', v)} error={errors.fullName} />
      <DateField label="Date of birth" required value={f.dateOfBirth} onChange={(v) => set('dateOfBirth', v)} error={errors.dateOfBirth} />
      <Text style={styles.label}>Gender <Text style={{ color: colors.dangerStrong }}>*</Text></Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: space.lg }}>
        {GENDERS.map((g) => <View key={g} style={{ minWidth: 150 }}><RadioRow label={g} boxed={false} selected={f.gender === g} onPress={() => set('gender', g)} /></View>)}
      </View>
      <SelectField label="Marital status" required value={f.maritalStatus} options={MARITAL} onChange={(v) => set('maritalStatus', v)} error={errors.maritalStatus} />
      <SelectField label="Height" value={f.heightCm} options={HEIGHT_OPTIONS} onChange={(v) => set('heightCm', v)} error={errors.heightCm} />
      <SelectField label="Location" required value={f.location} options={CITIES} onChange={(v) => set('location', v)} />
    </SettingsPage>
  );
}

export function PhoneNumber({ navigation }: any) {
  const { user } = useAuth();
  return (
    <SettingsPage active="account" title="Phone Number" subtitle="Manage the mobile number on your account.">
      <Card>
        <Text style={styles.small}>Current number</Text>
        <Text style={styles.big}>{user?.phone ? `+91 ${user.phone.slice(3, 8)} ${user.phone.slice(8)}` : 'Not added'}</Text>
        {user?.phone ? <View style={{ marginTop: 6 }}><StatePill state={user.phoneVerified ? 'verified' : 'pending'} label={user.phoneVerified ? 'Verified' : 'Not verified'} /></View> : null}
      </Card>
      <InfoNote icon="information-circle" text="Your number is never shown to other members. SMS verification is not available yet, so your number cannot be used to sign in." style={{ marginVertical: space.lg }} />
      <Button title={user?.phone ? 'Change phone number' : 'Add phone number'} onPress={() => navigation.navigate('ChangePhone')} />
    </SettingsPage>
  );
}

export function ChangePhone({ navigation }: any) {
  const { user, setUser } = useAuth();
  const [phone, setPhone] = useState(user?.phone ? user.phone.slice(3) : '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async (remove = false) => {
    setBusy(true); setError(null);
    try { const r = await MeApi.updatePhone(remove ? null : phone.replace(/\D/g, '')); setUser(r.user); navigation.navigate('Result', { kind: 'phoneUpdated', message: remove ? 'Your phone number has been removed.' : undefined }); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <SettingsPage active="account" title="Change phone number" subtitle="Enter the mobile number you would like to use." footer={<View style={{ gap: 8 }}><Button title="Save number" onPress={() => save()} loading={busy} />{user?.phone ? <TextLink title="Remove phone number" color={colors.dangerStrong} style={{ alignSelf: 'center' }} onPress={() => save(true)} /> : null}</View>}>
      <PhoneField label="New phone number" value={phone} onChangeText={setPhone} error={error} />
      <InfoNote tone="amber" icon="information-circle" text="We'll add SMS verification once an SMS provider is connected. Until then, numbers are saved as unverified." />
    </SettingsPage>
  );
}

export function EmailAddress({ navigation }: any) {
  const { user, config } = useAuth();
  return (
    <SettingsPage active="account" title="Email Address" subtitle="Your email is used to sign in and for important messages.">
      <Card>
        <Text style={styles.small}>Current email</Text>
        <Text style={styles.big}>{user?.email}</Text>
        <View style={{ marginTop: 6 }}><StatePill state={user?.emailVerified ? 'verified' : 'pending'} label={user?.emailVerified ? 'Verified' : 'Not confirmed'} /></View>
      </Card>
      {!config.emailCodes ? <InfoNote tone="amber" icon="information-circle" text="Changing your email needs a code sent to the new address. Email codes are not switched on for this service yet." style={{ marginTop: space.lg }} /> : null}
      <Button title="Change email address" onPress={() => navigation.navigate('ChangeEmail')} disabled={!config.emailCodes} style={{ marginTop: space.lg }} />
    </SettingsPage>
  );
}

export function ChangeEmail({ navigation }: any) {
  const { user, setUser } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = async () => {
    setBusy(true); setError(null);
    try { await MeApi.requestEmailChange(email.trim(), password); setStep(2); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  const confirm = async () => {
    setBusy(true); setError(null);
    try { const r = await MeApi.confirmEmailChange(code); setUser(r.user); navigation.navigate('Result', { kind: 'emailUpdated' }); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <SettingsPage active="account" title={step === 1 ? 'Change Email Address' : 'Verify your new email'} subtitle={step === 1 ? `Current: ${user?.email}` : `Enter the 6-digit code sent to ${email.trim()}`}
      footer={step === 1 ? <Button title="Send Verification Code" onPress={send} loading={busy} /> : <Button title="Verify" onPress={confirm} loading={busy} disabled={code.length !== 6} />}>
      {step === 1 ? (
        <>
          <TextField label="New email address" required value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" icon="mail-outline" />
          {user?.hasPassword ? <PasswordField label="Your password" required value={password} onChangeText={setPassword} helper="For your security, confirm your password." /> : null}
        </>
      ) : (
        <View style={{ marginVertical: space.lg }}><OtpInput value={code} onChange={setCode} error={!!error} /><TextLink title="Resend code" style={{ alignSelf: 'center', marginTop: 12 }} onPress={send} /></View>
      )}
      {error ? <InfoNote tone="red" icon="alert-circle" text={error} /> : null}
    </SettingsPage>
  );
}

export function LocationSettings({ navigation }: any) {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [loc, setLoc] = useState(user?.profile.location || '');
  const save = async () => { try { const r = await MeApi.updateAccount({ location: loc }); setUser(r.user); toast.show('Location saved'); navigation.goBack(); } catch (e) { toast.show(errorMessage(e), 'error'); } };
  return (
    <SettingsPage active="account" title="Location" subtitle="Your city helps us suggest people near you." footer={<Button title="Save" onPress={save} />}>
      <SelectField label="City" value={loc} options={CITIES} onChange={setLoc} icon="location-outline" />
      <InfoNote icon="navigate-outline" text="We only use the city you choose here. We never use your device's location." />
    </SettingsPage>
  );
}

export function ManageAccount({ navigation }: any) {
  return (
    <SettingsPage active="account" title="Manage Account" subtitle="Download your data or step away from Sambandh Setu.">
      <Card padded={false}>
        <ListRow icon="download-outline" tint="blue" title="Download your data" subtitle="Get a copy of the information in your account" onPress={() => navigation.navigate('DownloadData')} />
        <ListRow icon="pause-circle-outline" tint="amber" title="Deactivate account" subtitle="Hide your profile until you log in again" onPress={() => navigation.navigate('Deactivate')} />
        <ListRow icon="trash-outline" title="Delete account" subtitle="Permanently delete your account and data" danger onPress={() => navigation.navigate('DeleteAccount')} last />
      </Card>
    </SettingsPage>
  );
}

export function DownloadData({ navigation }: any) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const request = async () => {
    setBusy(true);
    try {
      const data = await MeApi.exportData();
      const json = JSON.stringify(data, null, 2);
      if (Platform.OS === 'web') {
        const blob = new Blob([json], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `sambandh-setu-data-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      } else {
        await Share.share({ title: 'My Sambandh Setu data', message: json });
      }
      navigation.navigate('Result', { kind: 'dataRequested' });
    } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setBusy(false); }
  };
  return (
    <SettingsPage active="account" title="Download Your Data" subtitle="We'll prepare a copy of your data to download." footer={<Button title="Request Data" onPress={request} loading={busy} />}>
      <Text style={styles.over}>INCLUDED IN YOUR DATA:</Text>
      {['Profile information', 'Your preferences and settings', 'Your connections and requests', 'Messages you have sent', 'Your Setu Journey reflections', 'Family access, verification and support records'].map((t) => <CheckItem key={t} text={t} />)}
      <InfoNote icon="information-circle" text={Platform.OS === 'web' ? 'The file downloads straight to this device as JSON.' : 'You can save or share the file from your phone.'} style={{ marginTop: space.md }} />
    </SettingsPage>
  );
}

function IdentityConfirm({ password, setPassword, code, setCode, error }: any) {
  const { user } = useAuth();
  const [sent, setSent] = useState(false);
  if (user?.hasPassword) return <PasswordField label="Enter your password to confirm" required value={password} onChangeText={setPassword} error={error} />;
  return (
    <View>
      {!sent ? <Button title="Email me a confirmation code" variant="secondary" onPress={async () => { await MeApi.requestDeleteCode(); setSent(true); }} /> : <OtpInput value={code} onChange={setCode} error={!!error} />}
      {error ? <InfoNote tone="red" icon="alert-circle" text={error} style={{ marginTop: 10 }} /> : null}
    </View>
  );
}

export function Deactivate({ navigation }: any) {
  const { signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true); setError(null);
    try { await MeApi.deactivate({ password, code }); await signOut(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <SettingsPage active="account" title="Deactivate Account" subtitle="Take a break without losing your profile." footer={<Button title="Deactivate my account" variant="danger" onPress={go} loading={busy} />}>
      <Card>
        <Text style={styles.h}>What happens when you deactivate</Text>
        <CheckItem text="Your profile is hidden from Discover and from people who are not connected with you." />
        <CheckItem text="You are signed out on all devices." />
        <CheckItem text="Log in again at any time to reactivate. Everything is kept as it was." />
      </Card>
      <View style={{ marginTop: space.lg }}><IdentityConfirm password={password} setPassword={setPassword} code={code} setCode={setCode} error={error} /></View>
    </SettingsPage>
  );
}

export function DeleteAccount({ navigation }: any) {
  const { signOut } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const del = async () => {
    setBusy(true); setError(null);
    try { await MeApi.deleteAccount({ password, code }); setStep(3); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  if (step === 3) {
    return (
      <Screen variant="none" title="Account Deleted" maxWidth={560} centerContent>
        <ResultView tone="green" title="Account Deleted" message="Your account and data have been permanently deleted. Thank you for being part of Sambandh Setu." primary={{ label: 'Done', onPress: () => signOut() }} />
      </Screen>
    );
  }
  return (
    <SettingsPage active="security" title={step === 1 ? 'Delete Account' : 'Confirm Deletion'} subtitle={step === 1 ? 'We are sorry to see you go.' : 'This cannot be undone.'}
      footer={step === 1 ? <ButtonRow><Button title="Cancel" variant="ghost" onPress={() => navigation.goBack()} /><Button title="Continue" variant="danger" onPress={() => setStep(2)} /></ButtonRow> : <ButtonRow><Button title="Back" variant="ghost" onPress={() => setStep(1)} /><Button title="Delete permanently" variant="danger" onPress={del} loading={busy} /></ButtonRow>}>
      {step === 1 ? (
        <>
          <Card>
            <Text style={styles.h}>Deleting your account will permanently remove:</Text>
            {['Your profile, photos and preferences', 'Your connections, chats and journey reflections', 'Family access invitations and verification documents', 'Your Setu Guide history'].map((t) => <CheckItem key={t} text={t} tone="red" />)}
          </Card>
          <Text style={[styles.h, { marginTop: space.lg, marginBottom: 8 }]}>Why are you leaving? (optional)</Text>
          {['I found a partner', 'I need a break', 'I did not find relevant matches', 'Privacy concerns', 'Other'].map((r) => <RadioRow key={r} label={r} selected={reason === r} onPress={() => setReason(r)} />)}
          <TextLink title="Deactivate instead (keeps your data)" onPress={() => navigation.navigate('Deactivate')} style={{ marginTop: 8 }} />
        </>
      ) : (
        <>
          <InfoNote tone="red" icon="warning" title="This action is permanent" text="Once deleted, your account cannot be recovered." style={{ marginBottom: space.lg }} />
          <IdentityConfirm password={password} setPassword={setPassword} code={code} setCode={setCode} error={error} />
        </>
      )}
    </SettingsPage>
  );
}

export function PasswordSecurity({ navigation }: any) {
  const { user, signOut } = useAuth();
  const [confirm, setConfirm] = useState(false);
  return (
    <SettingsPage active="security" title="Password & Security" subtitle="Keep your account safe.">
      <Card padded={false}>
        <ListRow icon="key-outline" tint="purple" title="Change password" subtitle={user?.hasPassword ? 'Update your password regularly' : 'Set a password for your account'} onPress={() => navigation.navigate('ChangePassword')} />
        <ListRow icon="phone-portrait-outline" tint="blue" title="Log out of all devices" subtitle="Sign out everywhere, including this device" onPress={() => setConfirm(true)} />
        <ListRow icon="shield-checkmark-outline" tint="green" title="Verification" subtitle="Verify your identity to build trust" onPress={() => navigation.navigate('Verification')} last />
      </Card>
      <Card padded={false} style={{ marginTop: space.lg }}>
        <ListRow icon="trash-outline" title="Delete account" subtitle="Permanently delete your account" danger onPress={() => navigation.navigate('DeleteAccount')} last />
      </Card>
      <InfoNote icon="lock-closed" text={`Member since ${formatDate(user?.createdAt)}. We will never ask for your password by email or chat.`} style={{ marginTop: space.lg }} />
      <ConfirmDialog visible={confirm} title="Log out of all devices?" message="You'll need to log in again on every device." confirmLabel="Log out everywhere" icon="log-out-outline" onCancel={() => setConfirm(false)} onConfirm={() => signOut(true)} />
    </SettingsPage>
  );
}

const RULES = [/.{8,}/, /\d/, /[A-Za-z]/, /[^A-Za-z0-9]/];
export function ChangePassword({ navigation }: any) {
  const { user, startSession } = useAuth();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setError(null);
    if (!RULES.every((r) => r.test(next))) return setError('Use at least 8 characters with a letter, a number and a special character.');
    if (next !== again) return setError('Passwords do not match');
    setBusy(true);
    try { const r = await Auth.changePassword(cur, next); await startSession(r.token, r.user); navigation.navigate('Result', { kind: 'passwordUpdated' }); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <SettingsPage active="security" title="Change password" subtitle="Choose a strong password you don't use elsewhere." footer={<Button title="Update password" onPress={save} loading={busy} />}>
      {user?.hasPassword ? <PasswordField label="Current password" required value={cur} onChangeText={setCur} autoComplete="current-password" /> : null}
      <PasswordField label="New password" required value={next} onChangeText={setNext} autoComplete="new-password" helper="At least 8 characters, with a letter, a number and a special character." />
      <PasswordField label="Confirm new password" required value={again} onChangeText={setAgain} autoComplete="new-password" />
      {error ? <InfoNote tone="red" icon="alert-circle" text={error} /> : null}
    </SettingsPage>
  );
}

export function Logout({ navigation }: any) {
  const { signOut } = useAuth();
  const [everywhere, setEverywhere] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <SettingsPage title="Log Out" subtitle="You can log back in anytime." footer={<ButtonRow><Button title="Cancel" variant="ghost" onPress={() => navigation.goBack()} /><Button title="Log Out" variant="danger" loading={busy} onPress={async () => { setBusy(true); await signOut(everywhere); }} /></ButtonRow>}>
      <Card style={{ alignItems: 'center' }}>
        <IconTile name="log-out-outline" tint="red" size={60} round style={{ marginBottom: 12 }} />
        <Text style={[styles.h, { textAlign: 'center' }]}>Are you sure you want to log out?</Text>
        <Text style={[styles.small, { textAlign: 'center', marginTop: 6 }]}>Your journey, reflections and conversations stay saved.</Text>
      </Card>
      <RadioRow label="Log out of this device" selected={!everywhere} onPress={() => setEverywhere(false)} style={{ marginTop: space.lg }} />
      <RadioRow label="Log out of all devices" description="Ends every session, including this one." selected={everywhere} onPress={() => setEverywhere(true)} />
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text, marginBottom: 4 },
  small: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted },
  big: { fontFamily: fonts.semibold, fontSize: 18, color: colors.text, marginTop: 4 },
  h: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text, marginBottom: 10 },
  over: { fontFamily: fonts.semibold, fontSize: 11.5, letterSpacing: 0.8, color: colors.muted, marginBottom: 12 },
  logoutIcon: { width: 0, height: 0 },
});
