# Work plan

Tick a task in the same PR that finishes it. **D** = Dhrutinandan, **T** = Teammate.

Key dates: idea submission **24 Oct** · shortlist **30 Oct** · build sprint **1–8 Nov**.

## Phase 0: setup (both)

- [x] D: Repo created, apps generated, pushed to GitHub
- [ ] D + T: Agree shared types in `packages/shared/src/index.ts`
- [ ] T: Vercel project connected (root `apps/web`)
- [ ] D: Cloudflare Workers Builds connected (root `apps/server`)
- [x] D: Aiven Postgres created, `DATABASE_URL` in `apps/server/.dev.vars`

## Phase 1: core flow on mock data (by 23 Oct, for the demo video)

Mobile (D) and Web (T) each build these screens on mock data:

- [x] D [x] T: Welcome, Sign up, Log in, Onboarding
- [x] D [x] T: Home, Tests library, Test detail
- [x] D [x] T: Issue intake → Your test plan → Calibration → Test instructions
- [x] D [x] T: Tests: Tumbling E, Clock dial, Amsler grid, Contrast
- [x] D [x] T: Between-test analysis, Red-flag alert, Analysing
- [x] D [x] T: Results & analysis, Lens recommendation

Server:

- [x] D: Hono setup, `GET /health`, CORS, error handling
- [x] D: Database schema (Drizzle) + auth: signup, login, `GET /me`
- [x] D: Agent: `POST /sessions` → AI test plan (Gemini)
- [x] T: Scoring for Tumbling E, Clock dial, Amsler, Contrast (built by D)
- [x] T: Red-flag rules + simple next-test rules (built by D)
- [x] D: `POST /sessions/:id/results` wiring scoring + rules + AI re-plan
- [x] T: Lens recommendation mapping (built by D)
- [x] D: `POST /sessions/:id/verdict`

## Phase 2: complete the app (24–30 Oct)

- [x] D [x] T: Results tab, Test result detail (+ peripheral map), Single test complete, Share report
- [x] D [x] T: Remaining screens: Profile, Family, Edit profile, My glasses, Settings, About
- [x] D [x] T: Remaining tests: Near reading, Near point, Duochrome, Colour plates, Peripheral, Kids tests, 3 questionnaires
- [x] D [x] T: Quick check, Glasses check, Who is this for, Kids intro, test-flow extras (switch eye, pause, exit), Permissions
- [x] D [x] T: Distance warning (47): needs camera distance tracking (Phase 3)
- [x] D [x] T: States: offline, error, re-check reminder; Tests library filter and search
- [x] D [x] T: Switch services from mock to real API
- [x] T: Scoring for remaining tests (built by D)
- [x] T: `GET /sessions`, `GET /sessions/:id`, share link (built by D, + `GET /reports/:token`)
- [x] D: Profiles: list, create, update

## Phase 3: final stretch

Split agreed on 2026-10-22: Dhrutinandan (with Claude Code) built the native mobile features (done) and does the deployment later; **Sidhartha does everything else**. Until the deploy, everyone runs the API locally (`cd apps/server && bun run dev:phone`).

Dhrutinandan:

- [x] D: Camera distance tracking (EAS development build): Distance setup (12), Distance warning (47), live distance in Near point
- [x] D: Screen Coach (Android native module + overlay, screens 7, 21, 22, 23) + real screen time on Home; reminders in the installed app
- [ ] D: Deploy the server (later, not started): Hyperdrive for Aiven, 4 secrets, `wrangler deploy`, smoke test on the live URL (`apps/server/CLAUDE.md` → Deploy)
- [ ] D: Final APK (EAS `preview`) pointing at the live API (after the deploy)

Sidhartha (details and pointers in `progress/sidhartha.md` → Handover):

- [x] T: Web services from mock to the real API (`NEXT_PUBLIC_API_URL`); replace web-only types with the shared ones
- [x] T: Web intake chat on `POST /intake/chat` (AI follow-up questions with chips)
- [x] T: Web report page `/r/[token]` reading `GET /reports/:token` (the doctor link from Share report)
- [x] T: Web camera distance (MediaPipe in `apps/web/lib/useDistance.ts`)
- [ ] T: Vercel deploy (root `apps/web`) with the live API URL; send Dhrutinandan the web URL (share links + CORS)
- [ ] T: Tune scoring / rules / lens if the accuracy check shows it (`apps/server/src/features/{scoring,rules,lens}`)
- [ ] T: Accuracy check with 15–20 people
- [ ] T: Demo video + presentation
