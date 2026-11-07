// List past checks, load one check, create a 24-hour share link.
import type { SessionMode, SessionSummary, ShareLink, Status, TestId, Verdict } from '@visus/shared';
import { and, desc, eq, gt, isNotNull, type SQL } from 'drizzle-orm';

import type { Db } from '../../db/client';
import { sessions, shops } from '../../db/schema';
import { fail } from '../../lib/errors';
import { getOwnSession } from '../sessions/sessions.service';

const RANK: Record<Status, number> = { good: 0, mild: 1, see_doctor: 2 };
const SHARE_HOURS = 24;

/** Finished checks matching `where`, newest first, with the shop that ran each one. */
export async function summaries(db: Db, where: SQL | undefined): Promise<SessionSummary[]> {
  const rows = await db
    .select({ s: sessions, shopName: shops.name })
    .from(sessions)
    .leftJoin(shops, eq(shops.id, sessions.shopId))
    .where(and(where, isNotNull(sessions.verdict)))
    .orderBy(desc(sessions.createdAt));
  return rows.map(({ s, shopName }) => {
    const v = s.verdict!;
    return {
      id: s.id,
      profileId: s.profileId,
      date: v.date ?? s.createdAt.toISOString(),
      mode: s.mode as SessionMode,
      headline: v.headline,
      status: v.results.reduce<Status>((w, r) => (RANK[r.status] > RANK[w] ? r.status : w), 'good'),
      tests: v.results.map((r) => r.testId),
      scores: Object.fromEntries(v.results.map((r) => [r.testId, r.score])) as Partial<Record<TestId, number>>,
      shopName: shopName ?? undefined,
    };
  });
}

/** Finished checks of this account, newest first. */
export async function listSessions(db: Db, userId: string): Promise<SessionSummary[]> {
  return summaries(db, eq(sessions.userId, userId));
}

/** One finished check. Shops may also open the checks of patients who linked their account. */
export async function getVerdict(db: Db, userId: string, id: string): Promise<Verdict> {
  const session = await getOwnSession(db, userId, id, true);
  if (!session.verdict) fail(404, "This check isn't finished yet");
  return session.verdict;
}

/** A read-only link for a doctor. Reuses a link that is still valid. */
export async function shareSession(db: Db, userId: string, id: string, webUrl: string): Promise<ShareLink> {
  const session = await getOwnSession(db, userId, id);
  if (!session.verdict) fail(400, 'Finish the check before sharing it');
  let token = session.shareToken;
  let expires = session.shareExpiresAt;
  if (!token || !expires || expires.getTime() < Date.now() + 60 * 60 * 1000) {
    token = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
    expires = new Date(Date.now() + SHARE_HOURS * 3600 * 1000);
    await db.update(sessions).set({ shareToken: token, shareExpiresAt: expires }).where(eq(sessions.id, id));
  }
  return { url: `${webUrl.replace(/\/$/, '')}/r/${token}`, expiresAt: expires.toISOString() };
}

/** The shared report behind a link, while it is valid (no login). */
export async function getSharedReport(db: Db, token: string): Promise<Verdict> {
  if (!/^[0-9a-f]{32}$/.test(token)) fail(404, 'This link is invalid or has expired');
  const [row] = await db
    .select({ verdict: sessions.verdict })
    .from(sessions)
    .where(and(eq(sessions.shareToken, token), gt(sessions.shareExpiresAt, new Date())));
  if (!row?.verdict) fail(404, 'This link is invalid or has expired');
  return row.verdict;
}
