import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';
import Keypad from '../../components/Keypad';
import OtpInput from '../../components/OtpInput';
import { useAuth } from '../../context/AuthContext';
import { sendOtp, verifyOtp } from '../../services/api';
import { colors, fonts, radius, shadow, spacing } from '../../theme';

const RESEND_SECONDS = 30;
const MAX_ATTEMPTS = 5;

export default function VerifyOtpScreen({ navigation, route }: any) {
  const identifier: string = route.params?.identifier ?? route.params?.phone ?? '';
  const password = route.params?.password;
  const purpose = route.params?.purpose || 'signup';
  const isEmail = identifier.includes('@');
  const targetDisplay = isEmail ? identifier : `+91 xxxxx xx${identifier.slice(-3)}`;
  const [demoCode, setDemoCode] = useState<string | undefined>(!isEmail ? route.params?.demoCode : undefined);
  const [code, setCode] = useState('');
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [attempts, setAttempts] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();
  const locked = attempts >= MAX_ATTEMPTS;

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const verify = async () => {
    setLoading(true);
    setError('');
    try {
      const session = await verifyOtp(identifier, code, password, purpose);
      if (session) {
        setLoading(false);
        if ((session as any).user?.onboardingCompleted || purpose === 'login') {
          await signIn(session);
        } else {
          navigation.navigate('OnboardingBasics', { session });
        }
        return;
      }
    } catch (err: any) {
      const used = attempts + 1;
      setAttempts(used);
      setCode('');
      setError(
        used >= MAX_ATTEMPTS
          ? 'Too many wrong tries. Please request a new code.'
          : err?.error?.message || err?.message || `Incorrect code. ${MAX_ATTEMPTS - used} tries left.`
      );
    }
    setLoading(false);
  };

  const resend = async () => {
    setError('');
    setCode('');
    setAttempts(0);
    try {
      const r = await sendOtp(identifier, purpose);
      if (!isEmail) setDemoCode(r.demoCode);
      setSeconds(RESEND_SECONDS);
    } catch (err: any) {
      setError(err?.error?.message || err?.message || "Couldn't send a new code. Try again.");
    }
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </Pressable>

      <View style={styles.brandRow}>
        <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
        <Text style={styles.brandTag}>SECURITY & TRUST</Text>
      </View>

      <Text style={styles.title}>{isEmail ? 'Verify Your Email' : 'Verify Your Number'}</Text>
      <Text style={styles.sub}>
        {isEmail ? 'We sent a 6-digit confirmation code to your inbox:' : 'We sent a 6-digit SMS verification code to:'}
      </Text>
      <Text style={styles.phone}>{targetDisplay}</Text>

      {!isEmail && !!demoCode && (
        <View style={styles.demo}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.demoText}>
            Demo code: <Text style={styles.demoCode}>{demoCode}</Text>
          </Text>
        </View>
      )}

      {/* OTP Boxes */}
      <View style={{ marginTop: spacing.lg }}>
        <OtpInput value={code} onChangeText={setCode} />
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.resend}>
        Didn't receive the code?{' '}
        {seconds > 0 && !locked ? (
          <Text style={styles.bold}>
            Resend in <Text style={styles.timer}>({mm}:{ss})</Text>
          </Text>
        ) : (
          <Text style={[styles.bold, { color: colors.primary }]} onPress={resend} accessibilityRole="button">
            Resend Code
          </Text>
        )}
      </Text>

      <View style={{ flex: 1 }} />

      <Keypad
        onDigit={(d) => !locked && setCode((c) => (c.length < 6 ? c + d : c))}
        onDelete={() => setCode((c) => c.slice(0, -1))}
      />

      <Button
        title="Verify & Continue"
        arrow
        loading={loading}
        disabled={code.length !== 6 || locked}
        onPress={verify}
        style={{ marginTop: spacing.md }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg, // Mint Green: #C0E1CF
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  brandTag: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.primary,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.text,
  },
  sub: {
    fontFamily: fonts.regular,
    fontSize: 13.5,
    color: colors.textMuted,
    marginTop: 4,
  },
  phone: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.primary,
    marginTop: 4,
  },
  demo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.cardSecondary, // Sage Mint
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(77, 98, 87, 0.12)',
  },
  demoText: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: colors.text,
  },
  demoCode: {
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.danger,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  resend: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.lg,
  },
  bold: {
    fontFamily: fonts.bold,
  },
  timer: {
    color: colors.primary,
  },
});
