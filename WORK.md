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
- [x] D: Mobile parity with the web (2026-10-23): guest mode, voice input in the intake chat, onboarding "Later" + skip-saves-profile fix, distance warning also on clock dial / duochrome / Amsler; server: hedged Gemini calls
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

## Phase 4: next features (Nov)

New priority order agreed on 2026-11-08 (replaces "Visus: Plan to 15 November"). One branch: `feat/visus-next`, merged by PR. Deploy stays for later. **D** = built by Dhrutinandan with Claude Code (including web this time); anything left goes to Sidhartha.

1. Shop portal (web + server + mobile link requests)

- [x] D: Server: `users.role` + `users.phone`, `shops`, `shop_patients`, `sessions.shop_id`; `POST /shops/register`; role on `/me` and login
- [x] D: Server: shop patients (list, search, add, detail with records), link request by phone, user approve / decline / unlink; shops can run checks for their patients
- [x] D: Web: shop register, shop dashboard, new patient, patient detail with records and "Start check"
- [x] D: Mobile + web: link requests ("Optics X wants to see your eye records"), Linked shops in Settings, "At <shop>" on shop-run checks

2. Multilingual voice agent (English, Hindi, Odia)

- [x] D: Server: `language` on intake chat, sessions and verdict; prompts reply in that language; Hindi / Odia rule fallbacks; Hindi / Odia urgent words in the red-flag rules
- [x] D: Server: Sarvam AI (Indian voice) `POST /voice/tts` + `/voice/stt`, and `sarvam-105b-conversations` next to Gemini (first for Hindi/Odia). LiveKit dropped: our own VoiceOrb visualizer
- [x] D: Mobile: language picker, talk mode (speak → auto-send → reply read aloud → listen again), `expo-audio`
- [x] D: Mobile: test instructions, switch-eye and next-test text in Hindi and Odia, read aloud automatically in talk mode
- [x] D: Web: same language picker, talk mode and translated instructions
- [x] D: `SARVAM_API_KEY` in `apps/server/.dev.vars`; key checked (voice, speech to text and chat each answered once)
- [x] D: Server: Sarvam through its official SDK `sarvamai`: `bulbul:v4-flash` Ritu medical voice (v3 for Odia), MP3, `saaras:v4` with eye-check keyterms, `sarvam-105b-conversations` (under 1 s), off for 10 min on 402/403, `GET /voice`; Settings on web and mobile shows which voice is in use
- [ ] D: Try talk mode end to end by ear once there are credits; native speaker checks the Hindi/Odia text
- [ ] D: New EAS development build for the installed app (adds `expo-audio`)

3. Faster AI and offline checks

- [ ] D: Server: Gemini timing logs, shorter hedge / budget, minimal thinking for chat and re-plan, plan started when the chat ends, verdict text and lens in parallel
- [ ] D: `packages/engine`: scoring, rules, rule plan, rule verdict and lens shared by the server and the phone
- [ ] D: Server: `POST /sessions/import` (an offline check with its own timestamps, re-scored on the server)
- [ ] D: Mobile: full check offline on rules, saved on the phone, synced when online + background sync every ~15 min
- [ ] D (stretch, **ask Dhrutinandan first: they have a different plan**): on-device model for the offline intake chat

4. Web accessibility

- [ ] D: Keyboard answers for the tests (arrows for Tumbling E, numbers for plates, space for peripheral)
- [ ] D: Spoken answers for Tumbling E ("up", "left")
- [ ] D: Skip link, focus on page change, live region for the AI chat, labels on icon buttons, status not by colour alone
- [ ] D: Reduced motion respected (landing smooth scroll, 3D iris, reveals)
- [ ] D: High-contrast theme and a dyslexia-friendly font option; `<html lang>` follows the language
- [ ] D or T: 44 px targets, contrast check, axe audit fixes

Before the final PR (cleanup on Dhrutinandan's laptop):

- [ ] D: Delete PGlite (the throwaway test Postgres from 2026-11-08): `rm -rf ~/.claude/jobs/3d970588/tmp/pg` and `bun pm cache rm`. It was never in the repo.
