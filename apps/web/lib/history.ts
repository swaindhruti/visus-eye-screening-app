import type { SessionSummary, TestId } from "@visus/shared";

import { MONTHS } from "./dates";
import { categoryOf, TEST_COPY, testInfo } from "./tests";

/** "Full eye check", "Quick check", or the test name for a single test. */
export function sessionTitle(s: SessionSummary) {
  if (s.mode === "single" && s.tests[0]) return TEST_COPY[s.tests[0]].title;
  return s.mode === "quick" ? "Quick check" : s.mode === "glasses" ? "Glasses check" : "Full eye check";
}

/** Second line on a past check: the test's group for a single test, else "4 tests". */
export function sessionSub(s: SessionSummary) {
  if (s.mode === "single" && s.tests[0]) return categoryOf(testInfo(s.tests[0]).category).label;
  return `${s.tests.length} ${s.tests.length === 1 ? "test" : "tests"}`;
}

const TRENDS: [string, TestId][] = [
  ["Sharpness", "tumbling_e"],
  ["Contrast", "contrast"],
  ["Colour", "colour_plates"],
];

export type Trend = { label: string; months: string[]; values: number[] };

/** Results tab chart: the last 6 scores per test the server returned, oldest first. */
export function trends(sessions: SessionSummary[]): Trend[] {
  return TRENDS.map(([label, id]) => {
    const points = sessions
      .filter((s) => s.scores[id] != null)
      .slice(0, 6)
      .reverse();
    return { label, months: points.map((s) => MONTHS[new Date(s.date).getMonth()]), values: points.map((s) => s.scores[id]!) };
  }).filter((t) => t.values.length > 0);
}
