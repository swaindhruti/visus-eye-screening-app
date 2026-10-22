// Scorers for tumbling_e and kids_tumbling_e (distance acuity, Tumbling E chart).
// Each trial: { line: "6/24", shown, answer }. A line counts as read when more answers on it were right than wrong.
import { arr, clamp, eachEyeSummary, obj, scoreEachEye, yourEyes, type Answers, type Ctx, type EyeScore, type Scored } from './helpers';

type Trial = { line?: unknown; shown?: unknown; answer?: unknown };

/** Denominator of a 6/x line, e.g. "6/24" → 24. */
const denominator = (line: unknown) => Number(/6\/(\d+(?:\.\d+)?)/.exec(String(line))?.[1]) || null;

/** The smallest line read (6/x denominator), or null when no line was read. */
export function bestLine(trials: Trial[]) {
  const tally = new Map<number, { right: number; wrong: number }>();
  for (const t of trials) {
    const d = denominator(t.line);
    if (!d) continue;
    const row = tally.get(d) ?? { right: 0, wrong: 0 };
    if (t.answer === t.shown) row.right++;
    else row.wrong++;
    tally.set(d, row);
  }
  let best: number | null = null;
  for (const [d, t] of tally) if (t.right > t.wrong && (best === null || d < best)) best = d;
  return best;
}

/** 6/x as US feet: 6/6 → "20/20", 6/9 → "20/30". */
const feet = (d: number) => `20/${d === 5 ? 16 : Math.round((d * 20) / 6)}`;

function scoreEye(a: Answers, kids: boolean): EyeScore {
  const trials = arr<Trial>(a.trials);
  const best = bestLine(trials);
  const right = trials.filter((t) => t.answer === t.shown).length;
  const detail = trials.length ? `${right} of ${trials.length} letters right` : 'No answers';
  if (best === null) return { value: 'Below 20/200', score: 5, status: 'see_doctor', detail };
  const logMar = Math.log10(best / 6);
  // Children's normal range is wider: 6/9 is the smallest kids line.
  const status = kids ? (best <= 9 ? 'good' : best <= 12 ? 'mild' : 'see_doctor') : best <= 7.5 ? 'good' : best <= 18 ? 'mild' : 'see_doctor';
  return { value: feet(best), score: clamp(90 - logMar * 80), status, detail, note: String(best) };
}

function scoreChart(answers: Answers, eye: Parameters<typeof scoreEachEye>[1], kids: boolean): Scored {
  const { eyes, score, status: eyeStatus, flagged, result } = scoreEachEye(answers, eye, (a) => scoreEye(a, kids));
  let status = eyeStatus;
  // Two or more lines between the eyes is worth a check, even when each eye alone is fine.
  const r = Number(eyes.right?.note);
  const l = Number(eyes.left?.note);
  const gap = r && l && Math.abs(Math.log10(r / l)) >= 0.19;
  if (gap && status === 'good') status = 'mild';

  const calibrated = [obj(answers.right), obj(answers.left), answers].some((a) => a?.calibrated === true);
  const subject = yourEyes(flagged);
  const summary =
    status === 'good' ? 'Both eyes see far detail sharply' : gap && flagged.length === 0 ? `One eye sees less sharply: ${eachEyeSummary(eyes)}` : eachEyeSummary(eyes);
  const meaning =
    status === 'good'
      ? kids
        ? 'Both eyes saw the small Es well for their age.'
        : 'You read small letters well with each eye, so far-away detail looks sharp.'
      : status === 'mild'
        ? flagged.length
          ? `${subject} read larger letters than expected. Signs and faces far away can look a little soft, especially at night. Glasses or an updated prescription often fix this.`
          : 'One eye reads two or more lines less than the other. An eye test can find out why.'
        : `${subject} only read large letters. Please have an eye doctor check your vision soon.`;
  const tip =
    status === 'good'
      ? undefined
      : kids
        ? "Book an eye test for your child. Children don't always notice when one eye sees less well."
        : status === 'mild'
          ? 'Ask an optician to check your prescription. A small update often fixes this.'
          : 'Book an eye exam soon and show them this result.';
  return {
    score,
    status,
    summary,
    eyes: result,
    meaning: calibrated ? meaning : `${meaning} Your screen wasn't calibrated, so this is a rough result.`,
    ...(tip ? { tip } : {}),
  };
}

export function scoreTumblingE(answers: Answers, eye: Parameters<typeof scoreEachEye>[1], ctx: Ctx): Scored {
  // Glasses check from the web app: both rounds in one result.
  const off = obj(answers.glassesOff);
  const on = obj(answers.glassesOn);
  if (off && on) {
    const without = scoreChart(off, eye, false);
    const withGlasses = scoreChart(on, eye, false);
    // "Right eye 20/40 → 20/20, left eye 20/50 → 20/20" (without → with): the web glasses result reads this.
    const sides = (['right', 'left'] as const).filter((side) => withGlasses.eyes?.[side]);
    const text = sides.map((side) => `${side} eye ${without.eyes?.[side]?.value ?? '?'} → ${withGlasses.eyes![side]!.value}`).join(', ');
    return { ...withGlasses, summary: text.charAt(0).toUpperCase() + text.slice(1) };
  }
  const scored = scoreChart(answers, eye, !!ctx.isChild && (ctx.age ?? 99) < 8);
  if (answers.round === 'glasses_off') return { ...scored, summary: `Without glasses: ${scored.summary}` };
  if (answers.round === 'glasses_on') return { ...scored, summary: `With glasses: ${scored.summary}` };
  return scored;
}

export const scoreKidsTumblingE = (answers: Answers, eye: Parameters<typeof scoreEachEye>[1]) => scoreChart(answers, eye, true);
