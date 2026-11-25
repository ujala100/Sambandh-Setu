import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, Line, Path, RadialGradient, Stop } from 'react-native-svg';
import { colors, fonts, radius, shadow, space } from '../../theme';
import { useLayout } from '../../hooks/useLayout';
import { Button, LogoMark, Logo, TextLink } from '../../ui';
import { MarketingHeader } from '../../layout/AuthLayout';

const NATIVE_DRIVER = Platform.OS !== 'web';

const FEATURES = [
  { icon: 'heart-outline', title: 'Self-Reflection First', text: 'Understand your readiness, values and preferences.' },
  { icon: 'chatbubble-ellipses-outline', title: 'Meaningful Conversations', text: 'Guided prompts for deeper, more authentic conversations.' },
  { icon: 'people-outline', title: 'Involve Family (Optional)', text: "Bring your family in when you're ready." },
  { icon: 'flash-outline', title: 'AI Guidance', text: 'Get thoughtful suggestions throughout your journey.' },
] as const;

const PATH = [
  { icon: 'document-text-outline', title: 'Self-Reflection', text: 'Explore your values, lifestyle, and relationship expectations.' },
  { icon: 'person-add-outline', title: 'Discover', text: 'Find compatible profiles aligned with your preferences.' },
  { icon: 'chatbubbles-outline', title: 'Connect', text: 'Start guided conversations with thoughtful prompts.' },
  { icon: 'heart-outline', title: 'Understand', text: 'Build mutual understanding over time with AI support.' },
  { icon: 'people-outline', title: 'Next Steps', text: 'Involve family (optional) and take the relationship forward at your pace.' },
] as const;

/** Signed-out home. Desktop: the "Introduction screen" design. Phone: the App "Welcome Screen". */
export default function Landing({ navigation, route }: any) {
  const { wide } = useLayout();
  return wide ? <WebLanding navigation={navigation} section={route?.params?.section} /> : <Welcome navigation={navigation} />;
}

function Welcome({ navigation }: any) {
  const { width, height } = useLayout();
  const collageWidth = Math.min(350, width - 40);
  const collageHeight = Math.min(320, Math.max(220, collageWidth * 0.91));
  const titleFontSize = Math.min(36, Math.max(28, width * 0.0624));
  const [page, setPage] = useState(0);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const pager = useRef<ScrollViewInstance | null>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const promptProgress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!showPromptPreview) return;
    promptProgress.setValue(0);
    const animation = Animated.spring(promptProgress, { toValue: 1, useNativeDriver: NATIVE_DRIVER, speed: 18, bounciness: 4 });
    animation.start();
    return () => animation.stop();
  }, [showPromptPreview, promptProgress]);
  const pageMotion = (index: number) => ({
    opacity: scrollX.interpolate({
      inputRange: [(index - 1) * width, index * width, (index + 1) * width],
      outputRange: [0.76, 1, 0.76],
      extrapolate: 'clamp',
    }),
    transform: [
      {
        translateX: scrollX.interpolate({
          inputRange: [(index - 1) * width, index * width, (index + 1) * width],
          outputRange: [width * 0.06, 0, -width * 0.06],
          extrapolate: 'clamp',
        }),
      },
      {
        scale: scrollX.interpolate({
          inputRange: [(index - 1) * width, index * width, (index + 1) * width],
          outputRange: [0.97, 1, 0.97],
          extrapolate: 'clamp',
        }),
      },
    ],
  });
  const goToPage = (nextPage: number) => {
    setPage(nextPage);
    pager.current?.scrollTo({ x: width * nextPage, animated: true });
  };
  const signup = () => navigation.navigate('SignUp');
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: page === 2 ? '#0D4338' : '#F8F5E9' }} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: NATIVE_DRIVER })}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) => setPage(Math.round(event.nativeEvent.contentOffset.x / width))}
      >
        <Animated.View style={[{ width, flex: 1 }, pageMotion(0)]}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.mobileScroll}>
            <View style={styles.mobileContent}>
              <WelcomeBrand />
              <Text style={[styles.mobileTitle, { fontSize: titleFontSize, lineHeight: Math.round(titleFontSize * 1.22) }]} accessibilityRole="header">Meet with Trust,{'\n'}Move at Your Pace</Text>
              <View style={[styles.mobileCollage, { height: collageHeight }]} accessible={false}>
                <View style={[styles.mobilePhoto, styles.mobilePhotoMain]}>
                  <Image source={require('../../../assets/illustrations/welcome-photo-main.png')} style={styles.mobilePhotoImage} resizeMode="cover" />
                </View>
                <View style={[styles.mobilePhoto, styles.mobilePhotoTop]}>
                  <Image source={require('../../../assets/illustrations/welcome-photo-top.png')} style={styles.mobilePhotoImage} resizeMode="cover" />
                </View>
                <View style={[styles.mobilePhoto, styles.mobilePhotoLeft]}>
                  <Image source={require('../../../assets/illustrations/welcome-photo-left.png')} style={styles.mobilePhotoOval} resizeMode="cover" />
                </View>
                <View style={[styles.mobilePhoto, styles.mobilePhotoRight]}>
                  <Image source={require('../../../assets/illustrations/welcome-photo-right.png')} style={styles.mobilePhotoImage} resizeMode="cover" />
                </View>
                <View style={[styles.mobileBadge, styles.mobileBadgeFace]}>
                  <Text style={styles.mobileBadgeText}>100% Face-Verified</Text>
                  <Ionicons name="checkmark" size={10} color="#6C3D4A" />
                </View>
                <View style={[styles.mobileBadge, styles.mobileBadgeAnonymous]}>
                  <Text style={styles.mobileBadgeText}>Anonymous-First</Text>
                  <Ionicons name="lock-closed" size={9} color="#315546" />
                </View>
                <View style={[styles.mobileBadge, styles.mobileBadgePressure]}>
                  <Text style={styles.mobileBadgeText}>Zero Pressure</Text>
                </View>
                <View style={[styles.mobileBadge, styles.mobileBadgePrivacy]}>
                  <Text style={styles.mobileBadgeText}>DPDP Protected</Text>
                </View>
              </View>
              <SwipeToStart onComplete={() => goToPage(1)} />
              <View style={styles.mobileAuthLinks}>
                <Text style={styles.mobileLogin}>Already have an account?</Text>
                <TextLink title="Log in" color="#4B7857" size={14} onPress={() => navigation.navigate('Login')} />
              </View>
            </View>
          </ScrollView>
        </Animated.View>

        <Animated.View style={[{ width, flex: 1 }, pageMotion(1)]}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.mobileScroll}>
            <View style={styles.mobileContent}>
              <WelcomeBrand />
              <View style={styles.journeyHeading}>
                <Text style={styles.journeyTitle} accessibilityRole="header">The Journey · Steps 1–5</Text>
                <Text style={styles.journeySubtitle}>How our intentional path works</Text>
              </View>
              <View style={styles.journeyCards}>
                <View style={[styles.journeyCard, styles.journeyCardMint]}>
                  <View style={styles.journeyCardHeader}>
                    <Text style={styles.journeyCardTitle}>01 | Verify &amp;{'\n'}Declare Intent</Text>
                    <View style={styles.journeyIconMint}><Ionicons name="shield-checkmark-outline" size={27} color="#477D68" /></View>
                  </View>
                  <Text style={styles.journeyCardText}>Facial verification and real marriage intent required.</Text>
                </View>
                <View style={[styles.journeyCard, styles.journeyCardCream]}>
                  <View style={styles.journeyCardHeader}>
                    <Text style={styles.journeyCardTitle}>02 | Anonymous-First Chat</Text>
                    <View style={styles.journeyIconColumn}>
                      <Ionicons name="person-circle-outline" size={30} color="#AAB4B0" />
                      <Text style={styles.concealedBadge}>Concealed</Text>
                    </View>
                  </View>
                  <Text style={styles.journeyCardText}>Discuss core values before revealing names or photos.</Text>
                </View>
                <View style={[styles.journeyCard, styles.journeyCardPink]}>
                  <View style={styles.journeyCardHeader}>
                    <Text style={styles.journeyCardTitle}>03 | Two-Key{'\n'}Mutual Reveal</Text>
                    <View style={styles.journeyIconPink}><Ionicons name="key-outline" size={27} color={colors.primaryText} /></View>
                  </View>
                  <Text style={styles.journeyCardText}>Both must turn their keys to reveal identities.</Text>
                </View>
              </View>
              <View style={styles.journeyCards}>
                <View style={[styles.journeyCard, styles.journeyCardMint, styles.journeyCardTall]}>
                  <View style={styles.journeyCardHeader}>
                    <Text style={styles.journeyCardTitle}>04 | Reflect with{'\n'}Setu Guide AI</Text>
                    <View style={styles.journeyIconMint}><Ionicons name="leaf-outline" size={25} color="#477D68" /></View>
                  </View>
                  <Text style={styles.journeyCardText}>Shared life vision &amp; expectations partner reflection.</Text>
                  <Pressable
                    onPress={() => setShowPromptPreview((shown) => !shown)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: showPromptPreview }}
                    style={styles.previewButton}
                  >
                    <Text style={styles.previewButtonText}>{showPromptPreview ? 'Hide Prompt' : 'Preview Prompts'}</Text>
                  </Pressable>
                  {showPromptPreview && (
                    <Animated.Text style={[styles.promptPreview, {
                      opacity: promptProgress,
                      transform: [{ translateY: promptProgress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
                    }]}>
                      “What does a meaningful shared life look like to you?”
                    </Animated.Text>
                  )}
                </View>
                <View style={[styles.journeyCard, styles.journeyCardPink, styles.journeyCardFamily]}>
                  <View style={styles.journeyCardHeader}>
                    <Text style={styles.journeyCardTitle}>05 | Optional{'\n'}Family Choice</Text>
                    <View style={styles.journeyIconPink}><Ionicons name="people-outline" size={27} color={colors.primaryText} /></View>
                  </View>
                  <Text style={styles.journeyCardText}>Bring family in on your own terms, only when you both agree.</Text>
                </View>
              </View>
              <View style={styles.journeyActions}>
                <Pressable onPress={signup} accessibilityRole="button" accessibilityLabel="Skip to create account" style={({ pressed }) => [styles.skipButton, pressed && styles.communityButtonPressed]}>
                  <Text style={styles.skipButtonText}>Skip</Text>
                </Pressable>
                <Pressable onPress={() => goToPage(2)} accessibilityRole="button" accessibilityLabel="Continue to the compatibility dial" style={({ pressed }) => [styles.communityButton, pressed && styles.communityButtonPressed]}>
                  <Text style={styles.communityButtonText}>Compatibility Dial</Text>
                  <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </Animated.View>

        <Animated.View style={[{ width, flex: 1 }, pageMotion(2)]}>
          <RotaryNatureScreen width={width} onContinue={() => goToPage(3)} onSkip={signup} />
        </Animated.View>

        <Animated.View style={[{ width, flex: 1 }, pageMotion(3)]}>
          <TwoKeyVaultScreen width={width} height={height} onContinue={signup} onSkip={signup} />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function WelcomeBrand() {
  return (
    <View style={styles.mobileHeader}>
      <View style={{ width: 44 }} />
      <View style={{ alignItems: 'center' }}>
        <Image source={require('../../../assets/brand-logo.png')} style={{ width: 34, height: 34, resizeMode: 'contain' }} accessibilityLabel="Sambandh Setu logo" />
        <Text style={styles.mobileBrand}>Sambandh Setu</Text>
      </View>
      <View style={{ width: 44 }} />
    </View>
  );
}

function RotaryNatureScreen({ width, onContinue, onSkip }: { width: number; onContinue: () => void; onSkip: () => void }) {
  const dialRotation = useRef(new Animated.Value(0)).current;
  const turns = useRef(0);
  const dialSize = Math.min(320, Math.max(230, width - 52));
  const dialAngle = dialRotation.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });
  const rotateDial = () => {
    turns.current += 1;
    Animated.spring(dialRotation, {
      toValue: turns.current * 45,
      useNativeDriver: NATIVE_DRIVER,
      speed: 10,
      bounciness: 4,
    }).start();
  };
  const outerTicks = Array.from({ length: 72 }, (_, index) => {
    const angle = index * 5;
    const major = index % 6 === 0;
    return (
      <Line
        key={`outer-${index}`}
        x1="160"
        y1="13"
        x2="160"
        y2={major ? '25' : '19'}
        stroke={major ? '#CDB77F' : '#829381'}
        strokeWidth={major ? '1.6' : '0.8'}
        opacity={major ? '0.95' : '0.65'}
        transform={`rotate(${angle} 160 160)`}
      />
    );
  });
  const compassTicks = Array.from({ length: 72 }, (_, index) => {
    const angle = index * 5;
    const major = index % 6 === 0;
    return (
      <Line
        key={`compass-${index}`}
        x1="160"
        y1="34"
        x2="160"
        y2={major ? '48' : '41'}
        stroke={major ? '#9E8861' : '#B3A581'}
        strokeWidth={major ? '1.2' : '0.65'}
        opacity="0.9"
        transform={`rotate(${angle} 160 160)`}
      />
    );
  });

  return (
    <View style={styles.dialScreen}>
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width={width} height="100%" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice">
        <Path d="M-70 460 C30 390 90 470 195 420 S340 380 460 470" fill="none" stroke="#7D9A84" strokeWidth="1" opacity="0.15" />
        <Path d="M-60 510 C40 440 110 520 205 470 S350 430 450 520" fill="none" stroke="#7D9A84" strokeWidth="1" opacity="0.12" />
        <Path d="M-40 560 C60 490 130 570 220 520 S360 490 440 570" fill="none" stroke="#7D9A84" strokeWidth="1" opacity="0.1" />
        <Circle cx="195" cy="480" r="248" fill="none" stroke="#9BB09A" strokeWidth="0.8" opacity="0.12" />
      </Svg>
      <View style={styles.dialHeading}>
        <Text style={styles.dialTitle} accessibilityRole="header">The Rotary Nature Dial</Text>
        <Text style={styles.dialSubtitle}>Explore Alignment · Rotate Dial</Text>
      </View>
      <View style={styles.dialCanvas}>
        <View style={styles.dialDiagramGroup}>
          <View style={[styles.dialOuter, { width: dialSize, height: dialSize, borderRadius: dialSize / 2 }]}>
            <Svg width={dialSize} height={dialSize} viewBox="0 0 320 320">
              <Defs>
                <RadialGradient id="dialCoreGradient" cx="48%" cy="35%" r="70%">
                  <Stop offset="0%" stopColor="#5A9279" />
                  <Stop offset="100%" stopColor="#0E5B4B" />
                </RadialGradient>
              </Defs>
              <Circle cx="160" cy="160" r="156" fill="#123F35" stroke="#D0B97F" strokeWidth="2" />
              <Circle cx="160" cy="160" r="148" fill="#164A3F" stroke="#647F6C" strokeWidth="1" />
              <Circle cx="160" cy="160" r="137" fill="none" stroke="#C1AB76" strokeWidth="1.5" />
              <Circle cx="160" cy="160" r="132" fill="#F4F0E4" stroke="#D5C59A" strokeWidth="2" />
              <Circle cx="160" cy="160" r="118" fill="none" stroke="#C5B58D" strokeWidth="1" />
              <Circle cx="160" cy="160" r="108" fill="none" stroke="#D7CBAE" strokeWidth="1" />
              <Circle cx="160" cy="160" r="91" fill="#E8E1CF" stroke="#BDAA7D" strokeWidth="1.5" />
              <Circle cx="160" cy="160" r="84" fill="#F8F4E9" stroke="#CBB98E" strokeWidth="1" />
              <Circle cx="160" cy="160" r="70" fill="none" stroke="#D6C9A6" strokeWidth="1" />
              <Circle cx="160" cy="160" r="63" fill="#E5E3D8" stroke="#BDAA7D" strokeWidth="2" />
              <Circle cx="160" cy="160" r="57" fill="none" stroke="#F0EBDD" strokeWidth="2" />
              <Circle cx="160" cy="160" r="52" fill="url(#dialCoreGradient)" stroke="#BDD7C9" strokeWidth="3" />
              <Path d="M160 53 L151 83 L160 77 L169 83 Z" fill="#BDA66F" stroke="#8F7952" strokeWidth="1" />
              <Path d="M160 267 L151 237 L160 243 L169 237 Z" fill="#BDA66F" stroke="#8F7952" strokeWidth="1" />
              <Path d="M53 160 L83 151 L77 160 L83 169 Z" fill="#D1C194" opacity="0.85" />
              <Path d="M267 160 L237 151 L243 160 L237 169 Z" fill="#D1C194" opacity="0.85" />
              <Circle cx="146" cy="142" r="11" fill="#B9CEC4" opacity="0.66" />
              <Circle cx="172" cy="145" r="10" fill="#B9CEC4" opacity="0.62" />
              <Path d="M126 174 C126 159 135 151 146 151 C155 151 160 157 163 166 C166 158 173 154 181 155 C194 157 199 166 199 180 L199 188 L126 188 Z" fill="#B9CEC4" opacity="0.58" />
            </Svg>
            <Animated.View
              pointerEvents="none"
              style={[styles.dialTickLayer, { width: dialSize, height: dialSize, transform: [{ rotate: dialAngle }] }]}
            >
              <Svg width={dialSize} height={dialSize} viewBox="0 0 320 320">
                {outerTicks}
                {compassTicks}
              </Svg>
            </Animated.View>
            <Pressable
              onPress={rotateDial}
              accessibilityRole="button"
              accessibilityLabel="Rotate the compatibility dial"
              style={[styles.dialRotateTarget, { borderRadius: dialSize / 2 }]}
            />
            <Text style={[styles.dialTag, styles.dialTagTopLeft]}>Deep Thinker</Text>
            <Text style={[styles.dialTag, styles.dialTagTopRight]}>Family-First</Text>
            <Text style={[styles.dialTag, styles.dialTagBottomLeft]}>Values Aligned</Text>
            <Text style={[styles.dialTag, styles.dialTagBottomRight]}>Steady Rhythm</Text>
          </View>
          <View style={styles.dialScoreRow}>
            <Text style={styles.dialScoreValue}>94%</Text>
            <Text style={styles.dialScoreLabel}>Compatibility</Text>
          </View>
        </View>
      </View>
      <View style={styles.dialActions}>
        <Pressable
          onPress={onSkip}
          accessibilityRole="button"
          accessibilityLabel="Skip to create account"
          style={({ pressed }) => [styles.dialSkipButton, pressed && styles.dialContinuePressed]}
        >
          <Text style={styles.dialSkipText}>Skip</Text>
        </Pressable>
        <Pressable
          onPress={onContinue}
          accessibilityRole="button"
          accessibilityLabel="Continue to the Two-Key Vault"
          style={({ pressed }) => [styles.dialContinueButton, pressed && styles.dialContinuePressed]}
        >
          <Text style={styles.dialContinueText}>Continue to Vault</Text>
          <Ionicons name="arrow-forward" size={17} color="#315546" />
        </Pressable>
      </View>
    </View>
  );
}

function TwoKeyVaultScreen({ width, height, onContinue, onSkip }: { width: number; height: number; onContinue: () => void; onSkip: () => void }) {
  const [yourKeyTurned, setYourKeyTurned] = useState(true);
  const artSize = Math.min(width - 32, Math.max(190, height * 0.5));
  return (
    <View style={styles.vaultScreen}>
      <ScrollView style={styles.vaultScroll} contentContainerStyle={styles.vaultContent} showsVerticalScrollIndicator={false}>
        <View style={styles.vaultSafetyBadge}>
          <Ionicons name="shield-checkmark" size={13} color="#A44D5D" />
          <Text style={styles.vaultSafetyText}>Safety Vault</Text>
        </View>
        <View style={styles.vaultInstructionGroup}>
          <Text style={styles.vaultInstruction}>Drag &amp; Turn Key to Reveal</Text>
        </View>
        <View style={[styles.vaultArtwork, { width: artSize, height: artSize }]}>
          <Svg width={artSize} height={artSize} viewBox="0 0 300 300">
            <Defs>
              <RadialGradient id="vaultGlow" cx="48%" cy="42%" r="62%">
                <Stop offset="0%" stopColor="#FAF7EC" stopOpacity="0.98" />
                <Stop offset="75%" stopColor="#E6ECE4" stopOpacity="0.9" />
                <Stop offset="100%" stopColor="#D6E3DA" stopOpacity="0.35" />
              </RadialGradient>
              <RadialGradient id="vaultHalo" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#F5E9BF" stopOpacity="0.55" />
                <Stop offset="70%" stopColor="#A8D9C6" stopOpacity="0.18" />
                <Stop offset="100%" stopColor="#F8F5E9" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx="150" cy="150" r="143" fill="url(#vaultHalo)" />
            <Circle cx="150" cy="150" r="127" fill="url(#vaultGlow)" stroke="#B7C8BE" strokeWidth="2" />
            <Circle cx="150" cy="150" r="116" fill="none" stroke="#C9D7CC" strokeWidth="2" />
            <Path d="M49 150 A101 101 0 0 1 251 150" fill="none" stroke="#9CC8B5" strokeWidth="1.5" opacity="0.82" />
            <Path d="M49 150 A101 101 0 0 0 251 150" fill="none" stroke="#E6CB8A" strokeWidth="1.2" opacity="0.9" />
            <Circle cx="150" cy="150" r="88" fill="none" stroke="#9CC8B5" strokeWidth="1.5" opacity="0.8" />
          </Svg>
          <View style={[styles.vaultKeyPosition, { left: artSize * 0.18, top: artSize * 0.13, width: artSize * 0.5, height: artSize * 0.7 }]}>
            <VaultKey side="partner" />
          </View>
          <View style={[styles.vaultKeyPosition, { left: artSize * 0.32, top: artSize * 0.13, width: artSize * 0.5, height: artSize * 0.7 }]}>
            <VaultKey side="you" onTurn={() => setYourKeyTurned(true)} />
          </View>
        </View>
        <Text style={styles.vaultTitle}>The Two-Key{'\n'}Mutual Reveal Vault</Text>
        <Text style={styles.vaultSubtitle}>Turn Your Key · Mutual Consent Required</Text>
        <Text style={styles.vaultSubtext}>Both keys must turn to reveal identities</Text>
        <View style={styles.vaultStatusCard}>
          <View style={styles.vaultAvatars}>
            <View style={[styles.vaultAvatar, styles.vaultAvatarOne]}>
              <Ionicons name="person" size={24} color="#AAB6AD" />
            </View>
            <View style={[styles.vaultAvatar, styles.vaultAvatarTwo]}>
              <Ionicons name="person" size={24} color="#AAB6AD" />
            </View>
          </View>
          <View style={styles.vaultStatusDetails}>
            <Text style={styles.vaultNames}>Aanya &amp; Rohan</Text>
            <View style={styles.vaultStatusRow}>
              <Ionicons name="lock-closed" size={10} color="#517B62" />
              <Text style={styles.vaultStatusText}>Your Key: {yourKeyTurned ? 'Turned' : 'Waiting'}</Text>
              {yourKeyTurned && <Ionicons name="checkmark" size={12} color="#517B62" />}
            </View>
            <View style={styles.vaultStatusRow}>
              <Ionicons name="lock-closed" size={10} color="#A48A5C" />
              <Text style={styles.vaultStatusText}>Rohan’s Key: Turning...</Text>
            </View>
          </View>
        </View>
        <View style={styles.vaultActions}>
          <Pressable
            onPress={onSkip}
            accessibilityRole="button"
            accessibilityLabel="Skip to create account"
            style={({ pressed }) => [styles.skipButton, styles.vaultSkipButton, pressed && styles.dialContinuePressed]}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </Pressable>
          <Pressable
            onPress={onContinue}
            accessibilityRole="button"
            accessibilityLabel="Continue to account setup"
            accessibilityHint="Continue to the existing sign-up flow."
            style={({ pressed }) => [styles.vaultContinueButton, pressed && styles.dialContinuePressed]}
          >
            <Text style={styles.vaultContinueText}>Continue</Text>
            <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function VaultKey({ side, onTurn }: { side: 'you' | 'partner'; onTurn?: () => void }) {
  const initialAngle = side === 'you' ? -45 : 45;
  const rotation = useRef(new Animated.Value(initialAngle)).current;
  const angle = rotation.interpolate({ inputRange: [-180, 180], outputRange: ['-180deg', '180deg'] });

  useEffect(() => {
    if (side !== 'partner') return;
    const motion = Animated.loop(Animated.sequence([
      Animated.timing(rotation, { toValue: initialAngle + 3, duration: 850, useNativeDriver: NATIVE_DRIVER }),
      Animated.timing(rotation, { toValue: initialAngle - 3, duration: 850, useNativeDriver: NATIVE_DRIVER }),
    ]));
    motion.start();
    return () => motion.stop();
  }, [initialAngle, rotation, side]);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => side === 'you',
    onMoveShouldSetPanResponder: (_, gesture) => side === 'you' && (Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4),
    onPanResponderMove: (_, gesture) => {
      if (side === 'you') rotation.setValue(Math.max(-120, Math.min(30, initialAngle + gesture.dx * 0.55)));
    },
    onPanResponderRelease: (_, gesture) => {
      if (side !== 'you') return;
      const target = Math.abs(gesture.dx) > 28 ? initialAngle + (gesture.dx > 0 ? 52 : -52) : initialAngle;
      Animated.spring(rotation, { toValue: target, useNativeDriver: NATIVE_DRIVER, speed: 14, bounciness: 5 })
        .start(({ finished }) => { if (finished && Math.abs(gesture.dx) > 28) onTurn?.(); });
    },
    onPanResponderTerminate: () => {
      if (side === 'you') Animated.spring(rotation, { toValue: initialAngle, useNativeDriver: NATIVE_DRIVER }).start();
    },
  })).current;

  const color = side === 'you' ? '#3C8B75' : colors.primary;
  const highlight = side === 'you' ? '#A8D5C4' : '#F0B7B6';
  return (
    <Animated.View
      {...(side === 'you' ? panResponder.panHandlers : {})}
      accessibilityRole={side === 'you' ? 'button' : undefined}
      accessibilityLabel={side === 'you' ? 'Drag to turn your key' : 'Rohan’s key'}
      accessibilityHint={side === 'you' ? 'Drag the key to rotate it.' : undefined}
      style={[
        styles.vaultKey,
        { transform: [{ rotate: angle }] },
      ]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 100 180" preserveAspectRatio="xMidYMid meet">
        <Path d="M50 59 L50 162" fill="none" stroke={color} strokeWidth="11" strokeLinecap="round" />
        <Path d="M50 121 L68 121 L68 132 L60 132 L60 142 L50 142" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M50 149 L39 149 L39 159 L50 159" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M50 64 L50 113" fill="none" stroke={highlight} strokeWidth="2" strokeLinecap="round" opacity="0.9" />
        <Circle cx="50" cy="40" r="19" fill="#EEF2E8" fillOpacity="0.25" stroke={color} strokeWidth="7" />
        <Circle cx="50" cy="40" r="9" fill="none" stroke={highlight} strokeWidth="3" />
        <Circle cx="28" cy="40" r="9" fill="#EEF2E8" fillOpacity="0.15" stroke={color} strokeWidth="5" />
        <Circle cx="72" cy="40" r="9" fill="#EEF2E8" fillOpacity="0.15" stroke={color} strokeWidth="5" />
        <Circle cx="50" cy="18" r="9" fill="#EEF2E8" fillOpacity="0.15" stroke={color} strokeWidth="5" />
      </Svg>
    </Animated.View>
  );
}

function SwipeToStart({ onComplete }: { onComplete: () => void }) {
  const trackWidth = useRef(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const swipeProgress = useRef(new Animated.Value(0)).current;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const maxDrag = () => Math.max(0, trackWidth.current - 42 - 8);
  const knobColor = swipeProgress.interpolate({ inputRange: [0, 1], outputRange: ['#28775C', colors.primary] });
  const fillWidth = Animated.add(translateX, 50);
  const fillColor = swipeProgress.interpolate({ inputRange: [0, 1], outputRange: ['#28775C', colors.primary] });
  const fillOpacity = swipeProgress.interpolate({ inputRange: [0, 0.01], outputRange: [0, 1], extrapolate: 'clamp' });
  const returnToStart = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: false, speed: 24, bounciness: 5 }).start();
    Animated.timing(swipeProgress, { toValue: 0, duration: 180, useNativeDriver: false }).start();
  };
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 2 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: (_, gesture) => {
      const limit = maxDrag();
      const distance = Math.max(0, Math.min(gesture.dx, limit));
      translateX.setValue(distance);
      swipeProgress.setValue(limit > 0 ? distance / limit : 0);
    },
    onPanResponderRelease: (_, gesture) => {
      const limit = maxDrag();
      if (limit > 0 && gesture.dx >= limit * 0.8) {
        Animated.parallel([
          Animated.timing(translateX, { toValue: limit, duration: 140, useNativeDriver: false }),
          Animated.timing(swipeProgress, { toValue: 1, duration: 140, useNativeDriver: false }),
        ])
          .start(({ finished }) => { if (finished) onCompleteRef.current(); });
      } else {
        returnToStart();
      }
    },
    onPanResponderTerminate: returnToStart,
    onPanResponderTerminationRequest: () => false,
  })).current;

  return (
    <Pressable
      onPress={onComplete}
      accessibilityRole="button"
      accessibilityLabel="Slide to explore Setu"
      accessibilityHint="Swipe the handle to the right. It turns pink as you slide, or tap to get started."
      onLayout={(event) => { trackWidth.current = event.nativeEvent.layout.width; }}
      style={styles.slideButton}
    >
      <Animated.View pointerEvents="none" style={[styles.slideTrackFill, { width: fillWidth, backgroundColor: fillColor, opacity: fillOpacity }]} />
      <Text pointerEvents="none" style={styles.slideText}>Slide to Explore Setu</Text>
      <Ionicons pointerEvents="none" name="pulse" size={18} color="#A5D3BD" style={styles.slidePulse} />
      <Animated.View {...panResponder.panHandlers} style={[styles.slideKnob, { backgroundColor: knobColor, transform: [{ translateX }] }]}>
        <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
      </Animated.View>
    </Pressable>
  );
}

function WebLanding({ navigation, section }: any) {
  const scroller = useRef<any>(null);
  const offsets = useRef<Record<string, number>>({});
  const mark = (key: string) => (e: any) => { offsets.current[key] = e.nativeEvent.layout.y; };
  React.useEffect(() => {
    if (section && offsets.current[section] !== undefined) scroller.current?.scrollTo({ y: offsets.current[section] - 10, animated: true });
    else if (section === 'top') scroller.current?.scrollTo({ y: 0, animated: true });
  }, [section]);
  const signup = () => navigation.navigate('SignUp');
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <MarketingHeader />
      <ScrollView ref={scroller} contentContainerStyle={{ paddingBottom: 0 }}>
        {/* Hero */}
        <View style={styles.heroBand}>
          <View style={styles.wrap}>
            <View style={{ flexDirection: 'row', gap: 48, alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <View style={styles.eyebrow}><View style={styles.eyebrowDot} /><Text style={styles.eyebrowText}>A more thoughtful way to find your person</Text></View>
                <Text style={styles.h1} accessibilityRole="header">Sambandh Setu{'\n'}Find with purpose.{'\n'}Connect with <Text style={styles.h1Accent}>trust.</Text></Text>
                <Text style={styles.lead}>Sambandh Setu is a relationship platform for individuals who are ready for meaningful, value-aligned connections. From self-reflection to conversations and next steps, we support you with tools, guidance and choices that respect your journey.</Text>
                <View style={{ flexDirection: 'row', gap: 14, marginTop: 28 }}>
                  <Button title="Start Your Journey" arrow full={false} onPress={signup} style={{ minWidth: 200 }} />
                  <Button title="Learn More" variant="ghost" icon="play" full={false} onPress={() => scroller.current?.scrollTo({ y: offsets.current.how || 700, animated: true })} style={{ minWidth: 150 }} />
                </View>
                <View style={styles.trust}>
                  {[['shield-checkmark-outline', 'Safe & Private'], ['person-outline', 'Your Choices'], ['heart-outline', 'Meaningful Connections']].map(([i, t]) => (
                    <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name={i as any} size={16} color={colors.primary} /><Text style={styles.trustText}>{t}</Text></View>
                  ))}
                </View>
              </View>
              <View style={styles.heroArt}>
                <Image source={require('../../../assets/illustrations/landing-bridge.jpg')} style={{ width: '100%' as any, height: '100%' as any, borderRadius: 18 }} resizeMode="cover" accessibilityLabel="Two people on either side of a bridge: different journeys, a shared tomorrow" />
              </View>
            </View>
            <View style={[styles.featureRow]} onLayout={mark('features')}>
              {FEATURES.map((f) => (
                <View key={f.title} style={styles.feature}>
                  <View style={styles.featureIcon}><Ionicons name={f.icon} size={22} color={colors.primary} /></View>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureText}>{f.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Journey path */}
        <View style={styles.section} onLayout={mark('how')}>
          <View style={styles.wrap}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <View style={{ maxWidth: 560 }}>
                <Text style={styles.kicker}>YOUR JOURNEY</Text>
                <Text style={styles.h2}>A thoughtful path{'\n'}to meaningful connections</Text>
                <Text style={styles.body}>From understanding yourself to building a real connection, Sambandh Setu supports you at every stage with the right tools and guidance.</Text>
              </View>
              <Button title="Explore the journey" variant="outline" arrow full={false} onPress={signup} />
            </View>
            <View style={{ flexDirection: 'row', marginTop: 48 }}>
              {PATH.map((p, i) => (
                <View key={p.title} style={{ flex: 1, alignItems: 'center', paddingHorizontal: 12 }}>
                  <View style={styles.num}><Text style={styles.numText}>{i + 1}</Text></View>
                  <Text style={styles.pathTitle}>{p.title}</Text>
                  <View style={styles.pathIcon}><Ionicons name={p.icon} size={24} color={colors.primary} /></View>
                  <Text style={styles.pathText}>{p.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* AI support */}
        <View style={[styles.section, { backgroundColor: colors.bgTint }]} onLayout={mark('approach')}>
          <View style={[styles.wrap, { flexDirection: 'row', gap: 56, alignItems: 'center' }]}>
            <View style={styles.mock}>
              <View style={styles.mockBar}><View style={[styles.mockDot, { backgroundColor: '#F87171' }]} /><View style={[styles.mockDot, { backgroundColor: '#FBBF24' }]} /><View style={[styles.mockDot, { backgroundColor: '#34D399' }]} /></View>
              <View style={{ flexDirection: 'row', flex: 1 }}>
                <View style={styles.mockSide}>
                  <Logo tagline={false} size={22} />
                  {['Home', 'My Journey', 'Discover', 'Conversations', 'Guidance', 'Profile'].map((t, i) => <Text key={t} style={[styles.mockNav, i === 0 && styles.mockNavOn]}>{t}</Text>)}
                </View>
                <View style={{ flex: 1, padding: 16, gap: 10 }}>
                  <Text style={styles.mockH}>Your progress</Text>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.primarySoft }}><View style={{ width: '45%', height: 6, borderRadius: 3, backgroundColor: colors.primary }} /></View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>{['Self-Reflect · Done', 'Discover · Active', 'Chat · Next'].map((t) => <View key={t} style={styles.mockChip}><Text style={styles.mockChipText}>{t}</Text></View>)}</View>
                  <Text style={[styles.mockH, { marginTop: 8 }]}>Setu Guide suggests</Text>
                  {['Lifestyle and daily routines', 'Family values', 'Career and personal growth'].map((t) => <View key={t} style={styles.mockRow}><Ionicons name="chatbubble-outline" size={13} color={colors.primary} /><Text style={styles.mockRowText}>{t}</Text></View>)}
                </View>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.badge}><Text style={styles.badgeText}>AI SUPPORT</Text></View>
              <Text style={styles.h2}>Guidance when you need it,{'\n'}choices always yours</Text>
              <Text style={styles.body}>Setu Guide helps you with conversation ideas, an understanding of each stage, and next-step guidance. It does not make judgements or decide for you. You remain in control.</Text>
              {['Conversation prompts for meaningful discussions', 'Suggestions based on the interests and values you share', 'Guidance on relationship readiness', 'Respects your privacy and personal boundaries'].map((t) => (
                <View key={t} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 14 }}><Ionicons name="checkmark" size={18} color={colors.primary} /><Text style={styles.check}>{t}</Text></View>
              ))}
            </View>
          </View>
        </View>

        {/* Two cards */}
        <View style={styles.section}>
          <View style={[styles.wrap, { flexDirection: 'row', gap: 24 }]}>
            {[
              { img: require('../../../assets/illustrations/starts-with-you.png'), tag: 'READINESS', title: 'It starts with you', text: 'Before meeting others, take time to understand your own values, expectations and readiness. Private reflection helps you ask the right questions and feel more confident in your journey.', cta: 'Explore reflection tools' },
              { img: require('../../../assets/illustrations/beyond-usual.png'), tag: 'CONVERSATIONS', title: 'Go beyond the usual', text: "Move past surface-level chats with guided conversation prompts designed to help you understand each other's values, perspectives and life goals.", cta: 'See example conversations' },
            ].map((c) => (
              <View key={c.title} style={styles.bigCard}>
                <Image source={c.img} style={{ width: 170, height: 170, borderRadius: 16 }} resizeMode="cover" accessibilityIgnoresInvertColors />
                <View style={{ flex: 1 }}>
                  <View style={[styles.badge, { alignSelf: 'flex-start' }]}><Text style={styles.badgeText}>{c.tag}</Text></View>
                  <Text style={styles.cardTitle}>{c.title}</Text>
                  <Text style={styles.cardText}>{c.text}</Text>
                  <TextLink title={c.cta} arrow onPress={signup} style={{ marginTop: 8 }} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Principles (no invented statistics or testimonials) */}
        <View style={[styles.section, { paddingTop: 0 }]} onLayout={mark('about')}>
          <View style={[styles.wrap, { flexDirection: 'row', gap: 24 }]}>
            {[
              { icon: 'lock-closed-outline', tag: 'PRIVACY & SAFETY', title: 'Your privacy, our priority', text: 'You decide who sees your profile and what they see. Private reflections stay private. You can pause, hide or take a break anytime.', cta: 'Read our Privacy Policy', slug: 'privacy-policy' },
              { icon: 'shield-checkmark-outline', tag: 'TRUST', title: 'Verified by people, not guesses', text: 'Identity and professional documents are checked by our team, never shown to other members, and deleted when you delete your account.', cta: 'About verification', slug: 'about-verification' },
              { icon: 'people-outline', tag: 'COMMUNITY', title: 'Respect is the rule', text: 'Clear community guidelines, block and report on every profile, and a team that reviews every report.', cta: 'Community Guidelines', slug: 'community-guidelines' },
            ].map((c) => (
              <View key={c.title} style={styles.principle}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.featureIconSm}><Ionicons name={c.icon as any} size={18} color={colors.primary} /></View>
                  <Text style={styles.kickerSm}>{c.tag}</Text>
                </View>
                <Text style={[styles.cardTitle, { fontSize: 19 }]}>{c.title}</Text>
                <Text style={styles.cardText}>{c.text}</Text>
                <TextLink title={c.cta} arrow size={13} onPress={() => navigation.navigate('Info', { slug: c.slug })} style={{ marginTop: 6 }} />
              </View>
            ))}
          </View>
        </View>

        {/* CTA */}
        <View style={[styles.section, { paddingTop: 0 }]}>
          <View style={[styles.wrap, styles.cta]}>
            <View>
              <Text style={[styles.h2, { fontSize: 30, marginTop: 0 }]}>Ready to begin your journey?</Text>
              <Text style={styles.body}>Take the first step towards a meaningful connection.</Text>
            </View>
            <Button title="Create your Profile" arrow full={false} onPress={signup} style={{ minWidth: 210 }} />
          </View>
        </View>

        <View style={styles.footer}>
          <View style={[styles.wrap, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <LogoMark size={30} />
              <View>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.text }}>Sambandh Setu</Text>
                <Text style={styles.muted}>© {new Date().getFullYear()} Sambandh Setu. Find with purpose. Connect with trust.</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 24 }}>
              {[['Privacy Policy', 'privacy-policy'], ['Terms of Service', 'terms'], ['Community Guidelines', 'community-guidelines'], ['About', 'about']].map(([t, slug]) => (
                <Pressable key={t} onPress={() => navigation.navigate('Info', { slug })} accessibilityRole="link"><Text style={styles.footLink}>{t}</Text></Pressable>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mobileScroll: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 12 },
  mobileContent: { flexGrow: 1, width: '100%' as any, maxWidth: 390, alignSelf: 'center', justifyContent: 'center' },
  mobileHeader: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mobileBrand: { fontFamily: fonts.display, fontSize: 11, color: '#194B3B', marginTop: 2 },
  mobileTitle: { width: '112%' as any, maxWidth: 390, alignSelf: 'center', fontFamily: fonts.display, fontSize: 28, lineHeight: 34, color: '#173F32', textAlign: 'center', marginTop: 6, marginBottom: 32 },
  mobileCollage: { width: '100%' as any, maxWidth: 350, alignSelf: 'center', position: 'relative', marginTop: 2 },
  journeyHeading: { alignItems: 'center', marginBottom: 14, marginTop: 8 },
  journeyTitle: { fontFamily: fonts.display, fontSize: 17, lineHeight: 23, color: '#253C32', textAlign: 'center' },
  journeySubtitle: { fontFamily: fonts.regular, fontSize: 10, lineHeight: 15, color: '#52635B', textAlign: 'center', marginTop: 2 },
  journeyCards: { gap: 7, paddingHorizontal: 2 },
  journeyCard: { borderWidth: 1, borderColor: 'rgba(40, 76, 62, 0.13)', borderRadius: 14, padding: 12, shadowColor: '#28392F', shadowOpacity: 0.15, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  journeyCardMint: { backgroundColor: '#DCEDE3', transform: [{ rotate: '-1.8deg' }, { translateX: -1 }] },
  journeyCardCream: { backgroundColor: '#FBF8F0', transform: [{ rotate: '1.2deg' }, { translateX: 1 }] },
  journeyCardPink: { backgroundColor: '#F6E0E5', transform: [{ rotate: '-1.4deg' }, { translateX: -1 }] },
  journeyCardTall: { paddingVertical: 13 },
  journeyCardFamily: { paddingVertical: 14, transform: [{ rotate: '1.5deg' }, { translateX: 1 }] },
  journeyCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  journeyCardTitle: { flex: 1, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, color: '#26392F' },
  journeyCardText: { fontFamily: fonts.regular, fontSize: 10, lineHeight: 14, color: '#394A41', marginTop: 5 },
  journeyIconMint: { width: 38, height: 38, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  journeyIconPink: { width: 38, height: 38, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.48)', alignItems: 'center', justifyContent: 'center' },
  journeyIconColumn: { alignItems: 'center', justifyContent: 'center', minWidth: 48, gap: 1 },
  concealedBadge: { fontFamily: fonts.medium, fontSize: 7, color: '#FFFFFF', backgroundColor: '#335C4C', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  previewButton: { height: 25, borderWidth: 1, borderColor: '#B7CBBE', borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 9, backgroundColor: 'rgba(255,255,255,0.25)' },
  previewButtonText: { fontFamily: fonts.medium, fontSize: 9, color: '#425C4D' },
  promptPreview: { fontFamily: fonts.regular, fontSize: 10, lineHeight: 14, fontStyle: 'italic', color: '#3E584B', marginTop: 9 },
  journeyActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  communityButton: { flex: 1, height: 42, borderRadius: 22, backgroundColor: '#0E5944', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...shadow.card },
  communityButtonPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  communityButtonText: { fontFamily: fonts.semibold, fontSize: 11, color: '#FFFFFF' },
  skipButton: { width: 76, height: 42, borderRadius: 22, borderWidth: 1.5, borderColor: '#0E5944', backgroundColor: '#F8F5E9', alignItems: 'center', justifyContent: 'center' },
  skipButtonText: { fontFamily: fonts.semibold, fontSize: 11, color: '#0E5944' },
  dialScreen: { flex: 1, backgroundColor: '#0D4338', alignItems: 'center', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 42, overflow: 'hidden' },
  dialHeading: { alignItems: 'center', marginTop: 4 },
  dialTitle: { fontFamily: fonts.display, fontSize: 20, lineHeight: 27, color: '#F6F1E5', textAlign: 'center' },
  dialSubtitle: { fontFamily: fonts.regular, fontSize: 10, lineHeight: 15, color: '#D5DED3', textAlign: 'center', marginTop: 1 },
  dialCanvas: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  dialDiagramGroup: { alignItems: 'center' },
  dialScoreRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6, marginTop: 8 },
  dialScoreValue: { fontFamily: fonts.display, fontSize: 18, lineHeight: 22, color: '#F6F1E5' },
  dialScoreLabel: { fontFamily: fonts.medium, fontSize: 12, color: '#D5DED3' },
  dialOuter: { position: 'relative', alignItems: 'center', justifyContent: 'center', backgroundColor: '#174D41', borderWidth: 3, borderColor: '#C4B07D', shadowColor: '#031E19', shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 8, overflow: 'visible' },
  dialTickLayer: { position: 'absolute', top: 0, left: 0 },
  dialRotateTarget: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  dialTag: { position: 'absolute', overflow: 'hidden', borderRadius: 12, backgroundColor: '#B65F70', paddingHorizontal: 8, paddingVertical: 4, color: '#FFF8F0', fontFamily: fonts.medium, fontSize: 8, lineHeight: 10, zIndex: 5 },
  dialTagTopLeft: { top: '18%' as any, left: '-3%' as any, transform: [{ rotate: '-27deg' }] },
  dialTagTopRight: { top: '18%' as any, right: '-3%' as any, transform: [{ rotate: '27deg' }] },
  dialTagBottomLeft: { bottom: '17%' as any, left: '-5%' as any, transform: [{ rotate: '20deg' }] },
  dialTagBottomRight: { bottom: '17%' as any, right: '-5%' as any, transform: [{ rotate: '-20deg' }] },
  dialActions: { width: '100%' as any, maxWidth: 300, flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'center' },
  dialSkipButton: { width: 76, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: '#C4B07D', backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  dialSkipText: { fontFamily: fonts.semibold, fontSize: 12, color: '#F6F1E5' },
  dialContinueButton: { flex: 1, height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#F7F2E5', borderWidth: 1.5, borderColor: '#C4B07D', shadowColor: '#031E19', shadowOpacity: 0.3, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  dialContinueText: { fontFamily: fonts.semibold, fontSize: 13, color: '#174D41' },
  dialContinuePressed: { opacity: 0.88, transform: [{ scale: 0.94 }] },
  vaultScreen: { flex: 1, width: '100%' as any, backgroundColor: '#F8F5E9' },
  vaultScroll: { flex: 1, width: '100%' as any },
  vaultContent: { flexGrow: 1, width: '100%' as any, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 4, paddingBottom: 36 },
  vaultSafetyBadge: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: '#FFFDF7', borderWidth: 1, borderColor: '#E8DDD0' },
  vaultSafetyText: { fontFamily: fonts.medium, fontSize: 10, color: '#765F50' },
  vaultInstructionGroup: { width: '100%' as any, alignItems: 'center', marginTop: 5 },
  vaultInstruction: { width: '100%' as any, fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: '#4E5A51', textAlign: 'center' },
  vaultArtwork: { position: 'relative', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: -7, overflow: 'visible' },
  vaultKeyPosition: { position: 'absolute', justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  vaultKey: { width: '100%' as any, height: '100%' as any },
  vaultTitle: { width: '100%' as any, fontFamily: fonts.display, fontSize: 22, lineHeight: 25, color: '#222B27', textAlign: 'center', marginTop: -3 },
  vaultSubtitle: { width: '100%' as any, fontFamily: fonts.medium, fontSize: 11, lineHeight: 15, color: '#2E3933', textAlign: 'center', marginTop: 3 },
  vaultSubtext: { width: '100%' as any, fontFamily: fonts.regular, fontSize: 10, lineHeight: 13, color: '#545F56', textAlign: 'center', marginTop: 2 },
  vaultStatusCard: { width: '100%' as any, maxWidth: 360, minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 11, paddingVertical: 8, marginTop: 10, borderRadius: 13, backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: '#E7E1D5', shadowColor: '#314138', shadowOpacity: 0.12, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  vaultAvatars: { width: 52, height: 42, position: 'relative' },
  vaultAvatar: { position: 'absolute', top: 0, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5E5DC', borderWidth: 1, borderColor: '#F8F5E9' },
  vaultAvatarOne: { left: 0 },
  vaultAvatarTwo: { left: 14, backgroundColor: '#D9E1D9' },
  vaultStatusDetails: { flex: 1, gap: 1 },
  vaultNames: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, color: '#2D3831' },
  vaultStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  vaultStatusText: { fontFamily: fonts.regular, fontSize: 9, lineHeight: 12, color: '#435047' },
  vaultActions: { width: '100%' as any, maxWidth: 330, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  vaultSkipButton: { height: 48 },
  vaultContinueButton: { flex: 1, height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#0E5944', borderWidth: 1.5, borderColor: '#C4B07D', shadowColor: '#314138', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  vaultContinueText: { fontFamily: fonts.semibold, fontSize: 13, color: '#FFFFFF' },
  mobilePhoto: { position: 'absolute', padding: 3, backgroundColor: '#FFFEF8', shadowColor: '#2E3A31', shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  mobilePhotoMain: { width: '52%' as any, height: '48%' as any, left: '3%' as any, top: '9%' as any, borderRadius: 13, zIndex: 2, transform: [{ rotate: '-8deg' }] },
  mobilePhotoTop: { width: '40%' as any, height: '37%' as any, right: '2%' as any, top: '2%' as any, borderRadius: 13, zIndex: 1, transform: [{ rotate: '7deg' }] },
  mobilePhotoLeft: { width: '36%' as any, height: '42%' as any, left: '5%' as any, bottom: '3%' as any, borderRadius: 999, zIndex: 4, transform: [{ rotate: '-7deg' }] },
  mobilePhotoRight: { width: '49%' as any, height: '48%' as any, right: '3%' as any, bottom: '6%' as any, borderRadius: 17, zIndex: 3, transform: [{ rotate: '6deg' }] },
  mobilePhotoImage: { width: '100%' as any, height: '100%' as any, borderRadius: 10 },
  mobilePhotoOval: { width: '100%' as any, height: '100%' as any, borderRadius: 999 },
  mobileBadge: { position: 'absolute', zIndex: 5, flexDirection: 'row', alignItems: 'center', gap: 2, borderWidth: 1, borderColor: 'rgba(36, 76, 62, 0.12)', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6 },
  mobileBadgeText: { fontFamily: fonts.medium, fontSize: 8, color: '#28483C' },
  mobileBadgeFace: { left: 0, top: '3%' as any, backgroundColor: '#F3D5DC', transform: [{ rotate: '-6deg' }] },
  mobileBadgeAnonymous: { right: 0, top: '28%' as any, backgroundColor: '#D8E9DB', transform: [{ rotate: '5deg' }] },
  mobileBadgePressure: { left: '3%' as any, bottom: '16%' as any, backgroundColor: '#F3D5DC', transform: [{ rotate: '-5deg' }] },
  mobileBadgePrivacy: { right: '2%' as any, bottom: '5%' as any, backgroundColor: '#D8E9DB', transform: [{ rotate: '5deg' }] },
  slideButton: { height: 48, maxWidth: 350, width: '100%' as any, alignSelf: 'center', justifyContent: 'center', borderRadius: 26, backgroundColor: '#0E5944', borderWidth: 1, borderColor: '#80A995', marginTop: 2, overflow: 'hidden', ...shadow.card },
  slideTrackFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 26 },
  slideKnob: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#28775C', borderWidth: 1, borderColor: '#8AB59D', alignItems: 'center', justifyContent: 'center', position: 'absolute', left: 3, top: 2 },
  slideText: { position: 'absolute', left: 0, right: 0, textAlign: 'center', paddingLeft: 34, paddingRight: 30, fontFamily: fonts.semibold, fontSize: 11, color: '#FFFFFF' },
  slidePulse: { position: 'absolute', right: 10 },
  mobileLogin: { fontFamily: fonts.regular, fontSize: 12, color: '#273D34' },
  mobileAuthLinks: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 6 },
  markCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  serifBrand: { fontFamily: fonts.display, fontSize: 19, color: colors.navy },
  brandSub: { fontFamily: fonts.medium, fontSize: 8.5, letterSpacing: 1, color: colors.muted },
  lang: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, height: 32, justifyContent: 'center', backgroundColor: '#fff' },
  langText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSoft },
  hero: { width: '100%' as any, height: 360, borderRadius: 24, marginBottom: 22 },
  welcomeTitle: { fontFamily: fonts.display, fontSize: 30, lineHeight: 38, color: colors.navy },
  welcomeSub: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, color: colors.textSoft, marginTop: 10 },
  trio: { flexDirection: 'row', marginVertical: 24 },
  trioItem: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  trioIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  trioText: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, textAlign: 'center' },
  muted: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.muted },
  heroBand: { backgroundColor: '#F1F6FE', paddingTop: 56, paddingBottom: 40 },
  wrap: { width: '100%' as any, maxWidth: 1200, alignSelf: 'center', paddingHorizontal: 32 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: radius.pill, borderWidth: 1, borderColor: colors.primaryLine, paddingHorizontal: 12, height: 30, marginBottom: 20 },
  eyebrowDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  eyebrowText: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.primary },
  h1: { fontFamily: fonts.bold, fontSize: 52, lineHeight: 58, color: colors.text, letterSpacing: -1 },
  h1Accent: { color: colors.primary, textDecorationLine: 'underline' },
  lead: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 28, color: colors.textSoft, marginTop: 22, maxWidth: 560 },
  trust: { flexDirection: 'row', gap: 24, marginTop: 28, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.border },
  trustText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textSoft },
  heroArt: { flex: 1, height: 430, borderRadius: 22, padding: 10, backgroundColor: '#fff', ...shadow.elevated },
  featureRow: { flexDirection: 'row', gap: 20, marginTop: 56 },
  feature: { flex: 1, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 24, alignItems: 'center' },
  featureIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  featureIconSm: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text, textAlign: 'center' },
  featureText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.muted, textAlign: 'center', marginTop: 6 },
  section: { paddingVertical: 72, backgroundColor: '#fff' },
  kicker: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1, color: colors.primary, backgroundColor: colors.primarySoft, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  kickerSm: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1, color: colors.primary },
  h2: { fontFamily: fonts.bold, fontSize: 36, lineHeight: 44, color: colors.text, marginTop: 14, letterSpacing: -0.5 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 26, color: colors.textSoft, marginTop: 12 },
  num: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: fonts.bold, fontSize: 13, color: '#fff' },
  pathTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text, marginTop: 12 },
  pathIcon: { width: 60, height: 60, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginVertical: 16, backgroundColor: '#fff' },
  pathText: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 20, color: colors.muted, textAlign: 'center' },
  mock: { width: 560, height: 360, backgroundColor: '#fff', borderRadius: 16, borderWidth: 8, borderColor: '#1E293B', overflow: 'hidden', ...shadow.modal },
  mockBar: { flexDirection: 'row', gap: 6, padding: 10, backgroundColor: colors.bgTint },
  mockDot: { width: 9, height: 9, borderRadius: 5 },
  mockSide: { width: 170, borderRightWidth: 1, borderRightColor: colors.border, padding: 14, gap: 10 },
  mockNav: { fontFamily: fonts.medium, fontSize: 12, color: colors.textSoft, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  mockNavOn: { backgroundColor: colors.primarySoft, color: colors.primary },
  mockH: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  mockChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  mockChipText: { fontFamily: fonts.medium, fontSize: 10.5, color: colors.primary },
  mockRow: { flexDirection: 'row', gap: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8 },
  mockRowText: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.textSoft },
  badge: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start' },
  badgeText: { fontFamily: fonts.semibold, fontSize: 11.5, letterSpacing: 0.8, color: colors.primary },
  check: { fontFamily: fonts.regular, fontSize: 16, color: colors.textSoft },
  bigCard: { flex: 1, flexDirection: 'row', gap: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 24, backgroundColor: '#fff', ...shadow.card },
  cardTitle: { fontFamily: fonts.bold, fontSize: 24, color: colors.text, marginTop: 10 },
  cardText: { fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 22, color: colors.muted, marginTop: 8 },
  principle: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 24, backgroundColor: '#FBFCFE' },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 40, backgroundColor: '#fff', ...shadow.card },
  footer: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 28, backgroundColor: '#fff' },
  footLink: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.textSoft },
});
