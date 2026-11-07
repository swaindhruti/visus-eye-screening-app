// Who may run or read a check. A person: their own profiles and checks. A shop: its walk-in
// patients, the checks it ran, and (read only) the checks of patients who approved a link.
import { and, eq, inArray, or, type SQL } from 'drizzle-orm';

import type { Db } from '../../db/client';
import { profiles, sessions, shopPatients, shops } from '../../db/schema';
import { fail } from '../../lib/errors';
import { isUuid } from '../../lib/validate';
import { toProfile } from '../profiles/profiles.service';

/** The shop this account owns, or null for a personal account. */
export async function shopIdOf(db: Db, userId: string) {
  const [shop] = await db.select({ id: shops.id }).from(shops).where(eq(shops.ownerId, userId));
  return shop?.id ?? null;
}

const myShops = (db: Db, userId: string) => db.select({ id: shops.id }).from(shops).where(eq(shops.ownerId, userId));

/** Accounts that approved a link with one of this user's shops. */
const linkedUsers = (db: Db, userId: string) =>
  db
    .select({ id: shopPatients.linkedUserId })
    .from(shopPatients)
    .where(and(inArray(shopPatients.shopId, myShops(db, userId)), eq(shopPatients.linkStatus, 'approved')));

/**
 * Sessions this user may use: their own and the ones their shop ran. With `read`, also every check
 * of a linked patient (a shop looking at past records).
 */
export function sessionAccess(db: Db, userId: string, read = false): SQL {
  const own = [eq(sessions.userId, userId), inArray(sessions.shopId, myShops(db, userId))];
  if (read) own.push(inArray(sessions.userId, linkedUsers(db, userId)));
  return or(...own)!;
}

/**
 * Whose check a new session is: the caller's own profile, or, for a shop, a linked patient's
 * profile (the check is then saved in the patient's account, marked with the shop).
 */
export async function checkTarget(db: Db, userId: string, profileId: string) {
  if (!isUuid(profileId)) fail(404, 'Profile not found');
  const [row] = await db.select().from(profiles).where(eq(profiles.id, profileId));
  if (!row) fail(404, 'Profile not found');
  const shopId = await shopIdOf(db, userId);
  if (row.userId === userId) return { ownerId: userId, profile: toProfile(row), shopId };
  if (shopId) {
    const [link] = await db
      .select({ id: shopPatients.id })
      .from(shopPatients)
      .where(and(eq(shopPatients.shopId, shopId), eq(shopPatients.linkedUserId, row.userId), eq(shopPatients.linkStatus, 'approved')));
    if (link) return { ownerId: row.userId, profile: toProfile(row), shopId };
  }
  fail(404, 'Profile not found');
}
