// Mock remote-consult world (NEXT_PUBLIC_USE_MOCK=1), kept in localStorage. Seeded relative to the
// first visit so there is always a consult to join in a few minutes, one later today, upcoming
// ones, a completed one with a prescription and a missed one. Shaped exactly like the shared types.
import type {
  Caption,
  ConsultDetail,
  ConsultPrescription,
  ConsultSummary,
  ConsultTest,
  Doctor,
  DoctorAccount,
  DoctorClinic,
  JoinConsultResponse,
  Language,
  LiveState,
  PatientFile,
  SavePrescriptionRequest,
  SessionSummary,
  SubmitResult,
} from "@visus/shared";
import { CONSULT_MINUTES } from "@visus/shared";

import type { NewCaption, NewTest } from "../consults";
import { cannedResult } from "./sessions";
import { delay, load, save, uid } from "./store";

const WORLD_KEY = "consults-v3";

/** `doctorId` unset = the doctor of this browser (registered here, else the demo doctor). */
export type MockConsult = Omit<ConsultSummary, "doctor" | "calendar" | "hasPrescription"> & { doctorId?: string };
/** A clinic–doctor link. `doctorId` unset = this browser's doctor (the doctor portal shows only those). */
export type MockLink = DoctorClinic & { doctorId?: string };
/** `botFrom`: when the mock doctor started (a patient or clinic device with no doctor on the call). */
type Live = { tests: ConsultTest[]; captions: Caption[]; joinedAt?: string; botFrom?: string };
type World = { consults: MockConsult[]; prescriptions: ConsultPrescription[]; links: MockLink[]; live?: Record<string, Live> };

export const CLINICS = {
  c1: { id: "c1", name: "Clear View Opticals", address: "Janpath, Unit 3", city: "Bhubaneswar" },
  c2: { id: "c2", name: "Netra Care Clinic", address: "College Square", city: "Cuttack" },
};

export const PATIENTS = {
  asha: { profileId: "pf-asha", name: "Asha Sharma", age: 46 },
  ravi: { profileId: "pf-ravi", name: "Ravi Patnaik", age: 62 },
  sunita: { profileId: "pf-sunita", name: "Sunita Das", age: 38 },
  arjun: { profileId: "pf-arjun", name: "Arjun Mohanty", age: 12 },
};

const DEMO_DOCTOR: DoctorAccount = {
  id: "doc-demo",
  visusId: "VIS-D-7K3Q",
  name: "Dr Meera Nayak",
  specialty: "Ophthalmologist",
  registrationNo: "OMC-2014-1123",
  languages: ["en", "hi", "or"],
  identifier: "meera@example.com",
};

/** Other doctors on Visus, for the clinic to add by Visus ID. */
export const OTHER_DOCTORS: Doctor[] = [
  { id: "doc-rohan", visusId: "VIS-D-R8M2", name: "Dr Rohan Mishra", specialty: "Optometrist", registrationNo: "OCO-2019-0457", languages: ["or", "en"] },
  { id: "doc-priya", visusId: "VIS-D-P4XN", name: "Dr Priya Sahu", specialty: "Ophthalmologist", registrationNo: "OMC-2011-0890", languages: ["en", "hi"] },
];

/** The mock clinic is c1, shown with the name of the shop account registered in this browser. */
export const MY_CLINIC = "c1";
export const myClinic = () => ({ ...CLINICS.c1, ...load<Partial<typeof CLINICS.c1>>("shop", {}), id: MY_CLINIC });
const clinicNow = <T extends { id: string }>(c: T): T => (c.id === MY_CLINIC ? { ...c, name: myClinic().name, city: myClinic().city } : c);

/** The logged-in doctor: the one registered in this browser, else the demo doctor. */
export const doctorAccount = () => load<DoctorAccount>("doctor", DEMO_DOCTOR);
export const doctorPublic = (): Doctor => {
  const d = doctorAccount();
  return { id: d.id, visusId: d.visusId, name: d.name, specialty: d.specialty, registrationNo: d.registrationNo, languages: d.languages };
};
export const doctorOf = (doctorId?: string): Doctor => (doctorId && OTHER_DOCTORS.find((d) => d.id === doctorId)) || doctorPublic();
/** The id stored on consults and links: unset for this browser's doctor. */
export const doctorKey = (doctorId: string) => (OTHER_DOCTORS.some((d) => d.id === doctorId) ? doctorId : undefined);

const minutesFromNow = (m: number) => {
  const d = new Date(Date.now() + m * 60_000);
  d.setSeconds(0, 0);
  return d.toISOString();
};
const dayAt = (days: number, h: number, m: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
export const dateOnly = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function seed(): World {
  const clinic = (c: (typeof CLINICS)["c1"]) => ({ id: c.id, name: c.name, city: c.city });
  const base = { minutes: CONSULT_MINUTES };
  const consults: MockConsult[] = [
    { ...base, id: "cs-now", startsAt: minutesFromNow(5), status: "scheduled", kind: "first", joinFrom: "home", reason: "Blurry reading for three months; the Amsler grid showed a small change in the left eye.", language: "hi", patient: PATIENTS.asha, clinic: clinic(CLINICS.c1) },
    { ...base, id: "cs-later", startsAt: minutesFromNow(180), status: "scheduled", kind: "follow_up", joinFrom: "clinic", reason: "Follow-up: new reading glasses and dry eyes.", language: "hi", patient: PATIENTS.ravi, clinic: clinic(CLINICS.c1) },
    { ...base, id: "cs-tomorrow", startsAt: dayAt(1, 16, 15), status: "scheduled", kind: "first", joinFrom: "home", reason: "Headaches after long screen work; eye strain score was high.", language: "en", patient: PATIENTS.sunita, clinic: clinic(CLINICS.c1) },
    { ...base, id: "cs-week", startsAt: dayAt(3, 16, 30), status: "scheduled", kind: "first", joinFrom: "clinic", reason: "School screening: distance vision lower in the right eye.", language: "or", patient: PATIENTS.arjun, clinic: clinic(CLINICS.c1) },
    { ...base, id: "cs-done", startsAt: dayAt(-2, 16, 0), status: "completed", kind: "first", joinFrom: "clinic", reason: "Trouble reading small print and glare while driving at night.", language: "hi", patient: PATIENTS.ravi, clinic: clinic(CLINICS.c1) },
    { ...base, id: "cs-missed", startsAt: dayAt(-5, 17, 0), status: "scheduled", kind: "first", joinFrom: "home", reason: "Red, itchy eyes for a week.", language: "en", patient: PATIENTS.sunita, clinic: clinic(CLINICS.c1) },
    { ...base, id: "cs-asha-past", doctorId: "doc-rohan", startsAt: dayAt(-21, 11, 30), status: "completed", kind: "first", joinFrom: "clinic", reason: "Glasses feel weak for reading; headaches in the evening.", language: "hi", patient: PATIENTS.asha, clinic: clinic(CLINICS.c1) },
  ];
  const doctor = doctorPublic();
  const prescriptions: ConsultPrescription[] = [
    {
      id: "rx-done",
      consultId: "cs-done",
      date: consults[4].startsAt,
      status: "final",
      kind: "first",
      symptoms: "Difficulty reading small print for six months, and glare from headlights when driving at night.",
      observations: "Near vision N10 in both eyes on the Visus test; Amsler grid normal. Reading glasses advised.",
      glasses: { right: { sph: 0.5, cyl: -0.5, axis: 90, add: 2 }, left: { sph: 0.75, cyl: 0, axis: 0, add: 2 }, pd: 63 },
      medicines: [{ name: "Carboxymethylcellulose 0.5% eye drops", dose: "1 drop", frequency: "3 times a day", days: 30 }],
      remedies: ["Take a 20-second break every 20 minutes of reading", "Wear sunglasses outdoors"],
      followUpDate: dateOnly(consults[1].startsAt),
      doctor,
      clinic: consults[4].clinic,
      patient: PATIENTS.ravi,
      followUpConsultId: "cs-later",
      translated: {
        language: "hi",
        symptoms: "छह महीने से छोटे अक्षर पढ़ने में कठिनाई, और रात में गाड़ी चलाते समय हेडलाइट की चकाचौंध।",
        observations: "Visus टेस्ट में दोनों आँखों में पास की दृष्टि N10; एम्सलर ग्रिड सामान्य। पढ़ने का चश्मा सलाह दिया गया।",
        remedies: ["पढ़ते समय हर 20 मिनट पर 20 सेकंड का ब्रेक लें", "बाहर धूप का चश्मा पहनें"],
      },
    },
  ];
  prescriptions.push({
    id: "rx-asha",
    consultId: "cs-asha-past",
    date: consults[6].startsAt,
    status: "final",
    kind: "first",
    symptoms: "Blurry reading for a few months and headaches in the evening after phone use.",
    observations: "Near vision N12 in both eyes on the Visus test. Distance vision good with current glasses. Small change on the Amsler grid in the left eye: referred to an ophthalmologist.",
    glasses: { right: { sph: -1.25, cyl: -0.5, axis: 180, add: 1.25 }, left: { sph: -1, cyl: -0.25, axis: 170, add: 1.25 }, pd: 62 },
    medicines: [],
    remedies: ["Follow the 20-20-20 rule on screens", "Keep the phone at least 40 cm from your eyes", "Check your blood sugar regularly"],
    followUpDate: null,
    doctor: OTHER_DOCTORS[0],
    clinic: consults[6].clinic,
    patient: PATIENTS.asha,
    followUpConsultId: null,
    translated: {
      language: "hi",
      symptoms: "कुछ महीनों से पढ़ने में धुंधलापन और फ़ोन इस्तेमाल के बाद शाम को सिरदर्द।",
      observations: "Visus टेस्ट में दोनों आँखों में पास की दृष्टि N12। मौजूदा चश्मे से दूर की दृष्टि अच्छी। बाईं आँख में एम्सलर ग्रिड पर छोटा बदलाव: नेत्र रोग विशेषज्ञ को दिखाने की सलाह।",
      remedies: ["स्क्रीन पर 20-20-20 नियम अपनाएँ", "फ़ोन आँखों से कम से कम 40 सेमी दूर रखें", "ब्लड शुगर नियमित जाँचें"],
    },
  });
  const links: MockLink[] = [
    {
      linkId: "l1",
      clinic: CLINICS.c1,
      status: "active",
      hours: [
        { day: 1, start: "16:00", end: "18:00" },
        { day: 3, start: "16:00", end: "18:00" },
        { day: 5, start: "10:00", end: "12:00" },
      ],
      createdAt: dayAt(-30, 10, 0),
    },
    { linkId: "l2", clinic: CLINICS.c2, status: "pending", hours: [], createdAt: dayAt(-1, 11, 20) },
    {
      linkId: "l3",
      doctorId: "doc-rohan",
      clinic: CLINICS.c1,
      status: "active",
      hours: [
        { day: 2, start: "10:00", end: "13:00" },
        { day: 4, start: "10:00", end: "13:00" },
        { day: 6, start: "09:00", end: "12:00" },
      ],
      createdAt: dayAt(-60, 12, 0),
    },
  ];
  return { consults, prescriptions, links };
}

export function world(): World {
  const w = load<World | null>(WORLD_KEY, null);
  if (w) return w;
  const fresh = seed();
  save(WORLD_KEY, fresh);
  return fresh;
}

export const saveWorld = (w: World) => save(WORLD_KEY, w);

/** Start the mock world again from fresh dates (e.g. after the demo consult passed). */
export const resetWorld = () => saveWorld(seed());

// ---------- Reading consults the way the server shows them ----------

/** "missed" is worked out on read: nobody joined by 15 minutes after the start. */
function statusNow(c: MockConsult): MockConsult["status"] {
  if (c.status === "scheduled" && Date.now() > Date.parse(c.startsAt) + CONSULT_MINUTES * 60_000) return "missed";
  return c.status;
}

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Google Calendar link and an .ics file (as a data: URL), with alarms 1 h and 10 min before. */
function calendar(c: MockConsult, doctorName: string): ConsultSummary["calendar"] {
  const end = new Date(Date.parse(c.startsAt) + c.minutes * 60_000).toISOString();
  const title = `Eye consult: ${c.patient.name} with ${doctorName}`;
  const details = `${c.reason}\n\nJoin from Visus. ${c.joinFrom === "clinic" ? `At ${c.clinic.name}.` : "From home."}`;
  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${stamp(c.startsAt)}/${stamp(end)}&details=${encodeURIComponent(details)}`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Visus//Consult//EN",
    "BEGIN:VEVENT",
    `UID:${c.id}@visus`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(c.startsAt)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${details.replace(/\n/g, "\\n")}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Eye consult in 1 hour",
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-PT10M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Eye consult in 10 minutes",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return { googleUrl, icsUrl: `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}` };
}

export function summary({ doctorId, ...c }: MockConsult, w = world()): ConsultSummary {
  const doctor = doctorOf(doctorId);
  c = { ...c, clinic: clinicNow(c.clinic) };
  return {
    ...c,
    status: statusNow(c),
    doctor,
    hasPrescription: w.prescriptions.some((p) => p.consultId === c.id && p.status === "final"),
    calendar: calendar(c, doctor.name),
  };
}

// ---------- The patient's own consults ----------
// The mock patient account is Asha (profile p1 in ./profiles); in the consult world she is pf-asha.
const MINE = new Set(["pf-asha", "p1"]);

/** GET /me/consults: upcoming (soonest first), then past (newest first). */
export async function myConsults(): Promise<ConsultSummary[]> {
  await delay(200);
  const w = world();
  const list = w.consults.filter((c) => MINE.has(c.patient.profileId)).map((c) => summary(c, w));
  const ahead = (c: ConsultSummary) => c.status === "scheduled" || c.status === "live";
  return [...list.filter(ahead).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)), ...list.filter((c) => !ahead(c)).sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt))];
}

/** GET /me/prescriptions: final ones, newest first. */
export async function myPrescriptions(): Promise<ConsultPrescription[]> {
  await delay(200);
  const w = world();
  return w.prescriptions
    .filter((p) => p.status === "final" && MINE.has(p.patient.profileId))
    .map((p) => rxNow(p, w))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

/** A prescription as it reads now: the clinic's current name, and the consult's doctor as they are now. */
export function rxNow(rx: ConsultPrescription, w = world()): ConsultPrescription {
  const c = w.consults.find((x) => x.id === rx.consultId);
  return { ...rx, clinic: clinicNow(rx.clinic), doctor: c ? doctorOf(c.doctorId) : rx.doctor };
}

export type When = "today" | "upcoming" | "past";

/** Today and upcoming soonest first, past newest first (as the server lists them). */
export function listConsults(when: When, keep: (c: MockConsult) => boolean = () => true): ConsultSummary[] {
  const w = world();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = start.getTime() + 86_400_000;
  const at = (c: MockConsult) => Date.parse(c.startsAt);
  const pick = (c: MockConsult) => (when === "today" ? at(c) >= start.getTime() && at(c) < end : when === "upcoming" ? at(c) >= end : at(c) < start.getTime());
  const list = w.consults.filter((c) => keep(c) && pick(c)).sort((a, b) => at(a) - at(b));
  return (when === "past" ? list.reverse() : list).map((c) => summary(c, w));
}

export const newId = (prefix: string) => `${prefix}-${uid()}`;
export type { Language };

// ---------- One consult, and the doctor's patient file ----------

/** How the signed-in mock account takes part: doctor, clinic (shop account) or patient. */
const myRole = (): ConsultDetail["role"] => {
  const role = load<{ role?: string } | null>("user", null)?.role;
  return role === "doctor" ? "doctor" : role === "shop" ? "clinic" : "patient";
};

export async function detail(id: string): Promise<ConsultDetail> {
  await delay(150);
  const c = world().consults.find((x) => x.id === id);
  if (!c) throw new Error("Consult not found");
  return { ...summary(c), role: myRole() };
}

const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

type FileExtras = Pick<PatientFile, "summary"> & { patient: Omit<PatientFile["patient"], "profileId" | "name" | "age">; sessions: SessionSummary[] };

const shopName = CLINICS.c1.name;
const FILES: Record<string, FileExtras> = {
  "pf-asha": {
    patient: {
      gender: "Female",
      wearsGlasses: true,
      healthConditions: ["Diabetes"],
      glasses: { right: { sph: -1.25, cyl: -0.5, axis: 180 }, left: { sph: -1, cyl: -0.25, axis: 170 }, updatedAt: daysAgo(400) },
    },
    summary: {
      text: "Asha reports blurry reading for three months. Her latest Visus check found near vision at N12 and a small change on the Amsler grid in the left eye; distance vision was good with her glasses. She has diabetes, so the Amsler change is worth a closer look.",
      points: ["Amsler grid: small change near the centre, left eye (see a doctor)", "Near vision N12 in both eyes (mild change)", "Distance vision 20/25 right, 20/30 left with glasses (looks good)", "Glasses last updated over a year ago"],
      ai: true,
      generatedAt: daysAgo(0),
    },
    sessions: [
      { id: "chk-asha-2", profileId: "pf-asha", date: daysAgo(3), mode: "full", headline: "One thing to follow up with a doctor", status: "see_doctor", tests: ["tumbling_e", "near_reading", "amsler", "contrast"], scores: { tumbling_e: 84, near_reading: 62, amsler: 40, contrast: 76 }, shopName },
      { id: "chk-asha-1", profileId: "pf-asha", date: daysAgo(70), mode: "quick", headline: "Your eyes look healthy", status: "good", tests: ["tumbling_e", "amsler", "clock_dial"], scores: { tumbling_e: 86, amsler: 100, clock_dial: 92 } },
    ],
  },
  "pf-ravi": {
    patient: { gender: "Male", wearsGlasses: true, healthConditions: ["High blood pressure"], glasses: null },
    summary: {
      text: "Ravi had a first consult two days ago for trouble reading and night glare; reading glasses (+2.00 add) and lubricating drops were prescribed. His last check showed near vision at N10 and normal Amsler grids.",
      points: ["Near vision N10 in both eyes (mild change)", "Glare at night: moderate on the questionnaire", "Amsler grid normal in both eyes"],
      ai: true,
      generatedAt: daysAgo(0),
    },
    sessions: [{ id: "chk-ravi-1", profileId: "pf-ravi", date: daysAgo(4), mode: "full", headline: "Reading print needs a closer look", status: "mild", tests: ["near_reading", "glare_night", "amsler"], scores: { near_reading: 68, glare_night: 55, amsler: 100 }, shopName }],
  },
};

/** The mock checks on record for a profile (shown on the clinic's patient page too). */
export const sessionsFor = (profileId: string): SessionSummary[] => FILES[profileId]?.sessions ?? [];

/** Rule fallback, as the server writes it when the AI is unavailable. */
const NO_AI: FileExtras = {
  patient: { wearsGlasses: false, healthConditions: [], glasses: null },
  summary: { text: "No Visus checks on record yet. Ask about the reason for this consult, and send a test during the call if it helps.", points: [], ai: false, generatedAt: daysAgo(0) },
  sessions: [],
};

export async function file(id: string): Promise<PatientFile> {
  await delay(400);
  const w = world();
  const c = w.consults.find((x) => x.id === id);
  if (!c) throw new Error("Consult not found");
  const extras = FILES[c.patient.profileId] ?? NO_AI;
  return {
    patient: { ...c.patient, ...extras.patient },
    summary: extras.summary,
    sessions: extras.sessions,
    prescriptions: w.prescriptions.filter((p) => p.patient.profileId === c.patient.profileId && p.status === "final").map((p) => rxNow(p, w)),
    consults: w.consults.filter((x) => x.patient.profileId === c.patient.profileId && x.id !== id).map((x) => summary(x, w)),
  };
}

// ---------- The call ----------
// With no patient device polling (no patient or clinic tab open on this consult), the mock plays the
// patient: it answers a pushed test after ~10 s and says a few scripted lines as captions. On a
// patient or clinic device with no doctor polling, it plays the doctor: a few lines and one test.

const UID = { doctor: 1, patient: 2, clinic: 3 } as const;
const liveOf = (w: World, id: string): Live => (w.live ??= {})[id] ?? (w.live[id] = { tests: [], captions: [] });
const findConsult = (w: World, id: string) => {
  const c = w.consults.find((x) => x.id === id);
  if (!c) throw new Error("Consult not found");
  return c;
};

export async function join(id: string): Promise<JoinConsultResponse> {
  await delay(300);
  const w = world();
  const c = findConsult(w, id);
  const start = Date.parse(c.startsAt);
  if (c.status === "cancelled" || c.status === "completed") throw new Error("This consult has ended.");
  if (Date.now() < start - 10 * 60_000) throw new Error("You can join from 10 minutes before the start.");
  if (c.status !== "live" && Date.now() > start + c.minutes * 60_000) throw new Error("This consult's time has passed.");
  c.status = "live";
  liveOf(w, id).joinedAt ??= new Date().toISOString();
  saveWorld(w);
  const role = myRole();
  // Mock only. Either an Agora project in testing mode (App ID, no token), or a project with a
  // certificate plus a temporary token from the Agora console for one fixed channel name. The real
  // App ID and token come from the server (POST /consults/:id/join).
  return {
    appId: process.env.NEXT_PUBLIC_AGORA_TEST_APP_ID ?? "",
    channel: process.env.NEXT_PUBLIC_AGORA_TEST_CHANNEL || id,
    token: process.env.NEXT_PUBLIC_AGORA_TEST_TOKEN || null,
    uid: UID[role],
    role,
    expiresAt: new Date(Date.now() + 2 * 3_600_000).toISOString(),
  };
}

export async function end(id: string): Promise<ConsultSummary> {
  await delay();
  const w = world();
  const c = findConsult(w, id);
  c.status = "completed";
  saveWorld(w);
  return summary(c, w);
}

const PATIENT_LINES: [string, string][] = [
  ["नमस्ते डॉक्टर, पढ़ते समय मुझे अक्षर धुंधले दिखते हैं।", "Hello doctor, letters look blurry when I read."],
  ["यह लगभग तीन महीने से हो रहा है।", "It has been happening for about three months."],
  ["बाईं आँख में सीधी रेखाएँ थोड़ी टेढ़ी लगती हैं।", "In my left eye, straight lines look a little wavy."],
  ["रात में गाड़ी चलाते समय चकाचौंध भी होती है।", "I also get glare when driving at night."],
];
const presenceKey = (id: string) => `presence-${id}`;
const doctorPresenceKey = (id: string) => `presence-doctor-${id}`;

const DOCTOR_LINES: [string, string][] = [
  ["Hello, I'm looking at your Visus results now.", "नमस्ते, मैं अभी आपके Visus नतीजे देख रही हूँ।"],
  ["I'm sending you a test. Follow the steps on your screen.", "मैं आपको एक टेस्ट भेज रही हूँ। स्क्रीन पर दिए चरणों का पालन करें।"],
  ["Thank you. I can see your result here.", "धन्यवाद। मुझे आपका नतीजा यहाँ दिख रहा है।"],
  ["I'll write your prescription now.", "मैं अब आपका पर्चा लिख रही हूँ।"],
];

/** The mock doctor, on a patient or clinic device while no doctor is polling this consult. */
function playDoctor(c: MockConsult, l: Live) {
  if (Date.now() - load<number>(doctorPresenceKey(c.id), 0) < 6_000 || c.status !== "live") return;
  l.botFrom ??= new Date().toISOString();
  const elapsed = Date.now() - Date.parse(l.botFrom);
  const said = l.captions.filter((x) => x.from === "doctor").length;
  const done = l.tests.some((t) => t.status === "done");
  // Line 3 waits for the test result; the others come every 15 s.
  const due = Math.min(Math.floor((elapsed - 3_000) / 15_000) + 1, done ? DOCTOR_LINES.length : 2);
  if (said < due) {
    const [en, hi] = DOCTOR_LINES[said];
    const english = c.language === "en";
    l.captions.push({ id: newId("cap"), at: new Date().toISOString(), from: "doctor", language: "en", text: en, translations: english ? {} : { [c.language]: hi } });
  }
  if (said >= 2 && l.tests.length === 0) l.tests.push({ id: newId("ct"), testId: "amsler", eye: "left", status: "pushed", pushedAt: new Date().toISOString(), result: null });
}

/** The mock patient, while no patient or clinic device is polling this consult. */
function playPatient(w: World, c: MockConsult, l: Live) {
  if (Date.now() - load<number>(presenceKey(c.id), 0) < 6_000 || c.status !== "live" || !l.joinedAt) return;
  const pending = l.tests.find((t) => t.status === "pushed");
  if (pending && Date.now() - Date.parse(pending.pushedAt) > 10_000) Object.assign(pending, { status: "done", result: cannedResult(pending.testId, pending.eye) });
  const said = l.captions.filter((x) => x.from === "patient").length;
  const due = Math.floor((Date.now() - Date.parse(l.joinedAt) - 8_000) / 20_000) + 1;
  if (said < Math.min(due, PATIENT_LINES.length)) {
    const [hi, en] = PATIENT_LINES[said];
    const english = c.language === "en";
    l.captions.push({ id: newId("cap"), at: new Date().toISOString(), from: "patient", language: english ? "en" : "hi", text: english ? en : hi, translations: english ? {} : { en } });
  }
}

export async function live(id: string, after?: string): Promise<LiveState> {
  await delay(80);
  const w = world();
  const c = findConsult(w, id);
  const l = liveOf(w, id);
  if (myRole() === "doctor") {
    save(doctorPresenceKey(id), Date.now());
    playPatient(w, c, l);
  } else {
    save(presenceKey(id), Date.now());
    playDoctor(c, l);
  }
  saveWorld(w);
  const from = after ? l.captions.findIndex((x) => x.id === after) + 1 : 0;
  return {
    status: summary(c, w).status,
    pendingTest: l.tests.find((t) => t.status === "pushed") ?? null,
    tests: l.tests,
    captions: l.captions.slice(from),
    prescriptionSaved: w.prescriptions.some((p) => p.consultId === id && p.status === "final"),
  };
}

export async function caption(id: string, input: NewCaption): Promise<Caption> {
  await delay(120);
  const w = world();
  const c = findConsult(w, id);
  const role = myRole();
  // Mock: no translation service, so other languages get the words as said (the server's fallback too).
  const others = [doctorPublic().languages[0] ?? "en", c.language].filter((l) => l !== input.language);
  const cap: Caption = { id: newId("cap"), at: new Date().toISOString(), from: role, language: input.language, text: input.text, translations: Object.fromEntries(others.map((l) => [l, input.text])) };
  liveOf(w, id).captions.push(cap);
  saveWorld(w);
  return cap;
}

export async function pushTest(id: string, input: NewTest): Promise<ConsultTest> {
  await delay(200);
  const w = world();
  const l = liveOf(w, id);
  if (l.tests.some((t) => t.status === "pushed")) throw new Error("Wait for the current test to finish, or cancel it.");
  const t: ConsultTest = { id: newId("ct"), testId: input.testId, eye: input.eye, status: "pushed", pushedAt: new Date().toISOString(), result: null };
  l.tests.push(t);
  saveWorld(w);
  return t;
}

function changeTest(id: string, rowId: string, change: Partial<ConsultTest>): ConsultTest {
  const w = world();
  const t = liveOf(w, id).tests.find((x) => x.id === rowId);
  if (!t) throw new Error("Test not found");
  if (t.status !== "pushed") throw new Error("That test is already finished.");
  Object.assign(t, change);
  saveWorld(w);
  return t;
}

export async function cancelTest(id: string, rowId: string): Promise<ConsultTest> {
  await delay(150);
  return changeTest(id, rowId, { status: "cancelled" });
}

export async function submitTest(id: string, rowId: string, r: SubmitResult): Promise<ConsultTest> {
  await delay(400);
  return changeTest(id, rowId, { status: "done", result: cannedResult(r.testId, r.eye) });
}

export async function savePrescription(id: string, input: SavePrescriptionRequest): Promise<ConsultPrescription> {
  await delay(250);
  const w = world();
  const c = findConsult(w, id);
  const { final, ...fields } = input;
  const old = w.prescriptions.find((p) => p.consultId === id);
  const rx: ConsultPrescription = {
    ...fields,
    id: old?.id ?? newId("rx"),
    consultId: id,
    date: new Date().toISOString(),
    status: final ? "final" : "draft",
    doctor: doctorOf(c.doctorId),
    clinic: c.clinic,
    patient: c.patient,
    followUpConsultId: old?.followUpConsultId ?? null,
    translated: null, // mock: the server translates into the patient's language
  };
  if (final) {
    // The follow-up is booked at the same clinic: the server takes the doctor's first free slot that day.
    if (input.followUpDate && !rx.followUpConsultId) {
      const at = new Date(`${input.followUpDate}T16:00:00`);
      const next: MockConsult = { ...c, id: newId("cs"), startsAt: at.toISOString(), status: "scheduled", kind: "follow_up", reason: `Follow-up: ${input.symptoms.slice(0, 120) || c.reason}` };
      w.consults.push(next);
      rx.followUpConsultId = next.id;
    }
    c.status = "completed";
  }
  w.prescriptions = [...w.prescriptions.filter((p) => p.consultId !== id), rx];
  saveWorld(w);
  return rx;
}

export async function prescription(id: string): Promise<ConsultPrescription | null> {
  await delay(150);
  const rx = world().prescriptions.find((p) => p.consultId === id) ?? null;
  return rx && (rx.status === "final" || myRole() === "doctor") ? rxNow(rx) : null;
}
