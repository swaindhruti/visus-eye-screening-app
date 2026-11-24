// Day 1 check: make real tokens for a test channel, to try in Agora's web demo.
// `bun scripts/agora-token.ts [channel]` → tokens for uid 1 (doctor) and 2 (patient), valid 2 hours.
// Reads AGORA_APP_ID / AGORA_APP_CERTIFICATE from .dev.vars; prints only the tokens, never the certificate.
import { readFileSync } from 'node:fs';

import { agoraToken } from '../src/lib/agora';

const vars = Object.fromEntries(
  readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^(["'])(.*)\1$/, '$2')]),
);
const channel = process.argv[2] ?? 'visus-check';
if (!vars.AGORA_APP_ID) throw new Error('AGORA_APP_ID is not set in .dev.vars');
console.log(`channel: ${channel}`);
for (const uid of [1, 2]) console.log(`uid ${uid}: ${agoraToken(vars.AGORA_APP_ID, vars.AGORA_APP_CERTIFICATE, channel, uid).token}`);
