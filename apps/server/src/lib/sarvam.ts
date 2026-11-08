// Sarvam AI (https://docs.sarvam.ai): Indian voices and an Indian-language LLM.
// - Text to speech: bulbul:v3 (the only Sarvam TTS model with Odia), base64 WAV back.
// - Speech to text: saaras:v3, "transcribe" mode, clips up to 30 s; "unknown" detects the language.
// - Chat: sarvam-105b (OpenAI-style), used next to Gemini in lib/gemini.ts.
// The key is a server secret (SARVAM_API_KEY); without it every function returns null and callers fall back.
import type { Language } from '@visus/shared';

const BASE = 'https://api.sarvam.ai';
/** Sarvam's language codes (Odia is od-IN there). */
const CODE: Record<Language, string> = { en: 'en-IN', hi: 'hi-IN', or: 'od-IN' };
const FROM_CODE: Record<string, Language> = { 'en-IN': 'en', 'hi-IN': 'hi', 'od-IN': 'or' };
/** A warm female voice available in all three languages on bulbul:v3. */
const SPEAKER = 'priya';

/** Short lines repeat a lot (instructions, greetings): keep the last 200 in memory per Worker instance. */
const ttsCache = new Map<string, string>();

export async function sarvamTts(apiKey: string | undefined, text: string, language: Language): Promise<string | null> {
  if (!apiKey) return null;
  const key = `${language}:${text}`;
  const hit = ttsCache.get(key);
  if (hit) return hit;
  try {
    const res = await fetch(`${BASE}/text-to-speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-subscription-key': apiKey },
      body: JSON.stringify({ text, target_language_code: CODE[language], model: 'bulbul:v3', speaker: SPEAKER, pace: 0.95 }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.warn(`Sarvam TTS: ${res.status} ${(await res.text()).slice(0, 200)}`);
      return null;
    }
    const audio = ((await res.json()) as { audios?: string[] }).audios?.[0] ?? null;
    if (audio) {
      if (ttsCache.size >= 200) ttsCache.delete(ttsCache.keys().next().value!);
      ttsCache.set(key, audio);
    }
    return audio;
  } catch (err) {
    console.warn(`Sarvam TTS: ${(err as Error).message}`);
    return null;
  }
}

export async function sarvamStt(apiKey: string | undefined, file: Blob, language?: Language): Promise<{ transcript: string; language: Language | null } | null> {
  if (!apiKey) return null;
  const form = new FormData();
  form.append('file', file, (file as File).name || 'speech.webm');
  form.append('model', 'saaras:v3');
  form.append('mode', 'transcribe');
  form.append('language_code', language ? CODE[language] : 'unknown');
  try {
    const res = await fetch(`${BASE}/speech-to-text`, {
      method: 'POST',
      headers: { 'api-subscription-key': apiKey },
      body: form,
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      console.warn(`Sarvam STT: ${res.status} ${(await res.text()).slice(0, 200)}`);
      return null;
    }
    const data = (await res.json()) as { transcript?: string; language_code?: string | null };
    return { transcript: (data.transcript ?? '').trim(), language: (data.language_code && FROM_CODE[data.language_code]) || null };
  } catch (err) {
    console.warn(`Sarvam STT: ${(err as Error).message}`);
    return null;
  }
}

/** One chat call to sarvam-105b asking for JSON. The raw text, or null. */
export async function sarvamChat(apiKey: string, system: string, prompt: string, signal: AbortSignal): Promise<string | null> {
  const res = await fetch(`${BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-subscription-key': apiKey },
    body: JSON.stringify({
      model: 'sarvam-105b',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    }),
    signal,
  });
  if (res.status === 429 || res.status === 503) throw Object.assign(new Error(`busy ${res.status}`), { busy: true });
  if (!res.ok) {
    console.warn(`Sarvam chat: ${res.status} ${(await res.text()).slice(0, 200)}`);
    return null;
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? null;
}
