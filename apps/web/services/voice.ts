import { type Language, type SttResponse, type TtsResponse } from "@visus/shared";

import { api, ApiError, getToken, USE_MOCK } from "./api";

// The Indian voice of Visus: POST /voice/tts and /voice/stt (Sarvam AI on the server).
// null means "use the browser's own voice": no login, mock mode, or the server has no voice key (503).

let serverVoice = true;

/** Text → a playable audio URL in the Visus voice, or null. */
export async function tts(text: string, language: Language): Promise<string | null> {
  if (!serverVoice || USE_MOCK || !getToken() || !text.trim()) return null;
  try {
    const res = await api<TtsResponse>("/voice/tts", { body: { text: text.slice(0, 2000), language } });
    return `data:${res.mime};base64,${res.audio}`;
  } catch (e) {
    if (e instanceof ApiError && e.status === 503) serverVoice = false;
    return null;
  }
}

/** A recording → what was said and the language heard, or null. */
export async function stt(audio: Blob, language?: Language): Promise<SttResponse | null> {
  if (!serverVoice || USE_MOCK || !getToken()) return null;
  const form = new FormData();
  form.append("file", audio, `answer.${audio.type.includes("mp4") ? "m4a" : "webm"}`);
  if (language) form.append("language", language);
  try {
    return await api<SttResponse>("/voice/stt", { form });
  } catch (e) {
    if (e instanceof ApiError && e.status === 503) serverVoice = false;
    return null;
  }
}

/** False once the server said it has no voice: skip recording and use the browser's speech recognition. */
export const hasServerVoice = () => serverVoice && !USE_MOCK && !!getToken();
