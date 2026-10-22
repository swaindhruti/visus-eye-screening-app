// Small helpers shared by the scorers. Answers come straight from the apps, so read them defensively.
import type { Eye, EyeResult, ScoredResult, Status } from '@visus/shared';

export type Answers = Record<string, unknown>;
export type Scored = Omit<ScoredResult, 'testId' | 'eye'>;
/** What the scorers may know about the person (from the session's profile). */
export type Ctx = { age?: number; isChild?: boolean };

const RANK: Record<Status, number> = { good: 0, mild: 1, see_doctor: 2 };
export const worst = (...list: Status[]): Status => list.reduce<Status>((a, b) => (RANK[b] > RANK[a] ? b : a), 'good');
export const isWorse = (a: Status, b: Status) => RANK[a] > RANK[b];

export const clamp = (n: number, lo = 0, hi = 100) => Math.round(Math.min(hi, Math.max(lo, n)));
export const obj = (v: unknown): Answers | undefined => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Answers) : undefined);
export const arr = <T = Answers>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
export const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "right eye", "left eye" or "both eyes", for sentences. */
export function eyesLabel(sides: ('right' | 'left')[]) {
  if (sides.length === 2) return 'both eyes';
  return sides.length === 1 ? `${sides[0]} eye` : 'your eyes';
}

/** "Your right eye", "Both your eyes" or "Your eyes", to start a sentence (never "Your both eyes"). */
export function yourEyes(sides: ('right' | 'left')[]) {
  if (sides.length === 2) return 'Both your eyes';
  return sides.length === 1 ? `Your ${sides[0]} eye` : 'Your eyes';
}

type Side = 'right' | 'left';
export type EyeScore = EyeResult & { note?: string };

/**
 * Tests done one eye at a time send { right, left } in one result (docs/API.md).
 * A result for a single eye (eye "right"/"left") may also send that eye's answers directly.
 */
export function scoreEachEye(answers: Answers, eye: Eye, scoreEye: (a: Answers) => EyeScore) {
  const right = obj(answers.right);
  const left = obj(answers.left);
  const eyes: Partial<Record<Side, EyeScore>> = {};
  if (right || left) {
    if (right) eyes.right = scoreEye(right);
    if (left) eyes.left = scoreEye(left);
  } else {
    eyes[eye === 'left' ? 'left' : 'right'] = scoreEye(answers);
  }
  const list = Object.values(eyes) as EyeScore[];
  const status = worst(...list.map((e) => e.status));
  const score = clamp(list.reduce((s, e) => s + e.score, 0) / Math.max(1, list.length));
  /** Sides with a status worse than good, right first. */
  const flagged = (['right', 'left'] as Side[]).filter((s) => eyes[s] && eyes[s]!.status !== 'good');
  const strip = (e?: EyeScore): EyeResult | undefined => e && { value: e.value, score: e.score, status: e.status, ...(e.detail ? { detail: e.detail } : {}) };
  return { eyes, score, status, flagged, result: { right: strip(eyes.right), left: strip(eyes.left) } };
}

/** "Right eye 20/20, left eye 20/30" or the one eye that was tested. */
export function eachEyeSummary(eyes: Partial<Record<Side, EyeScore>>) {
  const text = (['right', 'left'] as Side[])
    .filter((s) => eyes[s])
    .map((s) => `${s} eye ${eyes[s]!.value}`)
    .join(', ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}
