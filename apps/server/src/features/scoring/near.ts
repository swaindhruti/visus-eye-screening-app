// Scorers for near_reading and near_point (close-up vision).
import type { Eye } from '@visus/shared';

import { clamp, eachEyeSummary, num, scoreEachEye, yourEyes, type Answers, type Ctx, type Scored } from './helpers';

/** near_reading: { smallestRead: "N8" } (mobile) or { smallestLine: "N8" } (web), both eyes together. */
export function scoreNearReading(answers: Answers, ctx: Ctx): Scored {
  const label = answers.smallestRead ?? answers.smallestLine;
  const n = Number(/N?(\d+)/i.exec(String(label ?? ''))?.[1]) || null;
  if (!n)
    return {
      score: 5,
      status: 'see_doctor',
      summary: "Couldn't read the print",
      meaning: "You couldn't read even the largest line at reading distance. Please have an eye doctor check your near vision.",
      tip: 'Book an eye exam soon.',
    };
  const score = n <= 5 ? 100 : n <= 6 ? 95 : n <= 8 ? 85 : n <= 10 ? 72 : n <= 12 ? 62 : n <= 14 ? 52 : n <= 18 ? 40 : n <= 24 ? 25 : 15;
  const status = n <= 8 ? 'good' : n <= 18 ? 'mild' : 'see_doctor';
  if (status === 'good')
    return { score, status, summary: 'Reads small print comfortably', meaning: `You read down to N${n} print at reading distance, about newspaper size or smaller.` };
  const over40 = (ctx.age ?? 0) >= 40;
  return {
    score,
    status,
    summary: status === 'mild' ? `Needs slightly bigger print (N${n})` : `Needs large print (N${n})`,
    meaning:
      status === 'mild'
        ? over40
          ? `You need print a bit bigger than normal at reading distance. After 40 this is very common (presbyopia), and reading or progressive lenses fix it.`
          : 'You need print a bit bigger than normal at reading distance. An eye test can show if reading glasses would help.'
        : 'You only read large print at reading distance. Please have your near vision checked by an eye doctor.',
    tip: status === 'mild' ? 'Ask an optician about reading or progressive lenses.' : 'Book an eye exam soon and show them this result.',
  };
}

/** Furthest near point that is still normal for this age, in cm (Hofstetter's minimum amplitude). */
const normalNearPointCm = (age: number) => 100 / Math.max(1, 15 - 0.25 * age);

/** near_point, per eye: { blurCm } (mobile) or { cm } (web). */
export function scoreNearPoint(answers: Answers, eye: Eye, ctx: Ctx): Scored {
  const age = ctx.age ?? 30;
  const limit = normalNearPointCm(age);
  const { eyes, score, status, flagged, result } = scoreEachEye(answers, eye, (a) => {
    const cm = num(a.blurCm) ?? num(a.cm);
    if (cm === undefined) return { value: 'No answer', score: 50, status: 'mild' };
    const value = `${Math.round(cm)} cm`;
    if (cm <= limit) return { value, score: clamp(100 - (cm / limit) * 15), status: 'good' };
    return { value, score: cm <= limit * 1.5 ? 70 : 55, status: 'mild', detail: `Normal for your age: up to ${Math.round(limit)} cm` };
  });
  if (status === 'good')
    return { score, status, summary: 'Focuses close up as expected', eyes: result, meaning: 'Your eyes keep text sharp until it is quite close, which is normal for your age.' };
  return {
    score,
    status,
    summary: `Close focus is further than expected: ${eachEyeSummary(eyes)}`,
    eyes: result,
    meaning:
      age >= 40
        ? `${yourEyes(flagged)} can't focus as close as expected. This is the usual start of presbyopia, and reading or progressive lenses make close work easy again.`
        : `${yourEyes(flagged)} can't focus as close as expected for your age. This can cause tired eyes when reading; an eye test can find out why.`,
    tip: age >= 40 ? 'Ask an optician about progressive or reading lenses.' : 'Mention this at your next eye test.',
  };
}
