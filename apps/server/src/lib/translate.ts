// Translation for the remote consult: live captions and the prescription text, between English, Hindi
// and Odia. Gemini Flash-Lite first (key pool); Sarvam's model joins the hedge in lib/gemini.ts when
// Gemini is slow or busy; if both fail the caller keeps the original text (shown untranslated).
import type { Language } from '@visus/shared';
import { z } from 'zod';

import { geminiJson } from './gemini';

const NAME: Record<Language, string> = { en: 'English', hi: 'Hindi (Devanagari script)', or: 'Odia (Odia script)' };

const SYSTEM = `You translate for an eye-care video consult in India between a doctor, a patient and a rural clinic.
Translate each text faithfully and naturally, the way people speak; short and plain.
Keep medicine names, numbers, doses, eye powers (like -1.25, 6/9), test names and brand names (ZEISS, Visus) exactly as written.
Do not add advice, explanations or anything that is not in the text.`;

/** Translates each text into `to`. The same number of texts back, or null if the AI couldn't. */
export async function translateTexts(apiKey: string, texts: string[], to: Language, from?: Language): Promise<string[] | null> {
  if (!texts.length) return [];
  const schema = z.object({ texts: z.array(z.string()).length(texts.length) });
  const reply = await geminiJson({
    apiKey,
    system: SYSTEM,
    prompt: `Translate ${from ? `from ${NAME[from]} ` : ''}into ${NAME[to]}. Return {"texts": [...]} in the same order.\n\n${JSON.stringify(texts)}`,
    schema,
    models: ['gemini-3.5-flash-lite', 'gemini-3.6-flash'],
  });
  return reply?.texts.map((t, i) => t.trim() || texts[i]) ?? null;
}

/** One caption into every other language on the call. Missing languages stay out (shown untranslated). */
export async function translateCaption(apiKey: string, text: string, from: Language, targets: Language[]) {
  const out: Partial<Record<Language, string>> = {};
  await Promise.all(
    [...new Set(targets)]
      .filter((l) => l !== from)
      .map(async (to) => {
        const [t] = (await translateTexts(apiKey, [text], to, from)) ?? [];
        if (t) out[to] = t;
      }),
  );
  return out;
}
