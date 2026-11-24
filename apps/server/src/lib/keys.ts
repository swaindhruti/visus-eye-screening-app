// Key pool (final): GEMINI_KEYS / SARVAM_KEYS, comma-separated (the two teammates' own free-tier keys),
// plus the single GEMINI_API_KEY / SARVAM_API_KEY. Calls take turns over the keys; a key that hit its
// quota (Gemini 429) or was refused / ran out of credits (Sarvam 402/403) cools down and the others
// carry on. Key values are never logged: messages say "key 2 of 3".
import type { Bindings } from './env';

export type KeyKind = 'gemini' | 'sarvam';

const pools: Record<KeyKind, string[]> = { gemini: [], sarvam: [] };
const coolUntil = new Map<string, number>();
const turn: Record<KeyKind, number> = { gemini: 0, sarvam: 0 };

const parse = (list: string | undefined, single: string | undefined) => [
  ...new Set(
    [...(list ?? '').split(','), single ?? '']
      .map((k) => k.trim())
      .filter(Boolean),
  ),
];

/** Once per request (index.ts): the pools from the env. */
export function setKeyPools(env: Pick<Bindings, 'GEMINI_API_KEY' | 'GEMINI_KEYS' | 'SARVAM_API_KEY' | 'SARVAM_KEYS'>) {
  pools.gemini = parse(env.GEMINI_KEYS, env.GEMINI_API_KEY);
  pools.sarvam = parse(env.SARVAM_KEYS, env.SARVAM_API_KEY);
}

const resting = (id: string) => (coolUntil.get(id) ?? 0) >= Date.now();
/** `scope`: one model (free-tier quotas are per model), so a quota on one model leaves the others free. */
const ready = (kind: KeyKind, scope?: string) => pools[kind].filter((k) => !resting(k) && !(scope && resting(`${k}|${scope}`)));

/** Is any key of this kind usable now? */
export const hasKey = (kind: KeyKind) => ready(kind).length > 0;

/** The next usable key (taking turns), or null when all are resting or none is set. */
export function pickKey(kind: KeyKind, scope?: string): string | null {
  const keys = ready(kind, scope);
  if (!keys.length) return null;
  return keys[turn[kind]++ % keys.length];
}

/** Rest this key for `ms` (no credits, refused), or only for one model with `scope` (quota). */
export function coolKey(kind: KeyKind, key: string, ms: number, why: string, scope?: string) {
  coolUntil.set(scope ? `${key}|${scope}` : key, Date.now() + ms);
  const n = pools[kind].indexOf(key) + 1;
  console.warn(`${kind === 'gemini' ? 'Gemini' : 'Sarvam'} key ${n || '?'} of ${pools[kind].length}: ${why}, resting it ${Math.round(ms / 60_000)} min`);
}
