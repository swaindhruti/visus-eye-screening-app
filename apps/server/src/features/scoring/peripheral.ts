// Scorer for peripheral_field (side vision), per eye.
// Mobile: { trials: [{ angleDeg, xMm, yMm, seen }], falseTaps }. Web: { seen: boolean[24], falseTaps } (positions from FIELD_POINTS).
import type { Eye } from '@visus/shared';

import { arr, num, scoreEachEye, yourEyes, type Answers, type Scored } from './helpers';

type Dot = { angleDeg: number; xMm: number; yMm: number; seen: boolean };

/** The web app's 24 dots: 3 rings × 8 directions, radius as a fraction of the field (about 40 mm). */
function webDot(i: number, seen: boolean): Dot {
  const deg = -90 + (i % 8) * 45;
  const r = [0.29, 0.58, 0.86][Math.floor(i / 8)] * 40;
  const rad = (deg * Math.PI) / 180;
  return { angleDeg: (deg + 360) % 360, xMm: +(Math.cos(rad) * r).toFixed(1), yMm: +(Math.sin(rad) * r).toFixed(1), seen };
}

function dotsOf(a: Answers): Dot[] {
  const trials = arr<Partial<Dot>>(a.trials);
  if (trials.length)
    return trials.map((t) => ({ angleDeg: num(t.angleDeg) ?? 0, xMm: num(t.xMm) ?? 0, yMm: num(t.yMm) ?? 0, seen: t.seen === true }));
  return arr<boolean>(a.seen).map((s, i) => webDot(i, s === true));
}

export function scorePeripheral(answers: Answers, eye: Eye): Scored {
  const field: { right?: Dot[]; left?: Dot[] } = {};
  const { eyes, score, status, flagged, result } = scoreEachEye(answers, eye, (a) => {
    const dots = dotsOf(a);
    const seen = dots.filter((d) => d.seen).length;
    const missed = dots.length - seen;
    const falseTaps = num(a.falseTaps) ?? 0;
    const detail = falseTaps > 6 ? `${falseTaps} taps with no dot: try again more slowly` : undefined;
    return {
      value: `${seen} of ${dots.length} seen`,
      score: dots.length ? Math.round((seen / dots.length) * 100) : 0,
      status: !dots.length ? 'mild' : missed <= 2 ? 'good' : missed <= 5 ? 'mild' : 'see_doctor',
      ...(detail ? { detail } : {}),
      note: String(missed),
    };
  });
  // Echo the dots for the field map (58), per eye as sent.
  const right = answers.right as Answers | undefined;
  const left = answers.left as Answers | undefined;
  if (right || left) {
    if (right) field.right = dotsOf(right);
    if (left) field.left = dotsOf(left);
  } else field[eye === 'left' ? 'left' : 'right'] = dotsOf(answers);

  const missedText = (side: 'right' | 'left') => {
    const n = Number(eyes[side]?.note ?? 0);
    return n === 0 ? `Your ${side} eye saw every dot.` : `Your ${side} eye missed ${n} ${n === 1 ? 'dot' : 'dots'}.`;
  };
  const sides = (['right', 'left'] as const).filter((s) => eyes[s]);
  const totalMissed = sides.reduce((n, s) => n + Number(eyes[s]!.note), 0);
  const total = sides.reduce((n, s) => n + (field[s]?.length ?? 0), 0);
  const counts = sides.map(missedText).join(' ');
  return {
    score,
    status,
    summary: totalMissed === 0 ? 'Saw every dot' : `Missed ${totalMissed} of ${total} dots`,
    eyes: result,
    field,
    meaning:
      status === 'good'
        ? `${counts} Your side vision looks healthy.`
        : status === 'mild'
          ? `${counts} A few missed dots are often just a blink or a moment of lost focus.`
          : `${counts} ${yourEyes(flagged)} missed several dots at the side. Gaps in side vision can be an early sign of glaucoma and should be checked by an eye doctor.`,
    ...(status === 'mild' ? { tip: 'Repeat the test in a quiet moment, keeping your eye on the centre dot.' } : {}),
    ...(status === 'see_doctor' ? { tip: 'Book an eye exam and ask for a visual field test.' } : {}),
  };
}
