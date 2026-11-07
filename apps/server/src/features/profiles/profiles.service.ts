// Read and write user + family profiles (incl. glasses).
import type { Profile } from '@visus/shared';
import { and, asc, eq } from 'drizzle-orm';

import type { Db } from '../../db/client';
import { profiles } from '../../db/schema';
import { fail } from '../../lib/errors';
import { isUuid } from '../../lib/validate';

type Row = typeof profiles.$inferSelect;
export type NewProfile = Omit<Profile, 'id'>;

/** DB row → shared Profile (null columns become missing fields). */
export function toProfile(r: Row): Profile {
  return {
    id: r.id,
    name: r.name,
    age: r.age,
    gender: r.gender ?? undefined,
    isChild: r.isChild,
    wearsGlasses: r.wearsGlasses,
    healthConditions: r.healthConditions,
    screenHoursPerDay: r.screenHoursPerDay,
    relation: (r.relation as Profile['relation']) ?? undefined,
    eyewear: (r.eyewear as Profile['eyewear']) ?? undefined,
    pastEyeTest: (r.pastEyeTest as Profile['pastEyeTest']) ?? undefined,
    pastEyeNote: r.pastEyeNote ?? undefined,
    prescription: r.prescription,
    savedLens: r.savedLens,
  };
}

/** The account's profiles, owner ("self") first, then in the order they were added. */
export async function listProfiles(db: Db, userId: string) {
  const rows = await db.select().from(profiles).where(eq(profiles.userId, userId)).orderBy(asc(profiles.createdAt));
  const list = rows.map(toProfile);
  return [...list.filter((p) => p.relation === 'self'), ...list.filter((p) => p.relation !== 'self')];
}

/** A profile of this account, or 404. */
export async function getProfile(db: Db, userId: string, id: string) {
  if (!isUuid(id)) fail(404, 'Profile not found');
  const [row] = await db
    .select()
    .from(profiles)
    .where(and(eq(profiles.id, id), eq(profiles.userId, userId)));
  if (!row) fail(404, 'Profile not found');
  return toProfile(row);
}

/** Any profile by id, after the caller's access was checked (e.g. through its session). */
export async function getProfileById(db: Db, id: string) {
  const [row] = await db.select().from(profiles).where(eq(profiles.id, id));
  if (!row) fail(404, 'Profile not found');
  return toProfile(row);
}

/** The account owner's own profile ("self", else the first one), or null before onboarding. */
export async function selfProfile(db: Db, userId: string) {
  return (await listProfiles(db, userId))[0] ?? null;
}

/** The first profile of an account is the owner ("self"). */
export async function createProfile(db: Db, userId: string, input: NewProfile) {
  const relation = input.relation ?? ((await listProfiles(db, userId)).length === 0 ? 'self' : 'other');
  const [row] = await db
    .insert(profiles)
    .values({ ...input, relation, userId })
    .returning();
  return toProfile(row);
}

export async function updateProfile(db: Db, userId: string, id: string, patch: Partial<NewProfile>) {
  await getProfile(db, userId, id);
  if (Object.keys(patch).length === 0) return getProfile(db, userId, id);
  const [row] = await db
    .update(profiles)
    .set(patch)
    .where(and(eq(profiles.id, id), eq(profiles.userId, userId)))
    .returning();
  return toProfile(row);
}
