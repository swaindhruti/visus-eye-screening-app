// Scorer for clock_dial (astigmatism). Per eye: { darker: ["3-9"], allSame }.
import { arr, eachEyeSummary, scoreEachEye, yourEyes, type Answers, type Scored } from './helpers';
import type { Eye } from '@visus/shared';

export function scoreClockDial(answers: Answers, eye: Eye): Scored {
  const { eyes, score, status, flagged, result } = scoreEachEye(answers, eye, (a) => {
    const darker = a.allSame === true ? [] : arr<string>(a.darker).map(String);
    if (darker.length === 0) return { value: 'Even', score: 95, status: 'good' };
    return { value: `${darker.join(', ')} darker`, score: darker.length === 1 ? 62 : 68, status: 'mild', detail: 'Some lines looked darker' };
  });
  if (status === 'good')
    return { score, status, summary: 'Lines look even in both eyes', eyes: result, meaning: 'All lines looked equally dark, so there are no signs of astigmatism.' };
  return {
    score,
    status,
    summary: `Some lines look darker: ${eachEyeSummary(eyes)}`,
    eyes: result,
    meaning: `In ${yourEyes(flagged).toLowerCase()} some lines looked darker than others. This is a common sign of astigmatism, which blurs edges and makes lights streak at night. Lenses with a cylinder correction fix it.`,
    tip: 'Ask for an eye test that checks for astigmatism (the "cylinder" in a prescription).',
  };
}
