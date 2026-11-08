# Visus: mid-progress update

**Team G302**, ZEISS BeyondCode'26 · update of 9 November 2026 · branch `feat/visus-next`

> Screening, not diagnosis. Visus tells you when to see an eye doctor; it does not replace one.

## In one line

Visus now works at an **optical shop counter** as well as at home, and the whole check can be done **by talking, in English, Hindi or Odia**, with a natural Indian voice.

## Where we started

The first build (October) already covered the full check, end to end, on web and Android:

- an AI intake chat;
- an adaptive test plan, re-planned after each test;
- 14 vision tests drawn at real clinical sizes (bank-card calibration);
- camera distance tracking;
- red flags decided by rules;
- results with ZEISS lens suggestions;
- a shareable doctor report;
- family profiles, guest mode and Screen Coach.

See the [main README](../README.md#features) for the full list.

## What's new

### 1. Shop portal for optical stores (web)

A walk-in customer at any optical counter can get a screening, and the shop keeps a record.

- **Shop account:** a shop registers at `/shop/register` with its name, city and a login. Shops log in at `/shop/login`, or through the normal log in, which sends shop accounts to their portal.
- **Patients dashboard (`/shop`):** search by name or phone, see each patient's last check, and see how many were checked today and how many accounts are linked.
- **Add a walk-in:** name, age, glasses, and an optional mobile number. No email or account is needed for the customer.
- **Run any check for a patient:** a full AI check, the 1-minute quick check, a glasses check, or any single test. It's the same check flow, and the result is saved on the patient's record.
- **Link the patient's own Visus account by mobile number, with their consent:**
  1. The patient gets a request in their app: *"Optics X wants to see your eye records: Allow / Decline"*.
  2. Once they allow it, the shop sees all their past checks.
  3. Checks the shop runs show up in the patient's own Results, marked *"At Optics X"*.
  4. The patient can remove the shop any time in Settings → Optical shops.
- **Patients who don't use Visus yet:** the request waits, and appears as soon as they sign up with that number.

### 2. Talk to Visus in English, Hindi or Odia (web and Android)

- **Language picker** in the chat and in Settings. Visus AI also follows the language you write or speak in, including Hindi or Odia typed in English letters.
- **Talk mode:**
  1. Visus reads each question aloud in a natural Indian voice.
  2. The app listens until you pause.
  3. It writes your answer out and sends it.
  4. When the chat is done, your test plan opens by itself.
- **Read aloud during the whole check:** the plan, every test's instructions (in Hindi and Odia too), the "now cover your right eye" prompt, what comes next, and the result.
- **Voice visualizer:** a small animated orb shows when Visus is speaking, listening or thinking. We built it ourselves instead of pulling in a voice SDK.
- **Indian voice:** it comes from **Sarvam AI** (text to speech and speech to text, built for Indian languages). The key stays on our server. Without it, the app falls back to the phone's or browser's own voice, so nothing breaks.

### 3. Safety rules in every language

- **Red flags are still decided by rules, never by the AI alone.** Urgent words like *sudden*, *pain* or *flashes* are now also caught in Hindi and Odia (अचानक, दर्द, चमक, ହଠାତ୍, ଯନ୍ତ୍ରଣା…) and in romanised spellings (*achanak*, *dard*).
- **Negations are understood:** "दर्द नहीं है", "ଯନ୍ତ୍ରଣା ନାହିଁ" and "dard nahi hai" (all meaning "no pain") don't raise an alarm.
- **Doctor warnings appear in the person's language:** the "see an eye doctor today" note and the "see a doctor" verdict.

### 4. A check never gets stuck on one AI provider

- **Gemini and Sarvam together:** Sarvam AI's `sarvam-105b` model now runs next to Gemini.
  - For Hindi and Odia, Sarvam answers first.
  - For English, it steps in when Gemini is slow or the free tier is busy.
- **Rules as a last resort:** if every AI is slow, the rules still answer, in all three languages, so the check carries on.

## How to try it

Setup is in [SETUP.md](SETUP.md). Add the optional `SARVAM_API_KEY` to `apps/server/.dev.vars` for the Indian voice.

| Try | Where |
|---|---|
| Shop portal | Web: *For optical shops* in the landing page footer, or go to `/shop/register` |
| Link a patient | Add a walk-in with the phone number of an existing Visus account, then open that account: Home shows the request |
| Talk mode | New check → chat → **Talk instead** (web), or **Talk instead** in the chat (Android) |
| Hindi / Odia | The **EN / हिं / ଓଡ଼ି** switch in the chat, or Settings → Language |

## Built with

- **Server:**
  - Hono on Cloudflare Workers, Postgres (Aiven) with Drizzle.
  - New: the `shops` and `shop_patients` tables, a role and phone number on users, a shop and a language on each check.
  - New routes: `/shops/register`, `/shop/patients…`, `/me/shop-requests`, `/me/shops`, `/voice/tts`, `/voice/stt`.
  - All routes are listed in [API.md](API.md).
- **AI:** Gemini and Sarvam AI (`sarvam-105b` for chat, `bulbul:v3` for voice, `saaras:v3` for speech recognition).
- **Web:** Next.js. **Android:** Expo SDK 57 (`expo-audio` for recording and playback).
- **Shared:** Hindi and Odia instructions and the spoken lines live in `packages/shared`, so the web and the phone say the same thing.

How it fits together: [ARCHITECTURE.md](ARCHITECTURE.md) → *Shop portal and linking*, *Voice and languages*. Screens: [SCREENS.md](SCREENS.md).

## How we checked it

- **Server:** the automated smoke test covers every route, including 29 checks for the shop portal (register, walk-ins, linking, approve, unlink, who can see what), 6 for languages and 3 for voice. **75 of 75 pass.**
- **Web:** production build passes, with typecheck and lint.
- **Android:** typecheck and lint pass.
- **Still to check by hand:**
  - the Sarvam voice with a real key;
  - talk mode on a phone;
  - the shop pages on screen;
  - the Hindi and Odia wording, with a native speaker.

## What's next

1. **Faster AI answers:** shorter waits before the rules step in, and the test plan prepared while the chat finishes.
2. **Offline checks on the phone:** a full check works without internet using the same scoring rules and syncs when back online. Whether to add an on-device model is still open.
3. **Accessibility:**
   - answer Tumbling E by voice ("up", "left") or with the keyboard;
   - screen-reader improvements;
   - reduced motion;
   - a high-contrast theme.
4. **Deployment** (Cloudflare Workers + Vercel), then an **accuracy check** with 15–20 people against a printed Snellen chart.
