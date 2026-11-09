// Who may run or read a check. A person: their own profiles and checks. A shop: its walk-in
// patients, the checks it ran, and (read only) the checks of patients who approved a link.
import { and, eq, inArray, notInArray, or, type SQL } from 'drizzle-orm';

import type { Db } from '../../db/client';
import { profiles, sessions, shopPatients, shops } from '../../db/schema';
import { fail } from '../../lib/errors';
import { isUuid } from '../../lib/validate';
import { createProfile, toProfile } from '../profiles/profiles.service';

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
  if (profileId === '') {
    const shopId = await shopIdOf(db, userId);
    if (!shopId) fail(400, 'profileId: pick who this check is for');
    return { ownerId: userId, profile: await walkInProfile(db, userId, shopId), shopId };
  }
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

/**
 * A shop's checks without a patient record (Test library: "No patient"). They are saved on one
 * profile per shop that is no patient's: a shop account's other profiles all belong to its patients.
 */
async function walkInProfile(db: Db, userId: string, shopId: string) {
  const patients = db.select({ id: shopPatients.profileId }).from(shopPatients).where(eq(shopPatients.shopId, shopId));
  const [row] = await db
    .select()
    .from(profiles)
    .where(and(eq(profiles.userId, userId), notInArray(profiles.id, patients)));
  if (row) return toProfile(row);
  return createProfile(db, userId, {
    name: 'Walk-in (no record)',
    age: 30,
    isChild: false,
    wearsGlasses: false,
    eyewear: 'none',
    healthConditions: [],
    screenHoursPerDay: 0,
    relation: 'other',
  });
}
