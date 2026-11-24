# Visus API

Hono on Cloudflare Workers, with Postgres on Neon (Drizzle + `pg`, Hyperdrive in production), Gemini and Sarvam AI for the agent and voice, and Agora tokens for the video consult. It owns all the logic: scoring, red-flag rules, AI planning and verdicts, lens suggestions, and the remote consult (booking, captions, live tests, prescriptions).

**Live:** `https://visus-api.dhrutinandan-dev-80e.workers.dev` (`GET /health` → `{"ok":true}`)

- [`docs/API.md`](../../docs/API.md): every route.
- [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md): how a check flows.
- [`docs/CONSULT.md`](../../docs/CONSULT.md): the remote consult.

## Layout

```
src/
  index.ts                     CORS, error handler, one DB pool per request, mounts the feature routers
  db/schema.ts                 every table (Drizzle)
  lib/                         Gemini (hedged models), Sarvam, key pool, translation, Agora token, env
  features/
    auth/ profiles/            sign up, log in, JWT; family profiles and glasses
    intake/ sessions/ agent/   a check: intake chat, plan, re-plan, verdict (rules first, AI second)
    scoring/ rules/            one scorer per test; red flags and next-test rules
    lens/ history/             ZEISS lens suggestions; results, trends, share links
    shops/ orders/             clinic portal: patients, linking by phone, access, glasses orders
    voice/                     Sarvam text-to-speech and speech-to-text
    doctors/                   doctor sign-up (Visus ID), clinic links, weekly hours, free slots
    consults/                  booking, calendar, join, live state, captions, live tests, prescription, patient file
```

## Setup

All commands run in `apps/server`, after a `bun install` at the repo root.

```bash
cp .dev.vars.example .dev.vars    # fill in the keys below (gitignored, never commit)
bun run db:push                   # create the tables
```

| Key | Value |
|---|---|
| `DATABASE_URL` | Postgres URL (Neon console → *Connect* → connection string, with `?sslmode=require`) |
| `GEMINI_API_KEY` | Google AI Studio key |
| `JWT_SECRET` | long random string |
| `PASSWORD_PEPPER` | long random string |
| `SARVAM_API_KEY` | optional: Indian voice and a second AI model ([dashboard.sarvam.ai](https://dashboard.sarvam.ai)) |
| `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE` | the Agora project, for video consult tokens |
| `GEMINI_KEYS`, `SARVAM_KEYS` | optional: extra keys, comma-separated (round robin, a key that hits a limit rests) |

## Run

| Command | What |
|---|---|
| `bun run dev:phone` | Runs the app on Bun at `0.0.0.0:8787` (`src/local.ts`), so phones on your Wi-Fi can reach it. Use this for local integration. |
| `CONSULT_JOIN_EARLY_MIN=30 bun run dev:phone` | Same, with consults joinable 30 min before the start (default 10), handy for a demo |
| `bun run smoke` | Checks every route against a running server. Use `API=https://… bun run smoke` for a deployed one. |
| `bun run typecheck` | TypeScript check |
| `bun run db:push` | Syncs the Drizzle schema (`src/db/schema.ts`) to the database |

Health check: `GET /health` → `{"ok":true}`.

## Deploy

```bash
bunx wrangler login
bunx wrangler hyperdrive create visus-db --connection-string="<Neon direct URL>"   # add the id to wrangler.jsonc
bunx wrangler hyperdrive update <id> --caching-disabled true                      # always read fresh data
bunx wrangler secret bulk .dev.vars                                                # the same secrets as local
bun run deploy
API=https://visus-api.<subdomain>.workers.dev bun run smoke
```

- Use Neon's **direct** connection string for Hyperdrive (connection pooling off); Hyperdrive pools the connections itself.
- Keep `JWT_SECRET` and `PASSWORD_PEPPER` the same as local, or existing accounts can't log in.
- `wrangler.jsonc` sets `WEB_URL` (the Vercel app: report and join links) and `CONSULT_JOIN_EARLY_MIN`.

## AI

- **Prompts:** `src/features/agent/prompts.ts`. The test catalog is fed in from `@visus/shared`.
- **Models:** `GEMINI_MODELS` in `src/lib/gemini.ts`, plus Sarvam AI's `sarvam-105b-conversations` when `SARVAM_API_KEY` is set (`src/lib/sarvam.ts`). Sarvam goes first for Hindi and Odia, and second for English.
- **Voice:** `GET /voice` (is it on), `POST /voice/tts` (`bulbul:v4-flash`, voice Ritu medical; `bulbul:v3` for Odia; MP3) and `POST /voice/stt` (`saaras:v4`), in `src/features/voice`, calling Sarvam through its official SDK `sarvamai` (`src/lib/sarvam.ts`). Without the key, or when Sarvam says the credits are used up, they answer 503 and the apps use the device voice.
- **Languages:** English, Hindi and Odia. Fixed wording is translated in `src/features/agent/i18n.ts`, and Gemini or Sarvam write the rest in the session's language.
- **Hedging:** the server starts the next model after 2.5 s, the first valid answer wins, and after 7 s it uses the rule fallback.
- **Red flags** always come from `src/features/rules`, never from the AI alone.
