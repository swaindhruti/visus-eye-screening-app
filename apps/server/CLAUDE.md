# apps/server: Hono on Cloudflare Workers

Read the root `CLAUDE.md`, `docs/API.md` and (for the final) `docs/CONSULT.md` first. **Final submission: Dhrutinandan owns the whole server**; Sidhartha only tunes `scoring/`, `rules/` and `lens/` after the accuracy check.

> **Claude Code builds the server.** Follow the layout below, `docs/API.md` and the shared types in `@visus/shared`. Keep it simple: hackathon MVP.

## Stack

- Hono on Cloudflare Workers (`wrangler.jsonc`, `nodejs_compat` on), TypeScript
- Postgres on Neon (moved from Aiven on 2026-11-23), via Cloudflare Hyperdrive in production; Drizzle ORM + `pg`
- `zod` + `@hono/zod-validator`, types from `@visus/shared`
- Auth: phone/email + password (PBKDF2 via Web Crypto), JWT via `hono/jwt`
- Gemini (Google AI Studio API) for the agent; Sarvam AI for voice
- Agora (final): the server only makes call tokens (`lib/agora.ts`); video and voice go device ↔ Agora

## Layout (feature-first) and owners

Each feature folder holds its own routes, logic and queries. Own whole folders, never edit the other person's.

```
src/
  index.ts                  app setup: CORS, error handler, mounts feature routers   Dhrutinandan
  db/schema.ts, client.ts   all tables (Drizzle) + DB connection                     Dhrutinandan
  lib/                      env types, errors, Gemini client; (final) translate.ts,  Dhrutinandan
                            agora.ts (token), keys.ts (Gemini/Sarvam key pool)
  features/
    auth/                   signup, login, /me, password hashing, JWT middleware     Dhrutinandan
    profiles/               profiles, family members, glasses                        Dhrutinandan
    sessions/               POST /sessions, /results, /verdict: ties features together  Dhrutinandan
    agent/                  Gemini intake chat / plan / re-plan / verdict + prompts  Dhrutinandan
    intake/                 POST /intake/chat (route only; logic in agent/)         Dhrutinandan
    shops/                  shop portal: register, patients, link by phone, access   Dhrutinandan
    voice/                  GET /voice, POST /voice/tts, /voice/stt (Sarvam AI)      Dhrutinandan
    doctors/                (final) /doctors/register, /doctor/*, /shop/doctors*, slots  Dhrutinandan
    consults/               (final) /shop/consults*, /me/consults, /consults/*:        Dhrutinandan
                            join, live, captions, tests, prescription, file, .ics
    scoring/                one scorer per test: answers → ScoredResult             Teammate
    rules/                  red flags + simple next-test rules                       Teammate
    lens/                   ZEISS lens catalog + recommendation                      Teammate
    history/                GET /sessions, GET /sessions/:id, share link             Teammate
```

- Features with routes export a Hono router (`authRoutes`, `profilesRoutes`, `intakeRoutes`, `sessionsRoutes`, `historyRoutes`, `shopRoutes`; final: `doctorRoutes`, `consultRoutes`); `index.ts` mounts them, e.g. `app.route('/auth', authRoutes)`.
- Final: live tests create a normal `single` session for the patient's profile and reuse `sessions/` + `scoring/` + `rules/`; doctors get read access through `features/shops/access.ts`. The consult call state is polled (`GET /consults/:id/live`, every 2 s per device): keep that route to a few cheap queries.
- `agent`, `scoring`, `rules` and `lens` have no routes; `sessions` calls them.
- The DB schema has one owner (Dhrutinandan). Teammate asks for new tables or columns instead of editing it.
- `scoring/`, `rules/`, `lens/` and `history/` were built by Claude for the teammate (2026-10-21); the teammate owns and tunes them from here.

## Rules

- Rules first, AI second: red flags and obvious next tests come from `src/rules/`; Gemini only plans, re-plans unclear cases and writes the verdict text.
- Gemini returns JSON, validated with the shared zod schema; on failure fall back to the rule-based plan.
- The AI only picks tests from `TEST_CATALOG`.
- Prompts are TypeScript string exports in `src/features/agent/prompts.ts` (Workers can't read files at runtime).
- When you add or change a route, update `docs/API.md` in the same PR.

## Deploy (Dhrutinandan)

1. `bunx wrangler login`.
2. `bunx wrangler hyperdrive create visus-db --connection-string="<DATABASE_URL>"`, then add to `wrangler.jsonc`: `"hyperdrive": [{ "binding": "HYPERDRIVE", "id": "<id>", "localConnectionString": "<DATABASE_URL>" }]`.
3. `bunx wrangler secret put DATABASE_URL` (and `GEMINI_API_KEY`, `JWT_SECRET`, `PASSWORD_PEPPER`, `SARVAM_API_KEY`; final: `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`, `GEMINI_KEYS`, `SARVAM_KEYS`). The Neon tables are already pushed (2026-11-23); run `bun run db:push` again only after a schema change.
4. Set `WEB_URL` in `wrangler.jsonc` to the Vercel URL, then `bunx wrangler deploy`.
5. `API=https://visus-api.<subdomain>.workers.dev bun run smoke`, then point the APK's `EXPO_PUBLIC_API_URL` there.

## Secrets and running

- Local secrets in `.dev.vars` (gitignored, copy from `.dev.vars.example`): `DATABASE_URL`, `GEMINI_API_KEY`, `JWT_SECRET`, `PASSWORD_PEPPER`, and optional `SARVAM_API_KEY` (Indian voice + sarvam-105b-conversations; free ₹100 credits at dashboard.sarvam.ai). Final: `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE` (Agora console → project; the apps get the App ID from `POST /consults/:id/join`), optional key pools `GEMINI_KEYS`, `SARVAM_KEYS` (comma-separated, two teammates' own keys; never log them). Production: `bunx wrangler secret put <NAME>`.
- `bun run dev` → `http://localhost:8787` on the local Workers runtime.
- `bun run dev:phone` → the same app on Bun (`src/local.ts`), on `0.0.0.0:8787` for the phone on your Wi-Fi. No CA file needed. Use this for local integration with the mobile app.
- Free Workers have a small CPU budget: test signup/login on the deployed Worker early.
- Database: Neon. Its certificate is publicly trusted, so neither `bun run dev` nor `dev:phone` needs a CA file (the old `aiven-ca.pem` is no longer used).
- Tables: `bun run db:push` (drizzle-kit reads `DATABASE_URL` from `.dev.vars`, or from the environment).
- Smoke test of every route: `bun run smoke` (server running), or `API=https://… bun run smoke` for the deployed Worker.
- Test without the real database: run a throwaway Postgres (e.g. `bunx @electric-sql/pglite-socket` style `pglite-server -p 55432`), then `DATABASE_URL='postgres://postgres:pw@127.0.0.1:55432/postgres?sslmode=disable' bunx drizzle-kit push --force` and the same `DATABASE_URL=… bun src/local.ts`. Add `PORT=8788` to run it next to your own server, and `SARVAM_API_KEY=` (empty) so the smoke test doesn't spend Sarvam credits: `API=http://localhost:8788 bun run smoke`.
- Agora (final): `src/lib/agora.ts` makes 2-hour tokens (`agora-token`, runs on Workers). `bun scripts/agora-token.ts [channel]` prints test tokens for uid 1 and 2 (for Agora's web demo); `src/local.ts` (Bun only, never the Worker) also answers `GET /dev/agora-token?uid=2` for the app's developer Call check screen. On start, `local.ts` logs which secrets are set (names only). Consults can be joined from 10 min before the start; `CONSULT_JOIN_EARLY_MIN=30` (shell for `local.ts`, or a `wrangler.jsonc` var) widens it for a demo and the smoke test.
- Who may use a check: `features/shops/access.ts` (`sessionAccess`, `checkTarget`). A shop may run checks for its walk-ins and linked patients and read a linked patient's past checks.
- Sarvam AI: `src/lib/sarvam.ts` through the official SDK `sarvamai` (only the `sarvamai/textToSpeech`, `/speechToText` and `/chat` clients, so the Worker skips the SDK's WebSocket code). TTS `bulbul:v4-flash` (Ritu medical persona; `bulbul:v3` for Odia), STT `saaras:v4`, chat `sarvam-105b-conversations`. SDK retries are off. 402/403 turn Sarvam off for 10 min (`sarvamReady`). Docs: https://docs.sarvam.ai (append `.md` to any page). Routes in `features/voice/`.
- Gemini models: `GEMINI_MODELS` in `src/lib/gemini.ts` (hedged: Flash-Lite first, the next model joins after 2.5 s, first valid answer wins, rule fallback after 7 s; busy models skipped for 60 s).
