// The call (remote consult): join (Agora token), end, and GET /live, which every device polls every 2 s.
// Agora carries only video and voice; captions, live tests and the prescription state come from here.
import { TEST_CATALOG, type Caption, type ConsultTest, type Eye, type JoinConsultResponse, type Language, type LiveState, type SubmitResult, type TestId } from '@visus/shared';
import { and, asc, eq, gt } from 'drizzle-orm';

import type { Db } from '../../db/client';
import { consultCaptions, consults, consultTests, prescriptions, results, sessions } from '../../db/schema';
import { agoraToken, CALL_UID } from '../../lib/agora';
import type { Bindings } from '../../lib/env';
import { fail } from '../../lib/errors';
import { translateCaption } from '../../lib/translate';
import { isUuid } from '../../lib/validate';
import { doctorsById } from '../doctors/doctors.service';
import { createVerdict, submitResult } from '../sessions/sessions.service';
import { canJoin, consultFor, joinEarlyMs, statusOf, toSummaries, type ConsultRow, type Urls } from './consults.service';

/** How long a caption waits for its translation before it's saved untranslated. */
const CAPTION_WAIT_MS = 2500;

type TestRow = typeof consultTests.$inferSelect;
type CaptionRow = typeof consultCaptions.$inferSelect;

export const toTest = (t: TestRow): ConsultTest => ({
  id: t.id,
  testId: t.testId,
  eye: t.eye as ConsultTest['eye'],
  status: t.status as ConsultTest['status'],
  pushedAt: t.pushedAt.toISOString(),
  result: t.result ?? null,
});

export const toCaption = (c: CaptionRow): Caption => ({
  id: String(c.id),
  at: c.at.toISOString(),
  from: c.fromRole as Caption['from'],
  language: c.language,
  text: c.text,
  translations: c.translations,
});

/** POST /consults/:id/join: from 10 minutes before the start until it ends. The first join makes it live. */
export async function joinConsult(db: Db, env: Bindings, userId: string, id: string): Promise<JoinConsultResponse> {
  const { row, role } = await consultFor(db, userId, id);
  const status = statusOf(row);
  const early = joinEarlyMs(env.CONSULT_JOIN_EARLY_MIN);
  if (!canJoin(row, early)) {
    if (status === 'scheduled') fail(409, `You can join from ${early / 60_000} minutes before the start.`);
    fail(409, `This consult is ${status}.`);
  }
  if (!env.AGORA_APP_ID) fail(503, 'Video calls are not set up on this server yet.');
  if (status === 'scheduled') await db.update(consults).set({ status: 'live', startedAt: new Date() }).where(eq(consults.id, row.id));
  const uid = CALL_UID[role];
  const { token, expiresAt } = agoraToken(env.AGORA_APP_ID, env.AGORA_APP_CERTIFICATE, row.id, uid);
  return { appId: env.AGORA_APP_ID, channel: row.id, token, uid, role, expiresAt };
}

/** POST /consults/:id/end (doctor): the consult is completed. A pending live test is cancelled. */
export async function endConsult(db: Db, userId: string, id: string, urls: Urls) {
  const { row, role } = await consultFor(db, userId, id);
  if (role !== 'doctor') fail(403, 'Only the doctor can end the consult.');
  const status = statusOf(row);
  if (status === 'cancelled') fail(409, 'This consult was cancelled.');
  let next = row;
  if (status !== 'completed') {
    [next] = await db.update(consults).set({ status: 'completed', endedAt: new Date() }).where(eq(consults.id, row.id)).returning();
    await db.update(consultTests).set({ status: 'cancelled' }).where(and(eq(consultTests.consultId, row.id), eq(consultTests.status, 'pushed')));
  }
  return (await toSummaries(db, [next], role, urls))[0];
}

/** GET /consults/:id/live?after=<captionId>: one access query, then three small reads in parallel. */
export async function liveState(db: Db, userId: string, id: string, after: string | undefined): Promise<LiveState> {
  const { row } = await consultFor(db, userId, id);
  const afterId = after && /^\d+$/.test(after) ? Number(after) : 0;
  const [tests, captions, rx] = await Promise.all([
    db.select().from(consultTests).where(eq(consultTests.consultId, row.id)).orderBy(asc(consultTests.pushedAt)),
    db
      .select()
      .from(consultCaptions)
      .where(and(eq(consultCaptions.consultId, row.id), gt(consultCaptions.id, afterId)))
      .orderBy(asc(consultCaptions.id))
      .limit(100),
    db.select({ status: prescriptions.status }).from(prescriptions).where(eq(prescriptions.consultId, row.id)),
  ]);
  const pending = [...tests].reverse().find((t) => t.status === 'pushed') ?? null;
  return {
    status: statusOf(row),
    pendingTest: pending && toTest(pending),
    tests: tests.map(toTest),
    captions: captions.map(toCaption),
    prescriptionSaved: rx[0]?.status === 'final',
  };
}


/** Captions, tests and the prescription draft need a call that is on. */
function requireLive(row: ConsultRow) {
  const status = statusOf(row);
  if (status !== 'live') fail(409, status === 'scheduled' ? 'Join the call first.' : `This consult is ${status}.`);
}

// ---------- Captions ----------

/** POST /consults/:id/captions: one finished sentence, translated into the other sides' languages. */
export async function addCaption(db: Db, env: Bindings, userId: string, id: string, input: { text: string; language: Language }) {
  const { row, role } = await consultFor(db, userId, id);
  requireLive(row);
  const doctor = (await doctorsById(db, [row.doctorId])).get(row.doctorId)!;
  // The doctor reads their first language; the patient and the clinic read the consult's language.
  const targets: Language[] = role === 'doctor' ? [row.language] : [doctor.languages[0] ?? 'en', ...(role === 'patient' ? [row.language] : [])];
  const text = input.text.trim();
  // Captions must feel live: wait for the translation at most 2.5 s, else save the words as said
  // (the other side sees the original rather than nothing).
  const giveUp = new Promise<Partial<Record<Language, string>>>((done) => setTimeout(() => done({}), CAPTION_WAIT_MS));
  const translations = await Promise.race([translateCaption(env.GEMINI_API_KEY, text, input.language, targets), giveUp]);
  const [saved] = await db.insert(consultCaptions).values({ consultId: row.id, fromRole: role, language: input.language, text, translations }).returning();
  return toCaption(saved);
}

// ---------- Live tests ----------

/** POST /consults/:id/tests (doctor): a normal single check for the patient, shown on their screen now. */
export async function pushTest(db: Db, userId: string, id: string, input: { testId: TestId; eye: Eye }) {
  const { row, role } = await consultFor(db, userId, id);
  if (role !== 'doctor') fail(403, 'Only the doctor sends tests.');
  requireLive(row);
  if (!row.patientUserId) fail(409, "The patient's Visus account is no longer linked.");
  const [pending] = await db
    .select({ id: consultTests.id })
    .from(consultTests)
    .where(and(eq(consultTests.consultId, row.id), eq(consultTests.status, 'pushed')));
  if (pending) fail(409, 'The patient is still taking the last test. Wait for it or cancel it.');
  const doctor = (await doctorsById(db, [row.doctorId])).get(row.doctorId)!;
  const test = TEST_CATALOG.find((t) => t.id === input.testId)!;
  // Saved in the patient's own account, marked with the clinic: it shows in their Results too.
  const [session] = await db
    .insert(sessions)
    .values({
      userId: row.patientUserId,
      profileId: row.profileId,
      shopId: row.shopId,
      mode: 'single',
      language: row.language,
      intake: '',
      summary: `${test.name}, asked for by ${doctor.name} during a video consult.`,
      plan: [{ testId: input.testId, reason: 'Your doctor asked for this test.' }],
    })
    .returning({ id: sessions.id });
  const [t] = await db.insert(consultTests).values({ consultId: row.id, sessionId: session.id, testId: input.testId, eye: input.eye }).returning();
  return toTest(t);
}

async function testRow(db: Db, consultId: string, rowId: string) {
  if (!isUuid(rowId)) fail(404, 'Test not found');
  const [t] = await db
    .select()
    .from(consultTests)
    .where(and(eq(consultTests.id, rowId), eq(consultTests.consultId, consultId)));
  if (!t) fail(404, 'Test not found');
  return t;
}

/** DELETE /consults/:id/tests/:rowId (doctor): stop a test the patient hasn't finished. */
export async function cancelTest(db: Db, userId: string, id: string, rowId: string) {
  const { row, role } = await consultFor(db, userId, id);
  if (role !== 'doctor') fail(403, 'Only the doctor cancels tests.');
  const t = await testRow(db, row.id, rowId);
  if (t.status !== 'pushed') fail(409, `This test is already ${t.status}.`);
  const [next] = await db.update(consultTests).set({ status: 'cancelled' }).where(eq(consultTests.id, t.id)).returning();
  return toTest(next);
}

/**
 * POST /consults/:id/tests/:rowId/result (patient or clinic): the raw answers go through the normal check
 * (scoring + red-flag rules, then the verdict, so it is in the patient's Results). If the rules raised a
 * red flag, the finding is the result's `meaning`, so the doctor's card shows it.
 */
export async function submitTestResult(db: Db, env: Bindings, userId: string, id: string, rowId: string, input: SubmitResult) {
  const { row, role } = await consultFor(db, userId, id);
  if (role === 'doctor') fail(403, 'The patient takes the test.');
  const t = await testRow(db, row.id, rowId);
  if (t.status !== 'pushed') fail(409, t.status === 'done' ? 'This test is already done.' : 'The doctor cancelled this test.');
  if (input.testId !== t.testId) fail(400, `testId: this is the ${t.testId} test`);
  if (!t.sessionId) fail(409, 'This test has no check to save into.');
  // The patient owns the session; the clinic ran it (shopId), so both may submit.
  const step = await submitResult(db, env, userId, t.sessionId, input);
  await createVerdict(db, env, userId, t.sessionId);
  const [saved] = await db.select({ redFlag: results.redFlag }).from(results).where(eq(results.sessionId, t.sessionId)).limit(1);
  const finding = step.type === 'red_flag' ? step.finding : saved?.redFlag;
  const result = finding ? { ...step.result, meaning: finding } : step.result;
  const [next] = await db.update(consultTests).set({ status: 'done', result }).where(eq(consultTests.id, t.id)).returning();
  return toTest(next);
}
