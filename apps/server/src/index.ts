// App setup: CORS, error handler, health check, feature routers.
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { authRoutes } from './features/auth/auth.routes';
import { historyRoutes, reportRoutes } from './features/history/history.routes';
import { intakeRoutes } from './features/intake/intake.routes';
import { profilesRoutes } from './features/profiles/profiles.routes';
import { sessionsRoutes } from './features/sessions/sessions.routes';
import { myShopsRoutes, shopRegisterRoutes, shopRoutes } from './features/shops/shops.routes';
import { createDb } from './db/client';
import type { AppEnv } from './lib/env';
import { errorHandler } from './lib/errors';

const app = new Hono<AppEnv>();

// Browsers only: the web app on localhost and Vercel. The phone app doesn't need CORS.
const ALLOWED = [/^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/, /^https:\/\/[a-z0-9-]+\.vercel\.app$/];
app.use(
  '*',
  cors({
    origin: (origin) => (ALLOWED.some((re) => re.test(origin)) ? origin : null),
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);

// One database pool per request, closed after the response (Workers can't reuse connections).
app.use('*', async (c, next) => {
  const { db, close } = createDb(c.env);
  c.set('db', db);
  try {
    await next();
  } finally {
    c.executionCtx.waitUntil(close());
  }
});

app.get('/health', (c) => c.json({ ok: true }));

app.route('/', authRoutes); // /auth/signup, /auth/login, /me
app.route('/me', myShopsRoutes); // shop link requests and linked shops (the patient's side)
app.route('/profiles', profilesRoutes);
app.route('/intake', intakeRoutes); // AI intake chat
app.route('/sessions', sessionsRoutes); // create, results, verdict
app.route('/sessions', historyRoutes); // list, one check, share
app.route('/reports', reportRoutes); // shared report, no login
app.route('/shops', shopRegisterRoutes); // register a shop, no login
app.route('/shop', shopRoutes); // shop portal: patients, link requests

app.notFound((c) => c.json({ error: 'Not found' }, 404));
app.onError(errorHandler);

export default app;
