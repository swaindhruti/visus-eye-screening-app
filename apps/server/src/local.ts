// Local server on Bun for the phone on your Wi-Fi: `bun run dev:phone` → http://0.0.0.0:8787.
// Same app as the Worker, but Bun's Postgres TLS accepts Aiven's own CA, so no CA file is needed.
// Production runs on Cloudflare Workers (`wrangler deploy`, Hyperdrive).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import app from './index';
import type { Bindings } from './lib/env';

const vars = Object.fromEntries(
  readFileSync(fileURLToPath(new URL('../.dev.vars', import.meta.url).href), 'utf8')
    .split('\n')
    .filter((line) => line.includes('=') && !line.startsWith('#'))
    .map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()]),
);
// DATABASE_URL may be overridden from the shell, e.g. a local test database. SARVAM_API_KEY= (empty)
// turns the Sarvam voice off, e.g. to run the smoke test without spending Sarvam credits.
const env = {
  ...vars,
  ...(process.env.DATABASE_URL ? { DATABASE_URL: process.env.DATABASE_URL } : {}),
  ...(process.env.SARVAM_API_KEY !== undefined ? { SARVAM_API_KEY: process.env.SARVAM_API_KEY } : {}),
} as Bindings;

const ctx = {
  waitUntil: (promise: Promise<unknown>) => void promise.catch((err) => console.error(err)),
  passThroughOnException: () => undefined,
  props: {},
} as unknown as ExecutionContext;

const PORT = Number(process.env.PORT ?? 8787);
console.log(`Visus API → http://localhost:${PORT} (phone: http://<your Mac's Wi-Fi IP>:${PORT})`);

export default {
  port: PORT,
  hostname: '0.0.0.0',
  async fetch(req: Request) {
    const start = Date.now();
    const res = await app.fetch(req, env, ctx);
    console.log(`${req.method} ${new URL(req.url).pathname} ${res.status} (${Date.now() - start}ms)`);
    return res;
  },
};
