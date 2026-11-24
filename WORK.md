# Work plan

Tick a task in the same PR that finishes it. **D** = Dhrutinandan, **T** = Sidhartha (teammate).

Key dates: idea submission **24 Oct** · shortlist **30 Oct** · build sprint **1–8 Nov** · mid-term update **9 Nov** · **final evaluation: date to confirm** (write it here).

## Final submission (branch `feat/final`, plan agreed on 2026-11-22)

One new feature, the **remote consult** ([docs/CONSULT.md](docs/CONSULT.md)), plus polish and the free-tier deploy. **Scrapped:** the on-device model and full offline checks (`packages/engine`, `POST /sessions/import`, offline sync).

### How we work

1. **The contract is already written** (this setup commit): shared types in `packages/shared/src/index.ts` → "Remote consult", routes in `docs/API.md` → Remote consult, screens in `docs/SCREENS.md` → Remote consult. Build against them. A change to them needs both people's OK (write it in your progress file first).
2. **Stay in your folders** (table below). Never edit the other person's folders; write what you need in your progress file → "Asks".
3. **Mock first:** T builds the web on mock data (`services/mock/`) shaped exactly like the shared types, so the web doesn't wait for the server. D builds the server and the mobile app.
4. **Branches:** both start from `feat/final`. D works on `feat/final-d`, T on `feat/final-web` (in T's fork). Each opens a PR into `feat/final`. Pull `feat/final` daily.
5. **Integration (D, at the end):** merge both PRs into `feat/final`, switch the web's mocks off, run one consult end to end (doctor web ↔ patient phone ↔ clinic web), deploy, then `feat/final` → `main`.

### Who owns which folders (final)

| Folder | Owner |
|---|---|
| `apps/server/**` (all of it for the final, incl. new `features/doctors/`, `features/consults/`, `lib/translate.ts`, `lib/agora.ts`, `lib/keys.ts`) | D |
| `apps/server/src/features/{scoring,rules,lens}/` (tuning after the accuracy check only) | T |
| `apps/mobile/**` | D |
| `apps/web/**` (doctor portal `app/doctor/`, clinic additions in `app/shop/`, patient web `app/consults/`) | T |
| `packages/shared/**` | Both (contract; change only with both OKs) |
| `docs/API.md`, `docs/CONSULT.md` | D (T asks) |
| `docs/SCREENS.md` web rows, demo video, slides | T |
| Deploy: server + APK | D |
| Deploy: Vercel | T |

### Dhrutinandan (D): server, mobile app, deploy, integration

Day 1 checks (do these first; they decide the fallbacks in `docs/CONSULT.md`):

- [x] D: Agora account + project; App ID and App Certificate in `apps/server/.dev.vars` (`AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`). Send T the App ID only for web testing until `POST /consults/:id/join` is live (or use a testing-mode project)
- [x] D: Agora token built on Workers (`agora-token` package, `wrangler deploy --dry-run`); if it can't run there, use a testing-mode project (`token: null`)
- [ ] D: `expo-speech-recognition` while an Agora call is on (Android dev build): does it still hear the mic? If not, the doctor side makes the patient's captions (see CONSULT.md → risks)
- [ ] D: Odia (`or-IN`) recognition on Android and Chrome; if missing, 5-second pieces to `POST /voice/stt`

Server:

- [x] D: Schema: `doctors`, `clinic_doctors`, `consults`, `consult_tests`, `consult_captions`, `prescriptions`; `users.role` gains `doctor` (CONSULT.md → Data model)
- [x] D: Doctors: `POST /doctors/register` (Visus ID), `GET`/`PATCH /doctor`, requests (`GET /doctor/clinics`, `POST /doctor/clinics/:linkId`), hours (`PUT /doctor/clinics/:linkId/hours`), leave (`DELETE /doctor/clinics/:linkId`); `/auth/login` returns `role: "doctor"` + `visusId`
- [x] D: Clinic side: `GET`/`POST /shop/doctors`, `DELETE /shop/doctors/:linkId`, free slots `GET /shop/doctors/:doctorId/slots?date=`
- [x] D: Consults: `POST`/`GET /shop/consults`, `PATCH /shop/consults/:id`, `GET /doctor/consults`, `GET /me/consults`, `GET /consults/:id`; `missed` worked out on read; calendar links + `GET /consults/:id/calendar.ics?t=`
- [x] D: Call: `POST /consults/:id/join` (Agora token, status → live), `POST /consults/:id/end`, `GET /consults/:id/live`
- [x] D: Captions: `POST /consults/:id/captions` + `lib/translate.ts` (Gemini Flash-Lite → Sarvam → untranslated)
- [x] D: Live tests: `POST /consults/:id/tests`, `DELETE /consults/:id/tests/:rowId`, `POST /consults/:id/tests/:rowId/result` (reuses sessions + scoring + red-flag rules)
- [x] D: Prescription: `PUT`/`GET /consults/:id/prescription`; final → translate, book the follow-up, consult completed; `GET /me/prescriptions`, `GET /doctor/prescriptions`, `GET /shop/patients/:id/consults`
- [x] D: Patient file: `GET /consults/:id/file` with the AI summary (cached, rule fallback); doctors added to `sessionAccess` for their consult patients
- [x] D: Key pool: `GEMINI_KEYS`, `SARVAM_KEYS` (two teammates' own keys) with cooldowns; never log key values
- [x] D: Smoke test covers every new route; `docs/API.md` status planned → live as each lands

Mobile (patient app):

- [x] D: My consults: Home card ("Consult with Dr X · Today 4:15 pm"), `/consults` list (upcoming, past), `/consults/[id]` detail; Add to calendar (`expo-calendar`, alarms 1 h and 10 min before); "Join now" banner
- [x] D: Call screen `/consults/[id]/call` (`react-native-agora`): doctor's video, own preview, mute, camera, audio-only, leave; captions bar (own speech → `POST captions`, others from `/live`)
- [x] D: Live test in the call: `pendingTest` opens the existing test full screen, answers to `POST …/tests/:rowId/result`, back to the call
- [x] D: Prescriptions: on the consult detail and in Profile → Prescriptions (`/profile/prescriptions`), in the patient's language with "Show original"
- [x] D: New EAS development build (`react-native-agora`, `expo-calendar`, `expo-audio`)

Polish:

- [ ] D: Bug pass on the phone: every screen of the app, by hand
- [ ] D: Talk mode by ear; a native speaker checks the Hindi and Odia text (`packages/shared/src/voice.ts`, `apps/server/src/features/agent/i18n.ts`)

Integration and deploy:

- [ ] D: Merge both PRs into `feat/final`; web mocks off; one consult end to end on three devices (web side done by T on 2026-11-23: mocks off against the local server on Neon, one consult in three browsers; still to do on the deployed server with the phone)
- [ ] D: Deploy the server: Neon (tables already pushed on 2026-11-23), Hyperdrive pointed at Neon, secrets (the 4 + `AGORA_*`, key pools, `SARVAM_API_KEY`), `WEB_URL` = Vercel URL, `wrangler deploy`, smoke on the live URL, CORS for the Vercel URL
- [ ] D: Final APK (EAS `preview`) on the live API
- [ ] D: README + docs final pass; PR `feat/final` → `main`
- [ ] D: Delete PGlite from the laptop: `rm -rf ~/.claude/jobs/3d970588/tmp/pg` and `bun pm cache rm`

### Sidhartha (T): web (doctor portal, clinic portal additions, patient web)

All on mock data first (`apps/web/services/mock/`), shaped exactly like the shared types.

Doctor portal (`/doctor`, new, same sidebar style as the shop portal):

- [x] T: `/doctor/register` (name, login, password, specialty, registration number, languages) and `/doctor/login`; the normal `/login` sends `role: "doctor"` to `/doctor`; Visus ID shown big with a Copy button
- [x] T: Requests and clinics (`/doctor/clinics`): approve / decline requests, weekly hours editor per clinic, leave a clinic
- [x] T: Consults (`/doctor`): today, upcoming, past; "Join now" banner; Add to Google Calendar / `.ics`
- [x] T: Patient file (`/doctor/consults/[id]`): AI summary first (labelled), then checks (open one: the existing result screens), glasses, earlier prescriptions and consults
- [x] T: Consult room (`/doctor/consults/[id]/call`, `agora-rtc-sdk-ng`): patient video big, own preview, mute / camera / audio-only / end; captions panel (browser speech recognition → `POST captions`, others from `/live` every 2 s); test picker (test + eye) with live status and result cards; prescription panel (autosave every 10 s, Save and end)
- [x] T: Records: `/doctor/prescriptions` (list + view) and `/doctor/account`

Clinic portal additions (`/shop`):

- [x] T: Doctors (`/shop/doctors`): add by Visus ID, pending / active, hours (read only), remove
- [x] T: Consults (`/shop/consults`): list (today, upcoming, past); Book consult (`/shop/consults/new`): linked patient → doctor → date → free slot → from home / at the clinic → reason + language; move / cancel
- [x] T: Patient page: Consults and Prescriptions section + "Book consult" (only for linked patients)
- [x] T: Join at the clinic (`/shop/consults/[id]/call`): the patient's call screen with role `clinic`; live tests on the laptop (calibration first)

Patient web:

- [x] T: My consults: Home card, `/consults`, `/consults/[id]` (Add to calendar, Join now)
- [x] T: Call `/consults/[id]/call` (role `patient`, same component as the clinic join) with the live test takeover
- [x] T: Prescriptions in Profile (`/profile/prescriptions`) and on the consult
- [x] T (extra): print view `/rx/[id]` (browser print to PDF)

Polish and deploy:

- [ ] T: Bug pass in the browser: every patient web and shop portal screen, by hand
- [ ] T: Accuracy check with 15–20 people, then tune `scoring/`, `rules/`, `lens/`
- [ ] T: Vercel deploy (root `apps/web`, `NEXT_PUBLIC_API_URL` = live API); send D the URL (CORS, `WEB_URL`)
- [ ] T (extra): keyboard answers for the tests, 44 px targets, contrast check

Submission:

- [ ] T: Demo video (a consult end to end: book → reminder → call with captions → live test → prescription) + updated slides
- [ ] D + T: Final submission form

## Earlier phases (done)

Phases 0–4 (Oct–Nov): patient app on Android and web (14 tests, AI intake chat and re-plan, verdict, ZEISS lenses, family, share, guest mode, camera distance, Screen Coach), server (auth, sessions, scoring, rules, lens, history, Gemini + Sarvam hedge), shop portal (patients, consent linking, test library, Ask Visus AI, orders), multilingual voice (English, Hindi, Odia). Details: `git log`, `progress/`, [docs/MID_PROGRESS.md](docs/MID_PROGRESS.md).

Moved into the final plan above: deploy (server, Vercel, APK), accuracy check, demo video, talk mode by ear, native speaker check, new EAS build, PGlite cleanup.
Dropped: faster-AI timing work beyond the key pool, `packages/engine`, `POST /sessions/import`, offline full checks and sync, on-device model, most of the web accessibility list (a few items stay as T extras).
