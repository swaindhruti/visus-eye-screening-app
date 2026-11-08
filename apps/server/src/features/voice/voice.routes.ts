// POST /voice/tts and POST /voice/stt: the Indian voice of Visus (Sarvam AI), for the apps' talk mode,
// read-aloud instructions and spoken answers. 503 when the server has no Sarvam key: the apps then
// use the phone's or browser's own voice. Logged-in users only (the free credits are shared).
import { Language, TtsRequest, type SttResponse, type TtsResponse } from '@visus/shared';
import { Hono } from 'hono';

import type { AppEnv } from '../../lib/env';
import { fail } from '../../lib/errors';
import { sarvamStt, sarvamTts } from '../../lib/sarvam';
import { validate } from '../../lib/validate';
import { requireAuth } from '../auth/auth.middleware';

/** Sarvam's REST speech to text takes up to 30 s; a short answer is far smaller than this. */
const MAX_AUDIO_BYTES = 2_000_000;

export const voiceRoutes = new Hono<AppEnv>();
voiceRoutes.use('*', requireAuth);

voiceRoutes.post('/tts', validate('json', TtsRequest), async (c) => {
  if (!c.env.SARVAM_API_KEY) fail(503, 'The Visus voice is off on this server. Using the device voice.');
  const { text, language } = c.req.valid('json');
  const audio = await sarvamTts(c.env.SARVAM_API_KEY, text, language);
  if (!audio) fail(502, "Couldn't make the voice just now.");
  return c.json<TtsResponse>({ audio, mime: 'audio/wav' });
});

voiceRoutes.post('/stt', async (c) => {
  if (!c.env.SARVAM_API_KEY) fail(503, 'The Visus voice is off on this server. Using the device voice.');
  const form = await c.req.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') fail(400, 'file: send the recording as multipart "file"');
  if (file.size > MAX_AUDIO_BYTES) fail(413, 'That recording is too long. Keep answers short.');
  const language = Language.optional().catch(undefined).parse(form?.get('language') ?? undefined);
  const heard = await sarvamStt(c.env.SARVAM_API_KEY, file, language);
  if (!heard) fail(502, "Couldn't hear that just now. Try again or type it.");
  return c.json<SttResponse>(heard);
});
