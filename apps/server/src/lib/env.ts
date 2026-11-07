import type { Db } from '../db/client';

// Types for Cloudflare bindings and secrets, shared by every feature.
// Secrets come from .dev.vars locally and `wrangler secret put` in production.
export type Bindings = {
  DATABASE_URL: string;
  GEMINI_API_KEY: string;
  JWT_SECRET: string;
  PASSWORD_PEPPER: string;
  /** The web app, for report links (wrangler.jsonc "vars"). */
  WEB_URL?: string;
  /** Cloudflare Hyperdrive in production (pooled Postgres). Missing locally. */
  HYPERDRIVE?: Hyperdrive;
};

// Values set by middleware (e.g. the logged-in user id from the JWT).
export type Variables = {
  db: Db;
  userId: string;
  /** The caller's shop, on /shop/* routes (set by requireShop). */
  shopId: string;
};

export type AppEnv = { Bindings: Bindings; Variables: Variables };
