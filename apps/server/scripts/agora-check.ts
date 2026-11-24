// Day 1 check: does the Agora token code run on the Workers runtime?
// `bunx wrangler dev scripts/agora-check.ts --port 8798`, then GET / → a token made with a dummy App ID + certificate.
import { agoraToken } from '../src/lib/agora';

export default {
  fetch() {
    const { token } = agoraToken('0'.repeat(32), 'f'.repeat(32), 'visus-check', 1);
    return Response.json({ ok: !!token && token.startsWith('007'), length: token?.length });
  },
};
