import React, { useRef } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, shadow, space } from '../../theme';
import { useLayout } from '../../hooks/useLayout';
import { Button, LogoMark, Logo, TextLink } from '../../ui';
import { MarketingHeader } from '../../layout/AuthLayout';

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
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgTint }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={styles.markCircle}><LogoMark size={30} /></View>
            <View>
              <Text style={styles.serifBrand}>Sambandh Setu</Text>
              <Text style={styles.brandSub}>PEOPLE · CONVERSATIONS · POSSIBILITIES</Text>
            </View>
          </View>
          <View style={styles.lang}><Text style={styles.langText}>English</Text></View>
        </View>
        <Image source={require('../../../assets/illustrations/welcome-couple.jpg')} style={styles.hero} resizeMode="cover" accessibilityLabel="Two people walking together in a garden" />
        <Text style={styles.welcomeTitle} accessibilityRole="header">Meaningful connections,{'\n'}<Text style={{ color: colors.primary }}>at your own pace.</Text></Text>
        <Text style={styles.welcomeSub}>Discover people, understand each other, and take the next step when you're ready.</Text>
        <View style={styles.trio}>
          {[['people-outline', 'People with shared values'], ['chatbox-outline', 'Thoughtful conversations'], ['heart-circle-outline', 'A guided journey forward']].map(([icon, label], i) => (
            <View key={label} style={[styles.trioItem, i > 0 && { borderLeftWidth: 1, borderLeftColor: colors.border }]}>
              <View style={styles.trioIcon}><Ionicons name={icon as any} size={18} color={colors.primary} /></View>
              <Text style={styles.trioText}>{label}</Text>
            </View>
          ))}
        </View>
        <Button title="Get Started" arrow size="lg" onPress={() => navigation.navigate('SignUp')} />
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 14 }}>
          <Text style={styles.muted}>Already have an account? </Text>
          <TextLink title="Log in" onPress={() => navigation.navigate('Login')} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 12 }}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.muted} />
          <Text style={styles.muted}>Your information stays under your control.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  mockBar: { flexDirection: 'row', gap: 6, padding: 10, backgroundColor: '#F1F5F9' },
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
