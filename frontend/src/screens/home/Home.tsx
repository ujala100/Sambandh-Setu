import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Home as HomeApi, HomeData } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useLoad } from '../../hooks/useAsync';
import { useLayout } from '../../hooks/useLayout';
import { useLive, useLiveRefresh } from '../../context/LiveContext';
import { fonts, radius, shadow, space } from '../../theme';
import { Avatar, Button, Card, EmptyState, ErrorState, IconButton, JourneyStepper, Screen, Skeleton } from '../../ui';
import { greeting, nameAge } from '../../utils/format';

const HOME_COLORS = {
  background: '#F8F5E9',
  surface: '#FFFDF7',
  text: '#263B31',
  heading: '#173F32',
  muted: '#647067',
  rose: '#C14778',
  roseText: '#923454',
  roseSoft: '#FBE5ED',
  roseLine: '#EAB9CC',
  green: '#6EAE90',
  greenText: '#3D6749',
  greenSoft: '#E7F1E9',
  greenLine: '#CFE4D7',
  border: '#E8DAD8',
} as const;

const ATTN_ICON: Record<string, { icon: any; tint: 'rose' | 'green' }> = {
  requests: { icon: 'person-add-outline', tint: 'rose' },
  family: { icon: 'document-text-outline', tint: 'rose' },
  journey: { icon: 'infinite', tint: 'green' },
  chat: { icon: 'chatbubble-ellipses-outline', tint: 'green' },
  photo: { icon: 'camera-outline', tint: 'rose' },
};

const BLURB: Record<string, { title: string; text: string }> = {
  connect: { title: "You're just getting started.", text: 'Say hello and take your time before going further.' },
  understand: { title: "You're currently getting to know each other.", text: 'Take your time to have meaningful conversations and understand each other better.' },
  reflect: { title: "It's time to reflect.", text: 'Answer the Reflect questions privately and choose what to share.' },
  discuss: { title: "You're discussing what matters.", text: 'Talk openly about values, family and plans for the future.' },
  agree: { title: "You're finding common ground.", text: 'Notice where you align and what each of you needs.' },
  family: { title: "You're involving family.", text: 'Bring families in when you are both ready.' },
  reflect_again: { title: 'One more moment to reflect.', text: 'A short private check-in after the family stage.' },
  decision: { title: "You're at the decision stage.", text: 'Decide together, with care and at your own pace.' },
};

export default function Home({ navigation }: any) {
  const [showGettingStarted, setShowGettingStarted] = React.useState(false);
  const { user } = useAuth();
  const { wide } = useLayout();
  const { data, error, loading, refreshing, refresh, reload } = useLoad(() => HomeApi.get());
  const { snapshot } = useLive();
  useLiveRefresh((s) => [s.requests.pending, s.messages.unread, s.notifications.latest], reload);
  const first = data?.firstName || user?.firstName || '';

  const openAttention = (a: HomeData['attention'][number]) => {
    if (a.target === 'requests') navigation.navigate('Connections', { tab: 'requests' });
    else if (a.target === 'family') navigation.navigate('FamilyAccess');
    else if (a.target === 'journey' && a.connectionId) navigation.navigate('Journey', { connectionId: a.connectionId });
    else if (a.target === 'chats') navigation.navigate('Chats');
    else if (a.target === 'photo') navigation.navigate('EditAbout');
  };

  const greetingBlock = wide ? (
    <View style={styles.banner}>
      <View style={{ flex: 1, padding: 32, justifyContent: 'center' }}>
        <Text style={styles.bannerTitle} accessibilityRole="header">{greeting()},{'\n'}<Text style={styles.bannerName}>{first}</Text></Text>
        <Text style={styles.bannerSub}>Wishing you meaningful conversations and new possibilities today.</Text>
      </View>
      <Image source={require('../../../assets/illustrations/home-banner.png')} style={{ width: 300, height: 220, alignSelf: 'flex-end' }} resizeMode="contain" accessibilityIgnoresInvertColors />
    </View>
  ) : (
    <View style={styles.mobileHead}>
      <View style={{ flex: 1 }}>
        <Text style={styles.greet} accessibilityRole="header">{greeting()}, <Text style={styles.greetName}>{first}</Text></Text>
        <Text style={styles.greetSub}>Wishing you meaningful conversations and new possibilities today.</Text>
      </View>
      <IconButton icon="notifications-outline" label={snapshot?.notifications.unread ? `Notifications, ${snapshot.notifications.unread} unread` : 'Notifications'} color={HOME_COLORS.heading} bg={HOME_COLORS.surface} badge={!!snapshot?.notifications.unread} onPress={() => navigation.navigate('Notifications')} />
      <Pressable onPress={() => navigation.navigate('Profile')} accessibilityRole="button" accessibilityLabel="My profile"><Avatar uri={user?.photoUrl} name={user?.name} size={40} tone="pink" /></Pressable>
    </View>
  );

  const rail = (
    <>
      <HomeCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}><Ionicons name="heart" size={20} color={HOME_COLORS.rose} /><Text style={styles.cardH}>Your Preferences</Text></View>
        <Text style={styles.body}>{data?.hasPreferences ? summary(user) : 'Tell us what you are looking for so we can suggest more relevant people.'}</Text>
        <Button title={data?.hasPreferences ? 'Edit Preferences' : 'Set Preferences'} variant="outline" tone="green" size="sm" onPress={() => navigation.navigate('PreferencesReview')} style={{ marginTop: space.md }} />
      </HomeCard>
      <GuideCard onPress={() => navigation.navigate('GuideChat', { connectionId: data?.current?.connectionId })} />
    </>
  );

  return (
    <Screen variant="none" tab bg={HOME_COLORS.background} aside={rail} refreshing={refreshing} onRefresh={refresh}>
      <HomeBackdrop />
      {greetingBlock}
      {loading && !data ? (
        <View style={{ gap: 16 }}><Skeleton height={150} radius={16} style={styles.skeleton} /><Skeleton height={120} radius={16} style={styles.skeleton} /><Skeleton height={180} radius={16} style={styles.skeleton} /></View>
      ) : error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : data ? (
        <>
          <HomeSectionTitle title={data.current ? 'Current Connection' : 'Start Your Journey'} icon={data.current ? 'people-outline' : 'compass-outline'} action={data.activeCount ? 'View all' : undefined} onAction={() => navigation.navigate('Connections', { tab: 'active' })} />
          {data.current ? (
            <CurrentConnection data={data} navigation={navigation} />
          ) : (
            <GettingStartedCard
              hasPreferences={data.hasPreferences}
              expanded={showGettingStarted}
              onToggle={() => setShowGettingStarted((expanded) => !expanded)}
              onStart={() => navigation.navigate(data.hasPreferences ? 'Connections' : 'PreferencesReview', data.hasPreferences ? { tab: 'discover' } : undefined)}
            />
          )}

          <HomeSectionTitle title="Needs Your Attention" icon="notifications-outline" style={{ marginTop: space.xl }} />
          {data.attention.length ? (
            <View style={wide ? { flexDirection: 'row', flexWrap: 'wrap', gap: 16 } : { gap: 10 }}>
              {data.attention.map((a) => {
                const meta = ATTN_ICON[a.icon] || ATTN_ICON.requests;
                const tint = meta.tint === 'rose'
                  ? { backgroundColor: HOME_COLORS.roseSoft, color: HOME_COLORS.roseText }
                  : { backgroundColor: HOME_COLORS.greenSoft, color: HOME_COLORS.heading };
                return (
                  <HomeCard key={a.key} onPress={() => openAttention(a)} style={[styles.attn, wide && { width: '48.5%' as any }]} accessibilityLabel={`${a.title}. ${a.description}`}>
                    <View style={[styles.attnIcon, { backgroundColor: tint.backgroundColor }]}><Ionicons name={meta.icon} size={20} color={tint.color} /></View>
                    <View style={{ flex: 1 }}><Text style={styles.attnTitle}>{a.title}</Text><Text style={styles.attnText}>{a.description}</Text></View>
                    <Ionicons name="chevron-forward" size={18} color="#9AA79D" />
                  </HomeCard>
                );
              })}
            </View>
          ) : <HomeCard><EmptyState icon="checkmark-done-outline" tint="green" title="You're all caught up" text="Nothing needs your attention right now." /></HomeCard>}

          <HomeSectionTitle title="Your Journey" icon="walk-outline" action={data.current ? 'View details' : undefined} onAction={() => data.current && navigation.navigate('Journey', { connectionId: data.current.connectionId })} style={{ marginTop: space.xl }} />
          <HomeCard>
            <JourneyStepper stages={windowStages(data)} activeColor={HOME_COLORS.green} />
            <View style={styles.callout}>
              <Ionicons name="time-outline" size={22} color={HOME_COLORS.roseText} />
              <View style={{ flex: 1 }}>
                <Text style={styles.calloutTitle}>{data.current ? BLURB[data.current.stage]?.title : 'Your journey starts with a connection.'}</Text>
                <Text style={styles.body}>{data.current ? BLURB[data.current.stage]?.text : 'Send respectful interest to someone who shares your values. When you both agree, the Connect stage begins.'}</Text>
              </View>
            </View>
          </HomeCard>

          {!wide ? (
            <>
              <View style={{ height: space.xl }} />
              <GuideCard onPress={() => navigation.navigate('GuideChat', { connectionId: data.current?.connectionId })} />
              <HomeCard style={[styles.discoverCard, { marginTop: space.lg, flexDirection: 'row', alignItems: 'center' }]} onPress={() => navigation.navigate('Connections', { tab: 'discover' })} accessibilityLabel="Discover. Find meaningful connections">
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name="compass" size={20} color={HOME_COLORS.heading} /><Text style={styles.cardH}>Discover</Text></View>
                  <Text style={[styles.body, { marginVertical: 6 }]}>Meet people who share your values, goals and future hopes.</Text>
                  <Text style={styles.link}>Find meaningful connections →</Text>
                </View>
                <Image source={require('../../../assets/illustrations/discover-teaser.png')} style={{ width: 110, height: 76 }} resizeMode="contain" />
              </HomeCard>
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function summary(user: any) {
  const b = user?.profile?.preferences?.basic || {};
  const parts = [b.ageMin && b.ageMax ? `${b.ageMin}-${b.ageMax} years` : '', b.education, b.location].filter(Boolean);
  const values = user?.profile?.preferences?.values?.valueTags || user?.profile?.values || [];
  return `Looking for ${values.length ? `a partner who values ${values.slice(0, 2).join(' and ').toLowerCase()}` : 'a kind and supportive partner'}${parts.length ? ` · ${parts.join(' · ')}` : ''}.`;
}

function windowStages(data: HomeData) {
  const cur = data.current?.journey;
  if (!cur) return data.stages.slice(0, 4).map((s, i) => ({ ...s, status: i === 0 ? ('current' as const) : ('locked' as const) }));
  const idx = cur.stages.findIndex((s) => s.status === 'current');
  const start = Math.max(0, Math.min((idx < 0 ? 7 : idx) - 1, cur.stages.length - 4));
  return cur.stages.slice(start, start + 4);
}

function CurrentConnection({ data, navigation }: { data: HomeData; navigation: any }) {
  const { wide } = useLayout();
  const c = data.current!;
  return (
    <HomeCard onPress={() => navigation.navigate('PersonProfile', { userId: c.person.id })} accessibilityLabel={`${nameAge(c.person)}. Open profile`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Avatar uri={c.person.photoUrl} name={c.person.name} size={wide ? 112 : 92} rounded online={c.person.online} tone="pink" />
        <View style={{ flex: 1 }}>
          <HomeStagePill label={c.stageTitle} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <Text style={styles.name}>{nameAge(c.person)}</Text>
            {c.person.verified ? <Ionicons name="checkmark-circle" size={18} color={HOME_COLORS.heading} accessibilityLabel="Verified" /> : null}
          </View>
          {c.person.location ? <View style={styles.meta}><Ionicons name="location-outline" size={14} color={HOME_COLORS.muted} /><Text style={styles.metaText}>{c.person.location}</Text></View> : null}
          {c.person.profession ? <View style={styles.meta}><Ionicons name="briefcase-outline" size={14} color={HOME_COLORS.muted} /><Text style={styles.metaText}>{c.person.profession}</Text></View> : null}
          {!wide ? <Button title="Continue" arrow size="sm" full={false} tone="green" onPress={() => navigation.navigate('Journey', { connectionId: c.connectionId })} style={{ marginTop: 10 }} /> : null}
        </View>
        {wide ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Button title="Continue" arrow full={false} tone="green" onPress={() => navigation.navigate('Journey', { connectionId: c.connectionId })} />
            {c.chatId ? <IconButton icon="chatbubble-ellipses-outline" label="Open chat" color={HOME_COLORS.muted} onPress={() => navigation.navigate('ChatThread', { chatId: c.chatId })} /> : null}
          </View>
        ) : null}
      </View>
    </HomeCard>
  );
}

function GuideCard({ onPress }: { onPress: () => void }) {
  return (
    <HomeCard style={[styles.guideCard, { flexDirection: 'row', alignItems: 'center', ...shadow.card }]}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name="sparkles-outline" size={20} color={HOME_COLORS.heading} /><Text style={styles.cardH}>Setu Guide</Text></View>
        <Text style={[styles.attnTitle, { marginTop: 8 }]}>Need help with your next step?</Text>
        <Text style={[styles.body, { marginVertical: 6 }]}>Get personalised guidance on conversations, family involvement and next steps.</Text>
        <Button title="Ask Setu Guide" variant="outline" tone="green" size="sm" arrow full={false} onPress={onPress} />
      </View>
      <Image source={require('../../../assets/illustrations/guide-mascot.png')} style={{ width: 84, height: 100 }} resizeMode="contain" accessibilityIgnoresInvertColors />
    </HomeCard>
  );
}

function GettingStartedCard({ hasPreferences, expanded, onToggle, onStart }: {
  hasPreferences: boolean;
  expanded: boolean;
  onToggle: () => void;
  onStart: () => void;
}) {
  const completedSteps = hasPreferences ? 2 : 1;
  const progress = completedSteps / 3;
  const circumference = 2 * Math.PI * 19;
  const steps = [
    { title: 'Set your preferences', detail: 'Tell us what matters most to you.', complete: hasPreferences },
    { title: 'Explore profiles', detail: 'Take your time finding people who feel right.', complete: false },
    { title: 'Connect when you both agree', detail: 'There is no pressure to move faster than you want.', complete: false },
  ];

  return (
    <HomeCard style={styles.gettingStarted}>
      <View style={styles.startHeader}>
        <View style={styles.startIcon}><Ionicons name="compass-outline" size={23} color={HOME_COLORS.heading} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.startTitle}>{hasPreferences ? 'Your preferences are ready.' : 'Let’s begin with what matters to you.'}</Text>
          <Text style={[styles.body, { marginTop: 4 }]}>{hasPreferences ? 'Explore at your own pace. You decide when to show interest.' : 'A few preferences help us find more meaningful introductions.'}</Text>
        </View>
      </View>
      <View style={styles.startProgress}>
        <View style={styles.startProgressCircle}>
          <Svg width={48} height={48} viewBox="0 0 48 48">
            <Circle cx={24} cy={24} r={19} fill="none" stroke={HOME_COLORS.roseSoft} strokeWidth={4} />
            <Circle
              cx={24}
              cy={24}
              r={19}
              fill="none"
              stroke={HOME_COLORS.rose}
              strokeWidth={4}
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              strokeLinecap="round"
              transform="rotate(-90 24 24)"
              
        
            />
          </Svg>
          <View pointerEvents="none" style={styles.startProgressCenter}>
            <Text style={styles.startProgressPercent}>{Math.round(progress * 100)}%</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.startProgressEyebrow}>YOUR STARTING POINT</Text>
          <Text style={styles.startProgressStep}>Step {completedSteps} of 3</Text>
        </View>
      </View>
      <Button
        title={hasPreferences ? 'Explore people' : 'Set your preferences'}
        tone="pink"
        size="sm"
        arrow
        onPress={onStart}
      />
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={expanded ? 'Hide how Sambandh Setu works' : 'See how Sambandh Setu works'}
        style={styles.howItWorks}
      >
        <Text style={styles.howItWorksText}>{expanded ? 'Hide how it works' : 'How does it work?'}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={HOME_COLORS.heading} />
      </Pressable>
      {expanded ? (
        <View style={styles.startSteps} accessibilityLabel="Three steps to get started">
          {steps.map((step, index) => {
            const current = index === (hasPreferences ? 1 : 0);
            return (
              <View key={step.title} style={styles.startStep}>
                <View style={[styles.startStepNumber, step.complete && styles.startStepComplete, current && styles.startStepCurrent]}>
                  {step.complete ? <Ionicons name="checkmark" size={13} color="#fff" /> : <Text style={[styles.startStepNumberText, current && styles.startStepCurrentText]}>{index + 1}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.startStepTitle, current && styles.startStepTitleCurrent]}>{step.title}</Text>
                  <Text style={styles.startStepDetail}>{step.detail}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </HomeCard>
  );
}

function HomeCard(props: React.ComponentProps<typeof Card>) {
  return <Card {...props} style={[styles.homeCard, props.style]} />;
}

function HomeSectionTitle({ title, icon, action, onAction, style }: {
  title: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  action?: string;
  onAction?: () => void;
  style?: any;
}) {
  return (
    <View style={[styles.section, style]}>
      <View style={styles.sectionHeading}>
        {icon ? <Ionicons name={icon} size={19} color={HOME_COLORS.heading} /> : null}
        <Text style={styles.sectionTitle} accessibilityRole="header">{title}</Text>
      </View>
      {action && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button">
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function HomeStagePill({ label }: { label: string }) {
  return (
    <View style={styles.stagePill}>
      <View style={styles.stageDot} />
      <Text style={styles.stageText}>{label}</Text>
    </View>
  );
}

function HomeBackdrop() {
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no" style={styles.backgroundGlow}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="homeBottomWash" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={HOME_COLORS.background} stopOpacity="0" />
            <Stop offset="100%" stopColor={HOME_COLORS.roseSoft} stopOpacity="0.58" />
          </LinearGradient>
          <RadialGradient id="homeRoseGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={HOME_COLORS.rose} stopOpacity="0.16" />
            <Stop offset="100%" stopColor={HOME_COLORS.rose} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="homeGreenGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={HOME_COLORS.green} stopOpacity="0.12" />
            <Stop offset="100%" stopColor={HOME_COLORS.green} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#homeBottomWash)" />
        <Circle cx="8%" cy="82%" r="180" fill="url(#homeRoseGlow)" />
        <Circle cx="94%" cy="93%" r="160" fill="url(#homeGreenGlow)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  mobileHead: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: space.xl, backgroundColor: HOME_COLORS.roseSoft, marginHorizontal: -16, marginTop: -16, padding: 16, paddingTop: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, borderBottomWidth: 1, borderColor: HOME_COLORS.roseLine },
  greet: { fontFamily: fonts.display, fontSize: 24, color: HOME_COLORS.heading },
  greetName: { color: HOME_COLORS.greenText },
  greetSub: { fontFamily: fonts.regular, fontSize: 12.5, color: HOME_COLORS.muted, marginTop: 4 },
  banner: { flexDirection: 'row', backgroundColor: HOME_COLORS.roseSoft, borderColor: HOME_COLORS.roseLine, borderWidth: 1, borderRadius: 20, overflow: 'hidden', marginBottom: space.xl, minHeight: 220 },
  bannerTitle: { fontFamily: fonts.display, fontSize: 34, lineHeight: 42, color: HOME_COLORS.heading },
  bannerName: { color: HOME_COLORS.greenText },
  bannerSub: { fontFamily: fonts.regular, fontSize: 16, color: HOME_COLORS.muted, marginTop: 10 },
  homeCard: { backgroundColor: HOME_COLORS.surface, borderColor: HOME_COLORS.border, borderWidth: 1, shadowColor: '#536153', shadowOpacity: 0.06, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 19, color: HOME_COLORS.heading },
  sectionAction: { fontFamily: fonts.semibold, fontSize: 13, color: HOME_COLORS.greenText },
  name: { fontFamily: fonts.bold, fontSize: 19, color: HOME_COLORS.heading },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  metaText: { fontFamily: fonts.regular, fontSize: 13.5, color: HOME_COLORS.muted },
  stagePill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, backgroundColor: HOME_COLORS.greenSoft, borderColor: HOME_COLORS.greenLine, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  stageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: HOME_COLORS.green },
  stageText: { fontFamily: fonts.semibold, fontSize: 11, color: HOME_COLORS.greenText },
  attn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  attnIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  attnTitle: { fontFamily: fonts.semibold, fontSize: 14.5, color: HOME_COLORS.text },
  attnText: { fontFamily: fonts.regular, fontSize: 12.5, color: HOME_COLORS.muted, marginTop: 2 },
  callout: { flexDirection: 'row', gap: 12, backgroundColor: HOME_COLORS.roseSoft, borderRadius: radius.card, padding: 14, marginTop: space.lg, borderWidth: 1, borderColor: HOME_COLORS.roseLine },
  calloutTitle: { fontFamily: fonts.semibold, fontSize: 14, color: HOME_COLORS.roseText, marginBottom: 2 },
  cardH: { fontFamily: fonts.semibold, fontSize: 17, color: HOME_COLORS.heading },
  body: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 20, color: HOME_COLORS.muted },
  link: { fontFamily: fonts.semibold, fontSize: 13.5, color: HOME_COLORS.greenText },
  guideCard: { backgroundColor: HOME_COLORS.greenSoft, borderColor: HOME_COLORS.greenLine, borderWidth: 1 },
  discoverCard: { backgroundColor: HOME_COLORS.surface },
  gettingStarted: { backgroundColor: '#FFFBF9', borderColor: HOME_COLORS.roseLine },
  startHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  startIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: HOME_COLORS.greenSoft },
  startTitle: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: HOME_COLORS.heading },
  startProgress: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: space.lg, marginBottom: space.md },
  startProgressCircle: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  startProgressCenter: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  startProgressPercent: { fontFamily: fonts.semibold, fontSize: 10, color: HOME_COLORS.roseText },
  startProgressEyebrow: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 0.7, color: HOME_COLORS.muted },
  startProgressStep: { fontFamily: fonts.semibold, fontSize: 13, color: HOME_COLORS.heading, marginTop: 2 },
  howItWorks: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6, paddingTop: 12, paddingBottom: 2 },
  howItWorksText: { fontFamily: fonts.semibold, fontSize: 13, color: HOME_COLORS.greenText },
  startSteps: { gap: 14, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: HOME_COLORS.border },
  startStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  startStepNumber: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: HOME_COLORS.roseSoft, borderWidth: 1, borderColor: HOME_COLORS.roseLine },
  startStepComplete: { backgroundColor: HOME_COLORS.green, borderColor: HOME_COLORS.green },
  startStepCurrent: { backgroundColor: HOME_COLORS.surface, borderColor: HOME_COLORS.rose, borderWidth: 1.5 },
  startStepNumberText: { fontFamily: fonts.semibold, fontSize: 11, color: HOME_COLORS.roseText },
  startStepCurrentText: { color: HOME_COLORS.roseText },
  startStepTitle: { fontFamily: fonts.semibold, fontSize: 13, color: HOME_COLORS.text },
  startStepTitleCurrent: { color: HOME_COLORS.roseText },
  startStepDetail: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: HOME_COLORS.muted, marginTop: 1 },
  backgroundGlow: { position: 'absolute', left: -16, right: -16, bottom: 0, height: 360 },
  skeleton: { backgroundColor: '#EEEAE0' },
});
