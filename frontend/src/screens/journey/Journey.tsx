import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Connections, Journey as JourneyT, errorMessage } from '../../api';
import { useLoad } from '../../hooks/useAsync';
import { useLayout } from '../../hooks/useLayout';
import { colors, fonts, radius, space } from '../../theme';
import { Avatar, Button, Card, CheckItem, ConfirmDialog, ErrorState, InfoNote, ListRow, Loading, ProgressBar, Screen, StageList, StatusDot, UnderlineTabs, useToast } from '../../ui';
import { ActionMenu, VerifiedTick } from '../../components/People';
import { nameAge } from '../../utils/format';

function useConnectionMenu(j: JourneyT | null | undefined, navigation: any, reload: () => void) {
  const toast = useToast();
  const [confirm, setConfirm] = useState<'pause' | 'close' | null>(null);
  if (!j) return { menu: null, dialog: null };
  const c = j.connection;
  const act = async (kind: 'pause' | 'resume' | 'close') => {
    try {
      if (kind === 'pause') await Connections.pause(c.id); else if (kind === 'resume') await Connections.resume(c.id); else await Connections.close(c.id);
      toast.show(kind === 'pause' ? 'Connection paused' : kind === 'resume' ? 'Connection resumed' : 'Connection closed respectfully', 'info');
      setConfirm(null);
      if (kind === 'close') navigation.navigate('Main', { screen: 'Connections', params: { tab: 'active' } }); else reload();
    } catch (e) { toast.show(errorMessage(e), 'error'); }
  };
  const menu = (
    <ActionMenu actions={[
      ...(c.chatId ? [{ label: 'Open chat', icon: 'chatbubble-ellipses-outline' as const, onPress: () => navigation.navigate('ChatThread', { chatId: c.chatId }) }] : []),
      { label: 'View profile', icon: 'person-outline', onPress: () => navigation.navigate('PersonProfile', { userId: c.person.id }) },
      c.status === 'active' ? { label: 'Pause connection', icon: 'pause-circle-outline', onPress: () => setConfirm('pause') } : { label: 'Resume connection', icon: 'play-circle-outline', onPress: () => act('resume') },
      { label: 'Close respectfully', icon: 'close-circle-outline', danger: true, onPress: () => setConfirm('close') },
    ]} />
  );
  const dialog = (
    <ConfirmDialog visible={!!confirm} title={confirm === 'pause' ? 'Pause this connection?' : 'Close this connection?'}
      message={confirm === 'pause' ? 'You can resume at any time. There is no rush.' : 'Your chat and journey will end. They will not see a reason.'}
      confirmLabel={confirm === 'pause' ? 'Pause' : 'Close connection'} destructive={confirm === 'close'} tint={confirm === 'pause' ? 'amber' : undefined} icon={confirm === 'pause' ? 'pause' : 'close'}
      onCancel={() => setConfirm(null)} onConfirm={() => confirm && act(confirm)} />
  );
  return { menu, dialog };
}

/** "Your Journey with Rohan" (App active journey page / Web Active Journey). */
export function Journey({ route, navigation }: any) {
  const id = route.params?.connectionId;
  const { wide } = useLayout();
  const toast = useToast();
  const { data: j, error, loading, reload, refreshing, refresh } = useLoad(() => Connections.journey(id), [id]);
  const { menu, dialog } = useConnectionMenu(j, navigation, reload);
  const current = j?.stages.find((s) => s.status === 'current');
  const openStage = (key: string) => (key === 'reflect' || key === 'reflect_again' ? navigation.navigate('Reflect', { connectionId: id, mode: 'intro', stage: key }) : navigation.navigate('Stage', { connectionId: id, stage: key }));
  const name = j?.connection.person.name || '';

  const rail = j ? (
    <>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Ionicons name="star" size={15} color={colors.primary} /><Text style={styles.h}>Need guidance?</Text></View>
            <Text style={[styles.body, { marginVertical: 8 }]}>Chat with Setu Guide AI for personalised guidance, conversation ideas and insights.</Text>
            <Button title="Chat with Setu Guide" variant="outline" size="sm" arrow full={false} onPress={() => navigation.navigate('GuideChat', { connectionId: id })} />
          </View>
          <Image source={require('../../../assets/illustrations/guide-robot.png')} style={{ width: 80, height: 74 }} resizeMode="contain" />
        </View>
      </Card>
      <Card>
        <Text style={styles.h}>Your progress</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12 }}>
          <View style={styles.ring}><Text style={styles.ringText}>{j.progress.completed}/{j.progress.total}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.small}>{j.progress.completed} of {j.progress.total} stages completed</Text>
            <ProgressBar value={j.progress.percent} style={{ marginTop: 6 }} />
          </View>
          <Text style={styles.h}>{j.progress.percent}%</Text>
        </View>
      </Card>
      {current ? (
        <Card>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Ionicons name="bulb-outline" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.small}>Current Stage</Text>
              <Text style={styles.h}>{current.title}</Text>
              <Text style={[styles.body, { marginTop: 4 }]}>{current.short}</Text>
            </View>
          </View>
          <Button title={`Continue to stage ${current.index + 1}`} arrow onPress={() => openStage(current.key)} style={{ marginTop: space.md }} disabled={j.connection.status !== 'active'} />
        </Card>
      ) : null}
      <Card>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 }}><Ionicons name="flash-outline" size={16} color={colors.primary} /><Text style={styles.h}>Stage Tips</Text></View>
        <CheckItem text="Take time to think about your thoughts and feelings." />
        <CheckItem text="You can write down your reflections privately." />
        <CheckItem text="Setu Guide will help you with questions and insights." />
      </Card>
    </>
  ) : null;

  return (
    <Screen title={j ? `Your Journey with ${name}` : 'Your Journey'} variant="center" back="Main" aside={rail} refreshing={refreshing} onRefresh={refresh} maxWidth={760}>
      {loading && !j ? <Loading /> : error && !j ? <ErrorState message={error} onRetry={reload} /> : j ? (
        <View style={{ gap: space.lg }}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar uri={j.connection.person.photoUrl} name={name} size={56} online={j.connection.person.online} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Text style={styles.name}>{nameAge(j.connection.person)}</Text>{j.connection.person.verified ? <VerifiedTick size={15} /> : null}</View>
              <Text style={styles.small}>{[j.connection.person.profession, j.connection.person.location].filter(Boolean).join(' · ')}</Text>
              <View style={{ marginTop: 4 }}><StatusDot status={j.connection.status === 'active' ? 'connected' : 'pending'} label={j.connection.status === 'active' ? 'Connected' : j.connection.status === 'paused' ? 'Paused' : 'Closed'} /></View>
            </View>
            {menu}
          </Card>
          {j.connection.status === 'paused' ? (
            <InfoNote tone="amber" icon="pause-circle" title={j.connection.pausedByMe ? 'You paused this connection' : `${name} paused this connection`} text={j.connection.pausedByMe ? 'Resume whenever you are ready to continue.' : 'They are taking some time. There is no rush.'}>
              {j.connection.pausedByMe ? <Button title="Resume connection" size="sm" full={false} style={{ marginTop: 10 }} onPress={async () => { try { await Connections.resume(id); reload(); } catch (e) { toast.show(errorMessage(e), 'error'); } }} /> : null}
            </InfoNote>
          ) : null}
          <View style={styles.banner}>
            <View style={{ flex: 1, padding: 18 }}>
              <Text style={styles.bannerT}>Every meaningful relationship grows step by step.</Text>
              <Text style={[styles.small, { marginTop: 6 }]}>Take the time you need. Setu Guide is here to support you.</Text>
            </View>
            <Image source={require('../../../assets/illustrations/journey-mountains.png')} style={{ width: 130, height: 110, alignSelf: 'flex-end' }} resizeMode="contain" accessibilityIgnoresInvertColors />
          </View>
          <Card>
            <StageList stages={j.stages} onOpen={j.connection.status === 'active' ? openStage : undefined} />
          </Card>
          <View style={styles.note}><Ionicons name="infinite" size={18} color={colors.primary} /><Text style={[styles.body, { flex: 1 }]}>You can pause, take more time, or revisit any stage. There is no rush.</Text></View>
          {!wide && current && j.connection.status === 'active' ? <Button title={`Continue: ${current.title}`} arrow onPress={() => openStage(current.key)} /> : null}
        </View>
      ) : null}
      {dialog}
    </Screen>
  );
}

const STAGE_ICON: Record<string, any> = { connect: 'link-outline', understand: 'bulb-outline', reflect: 'heart-outline', discuss: 'chatbubbles-outline', agree: 'hand-left-outline', family: 'people-outline', reflect_again: 'refresh-outline', decision: 'flag-outline' };

/** "Stage 2: Understand" with Guidance / For You / Activities / Resources. */
export function Stage({ route, navigation }: any) {
  const { connectionId, stage } = route.params || {};
  const toast = useToast();
  const [tab, setTab] = useState<'guidance' | 'you' | 'activities' | 'resources'>('guidance');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data, error, loading, reload } = useLoad(async () => {
    const [content, journey] = await Promise.all([Connections.stage(stage), Connections.journey(connectionId)]);
    return { content, journey };
  }, [connectionId, stage]);
  const s = data?.journey.stages.find((x) => x.key === stage);
  const partner = data?.journey.connection.person.name || 'your partner';

  const complete = async () => {
    setBusy(true);
    try {
      const r = await Connections.completeStage(connectionId, stage);
      setConfirm(false);
      toast.show(r.advanced ? `You both moved to the next stage` : `Marked complete. Waiting for ${partner}.`);
      navigation.navigate('Journey', { connectionId });
    } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setBusy(false); }
  };
  const ask = (intent: string) => navigation.navigate('GuideChat', { connectionId, intent });

  return (
    <Screen title={data ? `Stage ${data.content.index + 1}: ${data.content.title}` : 'Stage'} variant="center" back="Main" maxWidth={760}
      footer={s && s.status === 'current' && !s.myDone ? <Button title="I've completed this stage" icon="checkmark-circle-outline" onPress={() => setConfirm(true)} /> : s?.myDone && s.status === 'current' ? <InfoNote icon="time-outline" text={`You've completed this stage. It finishes when ${partner} completes it too.`} /> : undefined}>
      {loading && !data ? <Loading /> : error && !data ? <ErrorState message={error} onRetry={reload} /> : data ? (
        <View>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: space.lg }}>
            <View style={styles.stageIcon}><Ionicons name={STAGE_ICON[stage] || 'ellipse-outline'} size={26} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stageTitle}>Stage {data.content.index + 1}: {data.content.title}</Text>
              <Text style={styles.body}>{data.content.short}</Text>
            </View>
          </View>
          <UnderlineTabs value={tab} onChange={setTab} options={[{ key: 'guidance', label: 'Guidance' }, { key: 'you', label: 'For You' }, { key: 'activities', label: 'Activities' }, { key: 'resources', label: 'Resources' }]} style={{ marginBottom: space.lg }} />
          {tab === 'guidance' ? (
            <View style={{ gap: space.lg }}>
              <Card tone="soft">
                <Text style={styles.h}>What does this stage mean?</Text>
                <Text style={[styles.body, { marginTop: 6 }]}>{data.content.meaning}</Text>
                <Image source={require('../../../assets/illustrations/beyond-usual.png')} style={{ width: 150, height: 110, alignSelf: 'center', marginTop: 12 }} resizeMode="contain" />
              </Card>
              <View>
                <Text style={[styles.h, { marginBottom: 10 }]}>Suggested for you</Text>
                <Card padded={false}>
                  {data.content.suggestions.map((x, i) => (
                    <ListRow key={x.title} icon={['chatbubbles-outline', 'create-outline', 'sparkles-outline'][i % 3] as any} tint={(['blue', 'blue', 'purple'] as const)[i % 3]} title={x.title} subtitle={x.text} onPress={() => ask(i === 0 ? 'conversation_ideas' : i === 1 ? 'help_me_understand' : 'next_steps')} last={i === data.content.suggestions.length - 1} />
                  ))}
                </Card>
              </View>
              <Card style={{ backgroundColor: '#EEF9F3', borderColor: '#CDEFDD' }}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 }}><Ionicons name="shield-checkmark" size={20} color={colors.navy} /><Text style={styles.h}>Helpful Reminders</Text></View>
                <CheckItem text="Be yourself and take your time." />
                <CheckItem text="You can skip any topic that you're not ready for." />
                <CheckItem text="Setu Guide suggests topics, but you decide what to discuss." />
              </Card>
            </View>
          ) : null}
          {tab === 'you' && s ? (
            <View style={{ gap: space.lg }}>
              <Card>
                <Text style={styles.h}>Where you both are</Text>
                <View style={{ marginTop: 10, gap: 8 }}>
                  <View style={styles.statusRow}><Ionicons name={s.myDone ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={s.myDone ? colors.navy : colors.faint} /><Text style={styles.body}>You: {s.myDone ? 'completed' : 'in progress'}</Text></View>
                  <View style={styles.statusRow}><Ionicons name={s.partnerDone ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={s.partnerDone ? colors.navy : colors.faint} /><Text style={styles.body}>{partner}: {s.partnerDone ? 'completed' : 'in progress'}</Text></View>
                </View>
              </Card>
              <InfoNote text={data.content.description} />
              <Button title="Ask Setu Guide about this stage" variant="secondary" icon="sparkles-outline" onPress={() => ask('help_me_understand')} />
            </View>
          ) : null}
          {tab === 'activities' ? (
            <Card padded={false}>{data.content.activities.map((a, i) => <ListRow key={a} icon="checkbox-outline" tint="green" title={a} last={i === data.content.activities.length - 1} />)}</Card>
          ) : null}
          {tab === 'resources' ? (
            <Card padded={false}>{data.content.resources.map((a, i) => <ListRow key={a} icon="book-outline" tint="purple" title={a} subtitle="Ask Setu Guide to explain" onPress={() => ask('help_me_understand')} last={i === data.content.resources.length - 1} />)}</Card>
          ) : null}
        </View>
      ) : null}
      <ConfirmDialog visible={confirm} icon="checkmark-circle-outline" tint="green" title="Complete this stage?"
        message={`The journey moves to the next stage when both you and ${partner} have completed it. You can still talk freely in the meantime.`}
        confirmLabel="Mark as complete" busy={busy} onCancel={() => setConfirm(false)} onConfirm={complete} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  h: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 20, color: colors.muted },
  small: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted },
  name: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  banner: { flexDirection: 'row', backgroundColor: '#E6EEFB', borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.primaryLine },
  bannerT: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 24, color: colors.text },
  note: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.card, padding: 14 },
  ring: { width: 56, height: 56, borderRadius: 28, borderWidth: 4, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  ringText: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  stageIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  stageTitle: { fontFamily: fonts.bold, fontSize: 19, color: colors.text },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
