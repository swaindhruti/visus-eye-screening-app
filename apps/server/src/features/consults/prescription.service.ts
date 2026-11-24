// The prescription (remote consult): a draft while the doctor types (autosaved), final on "Save and end".
// Final: translated into the patient's language (medicine names stay as written), the follow-up booked
// in the doctor's first free slot that day at the same clinic, and the consult completed.
// Visus never suggests medicines: everything here is what the doctor wrote.
import type { ConsultPrescription, Doctor, Language, SavePrescriptionRequest } from '@visus/shared';
import { and, desc, eq, inArray } from 'drizzle-orm';

import type { Db } from '../../db/client';
import { consults, consultTests, prescriptions, profiles, shops } from '../../db/schema';
import type { Bindings } from '../../lib/env';
import { fail } from '../../lib/errors';
import { translateTexts } from '../../lib/translate';
import { isUuid } from '../../lib/validate';
import { activeLinkOrNull, doctorsById, freeSlots } from '../doctors/doctors.service';
import { book, consultFor, statusOf, toSummaries, type ConsultRow, type Urls } from './consults.service';

type RxRow = typeof prescriptions.$inferSelect;

/** Rows → ConsultPrescription (doctor, clinic and patient filled in). */
export async function toPrescriptions(db: Db, rows: RxRow[]): Promise<ConsultPrescription[]> {
  if (!rows.length) return [];
  const [docs, clinics, pats] = await Promise.all([
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
  ]);
  return rows.map((r) => {
    const p = pats.find((x) => x.id === r.profileId) ?? { id: r.profileId, name: 'Patient', age: 0 };
    return {
      id: r.id,
      consultId: r.consultId,
      date: r.updatedAt.toISOString(),
      status: r.status as ConsultPrescription['status'],
      kind: r.kind as ConsultPrescription['kind'],
      symptoms: r.symptoms,
      observations: r.observations,
      glasses: r.glasses ?? null,
      medicines: r.medicines,
      remedies: r.remedies,
      followUpDate: r.followUpDate,
      followUpConsultId: r.followUpConsultId,
      doctor: docs.get(r.doctorId) as Doctor,
      clinic: clinics.find((c) => c.id === r.shopId) ?? { id: r.shopId, name: 'Clinic', city: '' },
      patient: { profileId: p.id, name: p.name, age: p.age },
      translated: r.translated ?? null,
    };
  });
}

/** The doctor's words in the patient's language; null for English or when the AI couldn't. */
async function translated(env: Bindings, input: SavePrescriptionRequest, to: Language) {
  if (to === 'en') return null;
  const texts = [input.symptoms, input.observations, ...input.remedies];
  const out = await translateTexts(env.GEMINI_API_KEY, texts, to, 'en');
  if (!out) return null;
  return { language: to, symptoms: out[0], observations: out[1], remedies: out.slice(2) };
}

/** The follow-up: the doctor's first free slot on that date at the same clinic, or null. */
async function bookFollowUp(db: Db, c: ConsultRow, date: string) {
  if (!c.patientUserId) return null;
  const link = await activeLinkOrNull(db, c.shopId, c.doctorId);
  if (!link) return null;
  const [slot] = await freeSlots(db, link, date);
  if (!slot) return null;
  const next = await book(db, {
    shopId: c.shopId,
    doctorId: c.doctorId,
    patient: { shopPatientId: c.shopPatientId, userId: c.patientUserId, profileId: c.profileId },
    startsAt: new Date(slot.startsAt),
    joinFrom: c.joinFrom,
    reason: c.reason ? `Follow-up: ${c.reason}` : 'Follow-up',
    language: c.language,
    parentConsultId: c.id,
  });
  return next.id;
}

/** PUT /consults/:id/prescription (doctor): draft every few seconds; final once, on "Save and end". */
export async function savePrescription(db: Db, env: Bindings, userId: string, id: string, input: SavePrescriptionRequest) {
  const { row, role } = await consultFor(db, userId, id);
  if (role !== 'doctor') fail(403, 'Only the doctor writes the prescription.');
  const status = statusOf(row);
  if (status === 'cancelled' || status === 'missed') fail(409, `This consult is ${status}.`);
  if (input.followUpDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(input.followUpDate)) fail(400, 'followUpDate: use YYYY-MM-DD');
  const [existing] = await db.select().from(prescriptions).where(eq(prescriptions.consultId, row.id));
  if (existing?.status === 'final') fail(409, 'This prescription is already saved.');

  const fields = {
    kind: input.kind,
    symptoms: input.symptoms.trim(),
    observations: input.observations.trim(),
    glasses: input.glasses,
    medicines: input.medicines,
    remedies: input.remedies.map((r) => r.trim()).filter(Boolean),
    followUpDate: input.followUpDate,
    updatedAt: new Date(),
  };
  let [rx] = existing
    ? await db.update(prescriptions).set(fields).where(eq(prescriptions.id, existing.id)).returning()
    : await db
        .insert(prescriptions)
        .values({ ...fields, consultId: row.id, doctorId: row.doctorId, shopId: row.shopId, profileId: row.profileId })
        .returning();

  if (input.final) {
    const [tr, followUpConsultId] = await Promise.all([
      translated(env, { ...input, ...fields }, row.language),
      fields.followUpDate ? bookFollowUp(db, row, fields.followUpDate) : Promise.resolve(null),
    ]);
    [rx] = await db
      .update(prescriptions)
      .set({ status: 'final', translated: tr, followUpConsultId, updatedAt: new Date() })
      .where(eq(prescriptions.id, rx.id))
      .returning();
    if (status !== 'completed') await db.update(consults).set({ status: 'completed', endedAt: new Date() }).where(eq(consults.id, row.id));
    await db.update(consultTests).set({ status: 'cancelled' }).where(and(eq(consultTests.consultId, row.id), eq(consultTests.status, 'pushed')));
  }
  return (await toPrescriptions(db, [rx]))[0];
}

/** GET /consults/:id/prescription: the doctor and the clinic see the draft; the patient only the final one. */
export async function getPrescription(db: Db, userId: string, id: string) {
  const { row, role } = await consultFor(db, userId, id);
  const [rx] = await db.select().from(prescriptions).where(eq(prescriptions.consultId, row.id));
  if (!rx || (role === 'patient' && rx.status !== 'final')) fail(404, 'No prescription yet.');
  return (await toPrescriptions(db, [rx]))[0];
}

/** GET /me/prescriptions: the patient's final prescriptions, newest first. */
export async function myPrescriptions(db: Db, userId: string) {
  const rows = await db
    .select({ rx: prescriptions })
    .from(prescriptions)
    .innerJoin(consults, eq(consults.id, prescriptions.consultId))
    .where(and(eq(consults.patientUserId, userId), eq(prescriptions.status, 'final')))
    .orderBy(desc(prescriptions.updatedAt));
  return toPrescriptions(
    db,
    rows.map((r) => r.rx),
  );
}

/** GET /doctor/prescriptions: everything this doctor wrote (drafts too), newest first. */
export async function doctorPrescriptions(db: Db, doctorId: string) {
  const rows = await db.select().from(prescriptions).where(eq(prescriptions.doctorId, doctorId)).orderBy(desc(prescriptions.updatedAt));
  return toPrescriptions(db, rows);
}

/** GET /shop/patients/:id/consults: this clinic's consults with the patient, and their final prescriptions. */
export async function patientConsults(db: Db, shopId: string, patientId: string, urls: Urls) {
  if (!isUuid(patientId)) fail(404, 'Patient not found');
  const rows = await db
    .select()
    .from(consults)
    .where(and(eq(consults.shopId, shopId), eq(consults.shopPatientId, patientId)))
    .orderBy(desc(consults.startsAt));
  const rx = rows.length
    ? await db
        .select()
        .from(prescriptions)
        .where(and(inArray(prescriptions.consultId, rows.map((r) => r.id)), eq(prescriptions.status, 'final')))
        .orderBy(desc(prescriptions.updatedAt))
    : [];
  return { consults: await toSummaries(db, rows, 'clinic', urls), prescriptions: await toPrescriptions(db, rx) };
}
