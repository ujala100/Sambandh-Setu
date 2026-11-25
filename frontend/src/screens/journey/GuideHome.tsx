import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Connections } from '../../api';
import { useLoad } from '../../hooks/useAsync';
import { useLayout } from '../../hooks/useLayout';
import { colors, fonts, radius, space } from '../../theme';
import { Avatar, Button, Card, EmptyState, ErrorState, IconButton, JourneyStepper, Screen, SectionTitle, Skeleton, TextLink } from '../../ui';
import { VerifiedTick } from '../../components/People';
import { nameAge } from '../../utils/format';

const HELP = [
  { key: 'help_me_understand', title: 'Understand', text: "Learn about each other's values and lifestyle.", icon: 'book-outline', tint: 'green' },
  { key: 'reflect', title: 'Reflect', text: 'Explore your thoughts and feelings privately.', icon: 'heart-outline', tint: 'green' },
  { key: 'conversation_ideas', title: 'Discuss', text: 'Get conversation ideas for important topics.', icon: 'chatbubbles-outline', tint: 'green' },
  { key: 'privacy_safety', title: 'Navigate', text: 'Stay informed with privacy, safety and helpful guidance.', icon: 'compass-outline', tint: 'green' },
] as const;

const TIPS = [
  { title: 'Be Open', text: 'Share your thoughts honestly.', icon: 'people-outline' },
  { title: 'Be Respectful', text: "Value each other's perspectives.", icon: 'heart-outline' },
  { title: 'Take Your Time', text: 'There is no rush to move ahead.', icon: 'time-outline' },
  { title: 'Use Setu Guide', text: 'Get suggestions when you need them.', icon: 'sparkles-outline' },
] as const;

/** The middle tab: "Setu Guide" journey hub. */
export default function GuideHome({ navigation }: any) {
  const { wide } = useLayout();
  const { data, error, loading, reload, refreshing, refresh } = useLoad(async () => {
    const list = await Connections.list();
    const c = list.active[0];
    return { count: list.active.length, journey: c ? await Connections.journey(c.id) : null };
  });
  const j = data?.journey;
  const current = j?.stages.find((s) => s.status === 'current');
  const openHelp = (key: string) => {
    if (key === 'reflect' && j && current?.key === 'reflect') navigation.navigate('Reflect', { connectionId: j.connection.id, mode: 'intro' });
    else navigation.navigate('GuideChat', { connectionId: j?.connection.id, intent: key === 'reflect' ? 'help_me_understand' : key });
  };

  const rail = (
    <>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name="add" size={18} color={colors.navy} /><Text style={styles.h}>Setu Guide AI</Text></View>
            <Text style={[styles.body, { marginVertical: 8 }]}>Chat with Setu Guide for personalised guidance, conversation ideas and insights.</Text>
            <Button title="Chat with Setu Guide" variant="outline" size="sm" arrow full={false} onPress={() => navigation.navigate('GuideChat', { connectionId: j?.connection.id })} />
          </View>
          <Image source={require('../../../assets/illustrations/guide-robot.png')} style={{ width: 90, height: 82 }} resizeMode="contain" />
        </View>
      </Card>
      {j ? (
        <Card>
          <Text style={styles.h}>Your Journey Progress</Text>
          <Text style={[styles.body, { marginBottom: 12 }]}>A step-by-step guide to build a meaningful connection.</Text>
          {j.stages.map((s, i) => (
            <View key={s.key} style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              {s.status === 'completed' ? <Ionicons name="checkmark-circle" size={22} color={colors.navy} /> : (
                <View style={[styles.num, s.status === 'current' && { backgroundColor: colors.primary, borderColor: colors.primary }]}><Text style={[styles.numText, s.status === 'current' && { color: '#fff' }]}>{i + 1}</Text></View>
              )}
              <View style={{ flex: 1 }}><Text style={[styles.stageT, s.status === 'current' && { color: colors.primary }]}>{s.title}</Text><Text style={styles.small}>{s.short}</Text></View>
              <Text style={[styles.small, s.status === 'completed' && { color: colors.success }, s.status === 'current' && { color: colors.primary, fontFamily: fonts.semibold }]}>{s.status === 'completed' ? 'Completed' : s.status === 'current' ? 'Current' : 'Upcoming'}</Text>
            </View>
          ))}
          <View style={styles.note}><Ionicons name="infinite" size={16} color={colors.navy} /><Text style={[styles.small, { flex: 1 }]}>You can pause, take more time, or revisit any stage. There is no rush.</Text></View>
        </Card>
      ) : null}
    </>
  );

  return (
    <Screen variant="none" tab aside={wide ? rail : undefined} refreshing={refreshing} onRefresh={refresh}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: space.lg }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} accessibilityRole="header">Setu Guide</Text>
          <Text style={styles.body}>Your companion for a thoughtful and meaningful journey.</Text>
        </View>
        {!wide ? <IconButton icon="notifications-outline" label="Notifications" onPress={() => navigation.navigate('Notifications')} /> : null}
      </View>
      <View style={styles.banner}>
        <View style={{ flex: 1, padding: wide ? 28 : 18 }}>
          <Text style={styles.bannerT}>Build understanding.{'\n'}At your own pace.</Text>
          <Text style={[styles.body, { marginTop: 8 }]}>Get guidance, conversation ideas and helpful insights to know each other better.</Text>
          {!wide ? <TextLink title="Chat with Setu Guide" arrow size={13} onPress={() => navigation.navigate('GuideChat', { connectionId: j?.connection.id })} style={{ marginTop: 6 }} /> : null}
        </View>
        <Image source={require('../../../assets/illustrations/guide-hood.png')} style={{ width: wide ? 150 : 104, height: wide ? 170 : 118, alignSelf: 'flex-end' }} resizeMode="contain" accessibilityIgnoresInvertColors />
      </View>

      <SectionTitle title="Your Active Journey" action={data?.count ? 'See all' : undefined} onAction={() => navigation.navigate('Connections', { tab: 'active' })} style={{ marginTop: space.xl }} />
      {loading && !data ? <Skeleton height={260} radius={16} /> : error && !data ? <ErrorState message={error} onRetry={reload} /> : j && current ? (
        <Card>
          <Pressable onPress={() => navigation.navigate('Journey', { connectionId: j.connection.id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} accessibilityRole="button" accessibilityLabel={`Your journey with ${j.connection.person.name}`}>
            <Avatar uri={j.connection.person.photoUrl} name={j.connection.person.name} size={48} online={j.connection.person.online} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Text style={styles.name}>{nameAge(j.connection.person)}</Text>{j.connection.person.verified ? <VerifiedTick size={15} /> : null}</View>
              <Text style={styles.small}>{[j.connection.person.profession, j.connection.person.location?.split(',')[0]].filter(Boolean).join(' · ')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.faint} />
          </Pressable>
          <View style={{ marginVertical: space.lg }}><JourneyStepper stages={j.stages} compact showDesc={false} /></View>
          <View style={styles.current}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <View style={styles.bulb}><Ionicons name="bulb-outline" size={20} color={colors.navy} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.over}>CURRENT STAGE</Text>
                <Text style={styles.curT}>{current.title}</Text>
                <Text style={styles.body}>{current.description}</Text>
              </View>
            </View>
            <Button title="Continue Journey" arrow onPress={() => navigation.navigate('Journey', { connectionId: j.connection.id })} style={{ marginTop: space.md }} />
          </View>
        </Card>
      ) : (
        <Card><EmptyState icon="infinite" tint="green" title="No active journey yet" text="Your Setu journey begins when you and someone both agree to connect." action="Explore Discover" onAction={() => navigation.navigate('Connections', { tab: 'discover' })} /></Card>
      )}

      <Text style={[styles.h, { marginTop: space.xl, marginBottom: space.md }]}>How Setu Guide can help you</Text>
      <View style={styles.helpGrid}>
        {HELP.map((h) => (
          <Pressable key={h.key} onPress={() => openHelp(h.key)} accessibilityRole="button" accessibilityLabel={`${h.title}. ${h.text}`} style={({ hovered }: any) => [styles.help, hovered && { borderColor: colors.primaryLine }]}>
            <View style={[styles.helpIcon, { backgroundColor: colors.tint[h.tint].bg }]}><Ionicons name={h.icon} size={18} color={colors.tint[h.tint].fg} /></View>
            <View style={{ flex: 1 }}><Text style={styles.helpT}>{h.title}</Text><Text style={styles.small}>{h.text}</Text></View>
          </Pressable>
        ))}
      </View>
      {wide ? (
        <>
          <Text style={[styles.h, { marginTop: space.xl, marginBottom: space.md }]}>Tips for a meaningful journey</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {TIPS.map((t) => (
              <View key={t.title} style={styles.tip}><Ionicons name={t.icon} size={20} color={colors.navy} /><Text style={styles.helpT}>{t.title}</Text><Text style={styles.small}>{t.text}</Text></View>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.bold, fontSize: 28, color: colors.text },
  h: { fontFamily: fonts.semibold, fontSize: 16.5, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 20, color: colors.muted },
  small: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.muted },
  banner: { flexDirection: 'row', backgroundColor: colors.greenSurface, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.primaryLine },
  bannerT: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 27, color: colors.navy },
  name: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.text },
  current: { backgroundColor: colors.primarySoft, borderRadius: radius.card, padding: 16, borderWidth: 1, borderColor: colors.primaryLine },
  bulb: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  over: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.8, color: colors.muted },
  curT: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, marginVertical: 2 },
  helpGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  help: { width: '48%' as any, flexGrow: 1, flexDirection: 'row', gap: 10, backgroundColor: '#fff', borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: 14, minHeight: 84 },
  helpIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  helpT: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  tip: { flex: 1, backgroundColor: '#fff', borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 6 },
  num: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.muted },
  stageT: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.text },
  note: { flexDirection: 'row', gap: 8, backgroundColor: colors.primarySoft, borderRadius: radius.sm, padding: 10, marginTop: 4 },
});
