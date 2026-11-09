// Sarvam AI (https://docs.sarvam.ai) through its official JS SDK (`sarvamai`): Indian voices and an Indian-language LLM.
// - Text to speech: bulbul:v4-flash with the "Ritu, medical" persona for English and Hindi; v4 has no Odia
//   yet, so Odia uses bulbul:v3 with the classic Ritu voice. MP3 back (much smaller than WAV on a phone).
// - Speech to text: saaras:v4, "transcribe" mode, clips up to 30 s; "unknown" detects the language.
//   Keyterms bias it towards the words people say in an eye check.
// - Chat: sarvam-105b-conversations, used next to Gemini in lib/gemini.ts. Plain sarvam-105b reasons
//   before answering (7–16 s, over our AI budget); the conversations model answers in under 1 s.
// The key is a server secret (SARVAM_API_KEY). Without it, or when Sarvam says the credits are used up
// (402) or the key is wrong (403), Sarvam is off for a while: voice routes answer 503, the apps switch to
// the device voice, and the AI uses Gemini only.
// Only the three resource clients are imported (not the root client), so the Worker skips the SDK's
// WebSocket streaming code.
import type { Language } from '@visus/shared';
import { ChatClient } from 'sarvamai/chat';
import { SpeechToTextClient } from 'sarvamai/speechToText';
import { TextToSpeechClient } from 'sarvamai/textToSpeech';

/** Sarvam's language codes (Odia is od-IN there). */
const CODE = { en: 'en-IN', hi: 'hi-IN', or: 'od-IN' } as const satisfies Record<Language, string>;
const FROM_CODE: Record<string, Language> = { 'en-IN': 'en', 'hi-IN': 'hi', 'od-IN': 'or' };
/** One voice for Visus in every language: Ritu, in her medical style where Sarvam has it. */
const VOICE = {
  en: { model: 'bulbul:v4-flash', speaker: 'ritu_en_medical' },
  hi: { model: 'bulbul:v4-flash', speaker: 'ritu_hi_medical' },
  or: { model: 'bulbul:v3', speaker: 'ritu' },
} as const satisfies Record<Language, { model: string; speaker: string }>;
export const SARVAM_CHAT_MODEL = 'sarvam-105b-conversations';
/** Words people say in a check, so speech to text spells them right (saaras:v4 only, up to 50). */
const KEYTERMS = ['Visus', 'ZEISS', 'Amsler', 'astigmatism', 'presbyopia', 'myopia', 'cataract', 'glaucoma', 'spectacles', 'contact lens'];

/** Our own retries are the hedge in lib/gemini.ts and the device voice: no SDK retries (each one costs credits). */
const OPTIONS = { maxRetries: 0 } as const;

let clients: { key: string; tts: TextToSpeechClient; stt: SpeechToTextClient; chat: ChatClient } | null = null;
function sdk(apiKey: string) {
  if (clients?.key !== apiKey) {
    const auth = { apiSubscriptionKey: apiKey, ...OPTIONS };
    clients = { key: apiKey, tts: new TextToSpeechClient(auth), stt: new SpeechToTextClient(auth), chat: new ChatClient(auth) };
  }
  return clients;
}

/** Out of credits (402) or a bad key (403): Sarvam stays off this long (per Worker instance). */
const OFF_MS = 10 * 60_000;
let offUntil = 0;

/** Sarvam can be used now: a key is set and it hasn't just said "no credits" or "bad key". */
export const sarvamReady = (apiKey: string | undefined): apiKey is string => !!apiKey && offUntil < Date.now();

const statusOf = (err: unknown) => (err as { statusCode?: number }).statusCode;

/** Logs a failed call; turns Sarvam off on 402/403. Returns true when the model is just busy (429/503). */
function failed(what: string, err: unknown): boolean {
  const status = statusOf(err);
  if (status === 402 || status === 403) {
    offUntil = Date.now() + OFF_MS;
    console.warn(`Sarvam ${what}: ${status === 402 ? 'no credits left' : 'the key was refused'}, using device voices and Gemini for ${OFF_MS / 60_000} min`);
    return false;
  }
  if (status === 429 || status === 503) return true;
  console.warn(`Sarvam ${what}: ${status ?? ''} ${(err as Error).message}`.slice(0, 300));
  return false;
}

/** Short lines repeat a lot (instructions, greetings): keep the last 200 in memory per Worker instance. */
const ttsCache = new Map<string, { audio: string; mime: string }>();

export async function sarvamTts(apiKey: string | undefined, text: string, language: Language): Promise<{ audio: string; mime: string } | null> {
  if (!sarvamReady(apiKey)) return null;
  const key = `${language}:${text}`;
  const hit = ttsCache.get(key);
  if (hit) return hit;
  try {
    const res = await sdk(apiKey).tts.convert(
      { text, language_code: CODE[language], ...VOICE[language], pace: 0.95, output_audio_codec: 'mp3' },
      { timeoutInSeconds: 15 },
    );
    const audio = res.audios.join('');
    if (!audio) return null;
    const out = { audio, mime: 'audio/mpeg' };
    if (ttsCache.size >= 200) ttsCache.delete(ttsCache.keys().next().value!);
    ttsCache.set(key, out);
    return out;
  } catch (err) {
    failed('TTS', err);
    return null;
  }
}

export async function sarvamStt(apiKey: string | undefined, file: Blob, language?: Language): Promise<{ transcript: string; language: Language | null } | null> {
  if (!sarvamReady(apiKey)) return null;
  try {
    const res = await sdk(apiKey).stt.transcribe(
      {
        file: { data: file, filename: (file as File).name || 'speech.webm', contentType: file.type || undefined },
        model: 'saaras:v4',
        mode: 'transcribe',
        language_code: language ? CODE[language] : 'unknown',
        keyterms: KEYTERMS,
      },
      { timeoutInSeconds: 20 },
    );
    return { transcript: (res.transcript ?? '').trim(), language: (res.language_code && FROM_CODE[res.language_code]) || null };
  } catch (err) {
    failed('STT', err);
    return null;
  }
}

/** One chat call asking for a JSON object. The raw text, or null. Throws `{ busy: true }` on 429/503. */
export async function sarvamChat(apiKey: string, system: string, prompt: string, signal: AbortSignal): Promise<string | null> {
  if (!sarvamReady(apiKey)) return null;
  try {
    const res = await sdk(apiKey).chat.completions(
      {
        model: SARVAM_CHAT_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
      },
      { abortSignal: signal },
    );
    if (!('choices' in res)) return null; // a stream: never asked for
    return res.choices[0]?.message?.content ?? null;
  } catch (err) {
    if (signal.aborted) return null;
    if (failed('chat', err)) throw Object.assign(new Error('busy'), { busy: true });
    return null;
  }
}
