// POST /intake/chat: one turn of the Issue intake chat (9). Stateless: the app sends the transcript.
import { IntakeChatRequest } from '@visus/shared';
import { Hono } from 'hono';

import type { AppEnv } from '../../lib/env';
import { validate } from '../../lib/validate';
import { intakeTurn } from '../agent/agent.service';
import { requireAuth } from '../auth/auth.middleware';
import { checkTarget } from '../shops/access';

export const intakeRoutes = new Hono<AppEnv>();
intakeRoutes.use('*', requireAuth);

intakeRoutes.post('/chat', validate('json', IntakeChatRequest), async (c) => {
  const { profileId, messages } = c.req.valid('json');
  const { profile: person } = await checkTarget(c.var.db, c.var.userId, profileId); // own profile, or a shop's patient
  return c.json(await intakeTurn({ messages, person, apiKey: c.env.GEMINI_API_KEY }));
});
