@AGENTS.md

# apps/web: Next.js app

Owner: Sidhartha. Read the root `CLAUDE.md` first; for the final also `docs/CONSULT.md` and `WORK.md` → Final submission (T tasks).

## Stack

- Next.js (App Router, routes in `app/`), TypeScript, Tailwind CSS
- SVG / Canvas for drawing tests
- `zustand` for check state, `@tanstack/react-query` for server data
- `@visus/shared` for types and the test catalog (already in `transpilePackages`)
- `@mediapipe/tasks-vision` for camera distance
- Final: `agora-rtc-sdk-ng` for the consult call (browser only: import it inside a client component with a dynamic `import()`, never during server rendering)

## Look and layout

- Same screens and routes as mobile (`docs/SCREENS.md`), matching the Claude Design handoff.
- Mobile-first: full screen on phones; on a laptop, centred in a phone-sized frame (max width ~430 px).
- Leave out mobile-only features: Screen Coach screens and the Home screen-time card.

## Layout

```
app/            routes, exactly as in docs/SCREENS.md
components/     shared UI
services/       api.ts + one file per server area (auth, sessions, profiles)
  mock/         mock data until the server route is live
tests/          one component per test, keyed by TestId
store/          zustand stores (current check, calibration)
```

## Remote consult (final)

Three areas in this app, all on mock data first (`services/mock/consults.ts`, `services/mock/doctor.ts`) shaped exactly like the shared types:

- **Doctor portal** `app/doctor/`: register, login, consults, clinics + hours, patient file, consult room, prescriptions, account. Same sidebar layout as the shop portal (`app/shop/(portal)`).
- **Clinic additions** in `app/shop/(portal)/`: doctors, consults, book consult, join at the clinic, consults + prescriptions on the patient page.
- **Patient web** `app/consults/` and `app/profile/prescriptions/`: My consults, consult detail, call, prescriptions; next consult card on Home.

Services: `services/doctor.ts`, `services/consults.ts` (one function per route in `docs/API.md` → Remote consult).

One call component (`components/call/`) for all three roles: Agora video, controls, captions, live test takeover (patient and clinic) or test picker + prescription panel (doctor). The call screen polls `GET /consults/:id/live` every 2 s (TanStack Query `refetchInterval`); captions come from the browser's `SpeechRecognition` (`lib/useVoiceInput.ts` shows how), finished sentences go to `POST /consults/:id/captions`. Live tests reuse the existing test components and the calibration store.

## Rules

- Pages use `services/*`. Never `fetch` in a page, never import from `mock/` in a page.
- Tests only collect raw answers and send them; the server scores.
- Test sizes come from `pxPerMm` in the calibration store.
- Login token in `localStorage`, sent as `Authorization: Bearer <token>`.
- Ask users to set screen brightness to full before visual tests.
- Camera needs HTTPS on phones: test camera features on the Vercel preview URL.
