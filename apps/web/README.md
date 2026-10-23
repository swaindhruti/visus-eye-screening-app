# Visus web

The web app, built with Next.js (App Router) and Tailwind CSS. It has the same screens and routes as the mobile app ([`docs/SCREENS.md`](../../docs/SCREENS.md)), except the mobile-only Screen Coach. It also serves the shared report page at `/r/<token>`. For the full stack, see [`docs/SETUP.md`](../../docs/SETUP.md). For rules and structure, see [`CLAUDE.md`](CLAUDE.md).

## Setup

All commands run in `apps/web`, after a `bun install` at the repo root.

```bash
cp .env.example .env.local
```

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8787`. Run the server in `apps/server` with `bun run dev:phone`, or use the deployed Worker URL. |
| `NEXT_PUBLIC_USE_MOCK` | `0` = real API, `1` = mock data from `services/mock` (no server needed) |

## Run

```bash
bun dev          # http://localhost:3000
bun run build    # production build
bun run lint
```

- **Phone camera:** phone browsers allow the camera (MediaPipe camera distance) only on HTTPS. Test it on the Vercel preview URL.
- **Voice input:** uses the browser's Web Speech API, which works in Chrome and Edge.

## Deploy

Vercel, with root directory `apps/web`. Set `NEXT_PUBLIC_API_URL` (the Worker URL) and `NEXT_PUBLIC_USE_MOCK=0`. Every push to `main` deploys.

## Layout

```
app/          routes, same as the mobile app (+ /r/[token] shared report)
components/   shared UI
lib/          hooks and helpers (tests copy, guest mode, voice input)
services/     api.ts + one file per server area; mock/ for USE_MOCK
store/        zustand stores (check, calibration)
tests/        one component per test
```
