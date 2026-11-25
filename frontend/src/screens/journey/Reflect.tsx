import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Answer, Connections, Question, ReflectData, errorMessage } from '../../api';
import { useLayout } from '../../hooks/useLayout';
import { colors, fonts, radius, space } from '../../theme';
import { Avatar, Button, ButtonRow, Card, CheckItem, CheckRow, ErrorState, FilterPills, InfoNote, Loading, ProgressBar, RadioRow, ResultView, Scale, Screen, SelectField, StatePill, TextField, TextLink, useToast } from '../../ui';
import { useAuth } from '../../context/AuthContext';

type Mode = 'intro' | 'privacy' | 'question' | 'done' | 'answers';
const OTHER = 'Other (please specify)';

const sharingOptions = (name: string) => [
  { value: 'keep_private', label: 'Keep private', description: 'Only you can see this answer.' },
  { value: 'share', label: `Share with ${name}`, description: `${name} can see this answer after you submit.` },
  { value: 'share_later', label: 'Share later', description: 'Decide after completing all questions.' },
];

const fmt = (q: Question, a?: { value?: any; otherText?: string }) => {
  if (!a || a.value === undefined || a.value === null) return '';
  if (q.type === 'scale') return `${a.value} / ${q.max}${a.value === q.max ? ` · ${q.maxLabel}` : a.value === q.min ? ` · ${q.minLabel}` : ''}`;
  const v = Array.isArray(a.value) ? a.value : [a.value];
  return v.map((x: string) => (x === OTHER && a.otherText ? a.otherText : x)).join(', ');
};

export default function Reflect({ route, navigation }: any) {
  const { connectionId, stage = 'reflect' } = route.params || {};
  const mode: Mode = route.params?.mode || 'intro';
  const index = Math.max(0, Number(route.params?.index) || 0);
  const [data, setData] = useState<ReflectData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => Connections.reflect(connectionId, stage).then(setData).catch((e) => setError(errorMessage(e)));
  useEffect(() => { load(); }, [connectionId, stage]);
  const go = (m: Mode, extra: any = {}) => navigation.setParams({ mode: m, ...extra });

  if (error && !data) return <Screen title="Reflect" back="Main"><ErrorState message={error} onRetry={load} /></Screen>;
  if (!data) return <Screen title="Reflect" back="Main"><Loading /></Screen>;
  const partner = data.partner.name;

  if (mode === 'intro') return <Intro data={data} partner={partner} onStart={() => go(Object.keys(data.answers).length ? 'question' : 'privacy', { index: Math.min(Object.keys(data.answers).length, data.total - 1) })} onAnswers={() => go('answers')} />;
  if (mode === 'privacy') return <Privacy partner={partner} onContinue={(s) => go('question', { index: 0, sharing: s })} />;
  if (mode === 'done') return <Done partner={partner} navigation={navigation} connectionId={connectionId} onAnswers={() => go('answers')} />;
  if (mode === 'answers') return <Answers data={data} partner={partner} connectionId={connectionId} stage={stage} onEdit={(i) => go('question', { index: i })} reload={load} navigation={navigation} />;
  return <QuestionStep key={index} data={data} setData={setData} index={Math.min(index, data.total - 1)} partner={partner} defaultSharing={route.params?.sharing || 'keep_private'}
    connectionId={connectionId} stage={stage} go={go} navigation={navigation} />;
}

function Intro({ data, partner, onStart, onAnswers }: { data: ReflectData; partner: string; onStart: () => void; onAnswers: () => void }) {
  const { wide } = useLayout();
  const answered = Object.keys(data.answers).length;
  const aside = (
    <Card>
      <Text style={styles.h}>Before you begin</Text>
      <Text style={[styles.body, { marginVertical: 8 }]}>This stage helps you understand yourself better so you can build a more meaningful connection with {partner}.</Text>
      {[['create-outline', 'Answer honestly', 'There are no right or wrong answers. Be open and true to yourself.'], ['eye-outline', 'Choose sharing per answer', `You can keep an answer private, share it with ${partner}, or decide later.`], ['time-outline', 'Take your time', 'You can save your progress and return anytime.']].map(([icon, t, d], i) => (
        <View key={t} style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
          <View style={{ flex: 1 }}><View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Ionicons name={icon as any} size={14} color={colors.primary} /><Text style={styles.t}>{t}</Text></View><Text style={styles.small}>{d}</Text></View>
        </View>
      ))}
    </Card>
  );
  return (
    <Screen title="Reflect" back="Main" aside={aside} maxWidth={720} variant={wide ? 'large' : 'center'}
      footer={<View style={{ gap: 10 }}><Button title={data.completed ? 'View my answers' : answered ? `Continue (${answered}/${data.total})` : 'Start Reflecting'} arrow onPress={data.completed ? onAnswers : onStart} />{answered && !data.completed ? <TextLink title="Review answers so far" style={{ alignSelf: 'center' }} onPress={onAnswers} /> : null}</View>}>
      <Card>
        <Image source={require('../../../assets/illustrations/reflect-girl.png')} style={{ width: 260, height: 143, alignSelf: 'center' }} resizeMode="contain" accessibilityIgnoresInvertColors />
        <Text style={[styles.title, { textAlign: 'center', marginTop: space.lg }]}>Take time for personal reflection</Text>
        <Text style={[styles.body, { textAlign: 'center', marginTop: 6 }]}>Think about your values, expectations, and what truly matters to you in a relationship.</Text>
        <View style={{ gap: 10, marginTop: space.xl }}>
          {[['shield-checkmark-outline', 'Your reflections are private by default.'], ['eye-outline', `Choose what to share with ${partner} later.`], ['document-text-outline', `There are ${data.total} questions in this stage.`], ['time-outline', 'Save your progress and return anytime.']].map(([icon, t]) => (
            <View key={t} style={styles.introRow}><View style={styles.introIcon}><Ionicons name={icon as any} size={16} color={colors.primary} /></View><Text style={styles.body}>{t}</Text></View>
          ))}
        </View>
      </Card>
    </Screen>
  );
}

function Privacy({ partner, onContinue }: { partner: string; onContinue: (s: string) => void }) {
  const [s, setS] = useState('keep_private');
  const icons: Record<string, any> = { keep_private: 'eye-off-outline', share: 'eye-outline', share_later: 'time-outline' };
  const aside = (
    <>
      <Card tone="soft"><Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} /><Text style={[styles.h, { marginTop: 8 }]}>Your Privacy Matters</Text><Text style={styles.body}>You are in control of what you share. There are no right or wrong answers. Be honest and open.</Text></Card>
      <Card style={{ backgroundColor: '#FFF8EC', borderColor: '#F3E1BD' }}><Ionicons name="bulb-outline" size={22} color="#C98A12" /><Text style={[styles.h, { marginTop: 8, marginBottom: 8 }]}>Tips for a Good Reflection</Text><CheckItem tone="blue" text="Take your time to think and answer." /><CheckItem tone="blue" text="Be honest about your preferences." /><CheckItem tone="blue" text="You can change your sharing choice anytime before submitting." /></Card>
      <Card style={{ backgroundColor: '#EEF9F3', borderColor: '#CDEFDD' }}><Ionicons name="lock-closed-outline" size={22} color={colors.navy} /><Text style={[styles.h, { marginTop: 8 }]}>Your Data is Safe</Text><Text style={styles.body}>Your answers are private and secure. We never share your information with anyone without your permission.</Text></Card>
    </>
  );
  return (
    <Screen title="Your Privacy, Your Choice" subtitle={`You can decide how each answer is shared with ${partner}.`} back="Main" aside={aside} maxWidth={720}
      footer={<Button title="Continue to Questions" arrow onPress={() => onContinue(s)} />}>
      <Card style={{ flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: space.lg }}>
        <View style={styles.lock}><Ionicons name="lock-closed" size={30} color="#fff" /></View>
        <View style={{ flex: 1 }}><Text style={styles.h}>You can decide how each answer is shared with {partner}.</Text><Text style={styles.body}>Choose a default now. You can change the choice for each answer.</Text></View>
      </Card>
      {sharingOptions(partner).map((o) => <RadioRow key={o.value} label={o.label} description={o.description} icon={icons[o.value]} selected={s === o.value} onPress={() => setS(o.value)} />)}
      <InfoNote icon="shield-checkmark" text="You can change the sharing choice for each answer. Your privacy is always respected." style={{ marginTop: space.md }} />
    </Screen>
  );
}

function QuestionStep({ data, setData, index, partner, defaultSharing, connectionId, stage, go, navigation }: { data: ReflectData; setData: (d: ReflectData) => void; index: number; partner: string; defaultSharing: string; connectionId: string; stage: string; go: (m: Mode, e?: any) => void; navigation: any }) {
  const q = data.questions[index];
  const prev = data.answers[q.key];
  const [value, setValue] = useState<any>(prev?.value ?? (q.type === 'multi' ? [] : q.type === 'scale' ? null : ''));
  const [otherText, setOtherText] = useState(prev?.otherText || '');
  const [sharing, setSharing] = useState<string>(prev?.sharing || defaultSharing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const last = index === data.total - 1;
  const valid = q.type === 'multi' ? value.length > 0 : q.type === 'scale' ? value !== null : q.type === 'text' ? String(value).trim().length > 0 : !!value;
  const needsOther = (Array.isArray(value) ? value.includes(OTHER) : value === OTHER) && !otherText.trim();

  const save = async (then: 'next' | 'exit') => {
    setError(null);
    if (!valid) { if (then === 'exit') return navigation.navigate('Journey', { connectionId }); return setError(q.type === 'text' ? 'Please write a short answer' : 'Please choose an answer'); }
    if (needsOther) return setError('Please tell us a little more');
    setBusy(true);
    try {
      await Connections.saveAnswer(connectionId, q.key, { value: q.type === 'text' ? String(value).trim() : value, otherText, sharing, stage });
      const answers = { ...data.answers, [q.key]: { value, otherText, sharing } as Answer };
      setData({ ...data, answers });
      if (then === 'exit') { toast.show('Progress saved'); navigation.navigate('Journey', { connectionId }); return; }
      if (!last) return go('question', { index: index + 1, sharing });
      if (Object.keys(answers).length < data.total) {
        const missing = data.questions.findIndex((x) => !answers[x.key]);
        toast.show('A few questions still need an answer', 'info');
        return go('question', { index: missing });
      }
      await Connections.completeStage(connectionId, stage);
      go('done');
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };

  const toggle = (o: string) => {
    const list: string[] = Array.isArray(value) ? value : [];
    if (list.includes(o)) setValue(list.filter((x) => x !== o));
    else if (!q.max || list.length < q.max) setValue([...list, o]);
    else setError(`You can select up to ${q.max} options`);
  };

  const aside = (
    <>
      <Card style={{ backgroundColor: '#FFF8EC', borderColor: '#F3E1BD' }}><Ionicons name="bulb-outline" size={22} color="#C98A12" /><Text style={[styles.h, { marginTop: 8 }]}>Why we ask this?</Text><Text style={styles.body}>{q.why}</Text></Card>
      <Card tone="soft"><Text style={[styles.h, { marginBottom: 8 }]}>Tips for your answer</Text><CheckItem tone="blue" text="Think about what truly matters to you." /><CheckItem tone="blue" text="Consider your past experiences and what you have learned." /><CheckItem tone="blue" text="There are no right or wrong answers. Choose what feels true to you." /></Card>
      <Card style={{ backgroundColor: '#EEF9F3', borderColor: '#CDEFDD' }}><Ionicons name="lock-closed-outline" size={20} color={colors.navy} /><Text style={[styles.h, { marginTop: 8 }]}>Your Data is Safe</Text><Text style={styles.body}>Your answers are private and secure. We never share your information with anyone without your permission.</Text></Card>
    </>
  );

  return (
    <Screen title="Reflect" back="Main" onBack={() => (index ? go('question', { index: index - 1 }) : go('intro'))} aside={aside} maxWidth={720}
      footer={
        <View style={{ gap: 6 }}>
          {error ? <InfoNote tone="red" icon="alert-circle" text={error} /> : null}
          <ButtonRow>
            <Button title="Save & Exit" variant="outline" onPress={() => save('exit')} />
            <Button title={last ? 'Complete' : 'Next'} arrow onPress={() => save('next')} loading={busy} />
          </ButtonRow>
        </View>
      }>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: space.lg }}>
        <ProgressBar value={((index + 1) / data.total) * 100} style={{ flex: 1 }} />
        <Text style={styles.small}>{index + 1} / {data.total}</Text>
      </View>
      <StatePill state="x" label={q.category} />
      <Text style={styles.q} accessibilityRole="header">{index + 1}. {q.prompt}</Text>
      <Text style={[styles.small, { marginBottom: space.lg }]}>{q.hint}</Text>
      {q.type === 'single' ? q.options!.map((o) => <RadioRow key={o} label={o} selected={value === o} onPress={() => setValue(o)} />) : null}
      {q.type === 'multi' ? q.options!.map((o) => <CheckRow key={o} label={o} checked={(value as string[]).includes(o)} onPress={() => toggle(o)} />) : null}
      {q.type === 'scale' ? <View style={{ maxWidth: 380 }}><Scale value={value} onChange={setValue} min={q.min} max={q.max} minLabel={q.minLabel} maxLabel={q.maxLabel} /></View> : null}
      {q.type === 'text' ? <TextField multiline value={value} onChangeText={(t) => setValue(t.slice(0, q.maxLength || 500))} placeholder="Type your answer here..." counter={q.maxLength || 500} /> : null}
      {(Array.isArray(value) ? value.includes(OTHER) : value === OTHER) ? <TextField label="Please specify" value={otherText} onChangeText={(t) => setOtherText(t.slice(0, 200))} placeholder="Share your thoughts" /> : null}
      <View style={{ marginTop: space.lg }}>
        <SelectField label="Sharing preference for this answer" icon={sharing === 'share' ? 'eye-outline' : sharing === 'share_later' ? 'time-outline' : 'eye-off-outline'} value={sharing} options={sharingOptions(partner)} onChange={setSharing} />
        <InfoNote icon="shield-checkmark" text="You can change the sharing choice for each answer. Your privacy is always respected." />
      </View>
    </Screen>
  );
}

function Done({ partner, navigation, connectionId, onAnswers }: { partner: string; navigation: any; connectionId: string; onAnswers: () => void }) {
  return (
    <Screen variant="none" title="Reflection completed" maxWidth={560} centerContent>
      <ResultView tone="blue" title="Reflection completed!" message="You have finished all the questions. Your reflections are saved."
        primary={{ label: 'Back to Journey', onPress: () => navigation.navigate('Journey', { connectionId }) }} secondary={{ label: 'View / Edit My Answers', onPress: onAnswers }}>
        <Text style={[styles.h, { marginBottom: 10 }]}>What happens next?</Text>
        {[['notifications-outline', `${partner} will be notified that you have completed this stage.`], ['eye-outline', `${partner} will be able to see the answers you chose to share.`], ['people-outline', 'After both of you complete this stage, you can move to the Discuss stage.']].map(([i, t]) => (
          <View key={t} style={styles.introRow}><View style={styles.introIcon}><Ionicons name={i as any} size={16} color={colors.primary} /></View><Text style={[styles.body, { flex: 1 }]}>{t}</Text></View>
        ))}
      </ResultView>
    </Screen>
  );
}

function Answers({ data, partner, connectionId, stage, onEdit, reload, navigation }: { data: ReflectData; partner: string; connectionId: string; stage: string; onEdit: (i: number) => void; reload: () => void; navigation: any }) {
  const { user } = useAuth();
  const toast = useToast();
  const [filter, setFilter] = useState<'all' | 'shared' | 'private'>('all');
  const later = data.questions.filter((q) => data.answers[q.key]?.sharing === 'share_later');
  const [choices, setChoices] = useState<Record<string, string>>({});
  const shared = data.questions.filter((q) => data.answers[q.key]?.sharing === 'share');
  const priv = data.questions.filter((q) => data.answers[q.key] && data.answers[q.key].sharing !== 'share');
  const list = filter === 'shared' ? shared : filter === 'private' ? priv : data.questions;
  const both = data.completed && data.partner.completed;
  const saveLater = async () => {
    try { await Connections.updateSharing(connectionId, Object.fromEntries(later.map((q) => [q.key, choices[q.key] || 'keep_private'])), stage); toast.show('Sharing choices saved'); reload(); } catch (e) { toast.show(errorMessage(e), 'error'); }
  };
  return (
    <Screen title={data.completed ? 'Reflect – Completed' : 'Your Reflect answers'} variant="center" back="Main" maxWidth={820}
      footer={<Button title="Continue to Journey" arrow onPress={() => navigation.navigate('Journey', { connectionId })} />}>
      {both ? <InfoNote icon="checkmark-circle" title="You've both completed the Reflect stage!" text="Here are your reflections for this stage. You can see each other's answers based on the sharing choices made." style={{ marginBottom: space.lg }} /> : !data.partner.completed ? <InfoNote icon="time-outline" text={`${partner} hasn't completed this stage yet. Answers ${partner} shares appear here once they finish.`} style={{ marginBottom: space.lg }} /> : null}
      <Card style={{ flexDirection: 'row', marginBottom: space.lg }}>
        {[[user?.name || 'You', 'You', user?.photoUrl, Object.keys(data.answers).length], [partner, partner, null, data.partner.answered]].map(([n, label, photo, count], i) => (
          <View key={String(label)} style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }, i === 1 && { borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: 14 }]}>
            <Avatar uri={photo as any} name={String(n)} size={40} />
            <View><Text style={styles.t}>{String(label)}</Text><Text style={[styles.small, { color: colors.primary }]}>{String(count)}/{data.total}</Text><Text style={styles.small}>{Number(count) >= data.total ? 'Completed' : 'In progress'}</Text></View>
          </View>
        ))}
      </Card>
      {later.length ? (
        <Card style={{ marginBottom: space.lg }}>
          <Text style={styles.h}>Decide what to share</Text>
          <Text style={[styles.body, { marginBottom: 10 }]}>You marked these answers "Share later".</Text>
          {later.map((q) => (
            <CheckRow key={q.key} label={q.prompt} description={fmt(q, data.answers[q.key])} checked={choices[q.key] === 'share'} onPress={() => setChoices((c) => ({ ...c, [q.key]: c[q.key] === 'share' ? 'keep_private' : 'share' }))} />
          ))}
          <Button title="Save sharing choices" size="sm" onPress={saveLater} />
        </Card>
      ) : null}
      <FilterPills value={filter} onChange={setFilter} options={[{ key: 'all', label: `All Questions (${data.total})` }, { key: 'shared', label: `Shared (${shared.length})` }, { key: 'private', label: `Private (${priv.length})` }]} />
      <View style={{ gap: 12, marginTop: space.lg }}>
        {list.map((q) => {
          const i = data.questions.indexOf(q);
          const mine = data.answers[q.key];
          const theirs = data.partner.answers[q.key];
          return (
            <Card key={q.key}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <View style={styles.qNum}><Text style={styles.qNumText}>{i + 1}</Text></View>
                <StatePill state="x" label={q.category} />
                <View style={{ flex: 1 }} />
                {!data.completed || stage ? <TextLink title="Edit" size={12.5} onPress={() => onEdit(i)} /> : null}
              </View>
              <Text style={styles.t}>{q.prompt}</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                <View style={styles.ans}><Text style={styles.ansLabel}>Your answer · {mine ? (mine.sharing === 'share' ? 'Shared' : mine.sharing === 'share_later' ? 'Share later' : 'Private') : 'Not answered'}</Text><Text style={styles.body}>{fmt(q, mine) || '—'}</Text></View>
                <View style={styles.ans}>
                  <Text style={styles.ansLabel}>{partner}'s answer</Text>
                  {theirs?.shared ? <Text style={styles.body}>{fmt(q, theirs)}</Text> : (
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Ionicons name="lock-closed-outline" size={14} color={colors.faint} /><Text style={styles.small}>{data.partner.completed ? `${partner} has kept this answer private.` : 'Not shared yet.'}</Text></View>
                  )}
                </View>
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.bold, fontSize: 22, color: colors.text },
  h: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.text },
  t: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 20, color: colors.textSoft },
  small: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted },
  q: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 28, color: colors.text, marginTop: 12, marginBottom: 4 },
  introRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bgTint, borderRadius: radius.card, padding: 12, marginBottom: 8 },
  introIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  stepNum: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: colors.primaryLine, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  stepNumText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.primary },
  lock: { width: 64, height: 64, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  qNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  qNumText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.primary },
  ans: { flex: 1, backgroundColor: colors.bgTint, borderRadius: radius.card, padding: 12 },
  ansLabel: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.muted, marginBottom: 4 },
});
