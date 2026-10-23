# Visus mobile

The Android app: an Expo SDK 57 app using Expo Router. For the full stack, see [`docs/SETUP.md`](../../docs/SETUP.md). For rules and structure, see [`CLAUDE.md`](CLAUDE.md). Every screen and route is listed in [`docs/SCREENS.md`](../../docs/SCREENS.md).

## Setup

All commands run in `apps/mobile`, after a `bun install` at the repo root.

```bash
cp .env.example .env
```

| Key | Value |
|---|---|
| `EXPO_PUBLIC_API_URL` | `http://<your computer's Wi-Fi IP>:8787` (`ipconfig getifaddr en0`). The server must be running with `bun run dev:phone`. |
| `EXPO_PUBLIC_USE_MOCK` | `0` = real API, `1` = mock data from `src/services/mock` (no server needed) |
| `EXPO_PUBLIC_WEB_URL` | the web app (report links, terms, privacy) |

After changing `.env`, restart Metro with `-c`.

## Run

| Goal | Command | Open with |
|---|---|---|
| Everything (camera distance, voice, Screen Coach, reminders) | `bunx expo start -c` | the installed **Visus** development build: scan the QR |
| Screens only | `bunx expo start -c --go` | Expo Go. Native features hide themselves. |

```bash
bunx tsc --noEmit     # typecheck
bunx expo lint        # lint
```

## EAS build

Rebuild only when native code changes: new native libraries, `app.json` plugins or `modules/screen-coach`. JavaScript changes reach the phone through Metro.

```bash
bunx eas-cli login                                              # once
bunx eas-cli build --profile development --platform android    # dev client APK
bunx eas-cli build --profile preview --platform android        # standalone APK
```

- When a build finishes, the terminal shows an install QR. Scan it with the phone and install the APK.
- The `preview` profile reads its API URL from the `env` block in `eas.json`. Point it to the deployed server before building.
- `eas.json` pins Bun 1.4.2 so the cloud build can read `bun.lock`.

## Native features

| Feature | Code | Needs |
|---|---|---|
| Camera distance | `src/components/FaceCamera.tsx` (VisionCamera v5 + ML Kit face detector), loaded lazily by `DistanceCamera.tsx`; setup screen `src/app/check/distance.tsx` | camera permission |
| Distance warning during tests | `src/app/check/[testId]/run.tsx` | camera distance |
| Voice input in the intake chat | `src/services/voice.ts` (`expo-speech-recognition`) | microphone permission |
| Screen Coach (screen time, weekly view, 20-20-20 breaks) | `modules/screen-coach` (Kotlin), `src/services/coach.ts`, `src/app/coach/*` | *Usage access* and *Display over other apps* |
| Check reminders | `src/services/reminders.ts` (`expo-notifications`) | notification permission |

Native code is never imported at the top of a file that Expo Go loads. It goes through `requireOptionalNativeModule` or `lazy(() => import(...))`, so the app keeps working in Expo Go.

## Layout

```
src/
  app/          routes (Expo Router), same as the web
  components/   shared UI
  constants/    theme from the design
  services/     api.ts + one file per server area; mock/ for USE_MOCK
  store/        zustand stores (auth, check, calibration, settings)
  tests/        one Skia component per test
modules/
  screen-coach/ local Expo module (Android)
```
