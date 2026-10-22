// GET /sessions, GET /sessions/:id, POST /sessions/:id/share; GET /reports/:token (public, for the web report page);
// POST /reports/guest-score (public, web guest mode)
import { SubmitResult, type NextStep } from '@visus/shared';
import { Hono } from 'hono';
import { z } from 'zod';

import type { AppEnv } from '../../lib/env';
import { validate } from '../../lib/validate';
import { requireAuth } from '../auth/auth.middleware';
import { redFlag } from '../rules/red-flags';
import { scoreTest } from '../scoring';
import { getSharedReport, getVerdict, listSessions, shareSession } from './history.service';

export const historyRoutes = new Hono<AppEnv>();
historyRoutes.use('*', requireAuth);

historyRoutes.get('/', async (c) => c.json(await listSessions(c.var.db, c.var.userId)));

historyRoutes.get('/:id', async (c) => c.json(await getVerdict(c.var.db, c.var.userId, c.req.param('id'))));

historyRoutes.post('/:id/share', async (c) =>
  c.json(await shareSession(c.var.db, c.var.userId, c.req.param('id'), c.env.WEB_URL ?? 'https://visus.app')),
);

export const reportRoutes = new Hono<AppEnv>();

reportRoutes.get('/:token', async (c) => c.json(await getSharedReport(c.var.db, c.req.param('token'))));

/** Guest mode: one test, no account. Same scorer and red-flag rules as a check, but nothing is saved. */
const GuestScore = SubmitResult.extend({ age: z.number().int().min(3).max(120).optional() });

reportRoutes.post('/guest-score', validate('json', GuestScore), (c) => {
  const { testId, eye, answers, age } = c.req.valid('json');
  const result = scoreTest(testId, eye, answers, { age, isChild: age !== undefined && age < 13 });
  const finding = redFlag(result, answers);
  const step: NextStep = finding ? { type: 'red_flag', result, finding } : { type: 'done', result };
  return c.json(step);
});
