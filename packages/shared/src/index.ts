// Shared types and the test catalog for mobile, web and server.
// Types and constants only — no logic. Changes need both people's approval.
// DRAFT: agree on these together before building against them.
import { z } from "zod";

// ---------- Tests ----------

export const TEST_IDS = [
  "tumbling_e",
  "near_reading",
  "near_point",
  "clock_dial",
  "duochrome",
  "amsler",
  "contrast",
  "colour_plates",
  "kids_tumbling_e",
  "kids_colour_shapes",
  "risk_screener",
  "eye_strain",
  "glare_night",
  "peripheral_field",
] as const;
export const TestId = z.enum(TEST_IDS);
export type TestId = z.infer<typeof TestId>;

export const Category = z.enum(["clarity", "focus", "eye_health", "colour", "comfort", "kids"]);
export type Category = z.infer<typeof Category>;

export const Eye = z.enum(["left", "right", "both"]);
export type Eye = z.infer<typeof Eye>;

/** good = "Looks good", mild = "Mild change", see_doctor = "See a doctor" */
export const Status = z.enum(["good", "mild", "see_doctor"]);
export type Status = z.infer<typeof Status>;

export type TestInfo = {
  id: TestId;
  name: string;
  category: Category;
  kind: "visual" | "questionnaire";
  minutes: number;
  minAge: number;
  eachEye: boolean;
  needsCalibration: boolean;
};

export const TEST_CATALOG: TestInfo[] = [
  { id: "tumbling_e", name: "Distance acuity", category: "clarity", kind: "visual", minutes: 3, minAge: 6, eachEye: true, needsCalibration: true },
  { id: "near_reading", name: "Near reading", category: "clarity", kind: "visual", minutes: 2, minAge: 8, eachEye: false, needsCalibration: true },
  { id: "near_point", name: "Near point", category: "focus", kind: "visual", minutes: 1, minAge: 13, eachEye: true, needsCalibration: true },
  { id: "clock_dial", name: "Astigmatism dial", category: "focus", kind: "visual", minutes: 1, minAge: 13, eachEye: true, needsCalibration: false },
  { id: "duochrome", name: "Red-green test", category: "focus", kind: "visual", minutes: 1, minAge: 13, eachEye: true, needsCalibration: false },
  { id: "amsler", name: "Amsler grid", category: "eye_health", kind: "visual", minutes: 2, minAge: 13, eachEye: true, needsCalibration: false },
  { id: "contrast", name: "Contrast sensitivity", category: "eye_health", kind: "visual", minutes: 3, minAge: 13, eachEye: false, needsCalibration: true },
  { id: "peripheral_field", name: "Peripheral vision", category: "eye_health", kind: "visual", minutes: 3, minAge: 13, eachEye: true, needsCalibration: false },
  { id: "colour_plates", name: "Colour vision plates", category: "colour", kind: "visual", minutes: 3, minAge: 8, eachEye: false, needsCalibration: false },
  { id: "risk_screener", name: "Eye risk screener", category: "eye_health", kind: "questionnaire", minutes: 1, minAge: 18, eachEye: false, needsCalibration: false },
  { id: "eye_strain", name: "Eye strain", category: "comfort", kind: "questionnaire", minutes: 1, minAge: 13, eachEye: false, needsCalibration: false },
  { id: "glare_night", name: "Glare & night vision", category: "comfort", kind: "questionnaire", minutes: 1, minAge: 16, eachEye: false, needsCalibration: false },
  { id: "kids_tumbling_e", name: "Kids: Tumbling E", category: "kids", kind: "visual", minutes: 2, minAge: 5, eachEye: true, needsCalibration: true },
  { id: "kids_colour_shapes", name: "Kids: Colour shapes", category: "kids", kind: "visual", minutes: 1, minAge: 5, eachEye: false, needsCalibration: false },
];

// ---------- Auth & profiles ----------

export const SignupRequest = z.object({
  name: z.string().min(1),
  identifier: z.string().min(3), // phone or email
  password: z.string().min(8).max(128),
});
export const LoginRequest = z.object({
  identifier: z.string().min(3),
  password: z.string().min(1).max(128),
});
/** "shop" accounts open the shop portal (web) instead of the personal app. */
export const Role = z.enum(["user", "shop"]);
export type Role = z.infer<typeof Role>;

export const AuthResponse = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    identifier: z.string(),
    role: Role.optional(), // missing = "user"
    shopName: z.string().optional(), // shop accounts only
    phone: z.string().optional(), // 10 digits; shops find a patient's account by it
  }),
});

/** PATCH /me: add or change the phone number shops can find you by. */
export const UpdateMeRequest = z.object({ phone: z.string().min(10).max(16) });

export const Relation = z.enum(["self", "child", "partner", "parent", "sibling", "other"]);
export type Relation = z.infer<typeof Relation>;
export const Eyewear = z.enum(["glasses", "contacts", "both", "none"]);
export type Eyewear = z.infer<typeof Eyewear>;

/** One eye of a glasses prescription. SPH and CYL in dioptres, AXIS 0–180°. */
export const PrescriptionEye = z.object({
  sph: z.number().min(-30).max(30),
  cyl: z.number().min(-15).max(15),
  axis: z.number().int().min(0).max(180),
});
export const Prescription = z.object({ right: PrescriptionEye, left: PrescriptionEye, updatedAt: z.string() });
export type Prescription = z.infer<typeof Prescription>;

export const Profile = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number().int().min(1).max(120),
  gender: z.string().optional(),
  isChild: z.boolean(),
  wearsGlasses: z.boolean(),
  healthConditions: z.array(z.string()),
  screenHoursPerDay: z.number().min(0).max(24),
  // Optional details (Profile, Edit profile, Add family member, My glasses).
  relation: Relation.optional(), // "self" for the account owner
  eyewear: Eyewear.optional(),
  pastEyeTest: z.enum(["yes", "no", "not_sure"]).optional(),
  pastEyeNote: z.string().max(500).optional(),
  prescription: Prescription.nullable().optional(), // null = "I don't know my prescription"
  savedLens: z.object({ product: z.string(), sessionId: z.string() }).nullable().optional(), // null = removed
});
export type Profile = z.infer<typeof Profile>;

// ---------- Check session ----------

export const CreateSessionRequest = z.object({
  profileId: z.string(),
  intake: z.string().max(2000), // what the user typed
  mode: z.enum(["full", "quick", "single", "glasses"]).default("full"), // same values as SessionMode
  testId: TestId.optional(), // for mode "single"
});

/** Issue intake chat (9): one turn. The app keeps the transcript and sends it every turn. */
export const IntakeMessage = z.object({ from: z.enum(["ai", "me"]), text: z.string().max(1000) });
export type IntakeMessage = z.infer<typeof IntakeMessage>;
export const IntakeChatRequest = z.object({ profileId: z.string(), messages: z.array(IntakeMessage).min(1).max(20) });
/** The next question with quick-reply chips, or done: then call POST /sessions with the transcript as `intake`. */
export const IntakeChatResponse = z.object({ reply: z.string(), chips: z.array(z.string()), done: z.boolean() });
export type IntakeChatResponse = z.infer<typeof IntakeChatResponse>;

export const PlanItem = z.object({ testId: TestId, reason: z.string() });
export const CreateSessionResponse = z.object({
  sessionId: z.string(),
  summary: z.string(),
  plan: z.array(PlanItem),
});

/** Sent by the app after every test. Raw answers only — the server scores. */
export const SubmitResult = z.object({
  testId: TestId,
  eye: Eye,
  answers: z.record(z.string(), z.unknown()),
  durationSec: z.number().min(0),
});
export type SubmitResult = z.infer<typeof SubmitResult>;

/** One eye's part of a result ("Left vs right" on Test result detail). */
export const EyeResult = z.object({
  value: z.string(), // e.g. "20/30", "72", "22 of 24 seen"
  score: z.number().min(0).max(100), // bar length
  status: Status,
  detail: z.string().optional(), // e.g. "Faintest seen: 3 of 6"
});
export type EyeResult = z.infer<typeof EyeResult>;

/** One peripheral dot as shown, for the field map. angleDeg 0 = right, clockwise; mm from the centre dot, y down. */
export const FieldDot = z.object({ angleDeg: z.number(), xMm: z.number(), yMm: z.number(), seen: z.boolean() });

export const ScoredResult = z.object({
  testId: TestId,
  eye: Eye,
  score: z.number().min(0).max(100),
  status: Status,
  summary: z.string(), // e.g. "Right eye 20/20, left eye 20/30"
  // Optional detail for Test result detail (18) and Single test complete (48).
  eyes: z.object({ right: EyeResult.optional(), left: EyeResult.optional() }).optional(),
  meaning: z.string().optional(), // "What it means", 1–2 plain sentences
  tip: z.string().optional(),
  field: z.object({ right: z.array(FieldDot).optional(), left: z.array(FieldDot).optional() }).optional(), // peripheral_field only
});
export type ScoredResult = z.infer<typeof ScoredResult>;

/** Server reply after each test. */
export const NextStep = z.discriminatedUnion("type", [
  z.object({ type: z.literal("next_test"), result: ScoredResult, testId: TestId, reason: z.string(), added: z.boolean() }),
  z.object({ type: z.literal("red_flag"), result: ScoredResult, finding: z.string() }),
  z.object({ type: z.literal("done"), result: ScoredResult }),
]);
export type NextStep = z.infer<typeof NextStep>;

// ---------- Verdict ----------

export const LensSuggestion = z.object({
  product: z.string(), // e.g. "ZEISS DriveSafe"
  lensType: z.string(), // e.g. "Single vision"
  reason: z.string(),
  coatings: z.array(z.object({ name: z.string(), reason: z.string() })),
});
export type LensSuggestion = z.infer<typeof LensSuggestion>;

export const Verdict = z.object({
  sessionId: z.string(),
  headline: z.string(),
  advice: z.string(),
  areas: z.partialRecord(Category, Status),
  results: z.array(ScoredResult),
  lens: z.array(LensSuggestion),
  date: z.string().optional(), // ISO, when the check was taken
  minutes: z.number().optional(), // how long the check took
});
export type Verdict = z.infer<typeof Verdict>;

// ---------- Past checks & sharing ----------

export const SessionMode = z.enum(["full", "quick", "single", "glasses"]);
export type SessionMode = z.infer<typeof SessionMode>;

/** One row of GET /sessions, newest first. */
export const SessionSummary = z.object({
  id: z.string(),
  profileId: z.string(), // whose check it was
  date: z.string(), // ISO
  mode: SessionMode,
  headline: z.string(),
  status: Status, // worst status of the check
  tests: z.array(TestId),
  scores: z.partialRecord(TestId, z.number().min(0).max(100)), // for the Results trend chart
  shopName: z.string().optional(), // set when an optical shop ran the check
});
export type SessionSummary = z.infer<typeof SessionSummary>;

/** POST /sessions/:id/share: a read-only report link for a doctor. */
export const ShareLink = z.object({ url: z.string(), expiresAt: z.string() });
export type ShareLink = z.infer<typeof ShareLink>;

// ---------- Shop portal (web) ----------
// An optical shop registers, adds walk-in patients and runs checks for them. A patient with a
// Visus account can be linked by phone number once they approve it in their app; the shop then
// sees their past checks, and the checks the shop runs show up in the patient's account.

export const ShopRegisterRequest = z.object({
  shopName: z.string().min(2).max(100),
  address: z.string().max(200).default(""),
  city: z.string().max(80).default(""),
  ownerName: z.string().min(1).max(100),
  identifier: z.string().min(3), // login: phone or email
  password: z.string().min(8).max(128),
});

export const Shop = z.object({ id: z.string(), name: z.string(), address: z.string(), city: z.string() });
export type Shop = z.infer<typeof Shop>;

/** none = no Visus account with this phone yet; pending = waiting for the patient's answer. */
export const LinkStatus = z.enum(["none", "pending", "approved", "declined"]);
export type LinkStatus = z.infer<typeof LinkStatus>;

export const CreatePatientRequest = z.object({
  name: z.string().min(1).max(100),
  age: z.number().int().min(3).max(120),
  gender: z.string().optional(),
  phone: z.string().max(16).default(""), // optional: needed only to link a Visus account
  wearsGlasses: z.boolean().default(false),
});

/** One row of GET /shop/patients. */
export const ShopPatient = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number(),
  phone: z.string(),
  wearsGlasses: z.boolean(),
  linkStatus: LinkStatus,
  /** Start checks with this profile: the patient's own profile once linked, else the shop's record. */
  checkProfileId: z.string(),
  lastCheck: z.string().nullable(), // ISO date
  createdAt: z.string(),
});
export type ShopPatient = z.infer<typeof ShopPatient>;

/** GET /shop/patients/:id: the patient and their finished checks (all of them once linked). */
export const PatientDetail = ShopPatient.extend({ sessions: z.array(SessionSummary) });
export type PatientDetail = z.infer<typeof PatientDetail>;

/** A shop asking to see your records (GET /me/shop-requests), or a linked shop (GET /me/shops). */
export const ShopRequest = z.object({
  id: z.string(),
  shopName: z.string(),
  city: z.string(),
  status: LinkStatus,
  createdAt: z.string(),
});
export type ShopRequest = z.infer<typeof ShopRequest>;

export const ShopRequestAnswer = z.object({ approve: z.boolean() });
