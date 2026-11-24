// All database tables (Drizzle). One owner: Dhrutinandan.
// Teammate: ask for new tables or columns instead of editing this file.
import type { GlassesRx, HoursBlock, Language, Medicine, PatientSummary, Payment, Prescription, ScoredResult, TestId, Verdict } from '@visus/shared';
import { boolean, date, index, integer, jsonb, pgTable, real, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  identifier: text('identifier').notNull().unique(), // phone or email, lower-cased
  passwordHash: text('password_hash').notNull(), // "salt:hash", base64
  role: text('role').notNull().default('user'), // Role: "user" | "shop" | "doctor"
  phone: text('phone'), // last 10 digits; shops find a patient's account by it
  createdAt: createdAt(),
});

/** An optical shop (shop portal). Its owner logs in as a "shop" user. */
export const shops = pgTable('shops', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  address: text('address').notNull().default(''),
  city: text('city').notNull().default(''),
  createdAt: createdAt(),
});

export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    age: integer('age').notNull(),
    gender: text('gender'),
    isChild: boolean('is_child').notNull().default(false),
    wearsGlasses: boolean('wears_glasses').notNull().default(false),
    healthConditions: jsonb('health_conditions').$type<string[]>().notNull().default([]),
    screenHoursPerDay: real('screen_hours_per_day').notNull().default(0),
    relation: text('relation'),
    eyewear: text('eyewear'),
    pastEyeTest: text('past_eye_test'),
    pastEyeNote: text('past_eye_note'),
    prescription: jsonb('prescription').$type<Prescription | null>(),
    savedLens: jsonb('saved_lens').$type<{ product: string; sessionId: string } | null>(),
    createdAt: createdAt(),
  },
  (t) => [index('profiles_user_idx').on(t.userId)],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    mode: text('mode').notNull(), // SessionMode
    language: text('language').notNull().default('en'), // Language: AI text and plan reasons are written in it
    intake: text('intake').notNull().default(''),
    summary: text('summary').notNull().default(''),
    plan: jsonb('plan').$type<{ testId: TestId; reason: string; added?: boolean }[]>().notNull(), // grows when tests are added
    verdict: jsonb('verdict').$type<Verdict>(), // set by POST /sessions/:id/verdict
    shopId: uuid('shop_id').references(() => shops.id, { onDelete: 'set null' }), // set when a shop ran the check
    shareToken: text('share_token'),
    shareExpiresAt: timestamp('share_expires_at', { withTimezone: true }),
    createdAt: createdAt(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  (t) => [index('sessions_user_idx').on(t.userId), index('sessions_shop_idx').on(t.shopId)],
);

export const results = pgTable(
  'results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    testId: text('test_id').$type<TestId>().notNull(),
    eye: text('eye').notNull(),
    answers: jsonb('answers').$type<Record<string, unknown>>().notNull(), // raw, as the app sent them
    durationSec: integer('duration_sec').notNull().default(0),
    scored: jsonb('scored').$type<ScoredResult>().notNull(),
    redFlag: text('red_flag'), // the finding, when the rules raised one
    createdAt: createdAt(),
  },
  (t) => [index('results_session_idx').on(t.sessionId)],
);

/**
 * A walk-in patient of a shop. The details live in a profile owned by the shop account, so the
 * normal check routes work for it. linkedUserId is the patient's own Visus account, found by phone;
 * once they approve, the shop can see and add to their checks (LinkStatus in @visus/shared).
 */
export const shopPatients = pgTable(
  'shop_patients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    shopId: uuid('shop_id')
      .notNull()
      .references(() => shops.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    phone: text('phone').notNull().default(''),
    linkedUserId: uuid('linked_user_id').references(() => users.id, { onDelete: 'set null' }),
    linkStatus: text('link_status').notNull().default('none'),
    createdAt: createdAt(),
  },
  (t) => [index('shop_patients_shop_idx').on(t.shopId), index('shop_patients_phone_idx').on(t.phone)],
);

/** A shop's order (spectacles, lenses…) and the payments against it (shop portal → Orders). */
export const shopOrders = pgTable(
  'shop_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    shopId: uuid('shop_id')
      .notNull()
      .references(() => shops.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id').references(() => shopPatients.id, { onDelete: 'set null' }),
    customerName: text('customer_name').notNull(),
    phone: text('phone').notNull().default(''),
    item: text('item').notNull(),
    kind: text('kind').notNull().default('spectacles'), // OrderKind
    total: integer('total').notNull(), // whole rupees
    payments: jsonb('payments').$type<Payment[]>().notNull().default([]),
    status: text('status').notNull().default('new'), // OrderStatus
    dueDate: date('due_date'),
    notes: text('notes').notNull().default(''),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('shop_orders_shop_idx').on(t.shopId), index('shop_orders_patient_idx').on(t.patientId)],
);

// ---------- Remote consult (docs/CONSULT.md → Data model) ----------

/** A doctor account (role "doctor"). Clinics add them by `visusId` ("VIS-D-7K3Q"). */
export const doctors = pgTable('doctors', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  visusId: text('visus_id').notNull().unique(),
  specialty: text('specialty').notNull(),
  registrationNo: text('registration_no').notNull(), // as typed, not verified
  languages: jsonb('languages').$type<Language[]>().notNull(),
  createdAt: createdAt(),
});

/** A clinic ↔ doctor link: the clinic asks (pending), the doctor approves (active) and sets weekly hours. */
export const clinicDoctors = pgTable(
  'clinic_doctors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    shopId: uuid('shop_id')
      .notNull()
      .references(() => shops.id, { onDelete: 'cascade' }),
    doctorId: uuid('doctor_id')
      .notNull()
      .references(() => doctors.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('pending'), // ClinicDoctorStatus
    hours: jsonb('hours').$type<HoursBlock[]>().notNull().default([]),
    createdAt: createdAt(),
  },
  (t) => [unique('clinic_doctors_shop_doctor').on(t.shopId, t.doctorId), index('clinic_doctors_doctor_idx').on(t.doctorId)],
);

/** A booked video consult. profileId / patientUserId = the linked patient's own profile and account. */
export const consults = pgTable(
  'consults',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    shopId: uuid('shop_id')
      .notNull()
      .references(() => shops.id, { onDelete: 'cascade' }),
    doctorId: uuid('doctor_id')
      .notNull()
      .references(() => doctors.id, { onDelete: 'cascade' }),
    shopPatientId: uuid('shop_patient_id').references(() => shopPatients.id, { onDelete: 'set null' }),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    patientUserId: uuid('patient_user_id').references(() => users.id, { onDelete: 'set null' }),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    minutes: integer('minutes').notNull().default(15),
    joinFrom: text('join_from').notNull(), // JoinFrom
    status: text('status').notNull().default('scheduled'), // ConsultStatus ("missed" is worked out on read)
    kind: text('kind').notNull().default('first'), // ConsultKind
    reason: text('reason').notNull().default(''),
    language: text('language').$type<Language>().notNull().default('en'),
    parentConsultId: uuid('parent_consult_id'), // the consult that booked this follow-up
    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    summary: jsonb('summary').$type<PatientSummary>(), // AI summary for the patient file (cached)
    summaryAt: timestamp('summary_at', { withTimezone: true }),
    calendarToken: text('calendar_token').notNull(), // for the .ics link (no login)
    createdAt: createdAt(),
  },
  (t) => [
    index('consults_shop_idx').on(t.shopId),
    index('consults_doctor_idx').on(t.doctorId, t.startsAt),
    index('consults_patient_idx').on(t.patientUserId),
  ],
);

/** A test the doctor pushed during a call. The answers are scored as a normal single check (sessionId). */
export const consultTests = pgTable(
  'consult_tests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    consultId: uuid('consult_id')
      .notNull()
      .references(() => consults.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),
    testId: text('test_id').$type<TestId>().notNull(),
    eye: text('eye').notNull(),
    status: text('status').notNull().default('pushed'), // pushed | done | cancelled
    pushedAt: timestamp('pushed_at', { withTimezone: true }).notNull().defaultNow(),
    result: jsonb('result').$type<ScoredResult>(),
  },
  (t) => [index('consult_tests_consult_idx').on(t.consultId)],
);

/** One finished caption sentence. A growing integer id, so GET /live?after=<id> is one cheap query. */
export const consultCaptions = pgTable(
  'consult_captions',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    consultId: uuid('consult_id')
      .notNull()
      .references(() => consults.id, { onDelete: 'cascade' }),
    fromRole: text('from_role').notNull(), // CallRole
    language: text('language').$type<Language>().notNull(),
    text: text('text').notNull(),
    translations: jsonb('translations').$type<Partial<Record<Language, string>>>().notNull().default({}),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('consult_captions_consult_idx').on(t.consultId, t.id)],
);

/** The doctor's prescription for one consult: draft during the call, final on "Save and end". */
export const prescriptions = pgTable(
  'prescriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    consultId: uuid('consult_id')
      .notNull()
      .unique()
      .references(() => consults.id, { onDelete: 'cascade' }),
    doctorId: uuid('doctor_id')
      .notNull()
      .references(() => doctors.id, { onDelete: 'cascade' }),
    shopId: uuid('shop_id')
      .notNull()
      .references(() => shops.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull().default('first'),
    symptoms: text('symptoms').notNull().default(''),
    observations: text('observations').notNull().default(''),
    glasses: jsonb('glasses').$type<GlassesRx | null>(),
    medicines: jsonb('medicines').$type<Medicine[]>().notNull().default([]),
    remedies: jsonb('remedies').$type<string[]>().notNull().default([]),
    followUpDate: date('follow_up_date'),
    followUpConsultId: uuid('follow_up_consult_id'),
    translated: jsonb('translated').$type<{ language: Language; symptoms: string; observations: string; remedies: string[] } | null>(),
    status: text('status').notNull().default('draft'), // draft | final
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('prescriptions_doctor_idx').on(t.doctorId), index('prescriptions_profile_idx').on(t.profileId)],
);
