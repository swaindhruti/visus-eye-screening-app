// Doctors (remote consult): sign up with a Visus ID, clinic requests, weekly hours per clinic, free slots.
// Times: hours are India time (IST, UTC+5:30, no daylight saving); slots and consults are stored in UTC.
import {
  CONSULT_MINUTES,
  type ClinicDoctor,
  type ClinicDoctorStatus,
  type Doctor,
  type DoctorAccount,
  type DoctorClinic,
  type DoctorRegisterRequest,
  type HoursBlock,
  type Slot,
  type UpdateDoctorRequest,
} from '@visus/shared';
import { and, eq, gt, inArray, lt, ne } from 'drizzle-orm';
import type { z } from 'zod';

import type { Db } from '../../db/client';
import { clinicDoctors, consults, doctors, shops, users } from '../../db/schema';
import type { Bindings } from '../../lib/env';
import { fail } from '../../lib/errors';
import { isUuid } from '../../lib/validate';
import { createUser, issue } from '../auth/auth.service';

type DoctorRow = typeof doctors.$inferSelect;
type LinkRow = typeof clinicDoctors.$inferSelect;

/** Letters and digits that can't be misread (no 0, O, 1, I). */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const newVisusId = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return `VIS-D-${[...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('')}`;
};
/** "vis-d-7k3q", "VISD7K3Q", "7K3Q" → "VIS-D-7K3Q". */
export const normalizeVisusId = (v: string) => {
  const code = v.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^VISD/, '');
  return `VIS-D-${code}`;
};

export const toDoctor = (d: DoctorRow, name: string): Doctor => ({
  id: d.id,
  visusId: d.visusId,
  name,
  specialty: d.specialty,
  registrationNo: d.registrationNo,
  languages: d.languages,
});

/** Doctors with their names, by id. */
export async function doctorsById(db: Db, ids: string[]) {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map<string, Doctor>();
  const rows = await db.select({ d: doctors, name: users.name }).from(doctors).innerJoin(users, eq(users.id, doctors.userId)).where(inArray(doctors.id, unique));
  return new Map(rows.map(({ d, name }) => [d.id, toDoctor(d, name)]));
}

/** The doctor record of this account, or null. */
export async function doctorIdOf(db: Db, userId: string) {
  const [row] = await db.select({ id: doctors.id }).from(doctors).where(eq(doctors.userId, userId));
  return row?.id ?? null;
}

/** POST /doctors/register: a doctor account (role "doctor") with a new Visus ID; logged in straight away. */
export async function registerDoctor(db: Db, env: Bindings, input: z.infer<typeof DoctorRegisterRequest>) {
  const user = await createUser(db, env, { name: input.name, identifier: input.identifier, password: input.password }, 'doctor');
  const languages = [...new Set(input.languages)];
  for (let attempt = 0; ; attempt++) {
    const visusId = newVisusId();
    const [taken] = await db.select({ id: doctors.id }).from(doctors).where(eq(doctors.visusId, visusId));
    if (taken && attempt < 5) continue;
    await db.insert(doctors).values({ userId: user.id, visusId, specialty: input.specialty.trim(), registrationNo: input.registrationNo.trim(), languages });
    break;
  }
  return issue(db, env, user);
}

/** GET /doctor */
export async function getDoctorAccount(db: Db, doctorId: string): Promise<DoctorAccount> {
  const [row] = await db
    .select({ d: doctors, name: users.name, identifier: users.identifier })
    .from(doctors)
    .innerJoin(users, eq(users.id, doctors.userId))
    .where(eq(doctors.id, doctorId));
  if (!row) fail(404, 'Doctor not found');
  return { ...toDoctor(row.d, row.name), identifier: row.identifier };
}

/** PATCH /doctor */
export async function updateDoctor(db: Db, doctorId: string, userId: string, input: z.infer<typeof UpdateDoctorRequest>) {
  if (input.name !== undefined) await db.update(users).set({ name: input.name.trim() }).where(eq(users.id, userId));
  const set: Partial<DoctorRow> = {};
  if (input.specialty !== undefined) set.specialty = input.specialty.trim();
  if (input.registrationNo !== undefined) set.registrationNo = input.registrationNo.trim();
  if (input.languages !== undefined) set.languages = [...new Set(input.languages)];
  if (Object.keys(set).length) await db.update(doctors).set(set).where(eq(doctors.id, doctorId));
  return getDoctorAccount(db, doctorId);
}

// ---------- Clinic ↔ doctor links ----------

const toClinicDoctor = (l: LinkRow, doctor: Doctor): ClinicDoctor => ({
  linkId: l.id,
  doctor,
  status: l.status as ClinicDoctorStatus,
  hours: l.hours,
  createdAt: l.createdAt.toISOString(),
});

/** GET /shop/doctors: pending, active and declined (removed links are left out). */
export async function listClinicDoctors(db: Db, shopId: string): Promise<ClinicDoctor[]> {
  const links = await db.select().from(clinicDoctors).where(and(eq(clinicDoctors.shopId, shopId), ne(clinicDoctors.status, 'removed')));
  const byId = await doctorsById(
    db,
    links.map((l) => l.doctorId),
  );
  const order: Record<string, number> = { active: 0, pending: 1, declined: 2 };
  return links
    .sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3) || b.createdAt.getTime() - a.createdAt.getTime())
    .map((l) => toClinicDoctor(l, byId.get(l.doctorId)!));
}

/** POST /shop/doctors: ask a doctor (by Visus ID) to work with this clinic. Asking again after a decline or removal is fine. */
export async function addClinicDoctor(db: Db, shopId: string, visusId: string) {
  const [doctor] = await db.select().from(doctors).where(eq(doctors.visusId, normalizeVisusId(visusId)));
  if (!doctor) fail(404, 'No doctor has this Visus ID. Check it with the doctor.');
  const [existing] = await db.select().from(clinicDoctors).where(and(eq(clinicDoctors.shopId, shopId), eq(clinicDoctors.doctorId, doctor.id)));
  let link: LinkRow;
  if (existing) {
    if (existing.status === 'pending' || existing.status === 'active') fail(409, existing.status === 'active' ? 'This doctor already works with your clinic.' : 'You already asked this doctor. Waiting for their answer.');
    [link] = await db.update(clinicDoctors).set({ status: 'pending', createdAt: new Date() }).where(eq(clinicDoctors.id, existing.id)).returning();
  } else {
    [link] = await db.insert(clinicDoctors).values({ shopId, doctorId: doctor.id }).returning();
  }
  const byId = await doctorsById(db, [doctor.id]);
  return toClinicDoctor(link, byId.get(doctor.id)!);
}

/** Future consults on a link that ends are cancelled. */
async function cancelFutureConsults(db: Db, shopId: string, doctorId: string) {
  await db
    .update(consults)
    .set({ status: 'cancelled' })
    .where(and(eq(consults.shopId, shopId), eq(consults.doctorId, doctorId), eq(consults.status, 'scheduled'), gt(consults.startsAt, new Date())));
}

/** DELETE /shop/doctors/:linkId */
export async function removeClinicDoctor(db: Db, shopId: string, linkId: string) {
  if (!isUuid(linkId)) fail(404, 'Doctor not found');
  const [link] = await db
    .update(clinicDoctors)
    .set({ status: 'removed' })
    .where(and(eq(clinicDoctors.id, linkId), eq(clinicDoctors.shopId, shopId)))
    .returning();
  if (!link) fail(404, 'Doctor not found');
  await cancelFutureConsults(db, shopId, link.doctorId);
  return { ok: true as const };
}

const toDoctorClinic = (l: LinkRow, clinic: typeof shops.$inferSelect): DoctorClinic => ({
  linkId: l.id,
  clinic: { id: clinic.id, name: clinic.name, address: clinic.address, city: clinic.city },
  status: l.status as ClinicDoctorStatus,
  hours: l.hours,
  createdAt: l.createdAt.toISOString(),
});

/** GET /doctor/clinics: requests (pending) first, then active clinics. */
export async function listDoctorClinics(db: Db, doctorId: string): Promise<DoctorClinic[]> {
  const rows = await db
    .select({ l: clinicDoctors, clinic: shops })
    .from(clinicDoctors)
    .innerJoin(shops, eq(shops.id, clinicDoctors.shopId))
    .where(and(eq(clinicDoctors.doctorId, doctorId), inArray(clinicDoctors.status, ['pending', 'active'])));
  return rows
    .sort((a, b) => (a.l.status === b.l.status ? b.l.createdAt.getTime() - a.l.createdAt.getTime() : a.l.status === 'pending' ? -1 : 1))
    .map(({ l, clinic }) => toDoctorClinic(l, clinic));
}

async function doctorLink(db: Db, doctorId: string, linkId: string) {
  if (!isUuid(linkId)) fail(404, 'Clinic not found');
  const [row] = await db
    .select({ l: clinicDoctors, clinic: shops })
    .from(clinicDoctors)
    .innerJoin(shops, eq(shops.id, clinicDoctors.shopId))
    .where(and(eq(clinicDoctors.id, linkId), eq(clinicDoctors.doctorId, doctorId)));
  if (!row) fail(404, 'Clinic not found');
  return row;
}

/** POST /doctor/clinics/:linkId: approve or decline a clinic's request. */
export async function answerClinic(db: Db, doctorId: string, linkId: string, approve: boolean) {
  const { l, clinic } = await doctorLink(db, doctorId, linkId);
  if (l.status !== 'pending') fail(409, 'This request was already answered.');
  const [next] = await db
    .update(clinicDoctors)
    .set({ status: approve ? 'active' : 'declined' })
    .where(eq(clinicDoctors.id, l.id))
    .returning();
  return toDoctorClinic(next, clinic);
}

const minutesOf = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** PUT /doctor/clinics/:linkId/hours: replaces the weekly hours at that clinic. */
export async function setHours(db: Db, doctorId: string, linkId: string, hours: HoursBlock[]) {
  const { l, clinic } = await doctorLink(db, doctorId, linkId);
  if (l.status !== 'active') fail(409, 'Approve the clinic first.');
  for (const h of hours) {
    const [s, e] = [minutesOf(h.start), minutesOf(h.end)];
    if (!(s >= 0 && e <= 24 * 60 && Number(h.start.slice(3)) < 60 && Number(h.end.slice(3)) < 60)) fail(400, `Check the time ${h.start}–${h.end}.`);
    if (e - s < CONSULT_MINUTES) fail(400, `${h.start}–${h.end} is shorter than one ${CONSULT_MINUTES}-minute consult.`);
  }
  const sorted = [...hours].sort((a, b) => a.day - b.day || minutesOf(a.start) - minutesOf(b.start));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].day === sorted[i - 1].day && minutesOf(sorted[i].start) < minutesOf(sorted[i - 1].end)) fail(400, 'Two blocks on the same day overlap.');
  }
  const [next] = await db.update(clinicDoctors).set({ hours: sorted }).where(eq(clinicDoctors.id, l.id)).returning();
  return toDoctorClinic(next, clinic);
}

/** DELETE /doctor/clinics/:linkId: the doctor leaves (or withdraws from a request). */
export async function leaveClinic(db: Db, doctorId: string, linkId: string) {
  const { l } = await doctorLink(db, doctorId, linkId);
  await db.update(clinicDoctors).set({ status: 'removed' }).where(eq(clinicDoctors.id, l.id));
  await cancelFutureConsults(db, l.shopId, doctorId);
  return { ok: true as const };
}

// ---------- Free slots ----------

const IST_MS = 330 * 60_000;
/** "2026-11-24" + 960 minutes (16:00 India time) → the UTC instant. */
export const istInstant = (date: string, minutes: number) => new Date(Date.parse(`${date}T00:00:00Z`) - IST_MS + minutes * 60_000);
/** The India-time calendar date and weekday of an instant. */
export const istDate = (at: Date) => {
  const local = new Date(at.getTime() + IST_MS);
  return { date: local.toISOString().slice(0, 10), day: local.getUTCDay(), minutes: local.getUTCHours() * 60 + local.getUTCMinutes() };
};

/** The active link of this doctor at this clinic, or null. */
export async function activeLinkOrNull(db: Db, shopId: string, doctorId: string) {
  if (!isUuid(doctorId)) return null;
  const [link] = await db
    .select()
    .from(clinicDoctors)
    .where(and(eq(clinicDoctors.shopId, shopId), eq(clinicDoctors.doctorId, doctorId), eq(clinicDoctors.status, 'active')));
  return link ?? null;
}

/** The active link of this doctor at this clinic, or a 404. */
export async function activeLink(db: Db, shopId: string, doctorId: string) {
  const link = await activeLinkOrNull(db, shopId, doctorId);
  if (!link) fail(404, "This doctor isn't active at your clinic.");
  return link;
}

/** The doctor's booked (not cancelled) consults that overlap [from, to), at any clinic. */
async function busy(db: Db, doctorId: string, from: Date, to: Date, exceptConsultId?: string) {
  const rows = await db
    .select({ id: consults.id, startsAt: consults.startsAt, minutes: consults.minutes })
    .from(consults)
    .where(
      and(
        eq(consults.doctorId, doctorId),
        ne(consults.status, 'cancelled'),
        lt(consults.startsAt, to),
        gt(consults.startsAt, new Date(from.getTime() - 24 * 60 * 60_000)),
      ),
    );
  return rows.filter((r) => r.id !== exceptConsultId && r.startsAt.getTime() + r.minutes * 60_000 > from.getTime());
}

/** Free 15-minute slots on one India-time date: in the doctor's hours at this clinic, not booked anywhere, not past. */
export async function freeSlots(db: Db, link: LinkRow, date: string, exceptConsultId?: string): Promise<Slot[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) fail(400, 'date: use YYYY-MM-DD');
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  const starts: Date[] = [];
  for (const h of link.hours.filter((b) => b.day === day)) {
    for (let m = minutesOf(h.start); m + CONSULT_MINUTES <= minutesOf(h.end); m += CONSULT_MINUTES) starts.push(istInstant(date, m));
  }
  if (!starts.length) return [];
  const taken = await busy(db, link.doctorId, starts[0], new Date(starts[starts.length - 1].getTime() + CONSULT_MINUTES * 60_000), exceptConsultId);
  const now = Date.now();
  return starts
    .filter((s) => s.getTime() > now)
    .filter((s) => !taken.some((t) => t.startsAt.getTime() < s.getTime() + CONSULT_MINUTES * 60_000 && t.startsAt.getTime() + t.minutes * 60_000 > s.getTime()))
    .map((s) => ({ startsAt: s.toISOString() }));
}

/** Is this exact start one of the free slots? (booking, moving, and the automatic follow-up) */
export async function isFreeSlot(db: Db, link: LinkRow, startsAt: Date, exceptConsultId?: string) {
  const { date } = istDate(startsAt);
  return (await freeSlots(db, link, date, exceptConsultId)).some((s) => Date.parse(s.startsAt) === startsAt.getTime());
}
