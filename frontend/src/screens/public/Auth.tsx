import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Auth, errorMessage } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { AuthLayout } from '../../layout/AuthLayout';
import { colors, fonts, radius, space } from '../../theme';
import { Button, CheckRow, Divider, InfoNote, OtpInput, PasswordField, PhoneField, TextField, TextLink } from '../../ui';
import { useLayout } from '../../hooks/useLayout';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function CardTitle({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: any }) {
  const { wide } = useLayout();
  if (!wide) return null;
  return (
    <View style={{ marginBottom: space.xl, alignItems: icon ? 'center' : 'flex-start' }}>
      {icon ? <View style={styles.cardIcon}><Ionicons name={icon} size={26} color={colors.primary} /></View> : null}
      <Text style={[styles.cardTitle, icon && { textAlign: 'center' }]} accessibilityRole="header">{title}</Text>
      {subtitle ? <Text style={[styles.cardSub, icon && { textAlign: 'center' }]}>{subtitle}</Text> : null}
    </View>
  );
}

function OrDivider() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: space.lg }}>
      <Divider style={{ flex: 1 }} /><Text style={{ fontFamily: fonts.regular, fontSize: 12.5, color: colors.faint }}>or</Text><Divider style={{ flex: 1 }} />
    </View>
  );
}

// ---------------- Login ----------------

export function Login({ navigation }: any) {
  const { startSession, config } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [mode, setMode] = useState<'password' | 'code' | 'code-sent'>('password');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!identifier.trim()) return setError('Enter your email address or mobile number');
    setBusy(true);
    try {
      if (mode === 'password') {
        if (!password) { setBusy(false); return setError('Enter your password'); }
        const r = await Auth.login(identifier.trim(), password);
        await startSession(r.token, r.user);
      } else if (mode === 'code') {
        if (!EMAIL_RE.test(identifier.trim())) { setBusy(false); return setError('Enter the email address on your account'); }
        await Auth.requestLoginCode(identifier.trim());
        setMode('code-sent');
      } else {
        const r = await Auth.loginWithCode(identifier.trim(), code);
        await startSession(r.token, r.user);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="WELCOME BACK"
      heading="Continue your"
      highlight="meaningful journey."
      intro="Log in to your Sambandh Setu account and pick up where you left off. Your reflections, preferences and conversations are right here."
      points={[
        { icon: 'heart', title: 'Your Progress', text: 'Continue your journey anytime.' },
        { icon: 'shield-checkmark', title: 'Your Privacy', text: 'Your information stays safe and secure.' },
        { icon: 'people', title: 'A More Thoughtful Experience', text: 'Personalised guidance for meaningful connections.' },
      ]}
      mobileTitle="Welcome back"
      mobileSubtitle="Log in to continue your journey towards meaningful connections."
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
    >
      <CardTitle title="Log in to Sambandh Setu" subtitle="Continue your journey towards meaningful connections." />
      <TextField label={mode === 'password' ? 'Email address or mobile number' : 'Email address'} required icon="mail-outline" value={identifier} onChangeText={setIdentifier}
        placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" autoComplete="username" textContentType="username" editable={mode !== 'code-sent'} />
      {mode === 'password' ? (
        <>
          <PasswordField label="Password" required value={password} onChangeText={setPassword} placeholder="Enter your password" autoComplete="current-password" textContentType="password" onSubmitEditing={submit} />
          <View style={styles.between}>
            <CheckRow label="Remember me" checked={remember} onPress={() => setRemember((r) => !r)} boxed={false} style={{ paddingVertical: 0, minHeight: 36 }} />
            <TextLink title="Forgot password?" size={13} onPress={() => navigation.navigate('ForgotPassword', { email: identifier.includes('@') ? identifier.trim() : undefined })} />
          </View>
        </>
      ) : mode === 'code-sent' ? (
        <View style={{ marginBottom: space.lg }}>
          <Text style={[styles.cardSub, { marginBottom: 12 }]}>If an account exists for {identifier.trim()}, we've sent a 6-digit code.</Text>
          <OtpInput value={code} onChange={setCode} error={!!error} />
        </View>
      ) : null}
      {error ? <InfoNote tone="red" icon="alert-circle" text={error} style={{ marginBottom: space.lg }} /> : null}
      <Button title={mode === 'password' ? 'Log in' : mode === 'code' ? 'Send code' : 'Verify & Log in'} arrow onPress={submit} loading={busy} disabled={mode === 'code-sent' && code.length !== 6} />
      {config.emailCodes ? (
        <TextLink title={mode === 'password' ? 'Log in with an email code instead' : 'Use my password instead'} size={13} style={{ alignSelf: 'center', marginTop: 10 }}
          onPress={() => { setError(null); setCode(''); setMode(mode === 'password' ? 'code' : 'password'); }} />
      ) : null}
      <OrDivider />
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={styles.muted}>Don't have an account? </Text>
        <TextLink title="Create one" onPress={() => navigation.navigate('SignUp')} />
      </View>
      <InfoNote icon="shield-checkmark" text="We respect your privacy. Your information is secure and will never be shared without your consent." style={{ marginTop: space.lg }} />
    </AuthLayout>
  );
}

// ---------------- Sign up ----------------

const RULES = [
  { label: 'Be at least 8 characters long', test: (p: string) => p.length >= 8 },
  { label: 'Include a number and a letter', test: (p: string) => /\d/.test(p) && /[A-Za-z]/.test(p) },
  { label: 'Include a special character (e.g., ! @ # $)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export function SignUp({ navigation }: any) {
  const { startSession, config } = useAuth();
  const [f, setF] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' });
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (v: string) => { setF((s) => ({ ...s, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (f.fullName.trim().length < 2) e.fullName = 'Enter your full name';
    if (!EMAIL_RE.test(f.email.trim())) e.email = 'Please enter a valid email address';
    if (f.phone && !/^[6-9]\d{9}$/.test(f.phone.replace(/\D/g, ''))) e.phone = 'Enter a valid 10-digit mobile number';
    if (!RULES.every((r) => r.test(f.password))) e.password = 'Your password does not meet the rules below';
    if (f.confirm !== f.password) e.confirm = 'Passwords do not match';
    if (!terms) e.terms = 'Please accept the Terms of Service and Privacy Policy';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setError(null);
    try {
      const r = await Auth.signup({ fullName: f.fullName.trim(), email: f.email.trim(), phone: f.phone ? f.phone.replace(/\D/g, '') : undefined, password: f.password, acceptTerms: true });
      await startSession(r.token, r.user);
    } catch (err: any) {
      if (err?.field) setErrors({ [err.field]: err.message });
      else setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      eyebrow=""
      heading="Meaningful connections begin with"
      highlight="understanding."
      intro="Sambandh Setu is a relationship platform that helps you understand yourself, explore compatibility, and build meaningful connections with clarity and trust."
      points={[
        { icon: 'heart-outline', title: 'Self-reflection', text: 'to understand what matters to you' },
        { icon: 'chatbubbles-outline', title: 'Meaningful conversations', text: 'with guided support' },
        { icon: 'people-outline', title: 'Family involvement', text: '(optional) with your permission' },
      ]}
      mobileTitle="Create your account"
      mobileSubtitle="Take the first step towards a more meaningful journey."
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
    >
      <CardTitle title="Create your account" subtitle="Take the first step towards a more meaningful journey." />
      <TextField label="Full name" required value={f.fullName} onChangeText={set('fullName')} placeholder="Enter your name" autoComplete="name" textContentType="name" error={errors.fullName} />
      <TextField label="Email address" required value={f.email} onChangeText={set('email')} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" error={errors.email} />
      <PhoneField label="Mobile number" optional value={f.phone} onChangeText={set('phone')} error={errors.phone} helper="Saved to your account. Mobile sign-in is not available yet." />
      <PasswordField label="Password" required value={f.password} onChangeText={set('password')} placeholder="Create a password" autoComplete="new-password" textContentType="newPassword" error={errors.password} />
      <PasswordField label="Confirm password" required value={f.confirm} onChangeText={set('confirm')} placeholder="Confirm your password" autoComplete="new-password" error={errors.confirm} />
      <View style={styles.rules}>
        <Text style={styles.rulesTitle}>Your password must:</Text>
        {RULES.map((r) => {
          const ok = r.test(f.password);
          return (
            <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <Ionicons name={ok ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={ok ? colors.primary : colors.faint} />
              <Text style={[styles.ruleText, ok && { color: colors.text }]}>{r.label}</Text>
            </View>
          );
        })}
      </View>
      <Pressable onPress={() => { setTerms((t) => !t); setErrors((e) => ({ ...e, terms: '' })); }} accessibilityRole="checkbox" accessibilityState={{ checked: terms }} style={styles.terms}>
        <View style={[styles.box, terms && styles.boxOn]}>{terms ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}</View>
        <Text style={styles.termsText}>
          I agree to the <Text style={styles.link} onPress={() => navigation.navigate('Info', { slug: 'terms' })}>Terms of Service</Text> and <Text style={styles.link} onPress={() => navigation.navigate('Info', { slug: 'privacy-policy' })}>Privacy Policy</Text> <Text style={{ color: colors.dangerStrong }}>*</Text>
        </Text>
      </Pressable>
      {errors.terms ? <Text style={styles.err}>{errors.terms}</Text> : null}
      {error ? <InfoNote tone="red" icon="alert-circle" text={error} style={{ marginBottom: space.lg }} /> : null}
      <Button title={config.emailCodes ? 'Continue to verification' : 'Create account'} arrow onPress={submit} loading={busy} />
      <OrDivider />
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={styles.muted}>Already have an account? </Text>
        <TextLink title="Log In" onPress={() => navigation.navigate('Login')} />
      </View>
    </AuthLayout>
  );
}

// ---------------- Forgot / reset password ----------------

export function ForgotPassword({ navigation, route }: any) {
  const { startSession, config } = useAuth();
  const [email, setEmail] = useState<string>(route?.params?.email || '');
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const send = async () => {
    setError(null);
    if (!EMAIL_RE.test(email.trim())) return setError('Please enter a valid email address');
    setBusy(true);
    try {
      const r: any = await Auth.forgotPassword(email.trim());
      setInfo(r?.message || 'Check your email for a 6-digit code.');
      setStep('reset');
    } catch (e) {
      setError(errorMessage(e));
    } finally { setBusy(false); }
  };
  const reset = async () => {
    setError(null);
    if (code.length !== 6) return setError('Enter the 6-digit code from your email');
    if (!RULES.every((r) => r.test(password))) return setError('Use at least 8 characters with a letter, a number and a special character.');
    if (password !== confirm) return setError('Passwords do not match');
    setBusy(true);
    try {
      const r = await Auth.resetPassword(email.trim(), code, password);
      await startSession(r.token, r.user);
    } catch (e) {
      setError(errorMessage(e));
    } finally { setBusy(false); }
  };

  const back = () => (step === 'reset' ? setStep('request') : navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Login'));

  return (
    <AuthLayout
      heading="Let's get you"
      highlight="back in."
      intro="Enter your registered email address and we'll send you a code to reset your password."
      points={[
        { icon: 'lock-closed', title: 'Secure Process', text: 'Your information stays safe and protected.' },
        { icon: 'mail', title: 'Quick and Easy', text: 'Get a reset code in just a few seconds.' },
        { icon: 'shield-checkmark', title: 'Need Help?', text: 'Contact our support team if you cannot access your account.' },
      ]}
      onBack={back}
      mobileTitle={step === 'request' ? 'Forgot password?' : 'Set a new password'}
      mobileSubtitle={step === 'request' ? "No worries! Enter your registered email and we'll send you a code." : `Enter the code sent to ${email.trim()} and choose a new password.`}
    >
      {step === 'request' ? (
        <>
          <CardTitle icon="lock-closed" title="Forgot Password?" subtitle="No worries! Enter your registered email address and we'll send you a code to reset your password." />
          <TextField label="Email address" required icon="mail-outline" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" helper="Enter the email address linked to your account." />
          {!config.emailCodes ? <InfoNote tone="amber" icon="information-circle" text="Password reset by email is not switched on for this service yet. If you can't log in, please contact the Sambandh Setu team for help." style={{ marginBottom: space.lg }} /> : null}
          {error ? <InfoNote tone="red" icon="alert-circle" text={error} style={{ marginBottom: space.lg }} /> : null}
          <Button title="Send reset code" arrow onPress={send} loading={busy} disabled={!config.emailCodes} />
          <InfoNote icon="shield-checkmark" text="The code expires in 10 minutes. For your security we never say whether an email is registered." style={{ marginTop: space.lg }} />
        </>
      ) : (
        <>
          <CardTitle icon="key" title="Set a New Password" subtitle={`Enter the 6-digit code sent to ${email.trim()} and choose a new password.`} />
          {info ? <InfoNote text={info} style={{ marginBottom: space.lg }} /> : null}
          <View style={{ marginBottom: space.lg }}><OtpInput value={code} onChange={setCode} /></View>
          <PasswordField label="New password" required value={password} onChangeText={setPassword} placeholder="Create a new password" autoComplete="new-password" />
          <PasswordField label="Confirm new password" required value={confirm} onChangeText={setConfirm} placeholder="Confirm your new password" autoComplete="new-password" />
          {error ? <InfoNote tone="red" icon="alert-circle" text={error} style={{ marginBottom: space.lg }} /> : null}
          <Button title="Reset password" arrow onPress={reset} loading={busy} />
          <TextLink title="Resend code" size={13} style={{ alignSelf: 'center', marginTop: 12 }} onPress={send} />
        </>
      )}
      <Divider style={{ marginVertical: space.lg }} />
      <Text style={[styles.muted, { textAlign: 'center' }]}>Remember your password?</Text>
      <TextLink title="Back to Log In" style={{ alignSelf: 'center' }} onPress={() => navigation.navigate('Login')} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  cardIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  cardTitle: { fontFamily: fonts.bold, fontSize: 25, color: colors.text },
  cardSub: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.muted, marginTop: 6 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.lg, marginTop: -6 },
  muted: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.muted },
  rules: { backgroundColor: colors.primarySoft, borderRadius: radius.card, padding: 14, marginBottom: space.lg },
  rulesTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  ruleText: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  terms: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8, minHeight: 32 },
  termsText: { flex: 1, fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 20, color: colors.textSoft },
  link: { color: colors.primary, fontFamily: fonts.semibold },
  box: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  err: { fontFamily: fonts.medium, fontSize: 12, color: colors.danger, marginBottom: 12 },
});
