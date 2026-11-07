// Shop portal. POST /shops/register (no login); /shop/* for shop accounts; /me/shop-requests and
// /me/shops for the patient's side (approve or decline a shop, unlink it later).
import { CreatePatientRequest, ShopRegisterRequest, ShopRequestAnswer } from '@visus/shared';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';

import type { AppEnv } from '../../lib/env';
import { fail } from '../../lib/errors';
import { validate } from '../../lib/validate';
import { requireAuth } from '../auth/auth.middleware';
import { shopIdOf } from './access';
import {
  answerRequest,
  createPatient,
  getPatient,
  listLinkedShops,
  listPatients,
  listRequests,
  registerShop,
  requestLink,
  unlinkShop,
} from './shops.service';

export const shopRegisterRoutes = new Hono<AppEnv>();

shopRegisterRoutes.post('/register', validate('json', ShopRegisterRequest), async (c) =>
  c.json(await registerShop(c.var.db, c.env, c.req.valid('json')), 201),
);

/** Shop accounts only; sets c.var.shopId. */
const requireShop = createMiddleware<AppEnv>(async (c, next) => {
  const shopId = await shopIdOf(c.var.db, c.var.userId);
  if (!shopId) fail(403, 'This is for optical shops. Register your shop first.');
  c.set('shopId', shopId);
  await next();
});

export const shopRoutes = new Hono<AppEnv>();
shopRoutes.use('*', requireAuth, requireShop);

shopRoutes.get('/patients', async (c) => c.json(await listPatients(c.var.db, c.var.shopId, c.req.query('q'))));

shopRoutes.post('/patients', validate('json', CreatePatientRequest), async (c) =>
  c.json(await createPatient(c.var.db, c.var.shopId, c.var.userId, c.req.valid('json')), 201),
);

shopRoutes.get('/patients/:id', async (c) => c.json(await getPatient(c.var.db, c.var.shopId, c.req.param('id'))));

shopRoutes.post('/patients/:id/link', async (c) => c.json(await requestLink(c.var.db, c.var.shopId, c.req.param('id'))));

export const myShopsRoutes = new Hono<AppEnv>();
myShopsRoutes.use('*', requireAuth);

myShopsRoutes.get('/shop-requests', async (c) => c.json(await listRequests(c.var.db, c.var.userId)));

myShopsRoutes.post('/shop-requests/:id', validate('json', ShopRequestAnswer), async (c) =>
  c.json(await answerRequest(c.var.db, c.var.userId, c.req.param('id'), c.req.valid('json').approve)),
);

myShopsRoutes.get('/shops', async (c) => c.json(await listLinkedShops(c.var.db, c.var.userId)));

myShopsRoutes.delete('/shops/:id', async (c) => c.json(await unlinkShop(c.var.db, c.var.userId, c.req.param('id'))));
