// Ties the check together:
// create session (agent plan) → for each result: scoring → rules → agent (only if rules can't decide)
// → NextStep; verdict: results + lens suggestions.
import { TEST_CATALOG, type CreateSessionRequest, type NextStep, type SessionMode, type Status, type SubmitResult, type Verdict } from '@visus/shared';
import { and, asc, eq } from 'drizzle-orm';
import type { z } from 'zod';

import type { Db } from '../../db/client';
import { results, sessions } from '../../db/schema';
import type { Bindings } from '../../lib/env';
import { fail } from '../../lib/errors';
import { isUuid } from '../../lib/validate';
import { aiReplan, planTests, REASONS, ruleVerdictText, verdictText } from '../agent/agent.service';
import { recommendLenses } from '../lens/recommend';
import { getProfileById } from '../profiles/profiles.service';
import { nextTestRule } from '../rules/next-test';
import { redFlag } from '../rules/red-flags';
import { scoreTest } from '../scoring';
import { checkTarget, sessionAccess } from '../shops/access';

/** The agent may add at most this many tests to a full check. */
const MAX_ADDED = 2;

/** A session of this account (or run by its shop), or 404. `read`: also a linked patient's check. */
export async function getOwnSession(db: Db, userId: string, id: string, read = false) {
  if (!isUuid(id)) fail(404, 'Check not found');
  const [row] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, id), sessionAccess(db, userId, read)));
  if (!row) fail(404, 'Check not found');
  return row;
}

export async function createSession(db: Db, env: Bindings, userId: string, input: z.infer<typeof CreateSessionRequest>) {
  if (input.mode === 'single' && !input.testId) fail(400, 'testId: pick a test for a single-test check');
  // A shop's check for a linked patient is saved in the patient's account, marked with the shop.
  const { ownerId, profile, shopId } = await checkTarget(db, userId, input.profileId);
  const { summary, plan } = await planTests({ mode: input.mode, testId: input.testId, intake: input.intake, person: profile, apiKey: env.GEMINI_API_KEY });
  const [row] = await db
    .insert(sessions)
    .values({ userId: ownerId, profileId: profile.id, shopId, mode: input.mode, intake: input.intake, summary, plan })
    .returning({ id: sessions.id });
  return { sessionId: row.id, summary, plan: plan.map(({ testId, reason }) => ({ testId, reason })) };
}

export async function submitResult(db: Db, env: Bindings, userId: string, sessionId: string, input: SubmitResult): Promise<NextStep> {
  const session = await getOwnSession(db, userId, sessionId);
  if (session.verdict) fail(409, 'This check is already finished. Start a new one to test again.');
  const profile = await getProfileById(db, session.profileId);
  const done = await db.select({ testId: results.testId, redFlag: results.redFlag }).from(results).where(eq(results.sessionId, sessionId));

  const result = scoreTest(input.testId, input.eye, input.answers, { age: profile.age, isChild: profile.isChild });
  const finding = redFlag(result, input.answers);
  // The same finding is shown once per check (e.g. after a retake).
  const showFlag = finding && !done.some((d) => d.redFlag === finding);
  await db.insert(results).values({
    sessionId,
    testId: input.testId,
    eye: input.eye,
    answers: input.answers,
    durationSec: Math.round(input.durationSec),
    scored: result,
    redFlag: finding,
  });
  // The app then continues with the next test in its own copy of the plan.
  if (showFlag) return { type: 'red_flag', result, finding };

  const plan = [...session.plan];
  const position = done.length + 1; // the plan can repeat a test (glasses check), so count results
  if (session.mode === 'full' && !profile.isChild && plan.filter((p) => p.added).length < MAX_ADDED) {
    const taken = [...plan.map((p) => p.testId), ...done.map((d) => d.testId), input.testId];
    const rule = nextTestRule(result, taken, profile.age);
    const added =
      rule === 'undecided'
        ? result.status === 'good'
          ? null
          : await aiReplan({ result, taken, intake: session.intake, person: profile, apiKey: env.GEMINI_API_KEY })
        : rule;
    if (added) {
      plan.splice(position, 0, { ...added, added: true });
      await db.update(sessions).set({ plan }).where(eq(sessions.id, sessionId));
      return { type: 'next_test', result, testId: added.testId, reason: added.reason, added: true };
    }
  }
  const next = plan[position];
  if (!next) return { type: 'done', result };
  return { type: 'next_test', result, testId: next.testId, reason: next.reason ?? REASONS[next.testId], added: false };
}

const RANK: Record<Status, number> = { good: 0, mild: 1, see_doctor: 2 };
const worse = (a: Status | undefined, b: Status): Status => (a && RANK[a] >= RANK[b] ? a : b);

/** Glasses check: is everything sharp with the glasses on (the last result)? */
function glassesText(withGlasses?: Verdict['results'][number]) {
  const sides = Object.values(withGlasses?.eyes ?? {}).filter(Boolean);
  const fine = sides.length > 0 && sides.every((e) => e!.status === 'good');
  return fine
    ? { headline: 'Your glasses still work well', advice: 'Both eyes see sharply with them on. No update needed for now.' }
    : { headline: 'Your glasses may need an update', advice: "Your vision isn't fully sharp with them on. An optician can check your prescription." };
}

export async function createVerdict(db: Db, env: Bindings, userId: string, sessionId: string): Promise<Verdict> {
  const session = await getOwnSession(db, userId, sessionId);
  if (session.verdict) return session.verdict;
  const rows = await db.select().from(results).where(eq(results.sessionId, sessionId)).orderBy(asc(results.createdAt));
  if (!rows.length) fail(400, 'No test results yet. Finish at least one test first.');
  const profile = await getProfileById(db, session.profileId);
  const scored = rows.map((r) => r.scored);

  const areas: Verdict['areas'] = {};
  for (const r of scored) {
    const category = TEST_CATALOG.find((t) => t.id === r.testId)?.category;
    if (category) areas[category] = worse(areas[category], r.status);
  }
  const mode = session.mode as SessionMode;
  const text =
    mode === 'glasses'
      ? glassesText(scored[scored.length - 1])
      : mode === 'single'
        ? ruleVerdictText(scored)
        : await verdictText({ results: scored, intake: session.intake, person: profile, apiKey: env.GEMINI_API_KEY });
  const seconds = rows.reduce((n, r) => n + r.durationSec, 0);
  const verdict: Verdict = {
    sessionId,
    ...text,
    areas,
    results: scored,
    lens: recommendLenses({ results: scored, profile, intake: session.intake }),
    date: session.createdAt.toISOString(),
    minutes: Math.max(1, Math.round(seconds / 60)),
  };
  await db.update(sessions).set({ verdict, finishedAt: new Date() }).where(eq(sessions.id, sessionId));
  return verdict;
}
