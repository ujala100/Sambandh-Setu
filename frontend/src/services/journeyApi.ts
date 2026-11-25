import AsyncStorage from '@react-native-async-storage/async-storage';
import { getActive, request, USE_MOCK } from './api';
import { Answer, QUESTIONS, Question, Sharing } from './journeyData';
import { buildStages, Connection, delay, StageKey, STAGES, store } from './mockData';

const ANSWERS_KEY = 'reflect_answers';
const META_KEY = 'reflect_meta'; // { privacySeen, defaultSharing }

async function connId(): Promise<string | null> {
  const active = await getActive();
  return active[0]?.id ?? null;
}

// GET journey: the one source for Home, Journey and Connections
export async function getJourney(): Promise<{ connection: Connection | null; stages: ReturnType<typeof buildStages> }> {
  const connections = await getActive();
  const c = connections[0] ?? null;
  if (!c) return { connection: null, stages: [] };

  if (USE_MOCK) {
    return { connection: c, stages: buildStages(c.stage) };
  }

  try {
    const res = await request<{ journey: { stages: any[]; currentStage: StageKey } }>(`/connections/${c.id}/journey`);
    const currentStage = (res.journey?.currentStage || c.stage || 'connect') as StageKey;
    return { connection: c, stages: buildStages(currentStage) };
  } catch {
    return { connection: c, stages: buildStages(c.stage) };
  }
}

export async function completeStage(stage: StageKey): Promise<void> {
  if (USE_MOCK) {
    await delay(300);
    const c = store.active[0];
    const i = STAGES.indexOf(stage);
    if (c && c.stage === stage && i < STAGES.length - 1) c.stage = STAGES[i + 1];
    return;
  }
  const id = await connId();
  if (!id) return;
  await request(`/connections/${id}/stages/${stage}/complete`, { method: 'POST' });
}

export type ReflectData = {
  questions: Question[];
  answers: Record<string, Answer>;
  privacySeen: boolean;
  defaultSharing: Sharing;
};

export async function loadReflect(): Promise<ReflectData> {
  const [a, m] = await Promise.all([AsyncStorage.getItem(ANSWERS_KEY), AsyncStorage.getItem(META_KEY)]);
  const cachedMeta = m ? JSON.parse(m) : { privacySeen: false, defaultSharing: 'keep_private' };
  const cachedAnswers = a ? JSON.parse(a) : {};

  if (USE_MOCK) {
    return { questions: QUESTIONS, answers: cachedAnswers, ...cachedMeta };
  }

  const id = await connId();
  if (!id) {
    return { questions: QUESTIONS, answers: cachedAnswers, ...cachedMeta };
  }

  try {
    const [qRes, pRes] = await Promise.all([
      request<{ questions: any[] }>(`/connections/${id}/reflect/questions`),
      request<{ progress: any }>(`/connections/${id}/reflect/progress`),
    ]);

    const remoteQuestions = qRes.questions || [];
    const questions: Question[] = remoteQuestions.map((q: any) => ({
      id: String(q._id || q.id),
      category: q.category || q.topic || 'General',
      text: q.text || q.prompt || '',
      type: q.type || 'free_text',
      options: (q.options || []).map((o: any) => (typeof o === 'string' ? o : o.label || o.value)),
    }));

    const answersMap: Record<string, Answer> = { ...cachedAnswers };
    const myAnswers = pRes.progress?.mine || [];
    for (const ans of myAnswers) {
      answersMap[ans.questionId] = {
        value: ans.value,
        other: ans.otherText,
        sharing: ans.sharing,
      };
    }

    return {
      questions: questions.length ? questions : QUESTIONS,
      answers: answersMap,
      privacySeen: true,
      defaultSharing: (pRes.progress?.sharingDefault as Sharing) || 'keep_private',
    };
  } catch (err) {
    console.warn('loadReflect using fallback cache:', err);
    return { questions: QUESTIONS, answers: cachedAnswers, ...cachedMeta };
  }
}

// Always saved on the phone first, then sent to the server.
export async function saveAnswer(questionId: string, answer: Answer): Promise<void> {
  const raw = await AsyncStorage.getItem(ANSWERS_KEY);
  const all = raw ? JSON.parse(raw) : {};
  all[questionId] = answer;
  await AsyncStorage.setItem(ANSWERS_KEY, JSON.stringify(all));

  if (!USE_MOCK) {
    const id = await connId();
    if (id) {
      await request(`/connections/${id}/reflect/answers/${questionId}`, {
        method: 'PUT',
        body: JSON.stringify({
          value: answer.value,
          otherText: answer.other,
          sharing: answer.sharing || 'keep_private',
        }),
      }).catch((err) => console.warn('saveAnswer remote sync error:', err));
    }
  }
}

export async function savePrivacyChoice(defaultSharing: Sharing): Promise<void> {
  await AsyncStorage.setItem(META_KEY, JSON.stringify({ privacySeen: true, defaultSharing }));
  if (!USE_MOCK) {
    await request('/users/sharing-default', {
      method: 'PUT',
      body: JSON.stringify({ sharing: defaultSharing }),
    }).catch((err) => console.warn('savePrivacyChoice remote sync error:', err));
  }
}
