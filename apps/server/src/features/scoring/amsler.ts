// Scorer for amsler (central vision distortion). Per eye: { gridSize | grid: 10, marked: number[], allStraight }.
import type { Eye } from '@visus/shared';

import { arr, eyesLabel, num, plural, scoreEachEye, yourEyes, type Answers, type Scored } from './helpers';

/** Areas in the middle 4×4 of the grid, around the centre dot. */
const central = (cell: number, size: number) => {
  const row = Math.floor(cell / size);
  const col = cell % size;
  const lo = size / 2 - 2;
  return row >= lo && row < lo + 4 && col >= lo && col < lo + 4;
};

export function scoreAmsler(answers: Answers, eye: Eye): Scored {
  const { score, status, flagged, eyes, result } = scoreEachEye(answers, eye, (a) => {
    const size = num(a.gridSize) ?? num(a.grid) ?? 10;
    const marked = a.allStraight === true ? [] : arr<number>(a.marked).filter((c) => typeof c === 'number');
    if (marked.length === 0) return { value: 'Grid normal', score: 100, status: 'good' };
    const nearCentre = marked.some((c) => central(c, size));
    const value = `${plural(marked.length, 'area')} marked`;
    const detail = nearCentre ? 'Wavy or missing lines near the centre' : 'Changes away from the centre';
    const note = nearCentre ? 'centre' : 'edge';
    if (nearCentre || marked.length >= 3) return { value, score: Math.max(10, 40 - marked.length * 3), status: 'see_doctor', detail, note };
    return { value, score: 70 - marked.length * 5, status: 'mild', detail, note };
  });
  const which = eyesLabel(flagged);
  if (status === 'good')
    return { score, status, summary: 'Grid lines look straight', eyes: result, meaning: 'All grid lines looked straight and complete, so your central vision looks healthy.' };
  if (status === 'mild')
    return {
      score,
      status,
      summary: `A small change at the edge, ${which}`,
      eyes: result,
      meaning: 'A small area away from the centre looked different. This is often nothing, like a moment of poor focus.',
      tip: 'Repeat the test in good light. If the same area looks wrong again, show this result to an eye doctor.',
    };
  const nearCentre = Object.values(eyes).some((e) => e?.note === 'centre');
  return {
    score,
    status,
    summary: `Wavy or missing lines, ${which}`,
    eyes: result,
    meaning: `${yourEyes(flagged)} saw wavy, blurry or missing lines${nearCentre ? ' near the centre' : ''}. This can be an early sign of a problem in the macula, the part of the eye you read with, and should be checked by an eye doctor.`,
    tip: 'Book an eye doctor this week and show them this result. If your vision suddenly gets worse, go today.',
  };
}
