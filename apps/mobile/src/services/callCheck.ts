// Day 1 check only (developer screen Settings → Call check): an Agora token for the test channel
// from the local Bun server (`GET /dev/agora-token`, not in the deployed Worker).
import { request } from '@/services/api';

export type CheckJoin = { appId: string; channel: string; uid: number; token: string | null; expiresAt: string };

export const getCheckToken = (uid = 2) => request<CheckJoin>(`/dev/agora-token?uid=${uid}`);
