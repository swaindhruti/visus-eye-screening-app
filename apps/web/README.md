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

## Remote consult: doctor portal and clinic

See [`docs/CONSULT.md`](../../docs/CONSULT.md) for the whole flow. The web side:

| Route | What |
|---|---|
| `/doctor/register`, `/doctor/login` | Sign up (gives a Visus ID such as `VIS-D-7K3Q`), log in |
| `/doctor` | Consults: Join banner, Today / Upcoming / Past |
| `/doctor/clinics` | Clinic requests (approve / decline), weekly hours, leave a clinic |
| `/doctor/consults/[id]` | Patient file: AI summary first, checks, prescriptions, earlier consults |
| `/doctor/consults/[id]/call` | Consult room: video, live captions, push tests, write the prescription (autosaves every 10 s) |
| `/doctor/prescriptions` | Every saved prescription, searchable |
| `/doctor/account` | Visus ID (Copy), details, login |
| `/shop/doctors` | Clinic: add a doctor by Visus ID, their hours, remove |
| `/shop/consults`, `/shop/consults/new` | Clinic: consults (today, upcoming, past), book (`?patient=`, `?doctor=`), move or cancel (`?move=<id>`) |
| `/shop/consults/[id]/call` | Clinic: join with the patient at the clinic; a test the doctor sends opens full screen (screen setup first) |
| `/consults`, `/consults/[id]` | Patient: my consults (also a card on Home), one consult with calendar links, Join now and the prescription |
| `/consults/[id]/call` | Patient: the call (same screen as the clinic's) |
| `/profile/prescriptions`, `/rx/[consultId]` | Patient: prescriptions in their language (Show original); print view (browser Print → Save as PDF) |

Code: `services/doctor.ts` and `services/consults.ts` (one function per route in `docs/API.md` → Remote consult), the call screen in `components/call/` (one for doctor, patient and clinic).

**Mock data** (`NEXT_PUBLIC_USE_MOCK=1`): a whole consult world lives in localStorage (`visus.mock.*`), with times relative to your first visit. Log in with any identifier containing `doctor` (for example `doctor@example.com`) to be the demo doctor, Dr Meera Nayak, or register a new one. A normal `/login` with anything else is the patient, Asha Sharma (a consult in 5 minutes, and a past one with a Hindi prescription). On `/shop/login`, any identifier containing `shop` or `clinic` is the demo clinic, Clear View Opticals, with linked patients (Asha, Ravi, Sunita, Arjun) and two doctors (Visus ID `VIS-D-P4XN` is a third one to add). The consult with Asha starts 5 minutes after the first visit, so Join is open straight away. While no patient device is in the call, a mock patient answers pushed tests after about 10 s and says a few Hindi captions. On the clinic's or the patient's call with no doctor in it, a mock doctor talks (captions) and sends one test (Amsler grid, left eye). To start over, clear the site's localStorage.

**Real server:** set `NEXT_PUBLIC_USE_MOCK=0` and `NEXT_PUBLIC_API_URL` (for example `http://localhost:8787` with `bun run dev:phone` in `apps/server`). The server makes the Agora token, so the `NEXT_PUBLIC_AGORA_TEST_*` keys are only for mock data. A full consult (clinic, doctor and patient in three separate browser profiles) was tested this way on 2026-11-23. For a quick demo, start the server with `CONSULT_JOIN_EARLY_MIN=30` so a consult can be joined 30 minutes early.

**Video (optional):** without an Agora App ID the call screen says video isn't set up, and captions, tests and the prescription still work. To test real video, create an Agora project in testing mode (App ID only) or generate a temp token in the Agora console, then add to `.env.local`:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_AGORA_TEST_APP_ID` | The project's App ID |
| `NEXT_PUBLIC_AGORA_TEST_TOKEN` | Temp token (only if the project has a certificate) |
| `NEXT_PUBLIC_AGORA_TEST_CHANNEL` | The channel the temp token was made for (defaults to the consult id) |

Never put the App Certificate in the web app. It lives only on the server (`apps/server/.dev.vars` / `wrangler secret`), which makes real tokens for `POST /consults/:id/join`. Captions use the browser's speech recognition (Chrome, Edge).

## Deploy

Vercel, with root directory `apps/web`. Set `NEXT_PUBLIC_API_URL` (the Worker URL) and `NEXT_PUBLIC_USE_MOCK=0`. Every push to `main` deploys.

## Layout

```
app/          routes, same as the mobile app (+ /r/[token] shared report, /shop/* shop portal, /doctor/* doctor portal)
components/   shared UI
lib/          hooks and helpers (tests copy, guest mode, voice input)
services/     api.ts + one file per server area; mock/ for USE_MOCK
store/        zustand stores (check, calibration)
tests/        one component per test
```
