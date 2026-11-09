// Thin AI client used by features/agent: Gemini (Google AI Studio) and Sarvam AI's sarvam-105b-conversations.
// Sends a prompt with a JSON schema and returns the parsed JSON, or null on any failure,
// so callers can fall back to the rules. Sarvam joins when its key is set (SARVAM_API_KEY): it keeps
// checks going when the Gemini free tier is busy, and goes first for Hindi and Odia.
//
// Gemini's latency comes in spikes (1 s most of the time, sometimes 10+ s), so requests are hedged:
// the first model starts; if it hasn't answered after HEDGE_MS (or fails), the next one starts too.
// The first valid answer wins and the others are cancelled. After BUDGET_MS the rules answer instead.
import { z } from 'zod';

import { SARVAM_CHAT_MODEL, sarvamChat } from './sarvam';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
/** Fastest first; the others join when it is slow, busy (503/429) or failing. */
export const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.8-flash'];
export const SARVAM_MODEL = SARVAM_CHAT_MODEL;

/** Set once per request from the env (index.ts), so the agent code doesn't pass a second key around. */
let sarvamKey = '';
export const setSarvamKey = (key: string | undefined) => {
  sarvamKey = key ?? '';
};
const HEDGE_MS = 2_500;
/** All models together: after this the caller's rule-based fallback answers. */
const BUDGET_MS = 7_000;

/** Models that just said they're busy are skipped for a minute (per Worker instance). */
const busyUntil = new Map<string, number>();

type Options<T extends z.ZodType> = {
  apiKey: string;
  system: string;
  prompt: string;
  schema: T;
  models?: string[];
  /** "sarvam": Sarvam first (Hindi, Odia), Gemini joins if it's slow. Default: Gemini first, Sarvam second. */
  prefer?: 'sarvam';
};

/** One Sarvam try: the parsed reply or null. Sarvam has no schema field, so the schema goes in the prompt. */
async function askSarvam<T extends z.ZodType>(system: string, prompt: string, schema: T, signal: AbortSignal): Promise<z.infer<T> | null> {
  try {
    const json = JSON.stringify(z.toJSONSchema(schema, { target: 'draft-7' }));
    const text = await sarvamChat(sarvamKey, `${system}\n\nReply with one JSON object only, matching this JSON schema:\n${json}`, prompt, signal);
    if (!text) return null;
    // Reasoning models may think out loud first: take the JSON object.
    const parsed = schema.safeParse(JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)));
    if (parsed.success) return parsed.data;
    console.warn(`Sarvam: reply didn't match the schema`, parsed.error.issues[0]);
    return null;
  } catch (err) {
    if ((err as { busy?: boolean }).busy) busyUntil.set(SARVAM_MODEL, Date.now() + 60_000);
    else if (!signal.aborted) console.warn(`Sarvam: ${(err as Error).message}`);
    return null;
  }
}

/** One model, one try: the parsed reply or null. */
async function ask<T extends z.ZodType>(model: string, apiKey: string, body: string, schema: T, signal: AbortSignal): Promise<z.infer<T> | null> {
  try {
    const res = await fetch(`${BASE}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body,
      signal,
    });
    if (res.status === 503 || res.status === 429 || res.status === 404) {
      console.warn(`Gemini ${model}: ${res.status}, skipping it for a minute`);
      busyUntil.set(model, Date.now() + 60_000);
      return null;
    }
    if (!res.ok) {
      console.warn(`Gemini ${model}: ${res.status} ${(await res.text()).slice(0, 200)}`);
      return null;
    }
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    const parsed = schema.safeParse(JSON.parse(text));
    if (parsed.success) return parsed.data;
    console.warn(`Gemini ${model}: reply didn't match the schema`, parsed.error.issues[0]);
    return null;
  } catch (err) {
    if (!signal.aborted) console.warn(`Gemini ${model}: ${(err as Error).message}`);
    return null;
  }
}

export async function geminiJson<T extends z.ZodType>({ apiKey, system, prompt, schema, models = GEMINI_MODELS, prefer }: Options<T>): Promise<z.infer<T> | null> {
  // Sarvam goes first for Hindi/Odia, else second (it joins when Flash-Lite is slow or busy).
  if (sarvamKey && !models.includes(SARVAM_MODEL)) models = prefer === 'sarvam' ? [SARVAM_MODEL, ...models] : [models[0], SARVAM_MODEL, ...models.slice(1)];
  if (!apiKey) models = models.filter((m) => m === SARVAM_MODEL);
  if (!models.length) return null;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseJsonSchema: z.toJSONSchema(schema, { target: 'draft-7' }),
      temperature: 0.4,
      thinkingConfig: { thinkingLevel: 'low' },
    },
  });
  const ready = models.filter((m) => (busyUntil.get(m) ?? 0) < Date.now());
  const list = ready.length ? ready : models;
  const abort = new AbortController();
  const budget = setTimeout(() => abort.abort(), BUDGET_MS);

  try {
    return await new Promise<z.infer<T> | null>((resolve) => {
      let next = 0;
      let running = 0;
      let settled = false;
      const finish = (value: z.infer<T> | null) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      const launch = () => {
        if (settled) return;
        if (next >= list.length) {
          if (running === 0) finish(null);
          return;
        }
        const model = list[next++];
        running++;
        const hedge = setTimeout(launch, HEDGE_MS);
        const attempt = model === SARVAM_MODEL ? askSarvam(system, prompt, schema, abort.signal) : ask(model, apiKey, body, schema, abort.signal);
        void attempt.then((reply) => {
          running--;
          clearTimeout(hedge);
          if (reply !== null) finish(reply);
          else launch(); // failed: the next model starts now
        });
      };
      abort.signal.addEventListener('abort', () => {
        if (!settled) console.warn(`Gemini: no answer within ${BUDGET_MS / 1000} s, using the rules`);
        finish(null);
      });
      launch();
    });
  } finally {
    clearTimeout(budget);
    abort.abort(); // cancels the requests still running
  }
}
