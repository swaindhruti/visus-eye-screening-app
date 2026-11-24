// Local server on Bun for the phone on your Wi-Fi: `bun run dev:phone` → http://0.0.0.0:8787.
// Same app as the Worker, but Bun's Postgres TLS accepts Aiven's own CA, so no CA file is needed.
// Production runs on Cloudflare Workers (`wrangler deploy`, Hyperdrive).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import app from './index';
import { agoraToken } from './lib/agora';
import type { Bindings } from './lib/env';

const vars = Object.fromEntries(
  readFileSync(fileURLToPath(new URL('../.dev.vars', import.meta.url).href), 'utf8')
    .split('\n')
    .filter((line) => line.includes('=') && !line.startsWith('#'))
    .map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim().replace(/^(["'])(.*)\1$/, '$2')]),
);
// DATABASE_URL may be overridden from the shell, e.g. a local test database. SARVAM_API_KEY= (empty)
// turns the Sarvam voice off, e.g. to run the smoke test without spending Sarvam credits.
const env = {
  ...vars,
  ...(process.env.DATABASE_URL ? { DATABASE_URL: process.env.DATABASE_URL } : {}),
  // SARVAM_API_KEY= (empty) turns every Sarvam key off, the pool too (no credits spent).
  ...(process.env.SARVAM_API_KEY !== undefined ? { SARVAM_API_KEY: process.env.SARVAM_API_KEY, ...(process.env.SARVAM_API_KEY ? {} : { SARVAM_KEYS: '' }) } : {}),
  ...(process.env.CONSULT_JOIN_EARLY_MIN ? { CONSULT_JOIN_EARLY_MIN: process.env.CONSULT_JOIN_EARLY_MIN } : {}),
} as Bindings;

const ctx = {
  waitUntil: (promise: Promise<unknown>) => void promise.catch((err) => console.error(err)),
  passThroughOnException: () => undefined,
  props: {},
} as unknown as ExecutionContext;

// Which secrets are set (names only, never values).
const SECRETS = ['DATABASE_URL', 'GEMINI_API_KEY', 'JWT_SECRET', 'PASSWORD_PEPPER', 'SARVAM_API_KEY', 'AGORA_APP_ID', 'AGORA_APP_CERTIFICATE', 'GEMINI_KEYS', 'SARVAM_KEYS'] as const;
const has = (k: (typeof SECRETS)[number]) => Boolean((env as Record<string, unknown>)[k]);
console.log(`Secrets set: ${SECRETS.filter(has).join(', ') || 'none'}. Missing: ${SECRETS.filter((k) => !has(k)).join(', ') || 'none'}`);

const PORT = Number(process.env.PORT ?? 8787);
console.log(`Visus API → http://localhost:${PORT} (phone: http://<your Mac's Wi-Fi IP>:${PORT})`);

export default {
  port: PORT,
  hostname: '0.0.0.0',
  async fetch(req: Request) {
    const start = Date.now();
    const url = new URL(req.url);
    // Local only (never in the Worker): an Agora token for the app's Call check screen (Day 1 check).
    const res =
      url.pathname === '/dev/agora-token' && env.AGORA_APP_ID
        ? Response.json({
            appId: env.AGORA_APP_ID,
            channel: 'visus-check',
            uid: Number(url.searchParams.get('uid') ?? 2),
            ...agoraToken(env.AGORA_APP_ID, env.AGORA_APP_CERTIFICATE, 'visus-check', Number(url.searchParams.get('uid') ?? 2)),
          })
        : await app.fetch(req, env, ctx);
    console.log(`${req.method} ${new URL(req.url).pathname} ${res.status} (${Date.now() - start}ms)`);
    return res;
  },
};
