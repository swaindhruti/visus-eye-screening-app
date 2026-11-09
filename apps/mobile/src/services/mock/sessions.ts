import {
  TEST_CATALOG,
  type IntakeChatResponse,
  type IntakeMessage,
  type NextStep,
  type ScoredResult,
  type SessionMode,
  type SessionSummary,
  type ShareLink,
  type Status,
  type SubmitResult,
  type TestId,
  type Verdict,
} from '@visus/shared';

import { WEB_URL } from '@/services/api';
import { mockOwnerId, mockProfile } from '@/services/mock/profiles';
import type { NewSession, Session } from '@/services/sessions';

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

const REASONS: Partial<Record<TestId, string>> = {
  tumbling_e: 'Sharpness of far-away detail',
  clock_dial: 'Can make lights streak at night',
  amsler: 'Checks for wavy or missing lines',
  contrast: 'Night blur often starts here',
  near_reading: 'Small print up close',
  near_point: 'How close your eyes can focus',
  duochrome: 'Checks if your focus is a little off',
  peripheral_field: 'Notices what is around you',
  colour_plates: 'Tells colours apart',
  risk_screener: 'Health and family risk factors',
  eye_strain: 'Screens and tired eyes',
  glare_night: 'Halos and glare from headlights',
  kids_tumbling_e: 'Sharpness of far-away detail',
  kids_colour_shapes: 'Tells colours apart',
};

const PLANS: Record<NewSession['mode'], TestId[]> = {
  full: ['tumbling_e', 'clock_dial', 'amsler', 'contrast'],
  quick: ['tumbling_e', 'amsler', 'clock_dial'],
  // Round 1 glasses off, round 2 glasses on (answers.round).
  glasses: ['tumbling_e', 'tumbling_e'],
  single: [],
  custom: [], // the tests picked (shop Test library)
};
/** A child's check: the kids versions, done with a parent. */
const KIDS_PLAN: TestId[] = ['kids_tumbling_e', 'kids_colour_shapes'];

/** Glasses check: the same E chart without and with glasses. */
const GLASSES: Record<'glasses_off' | 'glasses_on', Scored> = {
  glasses_off: {
    score: 45,
    status: 'mild',
    summary: 'Blurry without glasses',
    eyes: {
      right: { value: '20/40', score: 50, status: 'mild' },
      left: { value: '20/50', score: 40, status: 'mild' },
    },
  },
  glasses_on: {
    score: 92,
    status: 'good',
    summary: 'Sharp with glasses on',
    eyes: {
      right: { value: '20/20', score: 92, status: 'good' },
      left: { value: '20/20', score: 92, status: 'good' },
    },
  },
};

type Scored = Omit<ScoredResult, 'testId' | 'eye'>;

/** Fixed mock results per test, whatever the answers (peripheral is counted from the answers). */
const RESULTS: Record<TestId, Scored> = {
  tumbling_e: {
    score: 82,
    status: 'mild',
    summary: 'Left eye a little softer',
    eyes: {
      right: { value: '20/20', score: 92, status: 'good' },
      left: { value: '20/30', score: 74, status: 'mild' },
    },
    meaning:
      'You see fine detail well overall. Your left eye reads one line less than your right, which can make signs look soft, especially at night.',
    tip: 'Ask your eye doctor to recheck your left lens. A small update often fixes this.',
  },
  near_reading: {
    score: 88,
    status: 'good',
    summary: 'Reads small print comfortably',
    meaning: 'You read down to newspaper-size print at arm’s length without strain.',
  },
  near_point: {
    score: 84,
    status: 'good',
    summary: 'Focuses close up as expected',
    eyes: {
      right: { value: '11 cm', score: 86, status: 'good' },
      left: { value: '12 cm', score: 82, status: 'good' },
    },
    meaning: 'Both eyes keep text sharp until it is quite close, which is normal for your age.',
  },
  clock_dial: {
    score: 94,
    status: 'good',
    summary: 'Lines look even in both eyes',
    eyes: {
      right: { value: 'Even', score: 95, status: 'good' },
      left: { value: 'Even', score: 93, status: 'good' },
    },
    meaning: 'All lines looked equally dark, so there are no signs of astigmatism.',
  },
  duochrome: {
    score: 90,
    status: 'good',
    summary: 'Focus looks balanced',
    eyes: {
      right: { value: 'Same', score: 92, status: 'good' },
      left: { value: 'Same', score: 88, status: 'good' },
    },
    meaning: 'Letters looked equally sharp on red and green, so your focus looks right.',
  },
  amsler: {
    score: 40,
    status: 'see_doctor',
    summary: 'Wavy lines, left eye',
    eyes: {
      right: { value: 'Grid normal', score: 100, status: 'good' },
      left: { value: '4 areas marked', score: 30, status: 'see_doctor', detail: 'Wavy lines near the centre' },
    },
    meaning: 'Your left eye saw wavy lines near the centre of the grid. This should be checked by an eye doctor.',
    tip: 'Book an eye doctor this week and show them this result. If your vision suddenly gets worse, go today.',
  },
  contrast: {
    score: 76,
    status: 'mild',
    summary: 'Needs a little more contrast to see faint letters',
    meaning: 'You need a little more contrast to spot faint letters. This often shows up first in dim light.',
    tip: 'Use brighter light for reading and mention this at your next eye test.',
  },
  peripheral_field: { score: 100, status: 'good', summary: 'Saw every dot' },
  colour_plates: {
    score: 95,
    status: 'good',
    summary: 'Read every plate',
    meaning: 'You read the numbers on all plates, so your red-green colour vision looks normal.',
  },
  kids_tumbling_e: {
    score: 90,
    status: 'good',
    summary: 'Both eyes see well',
    eyes: {
      right: { value: '20/25', score: 90, status: 'good' },
      left: { value: '20/25', score: 90, status: 'good' },
    },
    meaning: 'Both eyes saw the small Es well for their age.',
  },
  kids_colour_shapes: {
    score: 100,
    status: 'good',
    summary: 'Found every shape',
    meaning: 'Every hidden shape was found, so colour vision looks normal.',
  },
  risk_screener: {
    score: 72,
    status: 'mild',
    summary: 'A few risk factors',
    meaning: 'Family history and long screen time raise your risk a little. Regular checks catch changes early.',
    tip: 'Check your eyes every 6 months.',
  },
  eye_strain: {
    score: 66,
    status: 'mild',
    summary: 'Tired eyes after screens',
    meaning: 'Your eyes often feel dry or tired after screen time, a common sign of digital eye strain.',
    tip: 'Every 20 minutes, look at something 6 metres away for 20 seconds.',
  },
  glare_night: {
    score: 62,
    status: 'mild',
    summary: 'Glare from headlights at night',
    meaning: 'Headlights and street lights often dazzle you, which makes night driving harder.',
    tip: 'Anti-reflective lenses can cut glare at night.',
  },
};

const statusOf = (score: number): Status => (score >= 85 ? 'good' : score >= 60 ? 'mild' : 'see_doctor');

type Trial = { angleDeg: number; xMm: number; yMm: number; seen: boolean };
const trialsOf = (side: unknown): Trial[] => {
  const trials = (side as { trials?: Trial[] } | undefined)?.trials;
  return Array.isArray(trials) ? trials.map(({ angleDeg, xMm, yMm, seen }) => ({ angleDeg, xMm, yMm, seen })) : [];
};

/** Mock scorer for peripheral vision: counts the dots seen per eye and echoes them for the map. */
function scorePeripheral(answers: SubmitResult['answers']): Scored {
  const right = trialsOf(answers.right);
  const left = trialsOf(answers.left);
  const eye = (dots: Trial[]) => {
    const seen = dots.filter((d) => d.seen).length;
    const score = dots.length ? Math.round((seen / dots.length) * 100) : 100;
    return { value: `${seen} of ${dots.length} seen`, score, status: statusOf(score), missed: dots.length - seen };
  };
  const r = eye(right);
  const l = eye(left);
  const missed = (name: string, n: number) =>
    n === 0 ? `Your ${name} eye saw every dot.` : `Your ${name} eye missed ${n} ${n === 1 ? 'dot' : 'dots'}.`;
  const score = Math.min(r.score, l.score);
  return {
    score,
    status: statusOf(score),
    summary: r.missed + l.missed === 0 ? 'Saw every dot' : `Missed ${r.missed + l.missed} of ${right.length + left.length} dots`,
    eyes: {
      right: { value: r.value, score: r.score, status: r.status },
      left: { value: l.value, score: l.score, status: l.status },
    },
    meaning: `${missed('left', l.missed)} ${missed('right', r.missed)}`,
    field: { right, left },
  };
}

type Stored = { profileId: string; mode: SessionMode; tests: TestId[]; results: ScoredResult[]; seconds: number; flagged: boolean };

/** Past checks belong to the account owner, whoever that is in this app run. */
const OWNER = 'owner';

let nextId = 1;
/** Sessions taken in this app run. */
const live = new Map<string, Stored>();
/** Finished checks, newest first: summary for GET /sessions, verdict for GET /sessions/:id. */
const finished: { summary: SessionSummary; verdict: Verdict }[] = [];

const RANK: Record<Status, number> = { good: 0, mild: 1, see_doctor: 2 };
const worst = (a: Status | undefined, b: Status): Status => (a && RANK[a] >= RANK[b] ? a : b);

const LENS: Verdict['lens'] = [
  {
    product: 'ZEISS DriveSafe',
    lensType: 'Single vision lens',
    reason: 'You noticed blurry signs at night. These lenses cut headlight glare and keep detail clear in low light.',
    coatings: [
      { name: 'ZEISS BlueGuard', reason: 'For your 4h+ of daily screen time' },
      { name: 'DuraVision Platinum UV', reason: 'Fewer reflections, resists scratches' },
    ],
  },
  {
    product: 'ZEISS SmartLife Single Vision',
    lensType: 'Single vision lens',
    reason: 'Made for busy days that switch between your phone, people and the road.',
    coatings: [{ name: 'DuraVision Platinum UV', reason: 'Fewer reflections, resists scratches' }],
  },
];

function buildVerdict(sessionId: string, results: ScoredResult[], date: string, minutes: number): Verdict {
  const areas: Verdict['areas'] = {};
  let overall: Status = 'good';
  for (const r of results) {
    const category = TEST_CATALOG.find((t) => t.id === r.testId)?.category;
    if (category) areas[category] = worst(areas[category], r.status);
    overall = worst(overall, r.status);
  }
  return {
    sessionId,
    headline:
      overall === 'see_doctor'
        ? 'Mostly healthy, one thing to follow up'
        : overall === 'mild'
          ? 'Mostly healthy, a few small changes'
          : 'Your eyes look healthy',
    advice:
      overall === 'see_doctor'
        ? 'Book an eye doctor this week and show them this report.'
        : overall === 'mild'
          ? 'Check again in 3 months, or sooner if things change.'
          : 'Check again in 6 months.',
    areas,
    results,
    lens: LENS,
    date,
    minutes,
  };
}

/** Glasses check verdict: is everything sharp with the glasses on? */
function glassesVerdict(sessionId: string, results: ScoredResult[], minutes: number): Verdict {
  const withGlasses = results[results.length - 1];
  const sides = Object.values(withGlasses?.eyes ?? {});
  const fine = sides.length > 0 && sides.every((e) => e.status === 'good');
  return {
    ...buildVerdict(sessionId, withGlasses ? [withGlasses] : [], new Date().toISOString(), minutes),
    headline: fine ? 'Your glasses still work well' : 'Your glasses may need an update',
    advice: fine
      ? 'Both eyes see much sharper with them on. No update needed for now.'
      : "One eye still isn't fully sharp with them on. An optician can check the lens.",
    results,
  };
}

function save(id: string, profileId: string, mode: SessionMode, verdict: Verdict) {
  const status = verdict.results.reduce<Status>((s, r) => worst(s, r.status), 'good');
  const summary: SessionSummary = {
    id,
    profileId,
    date: verdict.date ?? new Date().toISOString(),
    mode,
    headline: verdict.headline,
    status,
    tests: verdict.results.map((r) => r.testId),
    scores: Object.fromEntries(verdict.results.map((r) => [r.testId, r.score])),
  };
  const at = finished.findIndex((f) => f.summary.id === id);
  if (at >= 0) finished.splice(at, 1);
  finished.push({ summary, verdict });
  finished.sort((a, b) => b.summary.date.localeCompare(a.summary.date));
}

// Past checks since May, so the Results tab has a history and a trend.
const PAST: { id: string; days: number; mode: SessionMode; scores: Partial<Record<TestId, number>> }[] = [
  { id: 'past-oct', days: 9, mode: 'full', scores: { tumbling_e: 86, clock_dial: 94, contrast: 78, colour_plates: 95 } },
  { id: 'past-sep', days: 37, mode: 'single', scores: { tumbling_e: 84 } },
  { id: 'past-aug', days: 62, mode: 'full', scores: { tumbling_e: 82, amsler: 100, contrast: 74, colour_plates: 95 } },
  { id: 'past-jul', days: 95, mode: 'single', scores: { colour_plates: 93 } },
  { id: 'past-jun', days: 126, mode: 'full', scores: { tumbling_e: 79, clock_dial: 92, contrast: 71, colour_plates: 94 } },
  { id: 'past-may', days: 158, mode: 'full', scores: { tumbling_e: 78, clock_dial: 92, contrast: 70, colour_plates: 92 } },
];
for (const p of PAST) {
  const results = Object.entries(p.scores).map(([testId, score]): ScoredResult => {
    const status = statusOf(score);
    const base = RESULTS[testId as TestId];
    return {
      testId: testId as TestId,
      eye: 'both',
      score,
      status,
      summary: status === 'good' ? 'Looks good' : base.summary,
      meaning: status === 'good' ? undefined : base.meaning,
    };
  });
  save(p.id, OWNER, p.mode, buildVerdict(p.id, results, daysAgo(p.days), results.length * 3));
}

/** GET /sessions */
export function mockSessions(): SessionSummary[] {
  return finished.map((f) => (f.summary.profileId === OWNER ? { ...f.summary, profileId: mockOwnerId() } : f.summary));
}

/** GET /sessions/:id */
export function mockSession(sessionId: string): Verdict {
  const found = finished.find((f) => f.summary.id === sessionId);
  if (!found) throw new Error('Check not found');
  return found.verdict;
}

/** POST /sessions/:id/share */
export function mockShare(sessionId: string): ShareLink {
  const token = Math.random().toString(36).slice(2, 10);
  return { url: `${WEB_URL}/r/${sessionId}-${token}`, expiresAt: new Date(Date.now() + DAY).toISOString() };
}

/** Mock intake chat: three fixed follow-up questions. The real one is Gemini. */
const MOCK_QUESTIONS: [string, string[]][] = [
  ['Is it in both eyes, or one more than the other?', ['Both eyes', 'Mostly left', 'Mostly right']],
  ['How long has it been happening?', ['A few days', 'A few weeks', 'Months or more']],
  ['Any pain, redness or flashes of light?', ['None of those', 'Some discomfort', 'Yes, flashes']],
];
export function mockIntakeChat(messages: IntakeMessage[]): IntakeChatResponse {
  const answered = messages.filter((m) => m.from === 'me').length - 1;
  const next = MOCK_QUESTIONS[answered];
  return next ? { reply: next[0], chips: next[1], done: false } : { reply: '', chips: [], done: true };
}

/** Mock agent: a fixed plan. The real one reads the intake text. */
export function mockCreateSession(input: NewSession): Session {
  const child = mockProfile(input.profileId)?.isChild;
  const tests =
    input.mode === 'single' && input.testId ? [input.testId] : child && input.mode === 'full' ? KIDS_PLAN : PLANS[input.mode];
  const eyes = /Eyes: (.+)/.exec(input.intake)?.[1]?.toLowerCase();
  const sessionId = `session-${nextId++}`;
  live.set(sessionId, { profileId: input.profileId, mode: input.mode, tests, results: [], seconds: 0, flagged: false });
  return {
    sessionId,
    summary:
      input.mode === 'single'
        ? 'The test you picked.'
        : input.mode === 'glasses'
          ? 'Distance acuity twice: without, then with your glasses.'
          : input.mode === 'quick'
            ? 'Three fast tests for a quick read on your eyes.'
            : child
              ? 'Kids tests, done together with a parent.'
        : `Based on what you described${eyes ? `, in ${eyes === 'both eyes' ? 'both eyes' : eyes.replace('mostly ', 'mostly the ') + ' eye'}` : ''}.`,
    plan: tests.map((testId) => ({ testId, reason: REASONS[testId] ?? 'Picked for you' })),
  };
}

/**
 * Mock scorer: fixed results per test (peripheral counted from the answers).
 * Amsler raises a red flag once per session; otherwise the next test in the plan, then done.
 */
export function mockSubmitResult(sessionId: string, input: SubmitResult): NextStep {
  const session = live.get(sessionId) ?? { profileId: OWNER, mode: 'full', tests: [], results: [], seconds: 0, flagged: false };
  live.set(sessionId, session);
  const round = input.answers.round;
  const scored =
    input.testId === 'peripheral_field'
      ? scorePeripheral(input.answers)
      : round === 'glasses_off' || round === 'glasses_on'
        ? GLASSES[round]
        : RESULTS[input.testId];
  const result: ScoredResult = { testId: input.testId, eye: input.eye, ...scored };
  session.results.push(result);
  session.seconds += input.durationSec;

  if (input.testId === 'amsler' && !session.flagged) {
    session.flagged = true;
    return { type: 'red_flag', result, finding: 'Wavy lines near the centre' };
  }
  // The plan can repeat a test (glasses check), so count how many results are in.
  const next = session.tests[session.results.length];
  if (!next) return { type: 'done', result };
  const reason = session.mode === 'glasses' ? 'Same test again, now with your glasses on' : (REASONS[next] ?? 'Picked for you');
  return { type: 'next_test', result, testId: next, reason, added: false };
}

/** POST /sessions/:id/verdict: built from the session's results and saved to the history. */
export function mockVerdict(sessionId: string): Verdict {
  const session = live.get(sessionId);
  const results = session?.results ?? [];
  const minutes = Math.max(1, Math.round((session?.seconds ?? 0) / 60));
  const verdict =
    session?.mode === 'glasses' ? glassesVerdict(sessionId, results, minutes) : buildVerdict(sessionId, results, new Date().toISOString(), minutes);
  save(sessionId, session?.profileId ?? OWNER, session?.mode ?? 'full', verdict);
  return verdict;
}
