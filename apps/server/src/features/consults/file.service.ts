// The patient file (doctor, remote consult): the AI summary first ("AI summary, check the full records"),
// then the full history: checks, saved glasses, earlier prescriptions and consults.
// The summary is cached on the consult and made again only when there is a newer check or prescription.
import { TEST_CATALOG, type PatientFile, type PatientSummary, type Status } from '@visus/shared';
import { and, desc, eq, isNotNull, ne } from 'drizzle-orm';
import { z } from 'zod';

import type { Db } from '../../db/client';
import { consults, prescriptions, profiles, sessions } from '../../db/schema';
import type { Bindings } from '../../lib/env';
import { fail } from '../../lib/errors';
import { geminiJson } from '../../lib/gemini';
import { PATIENT_SUMMARY_PROMPT } from '../agent/prompts';
import { summaries } from '../history/history.service';
import { consultFor, toSummaries, type ConsultRow, type Urls } from './consults.service';
import { toPrescriptions } from './prescription.service';

const RANK: Record<Status, number> = { good: 0, mild: 1, see_doctor: 2 };
const WORDS: Record<Status, string> = { good: 'looks good', mild: 'mild change', see_doctor: 'see a doctor' };
const testName = (id: string) => TEST_CATALOG.find((t) => t.id === id)?.name ?? id;
const day = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

type SessionRow = typeof sessions.$inferSelect;
type RxRow = typeof prescriptions.$inferSelect;
type ProfileRow = typeof profiles.$inferSelect;

/** Rule summary (AI unavailable): the worst results in plain words. */
function ruleSummary(p: ProfileRow, checks: SessionRow[]): PatientSummary {
  const findings = checks
    .flatMap((s) => s.verdict!.results.map((r) => ({ r, at: s.createdAt })))
    .filter(({ r }) => r.status !== 'good')
    .sort((a, b) => RANK[b.r.status] - RANK[a.r.status] || b.at.getTime() - a.at.getTime());
  const seen = new Set<string>();
  const points = findings
    .filter(({ r }) => !seen.has(r.testId) && seen.add(r.testId))
    .slice(0, 5)
    .map(({ r, at }) => `${testName(r.testId)}: ${r.summary} (${WORDS[r.status]}, ${day(at)})`);
  const text = checks.length
    ? `${p.name}, ${p.age}, has ${checks.length} Visus check${checks.length === 1 ? '' : 's'}; the latest on ${day(checks[0].createdAt)}: "${checks[0].verdict!.headline}". ${points.length ? 'Results worth a look are listed below.' : 'All results looked good.'}`
    : `${p.name}, ${p.age}, has no Visus checks yet.`;
  return { text, points, ai: false, generatedAt: new Date().toISOString() };
}

/** The history as short lines for the AI. */
function historyText(p: ProfileRow, checks: SessionRow[], rx: RxRow[]) {
  const lines = [
    `Patient: ${p.name}, ${p.age} years${p.gender ? `, ${p.gender}` : ''}; wears glasses: ${p.wearsGlasses ? 'yes' : 'no'}; health: ${p.healthConditions.join(', ') || 'none given'}.`,
    p.prescription ? `Saved glasses: right ${JSON.stringify(p.prescription.right)}, left ${JSON.stringify(p.prescription.left)}.` : 'No saved glasses power.',
    ...checks.map((s) => `Check ${day(s.createdAt)} (${s.mode}): ${s.verdict!.results.map((r) => `${testName(r.testId)} ${r.status}: ${r.summary}`).join('; ')}`),
    ...rx.map((r) => `Prescription ${day(r.updatedAt)}: ${r.observations || r.symptoms || 'no notes'}`),
  ];
  return lines.join('\n');
}

/** The AI summary (cached on the consult), or the rule summary when the AI fails. */
async function summaryFor(db: Db, env: Bindings, c: ConsultRow, p: ProfileRow, checks: SessionRow[], rx: RxRow[]) {
  const newest = Math.max(0, ...checks.map((s) => s.createdAt.getTime()), ...rx.map((r) => r.updatedAt.getTime()));
  if (c.summary && c.summaryAt && c.summaryAt.getTime() >= newest) return c.summary;
  const recent = checks.slice(0, 10);
  const ai = recent.length
    ? await geminiJson({
        apiKey: env.GEMINI_API_KEY,
        system: PATIENT_SUMMARY_PROMPT,
        prompt: historyText(p, recent, rx.slice(0, 5)),
        schema: z.object({ text: z.string().min(1), points: z.array(z.string()).max(5) }),
      })
    : null;
  const summary: PatientSummary = ai ? { ...ai, ai: true, generatedAt: new Date().toISOString() } : ruleSummary(p, recent);
  // Only an AI summary is worth caching; a rule one is tried again next time.
  if (summary.ai) await db.update(consults).set({ summary, summaryAt: new Date() }).where(eq(consults.id, c.id));
  return summary;
}

/** GET /consults/:id/file (doctor). */
export async function patientFile(db: Db, env: Bindings, userId: string, id: string, urls: Urls): Promise<PatientFile> {
  const { row, role } = await consultFor(db, userId, id);
  if (role !== 'doctor') fail(403, 'The patient file is for the doctor.');
  const [p] = await db.select().from(profiles).where(eq(profiles.id, row.profileId));
  if (!p) fail(404, 'Patient not found');
  const [checks, rx, past] = await Promise.all([
    db
      .select()
      .from(sessions)
      .where(and(eq(sessions.profileId, p.id), isNotNull(sessions.verdict)))
      .orderBy(desc(sessions.createdAt)),
    db
      .select()
      .from(prescriptions)
      .where(and(eq(prescriptions.profileId, p.id), eq(prescriptions.status, 'final')))
      .orderBy(desc(prescriptions.updatedAt)),
    db
      .select()
      .from(consults)
      .where(and(eq(consults.profileId, p.id), ne(consults.status, 'cancelled'), ne(consults.id, row.id)))
      .orderBy(desc(consults.startsAt)),
  ]);
  const [summary, sessionList, prescriptionList, consultList] = await Promise.all([
    summaryFor(db, env, row, p, checks, rx),
    summaries(db, eq(sessions.profileId, p.id)),
    toPrescriptions(db, rx),
    toSummaries(db, past, 'doctor', urls),
  ]);
  return {
    patient: {
      profileId: p.id,
      name: p.name,
      age: p.age,
      gender: p.gender ?? undefined,
      wearsGlasses: p.wearsGlasses,
      healthConditions: p.healthConditions,
      glasses: p.prescription ?? null,
    },
    summary,
    sessions: sessionList,
    prescriptions: prescriptionList,
    consults: consultList,
  };
}

