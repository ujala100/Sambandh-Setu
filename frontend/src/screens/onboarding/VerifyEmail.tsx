import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Auth, errorMessage } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { AuthLayout } from '../../layout/AuthLayout';
import { colors, fonts, space } from '../../theme';
import { Button, InfoNote, OtpInput, TextLink } from '../../ui';
import { maskEmail } from '../../utils/format';

/** "Email Verification Page" (web) / "Verify your number" (app, adapted to email). */
export default function VerifyEmail() {
  const { user, startSession, signOut } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(30);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await Auth.verifyEmail(code);
      await startSession(r.token, r.user);
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  const resend = async () => {
    setError(null);
    try { await Auth.resendEmailCode(); setCooldown(30); } catch (e) { setError(errorMessage(e)); }
  };

  return (
    <AuthLayout
      heading="One more step towards"
      highlight="meaningful connections."
      intro="We've sent a verification code to confirm your details. This helps us keep your account safe and secure."
      points={[
        { icon: 'shield-checkmark', title: 'Safe & Secure', text: 'We verify your details to protect your privacy.' },
        { icon: 'lock-closed', title: 'Your Information is Private', text: 'Your data is used only for your account and is never shared without your consent.' },
        { icon: 'people', title: 'A Trusted Community', text: 'Helping individuals build meaningful connections with respect and trust.' },
      ]}
      mobileTitle="Verify your email"
      mobileSubtitle={`We've sent a 6-digit code to ${maskEmail(user?.email || '')}`}
    >
      <View style={{ alignItems: 'center', marginBottom: space.xl }}>
        <View style={styles.icon}><Ionicons name="mail-outline" size={26} color={colors.primary} /></View>
        <Text style={styles.title}>Let's verify it's you.</Text>
        <Text style={styles.sub}>We've sent a 6-digit verification code to <Text style={{ fontFamily: fonts.semibold, color: colors.text }}>{maskEmail(user?.email || '')}</Text>.</Text>
      </View>
      <OtpInput value={code} onChange={setCode} error={!!error} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: space.lg }}>
        <Text style={styles.sub}>Didn't receive the code? </Text>
        {cooldown > 0 ? <Text style={[styles.sub, { fontFamily: fonts.semibold }]}>Resend ({`00:${String(cooldown).padStart(2, '0')}`})</Text> : <TextLink title="Resend" size={13.5} onPress={resend} />}
      </View>
      {error ? <InfoNote tone="red" icon="alert-circle" text={error} style={{ marginBottom: space.lg }} /> : null}
      <Button title="Verify & Continue" arrow onPress={verify} loading={busy} disabled={code.length !== 6} />
      <TextLink title="Use a different email (sign out)" size={13} style={{ alignSelf: 'center', marginTop: space.lg }} onPress={() => signOut()} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  icon: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontFamily: fonts.bold, fontSize: 24, color: colors.text, textAlign: 'center' },
  sub: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.muted, textAlign: 'center', marginTop: 4 },
});
