// Gemini calls: initial test plan, re-plan, verdict text.
// Output validated with zod; on any failure we fall back to rules. Only picks tests from TEST_CATALOG.
import {
  Language,
  TEST_CATALOG,
  TestId,
  type IntakeChatResponse,
  type IntakeMessage,
  type Profile,
  type ScoredResult,
  type SessionMode,
  type Status,
  type TestId as TestIdT,
} from '@visus/shared';
import { z } from 'zod';

import { geminiJson } from '../../lib/gemini';
import { toTranscript, userText } from '../../lib/intake';
import { canAdd, type Added } from '../rules/next-test';
import { intakeRedFlag } from '../rules/red-flags';
import { LANGUAGE_NAME, TEXT, URGENT_NOTES } from './i18n';
import { INTAKE_PROMPT, PLAN_PROMPT, REPLAN_PROMPT, VERDICT_PROMPT } from './prompts';

type Person = Pick<Profile, 'age' | 'isChild' | 'screenHoursPerDay' | 'wearsGlasses' | 'healthConditions'>;
type PlanItem = { testId: TestIdT; reason: string };
export type Plan = { summary: string; plan: PlanItem[] };

/** Why a test is in the plan, when the AI didn't write it (English; other languages in i18n.ts). */
export const REASONS = TEXT.en.reasons;

const item = (testId: TestIdT, lang: Language = 'en', reason = TEXT[lang].reasons[testId]): PlanItem => ({ testId, reason });
/** The line every Gemini prompt ends with: which language to write in. */
const writeIn = (lang: Language) => `Write every text field in ${LANGUAGE_NAME[lang]}.`;
const isKid = (p: Person) => p.isChild || p.age < 13;
/** Adult tests this person is old enough for. */
const allowedFor = (p: Person) => TEST_CATALOG.filter((t) => t.category !== 'kids' && p.age >= t.minAge).map((t) => t.id);

const describe = (p: Person) =>
  `Age ${p.age}. ${p.wearsGlasses ? 'Wears glasses or contacts.' : 'No glasses.'} Screen time ${p.screenHoursPerDay} h/day.${
    p.healthConditions.length ? ` Health: ${p.healthConditions.join(', ')}.` : ''
  }`;

// ---------- Intake chat ----------

/** Follow-up questions after the first message. The AI asks its own; TEXT[lang].fallbackQuestions are the fallback. */
const MAX_QUESTIONS = 3;

/** Script of the person's last message, for the fallback when Gemini can't tell us the language. */
function scriptOf(text: string, chosen: Language): Language {
  if (/[\u0B00-\u0B7F]/.test(text)) return 'or';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  return /[a-z]/i.test(text) && chosen !== 'en' && !/\b(the|is|my|eye|eyes|and)\b/i.test(text) ? chosen : /[a-z]/i.test(text) ? 'en' : chosen;
}

/**
 * One turn of Issue intake (9): Gemini's next question with chips, or done (then POST /sessions plans).
 * Replies in the language the person writes in; `language` is what they picked in the app.
 */
export async function intakeTurn(input: { messages: IntakeMessage[]; person: Person; apiKey: string; language?: Language }): Promise<IntakeChatResponse> {
  const { messages, person } = input;
  const chosen = input.language ?? 'en';
  const last = [...messages].reverse().find((m) => m.from === 'me')?.text ?? '';
  const answered = messages.filter((m) => m.from === 'me').length - 1; // follow-ups answered after the first message
  if (answered < 0) return { reply: TEXT[chosen].firstQuestion, chips: [], done: false, language: chosen };
  const guess = scriptOf(last, chosen);
  if (answered >= MAX_QUESTIONS) return { reply: '', chips: [], done: true, language: guess };

  const transcript = toTranscript(messages);
  const ai = await geminiJson({
    apiKey: input.apiKey,
    system: INTAKE_PROMPT,
    prompt: `Allowed tests for this person: ${allowedFor(person).join(', ')}\nPerson: ${describe(person)}\nPreferred language: ${LANGUAGE_NAME[chosen]}.\nFollow-up questions asked so far: ${answered} of at most ${MAX_QUESTIONS}.\n\nChat so far:\n"""${transcript.slice(-3000)}"""\n\nWrite your next turn.`,
    schema: z.object({ reply: z.string().max(300), chips: z.array(z.string().max(40)).max(6), done: z.boolean(), language: Language }),
  });
  const language = ai?.language ?? guess;
  const fallback = TEXT[language].fallbackQuestions[answered];
  let turn: IntakeChatResponse;
  if (ai?.done && answered >= 1) turn = { reply: '', chips: [], done: true, language };
  else if (ai && !ai.done && ai.reply.trim()) turn = { reply: ai.reply.trim(), chips: ai.chips.map((c) => c.trim()).filter(Boolean).slice(0, 4), done: false, language };
  else turn = fallback ? { reply: fallback[0], chips: fallback[1], done: false, language } : { reply: '', chips: [], done: true, language };

  // Rules, not the AI: urgent symptoms get a doctor note once.
  const warned = messages.some((m) => m.from === 'ai' && URGENT_NOTES.some((note) => m.text.includes(note)));
  if (!turn.done && !warned && intakeRedFlag(transcript)) turn = { ...turn, reply: `${TEXT[language].urgentNote} ${turn.reply}` };
  return turn;
}

// ---------- Plan ----------

/** Fixed plans for every mode except an adult's full check. */
export async function planTests(input: { mode: SessionMode; testId?: TestIdT; intake: string; person: Person; apiKey: string; language?: Language }): Promise<Plan> {
  const { mode, person } = input;
  const lang = input.language ?? 'en';
  const t = TEXT[lang];
  if (mode === 'single') return { summary: t.single, plan: [item(input.testId!, lang)] };
  if (mode === 'glasses') return { summary: t.glasses.summary, plan: [item('tumbling_e', lang, t.glasses.off), item('tumbling_e', lang, t.glasses.on)] };
  if (mode === 'quick') return { summary: t.quick, plan: [item('tumbling_e', lang), item('amsler', lang), item('clock_dial', lang)] };
  if (isKid(person)) return { summary: t.kids, plan: [item('kids_tumbling_e', lang), item('kids_colour_shapes', lang)] };
  return (await aiPlan(input.intake, person, input.apiKey, lang)) ?? rulePlan(input.intake, person, lang);
}

async function aiPlan(intake: string, person: Person, apiKey: string, lang: Language): Promise<Plan | null> {
  const allowed = allowedFor(person);
  const schema = z.object({
    summary: z.string().min(1).max(300),
    plan: z
      .array(z.object({ testId: z.enum(allowed as [TestIdT, ...TestIdT[]]), reason: z.string().min(1).max(80) }))
      .min(2)
      .max(6),
  });
  const reply = await geminiJson({
    apiKey,
    system: PLAN_PROMPT,
    prompt: `Allowed tests for this person: ${allowed.join(', ')}\nPerson: ${describe(person)}\n\nChat:\n"""${intake.slice(0, 3000) || '(nothing, plan a general check)'}"""\n\n${writeIn(lang)}`,
    schema,
  });
  if (!reply) return null;
  const plan = reply.plan.filter((p, i) => reply.plan.findIndex((q) => q.testId === p.testId) === i).slice(0, 5);
  // Red flags come from the rules, not the AI alone.
  const urgent = intakeRedFlag(intake);
  if (urgent && !plan.some((p) => p.testId === 'amsler')) plan.splice(1, 0, item('amsler', lang));
  const summary = urgent
    ? `${TEXT[lang].urgentSummary} ${reply.summary.split(/(?<=[.।])\s+/).filter((s) => !/eye doctor|डॉक्टर|ଡାକ୍ତର/i.test(s)).join(' ')}`.trim()
    : reply.summary;
  return { summary, plan };
}

/** Keyword plan used when Gemini is unavailable (English, Hindi and Odia words). */
const KEYWORDS: [RegExp, TestIdT[], string][] = [
  [/night|headlight|glare|halo|dark|driv|रात|अंधेर|गाड़ी|चमक|ରାତି|ଅନ୍ଧାର|ଗାଡ଼ି/i, ['contrast', 'glare_night'], 'night'],
  [/read|close|near|phone|small print|book|menu|पढ़|पास|फ़ोन|फोन|किताब|ପଢ଼|ପାଖ|ଫୋନ|ବହି/i, ['near_reading', 'near_point'], 'reading'],
  [/screen|laptop|computer|tired|strain|headache|dry|burn|स्क्रीन|थक|सिरदर्द|सूख|जलन|ସ୍କ୍ରିନ|କ୍ଳାନ୍ତ|ମୁଣ୍ଡବିନ୍ଧା|ଶୁଖି|ଜଳ/i, ['eye_strain'], 'strain'],
  [/wavy|bent|distort|straight line|cent(re|er)|missing|टेढ़|लहर|ବଙ୍କା/i, ['amsler'], 'wavy'],
  [/colou?r|रंग|ରଙ୍ଗ/i, ['colour_plates'], 'colour'],
  [/side|bump|peripheral|tunnel|edge|किनार|बगल|ପାର୍ଶ୍ୱ|କଡ଼/i, ['peripheral_field'], 'side'],
  [/double|ghost|streak|smear|astigmat|दो-दो|दोहर|ଦୁଇଟା/i, ['clock_dial'], 'ghost'],
  [/diabet|glaucoma|family|pressure|smok|शुगर|मधुमेह|ग्लूकोमा|परिवार|बीपी|ମଧୁମେହ|ସୁଗାର|ପରିବାର/i, ['risk_screener'], 'risk'],
];

export function rulePlan(transcript: string, person: Person, lang: Language = 'en'): Plan {
  const intake = userText(transcript);
  const allowed = allowedFor(person);
  const tests: TestIdT[] = ['tumbling_e'];
  const concerns: string[] = [];
  const urgent = intakeRedFlag(intake);
  if (urgent) tests.push('amsler');
  for (const [re, ids, label] of KEYWORDS) {
    if (!re.test(intake)) continue;
    concerns.push(label);
    for (const id of ids) if (!tests.includes(id)) tests.push(id);
  }
  for (const id of ['clock_dial', 'amsler', 'contrast'] as TestIdT[]) if (tests.length < 4 && !tests.includes(id)) tests.push(id);
  const t = TEXT[lang];
  const plan = tests.filter((id) => allowed.includes(id)).slice(0, 5).map((id) => item(id, lang));
  const why = concerns.length ? t.basedOn(concerns.slice(0, 3).map((c) => t.concerns[c])) : t.general;
  return { summary: urgent ? `${t.urgentSummary} ${why}` : why, plan };
}

// ---------- Re-plan ----------

/** Asks Gemini if one extra test would help after an unclear result. null = no extra test. */
export async function aiReplan(input: { result: ScoredResult; taken: TestIdT[]; intake: string; person: Person; apiKey: string; language?: Language }): Promise<Added | null> {
  const allowed = allowedFor(input.person).filter((id) => canAdd(id, input.taken, input.person.age));
  if (!allowed.length) return null;
  const schema = z.object({ testId: z.enum(['none', ...allowed] as [string, ...string[]]), reason: z.string().max(120) });
  const reply = await geminiJson({
    apiKey: input.apiKey,
    system: REPLAN_PROMPT,
    prompt: `Allowed tests to add: ${allowed.join(', ')}\nAlready planned or done: ${input.taken.join(', ')}\nPerson: ${describe(
      input.person,
    )}\nWhat they said: """${userText(input.intake).slice(0, 800)}"""\n\nResult just now: ${input.result.testId}, status ${input.result.status}, score ${input.result.score}: ${input.result.summary}`,
    schema,
  });
  if (!reply || reply.testId === 'none') return null;
  const testId = TestId.parse(reply.testId);
  return { testId, reason: TEXT[input.language ?? 'en'].reasons[testId] }; // our wording: the AI's reason can drift from the test
}

// ---------- Verdict ----------

const RANK: Record<Status, number> = { good: 0, mild: 1, see_doctor: 2 };

export function ruleVerdictText(results: ScoredResult[], lang: Language = 'en') {
  const overall = results.reduce<Status>((s, r) => (RANK[r.status] > RANK[s] ? r.status : s), 'good');
  const worst = [...results].sort((a, b) => RANK[b.status] - RANK[a.status])[0];
  const text = TEXT[lang].verdict[overall];
  // The scorers' finding is English: added only to English text.
  return overall === 'good' || lang !== 'en' ? { ...text } : { headline: text.headline, advice: `${text.advice} ${worst.summary}.` };
}

export async function verdictText(input: { results: ScoredResult[]; intake: string; person: Person; apiKey: string; language?: Language }) {
  const lang = input.language ?? 'en';
  const fallback = ruleVerdictText(input.results, lang);
  if (!input.results.length) return fallback;
  const schema = z.object({ headline: z.string().min(3).max(70), advice: z.string().min(10).max(320) });
  const reply = await geminiJson({
    apiKey: input.apiKey,
    system: VERDICT_PROMPT,
    prompt: `Person: ${describe(input.person)}\nWhat they said: """${userText(input.intake).slice(0, 800)}"""\n\nResults:\n${input.results
      .map((r) => `- ${r.testId}: ${r.status}, score ${r.score}. ${r.summary}`)
      .join('\n')}\n\n${writeIn(lang)}`,
    schema,
  });
  if (!reply) return fallback;
  // The rules decide how serious it is: a doctor finding must say so.
  if (input.results.some((r) => r.status === 'see_doctor') && !/doctor|डॉक्टर|ଡାକ୍ତର/i.test(reply.advice)) return fallback;
  return reply;
}
