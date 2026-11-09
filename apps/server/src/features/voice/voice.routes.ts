// GET /voice, POST /voice/tts and POST /voice/stt: the Indian voice of Visus (Sarvam AI), for the apps'
// talk mode, read-aloud instructions and spoken answers. 503 when Sarvam is off (no key, no credits left,
// or the key was refused): the apps then use the phone's or browser's own voice for the rest of the visit.
// Logged-in users only (the credits are shared).
import { Language, TtsRequest, type SttResponse, type TtsResponse, type VoiceStatus } from '@visus/shared';
import { Hono } from 'hono';

import type { AppEnv } from '../../lib/env';
import { fail } from '../../lib/errors';
import { sarvamReady, sarvamStt, sarvamTts } from '../../lib/sarvam';
import { validate } from '../../lib/validate';
import { requireAuth } from '../auth/auth.middleware';

/** Sarvam's REST speech to text takes up to 30 s; a short answer is far smaller than this. */
const MAX_AUDIO_BYTES = 2_000_000;

export const voiceRoutes = new Hono<AppEnv>();
voiceRoutes.use('*', requireAuth);

const OFF = 'The Visus voice is off on this server. Using the device voice.';
/** After a failed Sarvam call: 503 if Sarvam just turned off (no credits, bad key), else 502 (try again). */
const failedCall = (apiKey: string | undefined, message: string) => (sarvamReady(apiKey) ? fail(502, message) : fail(503, OFF));

/** Whether the Visus voice is on. Free: it doesn't call Sarvam. */
voiceRoutes.get('/', (c) => c.json<VoiceStatus>({ voice: sarvamReady(c.env.SARVAM_API_KEY) }));

voiceRoutes.post('/tts', validate('json', TtsRequest), async (c) => {
  if (!sarvamReady(c.env.SARVAM_API_KEY)) fail(503, OFF);
  const { text, language } = c.req.valid('json');
  const voice = await sarvamTts(c.env.SARVAM_API_KEY, text, language);
  if (!voice) return failedCall(c.env.SARVAM_API_KEY, "Couldn't make the voice just now.");
  return c.json<TtsResponse>(voice);
});

voiceRoutes.post('/stt', async (c) => {
  if (!sarvamReady(c.env.SARVAM_API_KEY)) fail(503, OFF);
  const form = await c.req.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') fail(400, 'file: send the recording as multipart "file"');
  if (file.size > MAX_AUDIO_BYTES) fail(413, 'That recording is too long. Keep answers short.');
  const language = Language.optional().catch(undefined).parse(form?.get('language') ?? undefined);
  const heard = await sarvamStt(c.env.SARVAM_API_KEY, file, language);
  if (!heard) return failedCall(c.env.SARVAM_API_KEY, "Couldn't hear that just now. Try again or type it.");
  return c.json<SttResponse>(heard);
});
