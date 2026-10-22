// Stand-in for the server (NEXT_PUBLIC_USE_MOCK=1). Scores here are canned;
// the real scoring and rules live in apps/server.
import {
  TEST_CATALOG,
  type Category,
  type IntakeChatResponse,
  type IntakeMessage,
  type NextStep,
  type ScoredResult,
  type SessionSummary,
  type Status,
  type SubmitResult,
  type TestId,
  type Verdict,
} from "@visus/shared";

import type { CheckMode, CreatedSession, NewSession } from "../sessions";
import { delay, load, save, uid } from "./store";

type MockSession = { id: string; profileId: string; mode: CheckMode; date: string; plan: TestId[]; results: ScoredResult[]; redFlagShown: boolean };

const REASONS: Partial<Record<TestId, string>> = {
  tumbling_e: "Sharpness of far-away detail",
  clock_dial: "Can make lights streak at night",
  amsler: "Checks your central vision",
  contrast: "Night blur often starts here",
  kids_tumbling_e: "Sharpness, made into a game",
  kids_colour_shapes: "Colour vision with shapes",
};

const eye = (value: string, score: number, status: Status) => ({ value, score, status });

const CANNED: Record<TestId, Omit<ScoredResult, "testId" | "eye">> = {
  tumbling_e: { score: 82, status: "mild", summary: "Right eye 20/20, left eye 20/30", eyes: { right: eye("20/20", 92, "good"), left: eye("20/30", 74, "mild") }, meaning: "Your left eye reads one line less than your right.", tip: "Ask your eye doctor to recheck your left lens." },
  near_reading: { score: 90, status: "good", summary: "Smallest clear line N8" },
  near_point: { score: 84, status: "good", summary: "Right eye 11 cm, left eye 13 cm" },
  clock_dial: { score: 92, status: "good", summary: "Right eye even, left eye even" },
  duochrome: { score: 88, status: "good", summary: "Right eye balanced, left eye balanced" },
  amsler: { score: 40, status: "see_doctor", summary: "Right eye grid normal, left eye wavy lines" },
  contrast: { score: 76, status: "mild", summary: "Faintest seen: 3 of 6" },
  colour_plates: { score: 95, status: "good", summary: "11 of 12 plates read" },
  kids_tumbling_e: { score: 88, status: "good", summary: "Right eye 6/9, left eye 6/9" },
  kids_colour_shapes: { score: 100, status: "good", summary: "6 of 6 shapes found" },
  risk_screener: { score: 70, status: "mild", summary: "2 risk factors" },
  eye_strain: { score: 65, status: "mild", summary: "Moderate eye strain" },
  glare_night: { score: 60, status: "mild", summary: "Some glare at night" },
  peripheral_field: { score: 90, status: "good", summary: "Right eye 24 of 24, left eye 22 of 24" },
};

const PLANS: Record<Exclude<CheckMode, "single">, TestId[]> = {
  full: ["tumbling_e", "clock_dial", "amsler", "contrast"],
  quick: ["tumbling_e", "amsler", "clock_dial"],
  glasses: ["tumbling_e", "tumbling_e"],
};

const sessions = () => load<Record<string, MockSession>>("sessions-v2", {});
const put = (s: MockSession) => save("sessions-v2", { ...sessions(), [s.id]: s });

const FOLLOW_UPS: [string, string[]][] = [
  ["Is it in both eyes, or one more than the other?", ["Both eyes", "Mostly left", "Mostly right"]],
  ["How long has it been happening?", ["A few days", "A few weeks", "Months or more"]],
  ["Any pain, redness or flashes of light?", ["None of those", "Some discomfort", "Yes, flashes"]],
];

export async function intakeChat(messages: IntakeMessage[]): Promise<IntakeChatResponse> {
  await delay(900);
  const asked = messages.filter((m) => m.from === "ai").length - 1;
  if (asked >= FOLLOW_UPS.length) return { reply: "", chips: [], done: true };
  const [reply, chips] = FOLLOW_UPS[asked];
  return { reply, chips, done: false };
}

export async function create(input: NewSession): Promise<CreatedSession> {
  await delay(900);
  const child = load<{ id: string; isChild: boolean }[]>("profiles-v2", []).find((p) => p.id === input.profileId)?.isChild ?? input.profileId === "p2";
  const mode = input.mode ?? "full";
  const plan = mode === "single" && input.testId ? [input.testId] : mode === "full" && child ? (["kids_tumbling_e", "kids_colour_shapes"] as TestId[]) : PLANS[mode === "single" ? "full" : mode];
  const s: MockSession = { id: uid(), profileId: input.profileId, mode, date: new Date().toISOString(), plan, results: [], redFlagShown: false };
  put(s);
  return {
    sessionId: s.id,
    summary: input.intake ? "Based on blurry distance vision at night, in both eyes." : "A quick read on sharpness, focus and central vision.",
    plan: plan.map((testId) => ({ testId, reason: REASONS[testId] ?? "Picked for you" })),
  };
}

export async function submit(sessionId: string, r: SubmitResult): Promise<NextStep> {
  await delay(700);
  const s = sessions()[sessionId] ?? { id: sessionId, profileId: "p1", mode: "full", date: new Date().toISOString(), plan: PLANS.full, results: [], redFlagShown: false };
  if (s.mode === "glasses") {
    const off = r.answers.round === "glasses_off";
    const result: ScoredResult = off
      ? { testId: r.testId, eye: r.eye, score: 45, status: "mild", summary: "Without glasses: right eye 20/40, left eye 20/50", eyes: { right: eye("20/40", 50, "mild"), left: eye("20/50", 40, "mild") } }
      : { testId: r.testId, eye: r.eye, score: 92, status: "good", summary: "With glasses: right eye 20/20, left eye 20/20", eyes: { right: eye("20/20", 92, "good"), left: eye("20/20", 92, "good") } };
    s.results = [...s.results, result];
    put(s);
    return off ? { type: "next_test", result, testId: "tumbling_e", reason: "Now with your glasses on", added: false } : { type: "done", result };
  }
  const result: ScoredResult = { testId: r.testId, eye: r.eye, ...CANNED[r.testId] };
  s.results = [...s.results.filter((x) => x.testId !== r.testId), result];

  if (r.testId === "amsler" && !s.redFlagShown) {
    s.redFlagShown = true;
    put(s);
    return { type: "red_flag", result, finding: "Wavy lines near the centre" };
  }
  put(s);
  const next = s.plan.find((id) => !s.results.some((x) => x.testId === id));
  if (!next) return { type: "done", result };
  return { type: "next_test", result, testId: next, reason: REASONS[next] ?? "Next in your plan", added: false };
}

/** Guest mode: one test, scored, nothing kept. */
export async function guestScore(r: SubmitResult): Promise<NextStep> {
  await delay(500);
  const result: ScoredResult = { testId: r.testId, eye: r.eye, ...CANNED[r.testId] };
  return r.testId === "amsler" ? { type: "red_flag", result, finding: "Wavy lines near the centre" } : { type: "done", result };
}

const RANK: Status[] = ["good", "mild", "see_doctor"];
const worst = (a: Status | undefined, b: Status): Status => (!a || RANK.indexOf(b) > RANK.indexOf(a) ? b : a);

const LENS: Verdict["lens"] = [
  {
    product: "ZEISS DriveSafe",
    lensType: "Single vision lens",
    reason: "You noticed blurry signs at night. These lenses cut headlight glare and keep detail clear in low light.",
    coatings: [
      { name: "ZEISS BlueGuard", reason: "For your 4h+ of daily screen time" },
      { name: "DuraVision Platinum UV", reason: "Fewer reflections, resists scratches" },
    ],
  },
  { product: "ZEISS SmartLife", lensType: "Single vision lens", reason: "Made for a life that switches between screens and the world around you, all day.", coatings: [{ name: "DuraVision Platinum UV", reason: "Fewer reflections, resists scratches" }] },
];

export async function verdict(sessionId: string): Promise<Verdict> {
  await delay(500);
  const s = sessions()[sessionId];
  const results: ScoredResult[] = s?.results.length ? s.results : PLANS.full.map((testId) => ({ testId, eye: "both", ...CANNED[testId] }));
  const areas: Partial<Record<Category, Status>> = {};
  for (const r of results) {
    const cat = TEST_CATALOG.find((t) => t.id === r.testId)!.category;
    areas[cat] = worst(areas[cat], r.status);
  }
  const doctor = results.some((r) => r.status === "see_doctor");
  return {
    sessionId,
    headline: doctor ? "Mostly healthy, one thing to follow up" : "Your eyes look healthy",
    advice: doctor ? "Book an eye doctor for your left eye this week." : "Check again in about 3 months.",
    areas,
    results,
    lens: LENS,
    date: s?.date ?? "2026-10-12T10:00:00Z",
    minutes: results.reduce((n, r) => n + (TEST_CATALOG.find((t) => t.id === r.testId)?.minutes ?? 1), 0),
  };
}

const PAST: SessionSummary[] = [
  { id: "past-oct", profileId: "p1", date: "2026-10-12T10:00:00Z", mode: "full", headline: "Your eyes look healthy", status: "good", tests: ["tumbling_e", "contrast", "colour_plates", "amsler"], scores: { tumbling_e: 86, contrast: 76, colour_plates: 95 } },
  { id: "past-sep", profileId: "p1", date: "2026-09-14T10:00:00Z", mode: "single", headline: "A little soft in one eye", status: "mild", tests: ["tumbling_e"], scores: { tumbling_e: 84 } },
  { id: "past-aug", profileId: "p1", date: "2026-08-20T10:00:00Z", mode: "full", headline: "Your eyes look healthy", status: "good", tests: ["tumbling_e", "contrast", "colour_plates"], scores: { tumbling_e: 82, contrast: 73, colour_plates: 93 } },
  { id: "past-jul", profileId: "p1", date: "2026-07-18T10:00:00Z", mode: "full", headline: "Your eyes look healthy", status: "good", tests: ["tumbling_e", "contrast", "colour_plates"], scores: { tumbling_e: 79, contrast: 71, colour_plates: 94 } },
  { id: "past-jun", profileId: "p1", date: "2026-06-10T10:00:00Z", mode: "full", headline: "Your eyes look healthy", status: "good", tests: ["tumbling_e", "contrast", "colour_plates"], scores: { tumbling_e: 80, contrast: 72, colour_plates: 92 } },
  { id: "past-may", profileId: "p1", date: "2026-05-08T10:00:00Z", mode: "full", headline: "Your eyes look healthy", status: "good", tests: ["tumbling_e", "contrast", "colour_plates"], scores: { tumbling_e: 78, contrast: 70, colour_plates: 92 } },
];

export async function list(): Promise<SessionSummary[]> {
  await delay(250);
  const own = Object.values(sessions())
    .filter((s) => s.results.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(
      (s): SessionSummary => ({
        id: s.id,
        profileId: s.profileId,
        date: s.date,
        mode: s.mode,
        headline: "",
        status: s.results.reduce<Status>((w, r) => worst(w, r.status), "good"),
        tests: s.results.map((r) => r.testId),
        scores: Object.fromEntries(s.results.map((r) => [r.testId, r.score])),
      }),
    );
  return [...own, ...PAST];
}

export async function share(sessionId: string) {
  await delay(400);
  return { url: `${typeof location !== "undefined" ? location.origin : "https://visus.app"}/r/${sessionId}`, expiresAt: new Date(Date.now() + 864e5).toISOString() };
}
