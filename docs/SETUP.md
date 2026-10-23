# Setup

How to run the whole Visus stack, with the server, web and mobile app talking to each other, and how to build the Android app with EAS.

**Bun only.** Never use npm, yarn or pnpm, and never install anything globally. Run every CLI with `bunx` (`bunx wrangler`, `bunx eas-cli`, `bunx expo`).

## 1. What you need

| Need | For |
|---|---|
| [Bun](https://bun.sh) 1.4.2 or newer | everything |
| Postgres database (we use [Aiven](https://aiven.io), free tier) | server |
| [Gemini API key](https://aistudio.google.com/apikey) | AI agent (without one, the server falls back to rules) |
| An Android phone on the same network as your computer | mobile app |
| [Expo account](https://expo.dev) | EAS build of the Android app |
| Cloudflare and Vercel accounts | deployment only |

## 2. Install

From the repo root:

```bash
bun install
```

This installs all workspaces (`apps/*`, `packages/*`).

## 3. Server: secrets and database

**Location:** `apps/server`.

1. Copy the secrets template, then fill it in:
   ```bash
   cp .dev.vars.example .dev.vars
   ```
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Postgres URL (Aiven console → service → *Service URI*, ends in `?sslmode=require`) |
   | `GEMINI_API_KEY` | Google AI Studio key |
   | `JWT_SECRET` | any long random string, e.g. from `openssl rand -hex 32` |
   | `PASSWORD_PEPPER` | another long random string |

   `.dev.vars` is gitignored. Never commit it or paste it anywhere.
2. Create the tables:
   ```bash
   bun run db:push
   ```
3. Optional: put the Aiven CA certificate in `apps/server/aiven-ca.pem` (gitignored). Get it from the Aiven console → *Connection information* → *CA certificate*. Only `bun run dev` (the Workers runtime) needs it; `bun run dev:phone` does not.

## 4. Run everything together

Use three terminals. The computer and the phone must be on **the same Wi-Fi or hotspot**.

### Terminal 1: API

**Location:** `apps/server`.

```bash
bun run dev:phone
```

This runs the API on Bun at `0.0.0.0:8787`, so the phone can reach it. It logs every request as `METHOD path status (ms)`.

- To check it, open `http://localhost:8787/health`; it should return `{"ok":true}`.
- To test every route, run `bun run smoke` in another terminal while the server runs.
- `bun run dev` runs the same app on the local Workers runtime (wrangler) instead. That needs `aiven-ca.pem`, and it listens on localhost only.

### Find your computer's IP

```bash
ipconfig getifaddr en0        # macOS Wi-Fi, e.g. 192.168.1.20
```

The phone reaches the API at `http://<that IP>:8787`. Test it in the phone's browser: `http://<IP>:8787/health`.

### Terminal 2: web

**Location:** `apps/web`.

```bash
cp .env.example .env.local    # once
bun dev                       # http://localhost:3000
```

| Key in `.env.local` | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8787` (local) or the deployed Worker URL |
| `NEXT_PUBLIC_USE_MOCK` | `0` = real API, `1` = mock data (no server needed) |

Phone browsers only allow the camera on HTTPS. Test camera distance on the web through the Vercel preview URL.

### Terminal 3: mobile

**Location:** `apps/mobile`.

```bash
cp .env.example .env          # once
bunx expo start -c            # -c clears the cache so .env changes apply
```

| Key in `.env` | Value |
|---|---|
| `EXPO_PUBLIC_API_URL` | `http://<your computer's IP>:8787`, never `localhost` (on the phone, that is the phone itself) |
| `EXPO_PUBLIC_USE_MOCK` | `0` = real API, `1` = mock data |
| `EXPO_PUBLIC_WEB_URL` | the web app, used for report links, terms and privacy |

Then open the app on the phone. There are two ways:

| Way | Command | What works |
|---|---|---|
| **Visus development build** (recommended) | `bunx expo start -c`, then scan the QR from the installed Visus app | everything: camera distance, voice input, Screen Coach, reminders |
| Expo Go | `bunx expo start -c --go`, then scan with Expo Go | all screens and tests; native features hide themselves |

## 5. EAS build (Android)

You do this once, and again only when **native** code changes: a new native library, `app.json` plugins or `modules/screen-coach`. JavaScript changes reach the phone through Metro without a rebuild.

**Location:** `apps/mobile`.

1. Log in to Expo:
   ```bash
   bunx eas-cli login
   ```
2. Link the project. This is already done: the project id is in `app.json`, so skip this step unless you use your own Expo account.
   ```bash
   bunx eas-cli init
   ```
3. Build the development client:
   ```bash
   bunx eas-cli build --profile development --platform android
   ```
   - The build runs in Expo's cloud and takes about 10–20 minutes.
   - `eas.json` pins Bun 1.4.2 to match `bun.lock`.
4. When it finishes, the terminal shows an **install QR** and a link; the build also appears on expo.dev → project → *Builds*. Scan the QR with the phone camera, download the APK and install it. Allow "install unknown apps" if Android asks.
5. Run Metro (step 4, terminal 3) and scan its QR from inside the **Visus** app.

There are two QR codes, and they do different things:

- **Install QR (EAS):** installs the app. You use it once per build.
- **Metro QR (`bunx expo start`):** loads the latest JavaScript into the installed app. You scan it every session.

### Standalone APK (no computer needed)

```bash
bunx eas-cli build --profile preview --platform android
```

The `preview` profile bakes its `env` from `eas.json` into the APK. Set `EXPO_PUBLIC_API_URL` there to the **deployed** API (see Deploy) before building. A local IP only works on that one network.

## 6. When the network changes

| What changed | What to do |
|---|---|
| New Wi-Fi or hotspot | `ipconfig getifaddr en0` → update `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` → restart `bunx expo start -c`. No rebuild is needed. |
| Server | nothing; it listens on all interfaces. |
| Web (local) | nothing; it uses `localhost`. |

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| The server logs `Connection terminated due to connection timeout` | The network blocks the Aiven port. Test it with `nc -vz -G 5 <aiven host> <port>`. Switch to a phone hotspot, and check that the Aiven service is *Running* (free services power off when idle). |
| The app says it can't reach the server | Make sure the phone and the computer are on the same network and the IP in `.env` is current. Open `http://<IP>:8787/health` on the phone, then restart Metro with `-c`. |
| AI answers are slow or generic | Gemini is slow or busy. The server races the models in `src/lib/gemini.ts` and falls back to rules after 7 s, so the check still works. |
| EAS fails with `Unknown lockfile version` | Keep `"bun": "1.4.2"` in the `base` profile of `eas.json`. |
| Expo Go crashes on a native module | Use the development build, or `--go`; native code must load lazily (see `apps/mobile/CLAUDE.md`). |
| Camera distance or Screen Coach missing | They only exist in the installed Visus build, not in Expo Go. Screen Coach also needs *Usage access* and *Display over other apps*. |

## 8. Deploy

| App | How |
|---|---|
| Server (Cloudflare Workers) | Follow the steps in [`apps/server/CLAUDE.md`](../apps/server/CLAUDE.md#deploy-dhrutinandan): `bunx wrangler login`, then create Hyperdrive for the Aiven URL, `bunx wrangler secret put` each secret, and `bunx wrangler deploy`. Check it with `API=https://visus-api.<subdomain>.workers.dev bun run smoke`. |
| Web (Vercel) | Import the repo with root directory `apps/web`. Set `NEXT_PUBLIC_API_URL` to the Worker URL and `NEXT_PUBLIC_USE_MOCK=0`. Every push to `main` deploys. |
| Mobile | Point the `preview` env in `eas.json` to the Worker URL, then run `bunx eas-cli build --profile preview --platform android` and share the APK link. |

After deploying, set `WEB_URL` in `apps/server/wrangler.jsonc` and `EXPO_PUBLIC_WEB_URL` to the Vercel URL, so share links open the real web report.
