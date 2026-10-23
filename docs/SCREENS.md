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
