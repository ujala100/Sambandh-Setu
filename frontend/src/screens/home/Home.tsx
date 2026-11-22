import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Home as HomeApi, HomeData } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useLoad } from '../../hooks/useAsync';
import { useLayout } from '../../hooks/useLayout';
import { colors, fonts, radius, shadow, space } from '../../theme';
import { Avatar, Button, Card, EmptyState, ErrorState, IconButton, JourneyStepper, Screen, SectionTitle, Skeleton, StatePill, TextLink } from '../../ui';
import { greeting, nameAge } from '../../utils/format';

const ATTN_ICON: Record<string, { icon: any; tint: keyof typeof colors.tint }> = {
  requests: { icon: 'person-add-outline', tint: 'blue' },
  family: { icon: 'document-text-outline', tint: 'red' },
  journey: { icon: 'infinite', tint: 'purple' },
  chat: { icon: 'chatbubble-ellipses-outline', tint: 'green' },
  photo: { icon: 'camera-outline', tint: 'amber' },
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
  const { user } = useAuth();
  const { wide } = useLayout();
  const { data, error, loading, refreshing, refresh, reload } = useLoad(() => HomeApi.get());
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
        <Text style={styles.bannerTitle} accessibilityRole="header">{greeting()},{'\n'}<Text style={{ color: colors.primary }}>{first}</Text></Text>
        <Text style={styles.bannerSub}>Wishing you meaningful conversations and new possibilities today.</Text>
      </View>
      <Image source={require('../../../assets/illustrations/home-banner.png')} style={{ width: 300, height: 220, alignSelf: 'flex-end' }} resizeMode="contain" accessibilityIgnoresInvertColors />
    </View>
  ) : (
    <View style={styles.mobileHead}>
      <View style={{ flex: 1 }}>
        <Text style={styles.greet} accessibilityRole="header">{greeting()}, <Text style={{ color: colors.primary }}>{first}</Text></Text>
        <Text style={styles.greetSub}>Wishing you meaningful conversations and new possibilities today.</Text>
      </View>
      <IconButton icon="notifications-outline" label="Notifications" onPress={() => navigation.navigate('Notifications')} />
      <Pressable onPress={() => navigation.navigate('Profile')} accessibilityRole="button" accessibilityLabel="My profile"><Avatar uri={user?.photoUrl} name={user?.name} size={40} /></Pressable>
    </View>
  );

  const rail = (
    <>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}><Ionicons name="heart" size={20} color="#E5484D" /><Text style={styles.cardH}>Your Preferences</Text></View>
        <Text style={styles.body}>{data?.hasPreferences ? summary(user) : 'Tell us what you are looking for so we can suggest more relevant people.'}</Text>
        <Button title={data?.hasPreferences ? 'Edit Preferences' : 'Set Preferences'} variant="outline" size="sm" onPress={() => navigation.navigate('PreferencesReview')} style={{ marginTop: space.md }} />
      </Card>
      <GuideCard onPress={() => navigation.navigate('GuideChat', { connectionId: data?.current?.connectionId })} />
    </>
  );

  return (
    <Screen variant="none" tab aside={rail} refreshing={refreshing} onRefresh={refresh}>
      {greetingBlock}
      {loading && !data ? (
        <View style={{ gap: 16 }}><Skeleton height={150} radius={16} /><Skeleton height={120} radius={16} /><Skeleton height={180} radius={16} /></View>
      ) : error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : data ? (
        <>
          <SectionTitle title="Current Connection" icon="people-outline" action={data.activeCount ? 'View all' : undefined} onAction={() => navigation.navigate('Connections', { tab: 'active' })} />
          {data.current ? <CurrentConnection data={data} navigation={navigation} /> : (
            <Card><EmptyState icon="people-outline" tint="blue" title="No active connection yet" text="When you and someone both agree to connect, your journey together appears here." action="Explore Discover" onAction={() => navigation.navigate('Connections', { tab: 'discover' })} /></Card>
          )}

          <SectionTitle title="Needs Your Attention" icon="notifications-outline" style={{ marginTop: space.xl }} />
          {data.attention.length ? (
            <View style={wide ? { flexDirection: 'row', flexWrap: 'wrap', gap: 16 } : { gap: 10 }}>
              {data.attention.map((a) => {
                const meta = ATTN_ICON[a.icon] || ATTN_ICON.requests;
                return (
                  <Card key={a.key} onPress={() => openAttention(a)} style={[styles.attn, wide && { width: '48.5%' as any }]} accessibilityLabel={`${a.title}. ${a.description}`}>
                    <View style={[styles.attnIcon, { backgroundColor: colors.tint[meta.tint].bg }]}><Ionicons name={meta.icon} size={20} color={colors.tint[meta.tint].fg} /></View>
                    <View style={{ flex: 1 }}><Text style={styles.attnTitle}>{a.title}</Text><Text style={styles.attnText}>{a.description}</Text></View>
                    <Ionicons name="chevron-forward" size={18} color={colors.faint} />
                  </Card>
                );
              })}
            </View>
          ) : <Card><EmptyState icon="checkmark-done-outline" tint="green" title="You're all caught up" text="Nothing needs your attention right now." /></Card>}

          <SectionTitle title="Your Journey" icon="walk-outline" action={data.current ? 'View details' : undefined} onAction={() => data.current && navigation.navigate('Journey', { connectionId: data.current.connectionId })} style={{ marginTop: space.xl }} />
          <Card>
            <JourneyStepper stages={windowStages(data)} />
            <View style={styles.callout}>
              <Ionicons name="time-outline" size={22} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.calloutTitle}>{data.current ? BLURB[data.current.stage]?.title : 'Your journey starts with a connection.'}</Text>
                <Text style={styles.body}>{data.current ? BLURB[data.current.stage]?.text : 'Send respectful interest to someone who shares your values. When you both agree, the Connect stage begins.'}</Text>
              </View>
            </View>
          </Card>

          {!wide ? (
            <>
              <View style={{ height: space.xl }} />
              <GuideCard onPress={() => navigation.navigate('GuideChat', { connectionId: data.current?.connectionId })} />
              <Card style={{ marginTop: space.lg, flexDirection: 'row', alignItems: 'center' }} onPress={() => navigation.navigate('Connections', { tab: 'discover' })} accessibilityLabel="Discover. Find meaningful connections">
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name="compass" size={20} color={colors.primary} /><Text style={styles.cardH}>Discover</Text></View>
                  <Text style={[styles.body, { marginVertical: 6 }]}>Meet people who share your values, goals and future hopes.</Text>
                  <Text style={styles.link}>Find meaningful connections →</Text>
                </View>
                <Image source={require('../../../assets/illustrations/discover-teaser.png')} style={{ width: 110, height: 76 }} resizeMode="contain" />
              </Card>
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
    <Card onPress={() => navigation.navigate('PersonProfile', { userId: c.person.id })} accessibilityLabel={`${nameAge(c.person)}. Open profile`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Avatar uri={c.person.photoUrl} name={c.person.name} size={wide ? 112 : 92} rounded online={c.person.online} />
        <View style={{ flex: 1 }}>
          <StatePill state="current" label={c.stageTitle} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <Text style={styles.name}>{nameAge(c.person)}</Text>
            {c.person.verified ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} accessibilityLabel="Verified" /> : null}
          </View>
          {c.person.location ? <View style={styles.meta}><Ionicons name="location-outline" size={14} color={colors.muted} /><Text style={styles.metaText}>{c.person.location}</Text></View> : null}
          {c.person.profession ? <View style={styles.meta}><Ionicons name="briefcase-outline" size={14} color={colors.muted} /><Text style={styles.metaText}>{c.person.profession}</Text></View> : null}
          {!wide ? <Button title="Continue" arrow size="sm" full={false} onPress={() => navigation.navigate('Journey', { connectionId: c.connectionId })} style={{ marginTop: 10 }} /> : null}
        </View>
        {wide ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Button title="Continue" arrow full={false} onPress={() => navigation.navigate('Journey', { connectionId: c.connectionId })} />
            {c.chatId ? <IconButton icon="chatbubble-ellipses-outline" label="Open chat" color={colors.muted} onPress={() => navigation.navigate('ChatThread', { chatId: c.chatId })} /> : null}
          </View>
        ) : null}
      </View>
    </Card>
  );
}

function GuideCard({ onPress }: { onPress: () => void }) {
  return (
    <Card tone="soft" style={{ flexDirection: 'row', alignItems: 'center', ...shadow.card }}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name="sparkles-outline" size={20} color={colors.primary} /><Text style={styles.cardH}>Setu Guide</Text></View>
        <Text style={[styles.attnTitle, { marginTop: 8 }]}>Need help with your next step?</Text>
        <Text style={[styles.body, { marginVertical: 6 }]}>Get personalised guidance on conversations, family involvement and next steps.</Text>
        <Button title="Ask Setu Guide" variant="outline" size="sm" arrow full={false} onPress={onPress} />
      </View>
      <Image source={require('../../../assets/illustrations/guide-mascot.png')} style={{ width: 84, height: 100 }} resizeMode="contain" accessibilityIgnoresInvertColors />
    </Card>
  );
}

const styles = StyleSheet.create({
  mobileHead: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: space.xl, backgroundColor: '#EAF2FE', marginHorizontal: -16, marginTop: -16, padding: 16, paddingTop: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  greet: { fontFamily: fonts.display, fontSize: 24, color: colors.text },
  greetSub: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted, marginTop: 4 },
  banner: { flexDirection: 'row', backgroundColor: '#DCEAFB', borderRadius: 20, overflow: 'hidden', marginBottom: space.xl, minHeight: 220 },
  bannerTitle: { fontFamily: fonts.bold, fontSize: 34, lineHeight: 42, color: colors.text },
  bannerSub: { fontFamily: fonts.regular, fontSize: 16, color: colors.textSoft, marginTop: 10 },
  name: { fontFamily: fonts.bold, fontSize: 19, color: colors.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  metaText: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.muted },
  attn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  attnIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  attnTitle: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.text },
  attnText: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  callout: { flexDirection: 'row', gap: 12, backgroundColor: colors.primarySoft, borderRadius: radius.card, padding: 14, marginTop: space.lg, borderWidth: 1, borderColor: colors.primaryLine },
  calloutTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary, marginBottom: 2 },
  cardH: { fontFamily: fonts.semibold, fontSize: 17, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 20, color: colors.muted },
  link: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.primary },
});
