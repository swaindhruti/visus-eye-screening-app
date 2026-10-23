# Visus API

Hono on Cloudflare Workers, with Postgres on Aiven (Drizzle + `pg`) and Gemini for the agent. It owns all the logic: scoring, red-flag rules, AI planning and verdicts, and lens suggestions.

- [`docs/API.md`](../../docs/API.md): every route.
- [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md): how a check flows.
- [`CLAUDE.md`](CLAUDE.md): layout, owners and rules.

## Setup

All commands run in `apps/server`, after a `bun install` at the repo root.

```bash
cp .dev.vars.example .dev.vars    # fill in the 4 keys below (gitignored, never commit)
bun run db:push                   # create the tables
```

| Key | Value |
|---|---|
| `DATABASE_URL` | Postgres URL (Aiven *Service URI*) |
| `GEMINI_API_KEY` | Google AI Studio key |
| `JWT_SECRET` | long random string |
| `PASSWORD_PEPPER` | long random string |

## Run

| Command | What |
|---|---|
| `bun run dev:phone` | Runs the app on Bun at `0.0.0.0:8787` (`src/local.ts`), so phones on your Wi-Fi can reach it. Use this for local integration. |
| `bun run dev` | Runs on the local Workers runtime (wrangler). Needs the Aiven CA at `aiven-ca.pem` (gitignored). |
| `bun run smoke` | Checks every route against a running server. Use `API=https://… bun run smoke` for a deployed one. |
| `bun run typecheck` | TypeScript check |
| `bun run db:push` | Syncs the Drizzle schema (`src/db/schema.ts`) to the database |

Health check: `GET /health` → `{"ok":true}`.

## Deploy

```bash
bunx wrangler login
bunx wrangler hyperdrive create visus-db --connection-string="<DATABASE_URL>"   # add the id to wrangler.jsonc
bunx wrangler secret put DATABASE_URL       # and GEMINI_API_KEY, JWT_SECRET, PASSWORD_PEPPER
bunx wrangler deploy
API=https://visus-api.<subdomain>.workers.dev bun run smoke
```

Before deploying, set `WEB_URL` in `wrangler.jsonc` to the web app's URL; share links point there. [`CLAUDE.md`](CLAUDE.md#deploy-dhrutinandan) has the full deploy steps.

## AI

- **Prompts:** `src/features/agent/prompts.ts`. The test catalog is fed in from `@visus/shared`.
- **Models:** `GEMINI_MODELS` in `src/lib/gemini.ts`.
- **Hedging:** the server starts the next model after 2.5 s, the first valid answer wins, and after 7 s it uses the rule fallback.
- **Red flags** always come from `src/features/rules`, never from the AI alone.
