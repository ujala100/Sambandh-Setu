import React, { useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppBackground from '../../components/AppBackground';
import AppLogo from '../../components/AppLogo';
import { colors, fonts, radius, spacing } from '../../theme';
import { useAuth } from '../../context/AuthContext';

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isPhone = (v: string) => /^\d{10}$/.test(v.replace(/[\s+-]|^91/g, ''));
const isUsername = (v: string) => /^[a-zA-Z0-9_.-]{3,30}$/.test(v.trim());

export default function LoginScreen({ navigation }: any) {
  const auth = useAuth() as any;
  const login = auth.loginWithPassword;

  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const idFocus = useRef(new Animated.Value(0)).current;
  const pwFocus = useRef(new Animated.Value(0)).current;

  const idOk = isEmail(id) || isPhone(id) || isUsername(id);
  const idError = id.length > 0 && !idOk ? 'Enter a valid email, username, or phone number' : '';
  const valid = idOk && password.length >= 6;

  const animateFocus = (anim: Animated.Value, focused: boolean) => {
    Animated.timing(anim, {
      toValue: focused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const idBorderColor = idFocus.interpolate({
    inputRange: [0, 1],
    outputRange: ['#4D6257', '#D06D94'],
  });
  const pwBorderColor = pwFocus.interpolate({
    inputRange: [0, 1],
    outputRange: ['#4D6257', '#D06D94'],
  });

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      await login({ identifier: id.trim(), password });
    } catch (e: any) {
      setError(e?.error?.message || e?.message || 'Incorrect email/username or password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Romantic Atmospheric Dating Wallpaper */}
      <AppBackground opacity={0.42} />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back Button */}
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={12}
              style={styles.back}
              accessibilityLabel="Back"
            >
              <Ionicons name="arrow-back" size={22} color="#243B36" />
            </Pressable>

            {/* Top Brand with Logo */}
            <View style={styles.brandSection}>
              <AppLogo size={52} imageStyle={{ borderRadius: 14 }} />
              <Text style={styles.brandName}>Sambandh Setu</Text>
            </View>

            {/* Frosted Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Welcome Back</Text>
              <Text style={styles.cardSub}>Step back into your intentional journey.</Text>

              {/* Identifier Input */}
              <Text style={styles.label}>Email, username, or phone</Text>
              <Animated.View style={[styles.inputWrap, { borderColor: idBorderColor }]}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color="#4D6257"
                  style={styles.inputIcon}
                />
                <TextInput
                  value={id}
                  onChangeText={(t) => { setId(t); setError(''); }}
                  placeholder="name@domain.com or phone"
                  placeholderTextColor="rgba(77,98,87,0.45)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  style={styles.input}
                  onFocus={() => animateFocus(idFocus, true)}
                  onBlur={() => animateFocus(idFocus, false)}
                />
              </Animated.View>
              {!!idError && <Text style={styles.error}>{idError}</Text>}

              {/* Password Input */}
              <Text style={[styles.label, { marginTop: spacing.md }]}>Password</Text>
              <Animated.View style={[styles.inputWrap, { borderColor: pwBorderColor }]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color="#4D6257"
                  style={styles.inputIcon}
                />
                <TextInput
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(''); }}
                  placeholder="Enter your password"
                  placeholderTextColor="rgba(77,98,87,0.45)"
                  secureTextEntry={!show}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.input, { flex: 1, paddingRight: 44 }]}
                  onFocus={() => animateFocus(pwFocus, true)}
                  onBlur={() => animateFocus(pwFocus, false)}
                />
                <Pressable
                  onPress={() => setShow((s) => !s)}
                  hitSlop={10}
                  style={styles.eye}
                  accessibilityLabel={show ? 'Hide password' : 'Show password'}
                >
                  <Ionicons
                    name={show ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#4D6257"
                  />
                </Pressable>
              </Animated.View>

              <Pressable
                onPress={() => navigation.navigate('ForgotPassword')}
                style={styles.forgot}
                hitSlop={8}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>

              {!!error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={14} color="#E0485A" />
                  <Text style={styles.errorBoxText}>{error}</Text>
                </View>
              )}

              {/* Continue Button */}
              <Pressable
                onPress={submit}
                disabled={!valid || busy}
                style={({ pressed }) => [
                  styles.submitBtnWrap,
                  pressed && { opacity: 0.88 },
                  (!valid || busy) && { opacity: 0.55 },
                ]}
              >
                <LinearGradient
                  colors={['#E07AA0', '#D06D94', '#B8557B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitBtn}
                >
                  <Text style={styles.submitBtnText}>{busy ? 'Logging in…' : 'Continue'}</Text>
                  {!busy && (
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color="#fff"
                      style={{ marginLeft: 8 }}
                    />
                  )}
                </LinearGradient>
              </Pressable>

              {/* OTP Alt */}
              <Pressable
                onPress={() => navigation.navigate('CreateAccount', { mode: 'login' })}
                style={styles.otpBtn}
              >
                <Text style={styles.otpBtnText}>Log in with OTP instead</Text>
              </Pressable>
            </View>

            {/* Footer link */}
            <Text style={styles.footer}>
              New to Sambandh Setu?{' '}
              <Text
                style={styles.link}
                onPress={() => navigation.navigate('CreateAccount', { mode: 'signup' })}
              >
                Create an account
              </Text>
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAC6D6',
  },
  safe: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.xl,
  },
  brandHeart: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D06D94',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  brandName: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: '#243B36',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 24,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#243B36',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: '#243B36',
    marginBottom: 4,
  },
  cardSub: {
    fontFamily: fonts.regular,
    fontSize: 13.5,
    color: '#4D6257',
    marginBottom: spacing.xl,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: '#243B36',
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF4F2',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14.5,
    color: '#243B36',
    paddingVertical: 12,
  },
  eye: {
    position: 'absolute',
    right: 14,
    padding: 4,
  },
  forgot: {
    alignSelf: 'flex-end',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  forgotText: {
    fontFamily: fonts.semibold,
    fontSize: 12.5,
    color: '#D06D94',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDECEE',
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorBoxText: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: '#E0485A',
    flex: 1,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#E0485A',
    marginTop: 4,
    marginBottom: 4,
  },
  submitBtnWrap: {
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginTop: spacing.sm,
    shadowColor: '#D06D94',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: radius.pill,
  },
  submitBtnText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#fff',
  },
  otpBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  otpBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 13.5,
    color: '#D06D94',
  },
  footer: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 13.5,
    color: '#4D6257',
    marginTop: spacing.sm,
  },
  link: {
    fontFamily: fonts.bold,
    color: '#D06D94',
  },
});
