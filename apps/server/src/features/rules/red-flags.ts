// Decide if a scored result is a red flag: something to see an eye doctor about soon.
// Red flags come only from these rules, never from the AI alone.
import type { ScoredResult } from '@visus/shared';

import { userText } from '../../lib/intake';

type Side = 'right' | 'left';

/** Sides whose eye result matches `test`, as "right eye" / "left eye" / "both eyes". */
function sides(result: ScoredResult, test: (e: NonNullable<ScoredResult['eyes']>[Side]) => boolean) {
  const list = (['right', 'left'] as Side[]).filter((s) => result.eyes?.[s] && test(result.eyes[s]));
  return list.length === 2 ? 'both eyes' : list.length === 1 ? `${list[0]} eye` : null;
}

/** The finding to show on the Red-flag screen (15), or null. */
export function redFlag(result: ScoredResult, answers: Record<string, unknown>): string | null {
  switch (result.testId) {
    case 'amsler': {
      if (result.status !== 'see_doctor') return null;
      const which = sides(result, (e) => e?.status === 'see_doctor');
      const centre = Object.values(result.eyes ?? {}).some((e) => e?.detail?.includes('centre') && e.status === 'see_doctor');
      return `Wavy or missing lines${centre ? ' near the centre' : ''}${which ? `, ${which}` : ''}`;
    }
    case 'peripheral_field': {
      // A third of the dots (8 of 24) missed by one eye.
      const which = sides(result, (e) => !!e && e.score <= 67);
      return which ? `Missed many dots at the side, ${which}` : null;
    }
    case 'tumbling_e':
    case 'kids_tumbling_e': {
      // Without glasses, low vision is expected for many people (glasses check round 1).
      if (answers.round === 'glasses_off') return null;
      const which = sides(result, (e) => e?.value === 'Below 20/200');
      return which ? `Very low vision, ${which}` : null;
    }
    case 'contrast':
      return result.score === 0 ? 'Could not see the letters, even the dark ones' : null;
    default:
      return null;
  }
}

/** Words in the intake that need a doctor first. The plan summary warns about them. */
const URGENT: [RegExp, string][] = [
  [/\b(flash(es)?|floaters?)\b/i, 'flashes or floaters'],
  [/\b(curtain|veil)\b|\bshadow over\b/i, 'a shadow over your vision'],
  [/\b(sudden(ly)?|overnight)\b/i, 'a sudden change'],
  [/\b(pain(ful)?|hurts?|aching)\b/i, 'eye pain'],
  [/\bdouble vision\b|\bseeing double\b/i, 'double vision'],
  [/\bred eyes?\b|\bredness\b/i, 'a red eye'],
];

/**
 * The same in Hindi and Odia (scripts and common romanised spellings). Indic scripts have no
 * \b word boundaries in JS regex, so these match anywhere in the text.
 */
const URGENT_INDIC: [RegExp, string][] = [
  [/चमक|रोशनी.{0,12}(चमक|फ्लैश)|धब्बे|मक्खि|ଝଲସ|ଝଲକ|ଚମକ|ଦାଗ|\bchamak\b|\bdhabb/i, 'flashes or floaters'],
  [/पर्दा|परदा|परछाई|छाया|ପରଦା|ଛାଇ|\bparda\b/i, 'a shadow over your vision'],
  [/अचानक|एकदम से|ହଠାତ୍|ହଠାତ|\bachanak\b|\bhathat\b/i, 'a sudden change'],
  [/दर्द|दुख|चुभ|ଯନ୍ତ୍ରଣା|ବିନ୍ଧୁଛି|ବିନ୍ଧା|\bdard\b|\bdukh/i, 'eye pain'],
  [/दो-दो|दो दो|दोहरा|ଦୁଇଟା ଦେଖା|ଦୁଇଟି ଦେଖା|\bdo do dikh/i, 'double vision'],
  [/आँख.{0,6}लाल|आंख.{0,6}लाल|लाल.{0,6}आँख|ଆଖି.{0,6}ଲାଲ|ଲାଲ.{0,6}ଆଖି|\baankh.{0,6}lal\b/i, 'a red eye'],
];

/** "No pain", "I don't see flashes", "none of those": the words after a negation (up to "but" or punctuation) don't count. */
const NEGATED = /\b(no|not|none|never|without|nothing|don'?t|do not|haven'?t|didn'?t|isn'?t|aren'?t)\b(?:(?!\bbut\b)[^.,;!?\n])*/gi;

/**
 * Hindi and Odia put the negation after the word ("दर्द नहीं है", "ଯନ୍ତ୍ରଣା ନାହିଁ"): a clause with
 * a negation doesn't count. Clauses end at punctuation or "but" (लेकिन, पर, ମାତ୍ର, କିନ୍ତୁ).
 */
const INDIC_NEGATION = /नहीं|नही|(^|\s)(ना|मत)(\s|$)|ନାହିଁ|ନାହି|ନୁହେଁ|\bnahi[n]?\b|\bna\b/i;
const dropNegatedClauses = (text: string) =>
  text
    .split(/[.,;!?।\n]|लेकिन|\bpar\b|ମାତ୍ର|କିନ୍ତୁ|\blekin\b/)
    .filter((clause) => !INDIC_NEGATION.test(`${clause} `))
    .join('. ');

/** Urgent words in what the user said (not the AI's questions). The plan summary warns about them. */
export function intakeRedFlag(intake: string): string | null {
  const text = userText(intake)
    // The web app's fixed question "Pain, redness or flashes: No".
    .replace(/Pain, redness or flashes:\s*(No|None)[^\n]*/gi, '')
    .replace(/Pain, redness or flashes:/gi, '')
    .replace(NEGATED, '');
  const indic = dropNegatedClauses(text);
  const found = URGENT.filter(([re]) => re.test(text)).map(([, label]) => label);
  for (const [re, label] of URGENT_INDIC) if (re.test(indic) && !found.includes(label)) found.push(label);
  return found.length ? found.join(', ') : null;
}
