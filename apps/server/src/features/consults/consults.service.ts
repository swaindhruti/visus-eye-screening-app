// Consults (remote consult): the clinic books for a linked patient; lists for the clinic, the doctor and
// the patient; one consult with the caller's role; calendar links and the .ics file.
// "missed" is worked out on read: nobody joined by 15 minutes after the start (no cron job).
import {
  CONSULT_MINUTES,
  type CallRole,
  type ConsultDetail,
  type ConsultStatus,
  type ConsultSummary,
  type CreateConsultRequest,
  type Doctor,
  type UpdateConsultRequest,
} from '@visus/shared';
import { and, eq, inArray, ne, type SQL } from 'drizzle-orm';
import type { z } from 'zod';

import type { Db } from '../../db/client';
import { consults, doctors, prescriptions, profiles, shopPatients, shops } from '../../db/schema';
import { fail } from '../../lib/errors';
import { isUuid } from '../../lib/validate';
import { activeLink, doctorsById, istDate, isFreeSlot } from '../doctors/doctors.service';
import { selfProfile } from '../profiles/profiles.service';

export type ConsultRow = typeof consults.$inferSelect;
/** Where links point: the API itself (.ics) and the web app (join links). */
export type Urls = { api: string; web: string };

const MISSED_AFTER_MS = 15 * 60_000;
/** How early a consult can be joined: 10 minutes, or CONSULT_JOIN_EARLY_MIN (demo). */
export const joinEarlyMs = (setting?: string) => (Number(setting) > 0 ? Number(setting) : 10) * 60_000;

/** The status as everyone should see it now. */
export function statusOf(c: Pick<ConsultRow, 'status' | 'startsAt' | 'startedAt'>, now = Date.now()): ConsultStatus {
  if (c.status === 'scheduled' && !c.startedAt && now > c.startsAt.getTime() + MISSED_AFTER_MS) return 'missed';
  return c.status as ConsultStatus;
}

/** Can someone join now? From 10 minutes before the start until the consult ends. */
export function canJoin(c: ConsultRow, earlyMs: number, now = Date.now()) {
  const s = statusOf(c, now);
  return s === 'live' || (s === 'scheduled' && now >= c.startsAt.getTime() - earlyMs);
}

const drName = (d: Doctor) => (/^dr\.?\s/i.test(d.name) ? d.name : `Dr ${d.name}`);

/** Where each role opens the consult on the web. */
const webPath = (role: CallRole, id: string) => (role === 'doctor' ? `/doctor/consults/${id}` : role === 'clinic' ? `/shop/consults/${id}` : `/consults/${id}`);

type CalendarInfo = { id: string; startsAt: Date; minutes: number; joinFrom: string; reason: string; doctor: Doctor; clinicName: string; patientName: string };

function eventText(role: CallRole, e: CalendarInfo, urls: Urls) {
  const title = role === 'patient' ? `Eye consult with ${drName(e.doctor)}` : role === 'doctor' ? `Consult: ${e.patientName} (${e.clinicName})` : `Consult: ${e.patientName} with ${drName(e.doctor)}`;
  const where = e.joinFrom === 'clinic' ? `At ${e.clinicName} (video call)` : 'Video call in the Visus app';
  const join = `${urls.web}${webPath(role, e.id)}`;
  const details = [e.reason && `Reason: ${e.reason}`, `Join: ${join}`, 'Visus is a screening, not a diagnosis.'].filter(Boolean).join('\n');
  return { title, where, details };
}

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

function calendarLinks(role: CallRole, e: CalendarInfo, token: string, urls: Urls) {
  const { title, where, details } = eventText(role, e, urls);
  const end = new Date(e.startsAt.getTime() + e.minutes * 60_000);
  const google = new URL('https://calendar.google.com/calendar/render');
  google.searchParams.set('action', 'TEMPLATE');
  google.searchParams.set('text', title);
  google.searchParams.set('dates', `${stamp(e.startsAt)}/${stamp(end)}`);
  google.searchParams.set('details', details);
  google.searchParams.set('location', where);
  return { googleUrl: google.toString(), icsUrl: `${urls.api}/consults/${e.id}/calendar.ics?t=${token}&r=${role}` };
}

/** Rows → ConsultSummary, for one caller's role (the calendar links depend on it). */
export async function toSummaries(db: Db, rows: ConsultRow[], role: CallRole, urls: Urls): Promise<ConsultSummary[]> {
  if (!rows.length) return [];
  const [docs, clinics, pats, rx] = await Promise.all([
    doctorsById(
      db,
      rows.map((r) => r.doctorId),
    ),
    db
      .select({ id: shops.id, name: shops.name, city: shops.city })
      .from(shops)
      .where(inArray(shops.id, [...new Set(rows.map((r) => r.shopId))])),
    db
      .select({ id: profiles.id, name: profiles.name, age: profiles.age })
      .from(profiles)
      .where(inArray(profiles.id, [...new Set(rows.map((r) => r.profileId))])),
    db
      .select({ consultId: prescriptions.consultId })
      .from(prescriptions)
      .where(and(inArray(prescriptions.consultId, rows.map((r) => r.id)), eq(prescriptions.status, 'final'))),
  ]);
  const withRx = new Set(rx.map((r) => r.consultId));
  return rows.map((r) => {
    const doctor = docs.get(r.doctorId)!;
    const clinic = clinics.find((c) => c.id === r.shopId) ?? { id: r.shopId, name: 'Clinic', city: '' };
    const p = pats.find((x) => x.id === r.profileId) ?? { id: r.profileId, name: 'Patient', age: 0 };
    return {
      id: r.id,
      startsAt: r.startsAt.toISOString(),
      minutes: r.minutes,
      status: statusOf(r),
      kind: r.kind as ConsultSummary['kind'],
      joinFrom: r.joinFrom as ConsultSummary['joinFrom'],
      reason: r.reason,
      language: r.language,
      patient: { profileId: p.id, name: p.name, age: p.age },
      doctor,
      clinic,
      hasPrescription: withRx.has(r.id),
      calendar: calendarLinks(role, { ...r, doctor, clinicName: clinic.name, patientName: p.name }, r.calendarToken, urls),
    };
  });
}

export type When = 'today' | 'upcoming' | 'past' | undefined;

/** today = India-time today (soonest first); upcoming = later days (soonest first); past = earlier days (newest first). */
function byWhen(rows: ConsultRow[], when: When) {
  const today = istDate(new Date()).date;
  const day = (r: ConsultRow) => istDate(r.startsAt).date;
  const soonest = (a: ConsultRow, b: ConsultRow) => a.startsAt.getTime() - b.startsAt.getTime();
  if (when === 'today') return rows.filter((r) => day(r) === today).sort(soonest);
  if (when === 'upcoming') return rows.filter((r) => day(r) > today).sort(soonest);
  if (when === 'past') return rows.filter((r) => day(r) < today).sort((a, b) => -soonest(a, b));
  // No filter: still to come (scheduled or live) soonest first, then the rest newest first.
  const open = (r: ConsultRow) => ['scheduled', 'live'].includes(statusOf(r));
  return [...rows.filter(open).sort(soonest), ...rows.filter((r) => !open(r)).sort((a, b) => -soonest(a, b))];
}

export function parseWhen(v: string | undefined): When {
  if (v === undefined || v === '') return undefined;
  if (v === 'today' || v === 'upcoming' || v === 'past') return v;
  fail(400, 'when: use today, upcoming or past');
}

async function list(db: Db, where: SQL, when: When, role: CallRole, urls: Urls) {
  const rows = await db.select().from(consults).where(where);
  return toSummaries(db, byWhen(rows, when), role, urls);
}

export const listClinicConsults = (db: Db, shopId: string, when: When, urls: Urls) => list(db, eq(consults.shopId, shopId), when, 'clinic', urls);
export const listDoctorConsults = (db: Db, doctorId: string, when: When, urls: Urls) => list(db, eq(consults.doctorId, doctorId), when, 'doctor', urls);
/** The patient's consults (not the cancelled ones): upcoming first, then past. */
export const listMyConsults = (db: Db, userId: string, urls: Urls) =>
  list(db, and(eq(consults.patientUserId, userId), ne(consults.status, 'cancelled'))!, undefined, 'patient', urls);

/** The consult and who the caller is on it (doctor, patient or clinic), or 404. */
export async function consultFor(db: Db, userId: string, id: string): Promise<{ row: ConsultRow; role: CallRole }> {
  if (!isUuid(id)) fail(404, 'Consult not found');
  const [hit] = await db
    .select({ row: consults, doctorUser: doctors.userId, clinicOwner: shops.ownerId })
    .from(consults)
    .innerJoin(doctors, eq(doctors.id, consults.doctorId))
    .innerJoin(shops, eq(shops.id, consults.shopId))
    .where(eq(consults.id, id));
  if (!hit) fail(404, 'Consult not found');
  const role: CallRole | null = hit.doctorUser === userId ? 'doctor' : hit.clinicOwner === userId ? 'clinic' : hit.row.patientUserId === userId ? 'patient' : null;
  if (!role) fail(404, 'Consult not found');
  return { row: hit.row, role };
}

/** GET /consults/:id */
export async function getConsult(db: Db, userId: string, id: string, urls: Urls): Promise<ConsultDetail> {
  const { row, role } = await consultFor(db, userId, id);
  const [summary] = await toSummaries(db, [row], role, urls);
  return { ...summary, role };
}

const randomToken = () => [...crypto.getRandomValues(new Uint8Array(18))].map((b) => b.toString(16).padStart(2, '0')).join('');

/** A clinic patient who approved the link: their own account and profile. */
export async function linkedPatient(db: Db, shopId: string, patientId: string) {
  if (!isUuid(patientId)) fail(404, 'Patient not found');
  const [p] = await db.select().from(shopPatients).where(and(eq(shopPatients.id, patientId), eq(shopPatients.shopId, shopId)));
  if (!p) fail(404, 'Patient not found');
  if (p.linkStatus !== 'approved' || !p.linkedUserId) fail(400, "Consults are only for patients who linked their Visus account. Ask them to allow your clinic in their app.");
  const self = await selfProfile(db, p.linkedUserId);
  if (!self) fail(400, "This patient's Visus account has no profile yet.");
  return { shopPatientId: p.id, userId: p.linkedUserId, profileId: self.id };
}

/** Book one consult in a free slot (the clinic's booking, and the follow-up the prescription books). */
export async function book(
  db: Db,
  input: { shopId: string; doctorId: string; patient: { shopPatientId: string | null; userId: string; profileId: string }; startsAt: Date; joinFrom: string; reason: string; language: ConsultRow['language']; parentConsultId?: string },
) {
  const link = await activeLink(db, input.shopId, input.doctorId);
  if (!(await isFreeSlot(db, link, input.startsAt))) fail(409, 'That time is no longer free. Pick another slot.');
  const [before] = await db
    .select({ id: consults.id })
    .from(consults)
    .where(and(eq(consults.doctorId, input.doctorId), eq(consults.profileId, input.patient.profileId), eq(consults.status, 'completed')))
    .limit(1);
  const [row] = await db
    .insert(consults)
    .values({
      shopId: input.shopId,
      doctorId: input.doctorId,
      shopPatientId: input.patient.shopPatientId,
      profileId: input.patient.profileId,
      patientUserId: input.patient.userId,
      startsAt: input.startsAt,
      minutes: CONSULT_MINUTES,
      joinFrom: input.joinFrom,
      kind: input.parentConsultId || before ? 'follow_up' : 'first',
      reason: input.reason.trim(),
      language: input.language,
      parentConsultId: input.parentConsultId ?? null,
      calendarToken: randomToken(),
    })
    .returning();
  return row;
}

const instant = (iso: string) => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) fail(400, 'startsAt: use an ISO date and time from the free slots');
  return new Date(t);
};

/** POST /shop/consults */
export async function createConsult(db: Db, shopId: string, input: z.infer<typeof CreateConsultRequest>, urls: Urls) {
  const patient = await linkedPatient(db, shopId, input.patientId);
  const row = await book(db, { shopId, doctorId: input.doctorId, patient, startsAt: instant(input.startsAt), joinFrom: input.joinFrom, reason: input.reason, language: input.language });
  return (await toSummaries(db, [row], 'clinic', urls))[0];
}

/** PATCH /shop/consults/:id: move to another free slot, change where they join, or cancel. Only before it starts. */
export async function updateConsult(db: Db, shopId: string, id: string, input: z.infer<typeof UpdateConsultRequest>, urls: Urls) {
  if (!isUuid(id)) fail(404, 'Consult not found');
  const [row] = await db.select().from(consults).where(and(eq(consults.id, id), eq(consults.shopId, shopId)));
  if (!row) fail(404, 'Consult not found');
  if (statusOf(row) !== 'scheduled') fail(409, `This consult is ${statusOf(row)}; it can't be changed.`);
  const set: Partial<ConsultRow> = {};
  if (input.startsAt !== undefined) {
    const at = instant(input.startsAt);
    if (at.getTime() !== row.startsAt.getTime()) {
      const link = await activeLink(db, shopId, row.doctorId);
      if (!(await isFreeSlot(db, link, at, row.id))) fail(409, 'That time is no longer free. Pick another slot.');
      set.startsAt = at;
    }
  }
  if (input.joinFrom !== undefined) set.joinFrom = input.joinFrom;
  if (input.status === 'cancelled') set.status = 'cancelled';
  const [next] = Object.keys(set).length ? await db.update(consults).set(set).where(eq(consults.id, id)).returning() : [row];
  return (await toSummaries(db, [next], 'clinic', urls))[0];
}

// ---------- .ics (no login: the token in the link) ----------

const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

/** GET /consults/:id/calendar.ics?t=&r=: one event, alarms 1 h and 10 min before. */
export async function calendarFile(db: Db, id: string, token: string, roleParam: string | undefined, urls: Urls) {
  if (!isUuid(id) || !token) fail(404, 'Not found');
  const [row] = await db
    .select()
    .from(consults)
    .where(and(eq(consults.id, id), eq(consults.calendarToken, token)));
  if (!row) fail(404, 'Not found');
  const role: CallRole = roleParam === 'doctor' || roleParam === 'clinic' ? roleParam : 'patient';
  const [s] = await toSummaries(db, [row], role, urls);
  const { title, where, details } = eventText(role, { ...row, doctor: s.doctor, clinicName: s.clinic.name, patientName: s.patient.name }, urls);
  const end = new Date(row.startsAt.getTime() + row.minutes * 60_000);
  const alarm = (before: string) => ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(title)}`, `TRIGGER:-${before}`, 'END:VALARM'];
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Visus//Consult//EN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${row.id}@visus`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(row.startsAt)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${icsText(title)}`,
    `DESCRIPTION:${icsText(details)}`,
    `LOCATION:${icsText(where)}`,
    `STATUS:${s.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
    ...alarm('PT1H'),
    ...alarm('PT10M'),
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}
