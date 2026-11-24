import type { Db } from '../db/client';

// Types for Cloudflare bindings and secrets, shared by every feature.
// Secrets come from .dev.vars locally and `wrangler secret put` in production.
export type Bindings = {
  DATABASE_URL: string;
  GEMINI_API_KEY: string;
  JWT_SECRET: string;
  PASSWORD_PEPPER: string;
  /** Sarvam AI (Indian voices, speech to text, sarvam-105b-conversations). Optional: without it the apps use device voices and Gemini only. */
  SARVAM_API_KEY?: string;
  /** Remote consult: Agora App ID and App Certificate (Agora console → project). No certificate = testing mode (token null). */
  AGORA_APP_ID?: string;
  AGORA_APP_CERTIFICATE?: string;
  /** Optional key pools, comma-separated (the two teammates' own keys); fall back to the single keys. Never log them. */
  GEMINI_KEYS?: string;
  SARVAM_KEYS?: string;
  /** Minutes before the start a consult can be joined (default 10). A wider window helps a demo: book the next slot, join now. */
  CONSULT_JOIN_EARLY_MIN?: string;
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
  /** The caller's doctor record, on /doctor/* routes (set by requireDoctor). */
  doctorId: string;
};

export type AppEnv = { Bindings: Bindings; Variables: Variables };
