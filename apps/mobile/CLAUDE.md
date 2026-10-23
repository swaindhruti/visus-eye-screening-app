@AGENTS.md

# apps/mobile: Expo app

Owner: Dhrutinandan. Read the root `CLAUDE.md` first.

## Stack

- Expo SDK 57, Expo Router (routes in `src/app/`), TypeScript
- `@shopify/react-native-skia` for drawing tests, `react-native-reanimated` + `react-native-gesture-handler` for motion
- `zustand` for check state, `@tanstack/react-query` for server data
- `@visus/shared` for types and the test catalog

## Phases

1. **Screens:** still run in **Expo Go** (`bunx expo start --go`); native-only parts switch themselves off there.
2. **Native features (done, EAS development build):** camera distance (`react-native-vision-camera` v5 + `react-native-vision-camera-face-detector`, `components/FaceCamera.tsx`, loaded lazily through `components/DistanceCamera.tsx`) and Screen Coach (local Expo module `modules/screen-coach`, Kotlin: usage-stats screen time, foreground service, break overlay). Build: `bunx eas-cli build --profile development --platform android` (`eas.json`), then `bunx expo start` (dev client).
- Voice input (intake chat) uses `expo-speech-recognition` via `services/voice.ts` (installed app only; the mic is hidden in Expo Go). Guest mode: `useAuth().guest` (not saved), single tests with session `guest` scored by `POST /reports/guest-score` (`services/sessions.ts`), Guest mode bar instead of the tabs.
- Native code must never be imported at the top of a file Expo Go loads: use `requireOptionalNativeModule` (`services/coach.ts`) or `lazy(() => import(...))` (`DistanceCamera`).

## Layout

```
src/
  app/          routes, exactly as in docs/SCREENS.md
  components/   shared UI (Button, Card, Chip, TestHeader...)
  constants/    theme: colours, type, spacing from the design
  services/     api.ts + one file per server area (auth, sessions, profiles)
    mock/       mock data until the server route is live
  tests/        one component per test, keyed by TestId (Skia)
  store/        zustand stores (current check, calibration)
```

## Rules

- Screens use `src/services/*`. Never `fetch` in a screen, never import from `mock/` in a screen.
- Services call the real API at `EXPO_PUBLIC_API_URL`; `EXPO_PUBLIC_USE_MOCK=1` switches every service to `services/mock/`. Copy `.env.example` to `.env` (phone → your Mac's Wi-Fi IP, server with `bun run dev:phone`).
- The login token is kept in `expo-secure-store` (`store/auth.ts`). A 401 from the server signs out and opens Welcome (`services/api.ts`).
- A failed button action (save, start a check) shows `alertError(e)` (`components/alertError.ts`) with the server's message; pages that fail to load show `LoadState` / `ErrorState`.
- Tests only collect raw answers and send them; the server scores.
- Test sizes come from `pxPerMm` in the calibration store.
- Import `Text` and `TextInput` from `@/components/Text`, never from `react-native`: they follow Settings → Text size. Use `FixedText` for test symbols sized in mm (it ignores both the app and the phone font size). Control heights come from `useSizes()` (`store/settings.ts`).
- Screens that load data show `LoadState` (spinner, then the Error state `ErrorState` with Retry). `useOnline()` (`services/network.ts`) tells if the phone is online.
- Login, settings and calibration are saved on the phone (zustand `persist` + AsyncStorage, `store/storage.ts`); the root layout waits for them (`useHydrated`).
- Android is the target.
- Replace the Expo template example screens (`explore.tsx`, template components) as you build.
- Use the Expo skills and Expo MCP tools (screenshots, logs) to check screens against the design.
