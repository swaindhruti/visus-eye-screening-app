# API

Hono on Cloudflare Workers. Types come from `packages/shared` (`@visus/shared`).

- Local: `http://localhost:8787` (phone: `bunx wrangler dev --ip 0.0.0.0`, then use your Mac's Wi-Fi IP)
- Auth: send `Authorization: Bearer <token>` on every route except `/health`, `/auth/signup`, `/auth/login`
- Errors: `{ "error": "message" }` with a 4xx/5xx status

**D** = Dhrutinandan, **T** = Teammate. Status: planned → mock (apps use mock data) → live.

| Route | Request | Response | Owner | Status |
|---|---|---|---|---|
| `GET /health` | — | `{ ok: true }` | D | live |
| `POST /auth/signup` | `SignupRequest` | `AuthResponse` (201). 409 if the phone/email is taken | D | live |
| `POST /auth/login` | `LoginRequest` | `AuthResponse`. 401 on a wrong password | D | live |
| `GET /me` | — | `{ user, profiles: Profile[] }`, owner first | D | live |
| `GET /profiles` | — | `Profile[]`, owner first | D | live |
| `POST /profiles` | `Profile` without `id` | `Profile` (201). The first profile is the owner (`relation: "self"`) | D | live |
| `PATCH /profiles/:id` | partial `Profile` | `Profile` | D | live |
| `POST /intake/chat` | `IntakeChatRequest` (`{ profileId, messages: [{ from: "ai" \| "me", text }] }`, the whole chat so far) | `IntakeChatResponse` (`{ reply, chips, done }`) | D | live |
| `POST /sessions` | `CreateSessionRequest` | `CreateSessionResponse` (201) | D | live |
| `POST /sessions/:id/results` | `SubmitResult` | `NextStep`. 409 after the verdict | D (route) + T (scoring, rules) | live |
| `POST /sessions/:id/verdict` | — | `Verdict` (saved; calling again returns the same one) | D (route) + T (lens) | live |
| `GET /sessions` | — | `SessionSummary[]`, finished checks, newest first | T | live |
| `GET /sessions/:id` | — | `Verdict` (with `date`, `minutes`). 404 until finished | T | live |
| `POST /sessions/:id/share` | — | `ShareLink` (`{ url: WEB_URL/r/<token>, expiresAt }`, 24 h) | T | live |
| `GET /reports/:token` | — (no login) | `Verdict` behind a share link, 404 when expired. For the web report page `/r/<token>` | T | live |
| `POST /reports/guest-score` | — (no login) `SubmitResult` + optional `age` | `NextStep` (`red_flag` or `done`). Guest mode (web + mobile): same scorer and red-flag rules, nothing saved | T | live |

Server code: `apps/server` (feature folders, see `apps/server/CLAUDE.md`). Smoke test of every route: `apps/server/scripts/smoke.sh`.

## Check modes

- `CreateSessionRequest.mode`: `full` (intake → AI plan), `quick` (Tumbling E → Amsler → Clock dial), `glasses` (Tumbling E twice), `single` (one test, `testId`).
- A `full` check for a child profile (`isChild`) gets the kids tests (mock: Kids Tumbling E → Kids colour shapes); there is no intake chat, so `intake` is empty.
- Quick check: Tumbling E answers carry `quick: true` (chart starts at 6/12, 3 letters per line, a line ends after 2 right or 2 wrong).
- Glasses check: each Tumbling E result carries `answers.round`: `"glasses_off"` (round 1) or `"glasses_on"` (round 2). The plan repeats the test, so the next test is decided by how many results are in, not by test id. The verdict's `headline`/`advice` say whether the glasses still work ("Your glasses still work well" / "Your glasses may need an update"); the app compares `results[0].eyes` (without) and `results[1].eyes` (with).

## Offline

- A single test taken offline (mobile) keeps its `SubmitResult` on the phone. When the phone is back online the app sends it as a normal single check: `POST /sessions` (mode `single`) → `POST /sessions/:id/results` → `POST /sessions/:id/verdict`. `durationSec` is the time the test took offline.

## What the result screens read

- `ScoredResult` always has `score`, `status`, `summary`. The optional fields fill Test result detail (18) and Single test complete (48); a screen hides a section when its field is missing:
  - `eyes.right` / `eyes.left`: `{ value: "20/30", score, status, detail? }` for "Left vs right" (one-eye-at-a-time tests and contrast).
  - `meaning`: "What it means", 1–2 plain sentences. `tip`: one practical next step.
  - `field` (`peripheral_field` only): `{ right, left }` lists of `{ angleDeg, xMm, yMm, seen }` from the answers, for the field map (58).
- `SessionSummary.tests` and `.scores` (score per test) feed the Results tab: the trend chart (Sharpness = `tumbling_e`, Contrast = `contrast`, Colour = `colour_plates`) and "N tests" on each past check.
- `SessionSummary.profileId`: Profile shows each family member's last check.
- `Profile.relation`, `.eyewear`, `.pastEyeTest`/`.pastEyeNote`, `.prescription` (`null` = "I don't know"), `.savedLens` (`{ product, sessionId }` from Lens "Save") fill Profile, Edit profile, Add family member and My glasses.
- `Verdict.date` and `.minutes` fill "Today · 5 tests · 11 min" on Results (17).

## How the intake chat works (`POST /intake/chat`)

- Stateless: the app keeps the chat and sends all of it each turn (greeting, the user's first message, then questions and answers).
- Gemini (Flash-Lite) asks one short follow-up question per turn with 2–4 quick-reply `chips`, aimed at choosing tests. The test guide (what each test checks, which complaints fit) is fixed text in the system prompt (`features/agent/prompts.ts`).
- Rules: at least 1 and at most 3 follow-up questions, then `done: true` (`reply` empty). If Gemini fails, fixed questions are used (eyes, how long, pain/flashes).
- If the user mentions urgent symptoms (flashes, floaters, shadow, sudden, pain, double vision, red eye; negations like "no pain" don't count), the reply starts once with "If this started suddenly or is getting worse, please see an eye doctor today."
- When `done`, the app calls `POST /sessions` with `intake` = the chat, one line per message: `Visus: …` / `Me: …`. Rules (red flags, lens keywords) read only the `Me:` lines.

## How `POST /sessions` plans

- `single`, `quick`, `glasses` and a child's `full` check get fixed plans (see Check modes).
- An adult's `full` check: Gemini reads the intake and picks 3–5 tests from `TEST_CATALOG` (only tests the person is old enough for). If Gemini fails or is slow (5 s per model, 7 s in total), a keyword plan is used instead.
- If the intake mentions flashes, floaters, a shadow, sudden change, pain, double vision or a red eye (rules, not AI), the summary starts with "Please see an eye doctor soon about what you described." and `amsler` is added.

## How `POST /sessions/:id/results` works

1. Validate `SubmitResult`.
2. `scoring/` turns raw answers into a `ScoredResult`, using the profile's age.
3. Save the result.
4. `rules/` checks for a red flag (Amsler near the centre or 3+ areas, 8+ missed peripheral dots in one eye, an eye below 20/200 except glasses round 1, no contrast letters seen). The same finding is returned once per check. After a red flag the app continues with the next test in its own plan.
5. Full checks only: `rules/` may add one test (e.g. soft distance vision → `clock_dial`); when the rules can't decide on a non-good result, Gemini may add one. At most 2 added tests per check. An added test is inserted right after the current one (`added: true`), same as the app does.
6. Return `NextStep`: the added test, else the next test in the plan, else `done`.

## Verdict

- `headline`/`advice`: Gemini writes them from the scored results (rules decide the statuses; if a result is `see_doctor` the advice must mention a doctor, otherwise the rule text is used). Glasses and single checks use rule text.
- `areas`: worst status per category. `lens`: up to 3 ZEISS suggestions from `features/lens/` (SmartLife, DriveSafe, MyoCare, PhotoFusion X; DuraVision and BlueGuard coatings), best match first.

## Answers format per test

Each test screen sends `answers` in the shape its scorer expects. Shapes below are what the mobile app sends today (raw answers only, nothing scored).

Tests done one eye at a time (`eachEye` in `TEST_CATALOG`) send **one** result for both eyes: `eye: "both"` and `answers: { right: <shape>, left: <shape> }`. Right eye is tested first. Other tests send `eye: "both"` and the shape directly.

`pxPerMm` is screen points per mm from calibration; `calibrated: false` means the app used a 160 dpi guess.

| Test | `answers` shape (per eye where it applies) |
|---|---|
| `tumbling_e` | `{ distanceCm: 40, pxPerMm, calibrated, trials: [{ line: "6/24", sizeMm, shown, answer }] }`. `shown`/`answer`: `"up" \| "down" \| "left" \| "right"` (the way the E's legs point). `sizeMm` is the E height actually drawn (rounded to whole pixels). The chart starts at 6/60, moves to the next line after 3 right answers and stops after 3 wrong ones on a line (or after the last line). Lines too small to draw on that screen are skipped. |
| `clock_dial` | `{ darker: ["3-9", "12-6"], allSame: boolean }`. Line pairs by clock hours; `darker` is empty when `allSame` is true. |
| `amsler` | `{ gridSize: 10, marked: number[], allStraight: boolean }`. `marked` = areas the user marked as wavy, blurry or missing, `row * 10 + column` from the top-left (centre dot between 44, 45, 54, 55). |
| `contrast` | `{ distanceCm: 40, pxPerMm, calibrated, letterHeightMm, letters: [{ letter, color, contrast }], faintestSeen: number \| null, noneSeen: boolean }`. `letters` go darker → fainter; `contrast` is the Weber contrast on white (0.994 … 0.062). `faintestSeen` is an index into `letters`. Both eyes together. |
| `near_reading` | `{ distanceCm: 40, pxPerMm, calibrated, language: "en" \| "hi" \| "or", smallestRead: "N8", lines: [{ label: "N36", sizeMm }] }`. N-scale print sizes (N × 0.3528 mm), both eyes. |
| `near_point` | `{ blurCm, distanceSource: "manual", textSizeMm, pxPerMm, calibrated }` per eye. `blurCm` (10–40) is where the text blurred; the user sets it on a slider until camera distance exists (then `distanceSource: "camera"`). |
| `duochrome` | `{ clearer: "red" \| "green" \| "same" }` per eye. |
| `peripheral_field` | `{ distanceCm: 30, pxPerMm, calibrated, dotMm: 2.25, trials: [{ angleDeg, xMm, yMm, seen, reactionMs }], falseTaps }` per eye. 24 dots, `angleDeg` 0 = right, clockwise; `xMm`/`yMm` from the centre dot (y down). A tap counts within 1.5 s of a dot appearing. |
| `colour_plates` | `{ plates: [{ plate: 1, shown: "12", answer: "12" \| null }] }`. 12 plates; plate 1 is a demo everyone should read; `null` = "I don't see a number". Both eyes. |
| `kids_tumbling_e` | Same as `tumbling_e` (6 lines, 6/60 to 6/9), per eye. |
| `kids_colour_shapes` | `{ plates: [{ plate: 1, shown, answer }] }` with `"star" \| "circle" \| "square" \| "nothing"`. 6 plates, plate 1 is a demo. |
| `risk_screener` | `{ answers: [{ question, answer, index }] }`. Options `Yes` / `No` / `Not sure` (index 0–2). |
| `eye_strain`, `glare_night` | `{ answers: [{ question, answer, index }] }`. Options `Never` / `Sometimes` / `Often` / `Always` (index 0–3). |

### Web app shapes (also accepted)

The web app (`apps/web/tests/`) sends a few tests differently. The server scorers (`apps/server/src/features/scoring/`) accept both shapes:

| Test | Web `answers` |
|---|---|
| `tumbling_e`, `kids_tumbling_e` | `{ distanceMm, pxPerMm, trials: [{ line, shown, answer, sizeMm? }] }` per eye (5 letters per line). |
| Glasses check | One `tumbling_e` result: `{ glassesOff: { right, left }, glassesOn: { right, left } }` (mobile sends two results with `round`). |
| `amsler` | `{ grid: 10, marked, allStraight }` per eye. |
| `contrast` | `{ faintestSeen, shades: ["#111111", …], letters: ["H", …], letterMm }`; contrast is worked out from `shades`. |
| `near_reading` | `{ smallestLine: "N8", language, distanceMm, pxPerMm }`. |
| `near_point` | `{ cm, measured: "camera" \| "estimate" }` per eye. |
| `peripheral_field` | `{ seen: boolean[24], reactionMs, falseTaps }` per eye; dot positions are the web `FIELD_POINTS` (3 rings × 8 directions). |
| Questionnaires | `{ answers: [{ question, answer }] }` without `index`; the index is found from the answer text. |

### How each test is scored

Statuses: `good` = Looks good, `mild` = Mild change, `see_doctor` = See a doctor. `score` is 0–100; for one-eye-at-a-time tests it is the average of both eyes and `status` is the worse eye.

| Test | Rule |
|---|---|
| `tumbling_e` | Smallest 6/x line with more right than wrong answers → `20/x`. Up to 6/7.5 good, up to 6/18 mild, worse see a doctor. Two or more lines between the eyes → at least mild. |
| `kids_tumbling_e` | Same, with children's limits: 6/9 good, 6/12 mild, worse see a doctor. |
| `clock_dial` | No darker lines good; any darker line mild (astigmatism sign). |
| `duochrome` | Same good; red or green clearer mild (focus a little short / long). |
| `amsler` | Nothing marked good; 1–2 areas away from the centre mild; anything near the centre or 3+ areas see a doctor (**red flag**). |
| `contrast` | Faintest grey seen (log contrast sensitivity): 6–12% good, 25–45% mild, darker see a doctor. |
| `near_reading` | N8 or smaller good, up to N18 mild, larger see a doctor. |
| `near_point` | Compared with the normal near point for the profile's age (Hofstetter); further than normal is mild. |
| `peripheral_field` | Missed dots per eye: 0–2 good, 3–5 mild, 6+ see a doctor; 8+ in one eye is a **red flag**. |
| `colour_plates` | Plates 2–12: at most 1 missed good, 60%+ right mild, fewer see a doctor. Missing the demo plate makes it at least mild. |
| `kids_colour_shapes` | Plates 2–6: at most 1 missed good, 2 missed mild, more see a doctor. |
| `risk_screener` | Yes = risk factor. None good, 1–2 (or 2+ "Not sure") mild, 3+ see a doctor. |
| `eye_strain`, `glare_night` | Never…Always = 0…3 points; score = 100 − share of points. 75+ good, 45+ mild, lower see a doctor. |
