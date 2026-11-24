// Agora call tokens (remote consult). The server makes them; video and voice go device ↔ Agora.
// Channel = consult id. uid: doctor 1, patient 2, clinic 3 (docs/CONSULT.md → How the call works).
import { RtcRole, RtcTokenBuilder } from 'agora-token';

import type { CallRole } from '@visus/shared';

export const CALL_UID: Record<CallRole, number> = { doctor: 1, patient: 2, clinic: 3 };
const TOKEN_SECONDS = 2 * 60 * 60;

/**
 * A 2-hour publisher token for one uid on one channel. Without an App Certificate (an Agora project
 * in testing mode) the token is null and the apps join with the App ID only.
 */
export function agoraToken(appId: string, certificate: string | undefined, channel: string, uid: number) {
  const expiresAt = new Date(Date.now() + TOKEN_SECONDS * 1000).toISOString();
  const token = certificate
    ? RtcTokenBuilder.buildTokenWithUid(appId, certificate, channel, uid, RtcRole.PUBLISHER, TOKEN_SECONDS, TOKEN_SECONDS)
    : null;
  return { token, expiresAt };
}
