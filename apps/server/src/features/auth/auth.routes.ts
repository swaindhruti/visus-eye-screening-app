// POST /auth/signup, POST /auth/login, GET /me, PATCH /me
import { LoginRequest, SignupRequest, UpdateMeRequest } from '@visus/shared';
import { Hono } from 'hono';

import type { AppEnv } from '../../lib/env';
import { validate } from '../../lib/validate';
import { listProfiles } from '../profiles/profiles.service';
import { requireAuth } from './auth.middleware';
import { getUser, login, setPhone, signup } from './auth.service';

export const authRoutes = new Hono<AppEnv>();

authRoutes.post('/auth/signup', validate('json', SignupRequest), async (c) => c.json(await signup(c.var.db, c.env, c.req.valid('json')), 201));

authRoutes.post('/auth/login', validate('json', LoginRequest), async (c) => c.json(await login(c.var.db, c.env, c.req.valid('json'))));

authRoutes.get('/me', requireAuth, async (c) => {
  const [user, profiles] = await Promise.all([getUser(c.var.db, c.var.userId), listProfiles(c.var.db, c.var.userId)]);
  return c.json({ user, profiles });
});

authRoutes.patch('/me', requireAuth, validate('json', UpdateMeRequest), async (c) => c.json(await setPhone(c.var.db, c.var.userId, c.req.valid('json').phone)));
