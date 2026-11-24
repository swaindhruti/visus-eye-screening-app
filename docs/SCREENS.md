# Screens and routes

All 61 screens from the Claude Design handoff. The number is the screen number in the design.

**Routes are identical on mobile (Expo Router, `apps/mobile/src/app/`) and web (Next.js, `apps/web/app/`).** Route groups like `(auth)` and `(tabs)` don't appear in the URL.

Platform: **Both**, **Mobile** (native-only, web leaves it out), or **Part of** another screen (a modal, sheet or state, not its own route).

## Auth and first launch

| # | Screen | Route | Platform | Data |
|---|---|---|---|---|
| 1 | Entry | `/(auth)/welcome` | Both (with "Continue as guest": Tests library only, scored by `POST /reports/guest-score`, nothing saved) | — |
| 39 | Sign up | `/(auth)/signup` | Both | `POST /auth/signup` |
| 40 | Log in | `/(auth)/login` | Both | `POST /auth/login` |
| 2 | Onboarding (7 steps + summary) | `/onboarding` | Both | `POST /profiles` |
| 41 | Permissions | `/permissions` | Both (web: camera only; mobile: camera + notifications in the installed app, notifications only in Expo Go) | — |

## Main tabs

| # | Screen | Route | Platform | Data |
|---|---|---|---|---|
| 3 | Home | `/(tabs)/home` | Both (screen-time card mobile only) | `GET /sessions` (last check) |
| 4 | Tests (library) | `/(tabs)/tests` | Both | `TEST_CATALOG` (shared) |
| 52 | Test library filter | Part of Tests (bottom sheet) | Both | `TEST_CATALOG` (shared) |
| 53 | Test library search | `/tests/search` | Both | `TEST_CATALOG` (shared) |
| 8 | Test detail | `/tests/[testId]` | Both | `TEST_CATALOG` (shared) |
| 5 | Results | `/(tabs)/results` | Both | `GET /sessions` |
| 6 | Profile | `/(tabs)/profile` | Both | `GET /me`, `GET /profiles` |

## Eye check flow

| # | Screen | Route | Platform | Data |
|---|---|---|---|---|
| 42 | Who is this check for? | `/check/who` | Both | `GET /profiles` |
| 43 | Kids mode intro | `/check/kids-intro` | Both | — |
| 9 | Issue intake | `/check/intake` | Both | `POST /sessions` |
| 10 | Your test plan | `/check/plan` | Both | plan from `POST /sessions` |
| 11 | Screen calibration | `/check/calibrate` | Both | saved locally (px per mm) |
| 12 | Distance setup | `/check/distance` | Both | camera, on device |
| 13 | Test instructions | `/check/[testId]/instructions` | Both | `TEST_CATALOG` (shared) |
| — | Test run (hosts screens 26–38, 57) | `/check/[testId]/run` | Both | answers → `POST /sessions/:id/results` |
| 44 | Switch eye | Part of test run | Both | — |
| 45 | Test paused | Part of test run (sheet) | Both | — |
| 46 | Exit confirmation | Part of test run (dialog) | Both | — |
| 47 | Distance warning | Part of test run (overlay) | Both | camera |
| 14 | Between-test analysis | `/check/next` | Both | `POST /sessions/:id/results` → `NextStep` |
| 15 | Red-flag alert | `/check/red-flag` | Both | `NextStep` of type `red_flag` |
| 16 | Analysing | `/check/analysing` | Both | `POST /sessions/:id/verdict` |
| 59 | Quick check intro | `/check/quick` | Both | fixed 3-test plan |
| 60 | Glasses check: setup | `/check/glasses` | Both | — |
| 61 | Glasses check: result | `/check/glasses/result` | Both | session results |

A single test from the library runs `/check/[testId]/instructions` → `/check/[testId]/run?mode=single` → screen 48.

## Test screens (rendered inside `/check/[testId]/run`)

| # | Test | `TestId` | Platform |
|---|---|---|---|
| 26 | Distance acuity (Tumbling E) | `tumbling_e` | Both |
| 27 | Near reading | `near_reading` | Both |
| 28 | Near point | `near_point` | Both |
| 29 | Astigmatism clock dial | `clock_dial` | Both |
| 30 | Red-green duochrome | `duochrome` | Both |
| 31 | Amsler grid | `amsler` | Both |
| 32 | Contrast sensitivity | `contrast` | Both |
| 33 | Colour vision plates | `colour_plates` | Both |
| 34 | Kids: Tumbling E | `kids_tumbling_e` | Both |
| 35 | Kids: Colour shapes | `kids_colour_shapes` | Both |
| 36 | Eye risk screener | `risk_screener` | Both |
| 37 | Eye strain questionnaire | `eye_strain` | Both |
| 38 | Glare & night vision | `glare_night` | Both |
| 57 | Peripheral vision (dot field) | `peripheral_field` | Both |

## Results

| # | Screen | Route | Platform | Data |
|---|---|---|---|---|
| 17 | Results & analysis | `/results/[sessionId]` | Both | `Verdict` / `GET /sessions/:id` |
| 18 | Test result detail | `/results/[sessionId]/[testId]` | Both | `GET /sessions/:id` |
| 58 | Peripheral vision result map | Part of screen 18 for `peripheral_field` | Both | — |
| 48 | Single test complete | `/tests/[testId]/done` | Both | result from the run |
| 19 | Lens recommendation | `/results/[sessionId]/lens` | Both | `Verdict.lens` |
| 20 | Share report | `/results/[sessionId]/share` | Both | `POST /sessions/:id/share` |

## Screen Coach (mobile only)

| # | Screen | Route | Platform | Data |
|---|---|---|---|---|
| 7 | Screen Coach | `/coach` | Mobile | native module, on device |
| 21 | Coach permission | `/coach/permission` | Mobile | Android overlay permission |
| 22 | Break overlay | Native overlay, not a route | Mobile | native module |
| 23 | Weekly report | `/coach/weekly` | Mobile | on device |

## Profile and settings

| # | Screen | Route | Platform | Data |
|---|---|---|---|---|
| 49 | Add family member | `/profile/family/new` | Both | `POST /profiles` |
| 50 | Edit profile | `/profile/edit` | Both | `PATCH /profiles/:id` |
| 51 | My glasses | `/profile/glasses` | Both | `PATCH /profiles/:id` |
| 24 | Settings | `/settings` | Both | local |
| 25 | About & disclaimer | `/settings/about` | Both | — |

## Shop portal (web only, added 2026-11-08)

Not in the Claude Design handoff: built from the existing components and auth layout.

| # | Screen | Route | Platform | Data |
|---|---|---|---|---|
| S1 | Shop register | `/shop/register` | Web | `POST /shops/register` |
| S2 | Shop log in | `/shop/login` (the normal `/login` also sends shops to `/shop`) | Web | `POST /auth/login` |
| S3 | Patient records (Add new patient at the top, stats, search) | `/shop` | Web | `GET /shop/patients?q=` |
| S4 | New patient (mobile number optional) | `/shop/patients/new` | Web | `POST /shop/patients` |
| S5 | Patient (link status, add or change the mobile number, start a check, past checks) | `/shop/patients/[id]` | Web | `GET /shop/patients/:id`, `PATCH /shop/patients/:id`, `POST /shop/patients/:id/link` |
| S8 | Account (shop name, city, address; login; number of patients) | `/shop/account` | Web | `GET /shop`, `PATCH /shop` |
| S10 | Ask Visus AI (who it's for: a patient, no record, or add one; then the AI chat) | `/shop/ask` → `/check/intake` (with a *For* bar to pick or add the patient mid-chat) | Web | `POST /intake/chat`, `POST /sessions` (`profileId: ""` for no patient) |
| S11 | Orders (totals: open, ready, collected, due; status filter; search) | `/shop/orders` | Web | `GET /shop/orders` |
| S12 | New order (patient or customer, type, item, total, advance, ready by, notes) | `/shop/orders/new` (`?patient=<id>` from a patient's page) | Web | `POST /shop/orders` |
| S13 | Order (status steps, cancel; payments and record a payment) | `/shop/orders/[id]` | Web | `GET`/`PATCH /shop/orders/:id`, `POST /shop/orders/:id/payments` |
| S9 | Test library (by category; run one test for a quick analysis, or tick up to 8 and run them as a set; for a patient or no patient record) | `/shop/tests` | Web | `GET /shop/patients`, `POST /sessions` (`single` or `custom`, `profileId: ""` for no patient) |
| — | The check itself | the normal `/check/*` and `/results/*` screens, for the patient's profile | Web | as a normal check |

Way in: *Log in as an optical shop* on `/login`, *Sign up as an optical shop* on `/signup`, and *For optical shops* in the landing footer. The shop pages link back to the personal log in and sign up.

Layout: a sidebar instead of a top bar. **Ask Visus AI** first, as a highlighted capsule; then **Patient records**, **Test library** and **Orders**; **Account** and **Log out** at the bottom. On a laptop it folds to icons (remembered); on a phone a menu button opens it as a drawer.

Patient side:

| # | Screen | Route | Platform | Data |
|---|---|---|---|---|
| S6 | Shop request card (Allow / Decline) | on Home | Both | `GET /me/shop-requests`, `POST /me/shop-requests/:id` |
| S7 | Optical shops: mobile number, linked shops, Remove | web: section in `/settings`; mobile: `/settings/shops` | Both | `PATCH /me`, `GET /me/shops`, `DELETE /me/shops/:id` |

## Remote consult (final, added 2026-11-22)

Not in the Claude Design handoff: build from the existing components (the shop portal's sidebar, cards, buttons, the auth layout). Flow and rules: [CONSULT.md](CONSULT.md). Web screens: **T**. Mobile screens: **D**.

Doctor portal (web only, new, same sidebar as the shop portal: Consults, Clinics, Prescriptions; Account and Log out at the bottom):

| # | Screen | Route | Platform | Data |
|---|---|---|---|---|
| R1 | Doctor sign up (name, login, password, specialty, registration number, languages; then the Visus ID with Copy) | `/doctor/register` | Web | `POST /doctors/register` |
| R2 | Doctor log in (the normal `/login` also sends doctors here) | `/doctor/login` | Web | `POST /auth/login` |
| R3 | Consults (today, upcoming, past; Join now banner; calendar links) | `/doctor` | Web | `GET /doctor/consults` |
| R4 | Clinics (requests with Approve / Decline; clinics with weekly hours editor; Leave) | `/doctor/clinics` | Web | `GET /doctor/clinics`, `POST /doctor/clinics/:linkId`, `PUT …/hours`, `DELETE` |
| R5 | Patient file (AI summary first, then checks, glasses, prescriptions, consults; Join) | `/doctor/consults/[id]` | Web | `GET /consults/:id`, `GET /consults/:id/file`, `GET /sessions/:id` |
| R6 | Consult room (video, captions panel, test picker + result cards, prescription panel, Save and end) | `/doctor/consults/[id]/call` | Web | `POST /join`, `GET /live`, `POST /captions`, `POST`/`DELETE /tests`, `PUT /prescription`, `POST /end` |
| R7 | Prescriptions (list, open one) | `/doctor/prescriptions` | Web | `GET /doctor/prescriptions` |
| R8 | Account (name, specialty, registration number, languages, Visus ID) | `/doctor/account` | Web | `GET`/`PATCH /doctor` |

Clinic portal additions (web only, in the shop portal sidebar: **Consults** and **Doctors** under Patient records):

| # | Screen | Route | Platform | Data |
|---|---|---|---|---|
| S14 | Doctors (add by Visus ID, pending / active, hours, remove) | `/shop/doctors` | Web | `GET`/`POST /shop/doctors`, `DELETE /shop/doctors/:linkId` |
| S15 | Consults (today, upcoming, past; Join for "at the clinic") | `/shop/consults` | Web | `GET /shop/consults` |
| S16 | Book consult (linked patient → doctor → date → free slot → from home / at the clinic → reason + language); also move / cancel | `/shop/consults/new` (`?patient=<id>` from a patient's page) | Web | `GET /shop/patients`, `GET /shop/doctors`, `GET …/slots`, `POST`/`PATCH /shop/consults` |
| S17 | Join at the clinic (the patient's call screen, role `clinic`) | `/shop/consults/[id]/call` | Web | as C1 |
| — | Patient page: Consults and Prescriptions section, "Book consult" (linked patients only) | `/shop/patients/[id]` | Web | `GET /shop/patients/:id/consults` |

Patient (no booking screen: only the clinic books). Mobile (D): built on `feat/final-d` (2026-11-22), files under `apps/mobile/src/app/consults/` and `src/app/profile/prescriptions/`:

| # | Screen | Route | Platform | Data |
|---|---|---|---|---|
| C1 | Call (doctor's video, own preview, mute, camera, audio-only, leave; captions bar; a pushed test opens full screen, then back to the call) | `/consults/[id]/call` | Both | `POST /join`, `GET /live`, `POST /captions`, `POST …/tests/:rowId/result` |
| C2 | My consults (upcoming, past) | `/consults` | Both | `GET /me/consults` |
| C3 | Consult (doctor, clinic, time, where to join; Add to calendar; Join now; prescription once saved) | `/consults/[id]` | Both | `GET /consults/:id`, `GET /consults/:id/prescription` |
| C4 | Prescriptions (list → one prescription, in the patient's language with "Show original") | `/profile/prescriptions` | Both | `GET /me/prescriptions` |
| — | Home card: next consult ("Dr X · Today 4:15 pm", Join now from 10 min before) | on Home | Both | `GET /me/consults` |
| — | Add to calendar | on C3 | Mobile: `expo-calendar` (alarms 1 h and 10 min before); web: Google Calendar link + `.ics` | `ConsultSummary.calendar` |
| — | Print view (extra) | `/rx/[id]` | Web | `GET /consults/:id/prescription` |

## Languages and talk mode (added 2026-11-09)

Not new screens: controls on existing ones, on both web and mobile.

| Where | What |
|---|---|
| Issue intake (9) | Language picker (EN / हिं / ଓଡ଼ି) and a "Talk instead" switch. In talk mode, a bar with the voice visualizer (VoiceOrb) and Speak / Done buttons |
| Test instructions (13) | Hindi and Odia text (`INSTRUCTIONS_I18N`, `WEB_STEPS_I18N` in `@visus/shared`), Listen in the Visus voice, plays by itself in talk mode |
| Your test plan, Between tests (14), Results (16), Switch eye (44) | Read aloud in talk mode, in the chosen language |
| Settings (24) | Language (English, हिन्दी, ଓଡ଼ିଆ) and Talk mode, with which voice is in use (Visus voice by Sarvam, or the device's own) |

Screens themselves stay in English. The AI's text (questions, plan reasons, verdict) and every spoken line follow the language.

## States

| # | Screen | Where | Platform |
|---|---|---|---|
| 54 | Offline | Banner component + Issue intake fallback ("Choose tests myself") | Both |
| 55 | Error | Shared error component with Retry | Both |
| 56 | Re-check reminder | Home banner → `/check/recheck` (+ notification on mobile) | Both |

## Copy fixes to apply while building

- Entry: "Runs privately on your device" → "Tests run on your phone."
- Analysing: "Analysed on your phone. Nothing is uploaded." → "Preparing your results…"
- About: "Nothing is uploaded unless you share a report" → "Tests run on your phone. Only your answers go to our AI, and results are saved securely to your account."
