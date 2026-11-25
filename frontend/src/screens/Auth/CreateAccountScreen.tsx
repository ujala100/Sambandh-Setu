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
import PhoneInput from '../../components/PhoneInput';
import { useAuth } from '../../context/AuthContext';
import { sendOtp } from '../../services/api';
import { getGoogleProfile, googleLogin } from '../../services/googleAuth';
import { colors, fonts, radius, spacing } from '../../theme';

const STEPS = 3; // placeholder count for progress dots

export default function CreateAccountScreen({ navigation, route }: any) {
  const isSignup = (route.params?.mode ?? 'signup') === 'signup';
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [isExistingAccount, setIsExistingAccount] = useState(false);
  const { user, signIn, signOut } = useAuth();

  const emailFocus = useRef(new Animated.Value(0)).current;
  const pwFocus = useRef(new Animated.Value(0)).current;

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isPhoneValid = phone.length === 10;
  const isPasswordValid = isSignup ? password.length >= 8 : true;
  const valid = (method === 'email' ? isEmailValid : isPhoneValid) && isPasswordValid;
  const target = method === 'email' ? email.trim() : phone.trim();

  const animateFocus = (anim: Animated.Value, focused: boolean) => {
    Animated.timing(anim, {
      toValue: focused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const emailBorderColor = emailFocus.interpolate({
    inputRange: [0, 1],
    outputRange: ['#4D6257', '#D06D94'],
  });
  const pwBorderColor = pwFocus.interpolate({
    inputRange: [0, 1],
    outputRange: ['#4D6257', '#D06D94'],
  });

  if (user) {
    return (
      <View style={styles.root}>
        <LinearGradient
          colors={['#FAC6D6', '#F5D5E8', '#C0E1CF']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.safe}>
          <View style={styles.loggedBox}>
            <LinearGradient colors={['#FAC6D6', '#D06D94']} style={styles.loggedHeart}>
              <Ionicons name="heart-circle-outline" size={42} color="#fff" />
            </LinearGradient>
            <Text style={styles.loggedTitle}>Already Signed In</Text>
            <Text style={styles.loggedSub}>
              You are signed in as{' '}
              <Text style={{ fontFamily: fonts.bold, color: '#243B36' }}>
                {user.name || 'Member'}
              </Text>
              .
            </Text>
            <Pressable
              style={({ pressed }) => [styles.submitBtnWrap, pressed && { opacity: 0.88 }]}
              onPress={() => navigation.navigate('Home')}
            >
              <LinearGradient
                colors={['#E07AA0', '#D06D94', '#B8557B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitBtn}
              >
                <Text style={styles.submitBtnText}>Continue to App</Text>
              </LinearGradient>
            </Pressable>
            <Pressable style={styles.signOutBtn} onPress={() => signOut()}>
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const onContinue = async () => {
    setLoading(true);
    setError('');
    setIsExistingAccount(false);
    try {
      const purpose = isSignup ? 'signup' : 'login';
      const r = await sendOtp(target, purpose);
      navigation.navigate('VerifyOtp', {
        identifier: target,
        phone: method === 'phone' ? target : undefined,
        demoCode: method === 'phone' ? r.demoCode : undefined,
        isPhone: method === 'phone',
        password: isSignup ? password : undefined,
        purpose,
      });
    } catch (err: any) {
      const msg =
        err?.error?.message || err?.message || "Couldn't send the code. Please check your connection.";
      setError(msg);
      if (err?.error?.code === 'CONFLICT' || msg.toLowerCase().includes('already exists')) {
        setIsExistingAccount(true);
      }
    }
    setLoading(false);
  };

  const onGoogle = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    setError('');
    try {
      const g = await getGoogleProfile();
      if (g) {
        const session = await googleLogin(g);
        await signIn(session);
      }
    } catch (e: any) {
      if (e?.code === 'GOOGLE_UNAVAILABLE') {
        if (__DEV__) {
          await signIn(
            await googleLogin({ idToken: 'dev', name: 'Member', email: 'user@example.com' })
          );
        } else {
          setError('Google sign-in is currently unavailable. Please use email or phone.');
        }
      } else {
        setError("Couldn't sign in with Google. Please try again.");
      }
    }
    setGoogleLoading(false);
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

            {/* Progress Dots */}
            <View style={styles.progressRow}>
              {Array.from({ length: STEPS }).map((_, i) => (
                <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
              ))}
            </View>

            {/* Brand */}
            <View style={styles.brandSection}>
              <AppLogo size={52} imageStyle={{ borderRadius: 14 }} />
              <Text style={styles.brandName}>Sambandh Setu</Text>
            </View>

            {/* Frosted Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {isSignup ? 'Begin Your Story' : 'Quick OTP Access'}
              </Text>
              <Text style={styles.cardSub}>
                {isSignup
                  ? 'Join our intentional community seeking authentic partnership.'
                  : 'Enter your credentials to receive a secure one-time code.'}
              </Text>

              {/* Method Toggle */}
              <View style={styles.toggleRow}>
                <Pressable
                  style={[styles.toggleBtn, method === 'email' && styles.toggleBtnActive]}
                  onPress={() => { setMethod('email'); setError(''); setIsExistingAccount(false); }}
                >
                  {method === 'email' ? (
                    <LinearGradient
                      colors={['#E07AA0', '#D06D94']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                  ) : null}
                  <Ionicons
                    name="mail"
                    size={14}
                    color={method === 'email' ? '#fff' : '#243B36'}
                    style={{ marginRight: 6, zIndex: 1 }}
                  />
                  <Text
                    style={[
                      styles.toggleText,
                      method === 'email' && styles.toggleTextActive,
                    ]}
                  >
                    Email
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.toggleBtn, method === 'phone' && styles.toggleBtnActive]}
                  onPress={() => { setMethod('phone'); setError(''); setIsExistingAccount(false); }}
                >
                  {method === 'phone' ? (
                    <LinearGradient
                      colors={['#E07AA0', '#D06D94']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                  ) : null}
                  <Ionicons
                    name="call"
                    size={14}
                    color={method === 'phone' ? '#fff' : '#243B36'}
                    style={{ marginRight: 6, zIndex: 1 }}
                  />
                  <Text
                    style={[
                      styles.toggleText,
                      method === 'phone' && styles.toggleTextActive,
                    ]}
                  >
                    Phone
                  </Text>
                </Pressable>
              </View>

              {/* Input fields */}
              <View style={{ marginTop: spacing.md }}>
                <Text style={styles.label}>
                  {method === 'email' ? 'Email Address' : 'Mobile Number'}
                </Text>

                {method === 'email' ? (
                  <Animated.View style={[styles.inputWrap, { borderColor: emailBorderColor }]}>
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color="#4D6257"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      value={email}
                      onChangeText={(t) => { setEmail(t); setError(''); setIsExistingAccount(false); }}
                      placeholder="name@domain.com"
                      placeholderTextColor="rgba(77,98,87,0.45)"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.input}
                      onFocus={() => animateFocus(emailFocus, true)}
                      onBlur={() => animateFocus(emailFocus, false)}
                    />
                  </Animated.View>
                ) : (
                  <PhoneInput
                    value={phone}
                    onChangeText={(t) => { setPhone(t); setError(''); setIsExistingAccount(false); }}
                  />
                )}

                {isSignup && (
                  <>
                    <Text style={[styles.label, { marginTop: spacing.md }]}>Create Password</Text>
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
                        placeholder="At least 8 characters"
                        placeholderTextColor="rgba(77,98,87,0.45)"
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={[styles.input, { flex: 1, paddingRight: 44 }]}
                        onFocus={() => animateFocus(pwFocus, true)}
                        onBlur={() => animateFocus(pwFocus, false)}
                      />
                      <Pressable
                        onPress={() => setShowPassword((s) => !s)}
                        hitSlop={10}
                        style={styles.eye}
                        accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                      >
                        <Ionicons
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color="#4D6257"
                        />
                      </Pressable>
                    </Animated.View>
                    {password.length > 0 && password.length < 8 && (
                      <Text style={styles.warnText}>Password must be at least 8 characters</Text>
                    )}
                  </>
                )}

                {!!error && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={14} color="#E0485A" />
                    <Text style={styles.errorBoxText}>{error}</Text>
                  </View>
                )}

                {isExistingAccount && (
                  <Pressable
                    style={styles.existingBtn}
                    onPress={() => navigation.navigate('Login')}
                  >
                    <Text style={styles.existingBtnText}>Proceed to Log In →</Text>
                  </Pressable>
                )}

                {/* CTA */}
                <Pressable
                  onPress={onContinue}
                  disabled={!valid || loading}
                  style={({ pressed }) => [
                    styles.submitBtnWrap,
                    pressed && { opacity: 0.88 },
                    (!valid || loading) && { opacity: 0.55 },
                    { marginTop: spacing.lg },
                  ]}
                >
                  <LinearGradient
                    colors={['#E07AA0', '#D06D94', '#B8557B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitBtn}
                  >
                    <Text style={styles.submitBtnText}>
                      {loading ? 'Sending code…' : isSignup ? 'Create Account' : 'Continue'}
                    </Text>
                    {!loading && (
                      <Ionicons
                        name="arrow-forward"
                        size={18}
                        color="#fff"
                        style={{ marginLeft: 8 }}
                      />
                    )}
                  </LinearGradient>
                </Pressable>

                <View style={styles.loginRow}>
                  <Text style={styles.loginPrompt}>
                    {isSignup ? 'Already have an account? ' : 'Prefer your password? '}
                  </Text>
                  <Pressable onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.link}>{isSignup ? 'Log in' : 'Log in here'}</Text>
                  </Pressable>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.orRow}>
                <View style={styles.line} />
                <Text style={styles.or}>or</Text>
                <View style={styles.line} />
              </View>

              {/* Google */}
              <Pressable
                style={({ pressed }) => [styles.googleBtn, pressed && { opacity: 0.8 }]}
                onPress={onGoogle}
                disabled={googleLoading}
              >
                <Ionicons name="logo-google" size={18} color="#4D6257" style={{ marginRight: 8 }} />
                <Text style={styles.googleBtnText}>
                  {googleLoading ? 'Connecting…' : 'Continue with Google'}
                </Text>
              </Pressable>

              <Text style={styles.terms}>
                By continuing, you acknowledge our{' '}
                <Text style={styles.link}>Terms</Text> and{' '}
                <Text style={styles.link}>Privacy Policy</Text>.
              </Text>
            </View>
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
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },

  // Progress dots
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(208,109,148,0.25)',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#D06D94',
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
  },
  cardTitle: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: '#243B36',
    marginBottom: 4,
  },
  cardSub: {
    fontFamily: fonts.regular,
    fontSize: 13.5,
    color: '#4D6257',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#DFEBE1',
    borderRadius: radius.pill,
    padding: 3,
    overflow: 'hidden',
  },
  toggleBtn: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  toggleBtnActive: {
    // gradient overlay applied inside
  },
  toggleText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: '#243B36',
    zIndex: 1,
  },
  toggleTextActive: {
    color: '#fff',
    fontFamily: fonts.semibold,
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
  warnText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#E0485A',
    marginTop: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDECEE',
    borderRadius: 10,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  errorBoxText: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: '#E0485A',
    flex: 1,
  },

  existingBtn: {
    backgroundColor: '#FDF4F2',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: '#D06D94',
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  existingBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 13.5,
    color: '#D06D94',
  },

  submitBtnWrap: {
    borderRadius: radius.pill,
    overflow: 'hidden',
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

  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  loginPrompt: {
    fontFamily: fonts.regular,
    fontSize: 13.5,
    color: '#4D6257',
  },
  link: {
    fontFamily: fonts.bold,
    color: '#D06D94',
  },

  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(77,98,87,0.15)',
  },
  or: {
    marginHorizontal: 12,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#4D6257',
  },

  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(77,98,87,0.2)',
    paddingVertical: 14,
  },
  googleBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: '#243B36',
  },

  terms: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: '#4D6257',
    marginTop: spacing.lg,
    lineHeight: 16,
  },

  // Logged-in state
  loggedBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  loggedHeart: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    shadowColor: '#D06D94',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  loggedTitle: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: '#243B36',
    marginBottom: spacing.sm,
  },
  loggedSub: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: '#4D6257',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  signOutBtn: {
    marginTop: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderWidth: 1.5,
    borderColor: '#D06D94',
    borderRadius: radius.pill,
  },
  signOutText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: '#D06D94',
  },
});
