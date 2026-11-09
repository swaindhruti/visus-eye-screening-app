// Shop portal: register a shop, its walk-in patients, and linking a patient's own Visus account.
import type { CreatePatientRequest, LinkStatus, PatientDetail, ShopAccount, ShopPatient, ShopRegisterRequest, ShopRequest, UpdateShopRequest } from '@visus/shared';
import { and, count, desc, eq, ilike, inArray, isNotNull, isNull, max, ne, or } from 'drizzle-orm';
import type { z } from 'zod';

import type { Db } from '../../db/client';
import { profiles, sessions, shopPatients, shops, users } from '../../db/schema';
import type { Bindings } from '../../lib/env';
import { fail } from '../../lib/errors';
import { isUuid } from '../../lib/validate';
import { createUser, issue, normalizePhone } from '../auth/auth.service';
import { summaries } from '../history/history.service';
import { createProfile, selfProfile } from '../profiles/profiles.service';

type PatientRow = typeof shopPatients.$inferSelect;
type ProfileRow = typeof profiles.$inferSelect;

/** POST /shops/register: a shop account (role "shop") and its shop; logged in straight away. */
export async function registerShop(db: Db, env: Bindings, input: z.infer<typeof ShopRegisterRequest>) {
  const user = await createUser(db, env, { name: input.ownerName, identifier: input.identifier, password: input.password }, 'shop');
  await db.insert(shops).values({ ownerId: user.id, name: input.shopName.trim(), address: input.address.trim(), city: input.city.trim() });
  return issue(db, env, user);
}

/** A personal account with this phone number (shops can't link other shops). */
async function accountByPhone(db: Db, phone: string) {
  if (!phone) return null;
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.phone, phone), eq(users.role, 'user')));
  return user ?? null;
}

/** Rows → ShopPatient: linked patients are checked on their own profile; adds the last check date. */
async function toPatients(db: Db, rows: { p: PatientRow; profile: ProfileRow }[]): Promise<ShopPatient[]> {
  const linked = rows.filter(({ p }) => p.linkStatus === 'approved' && p.linkedUserId).map(({ p }) => p.linkedUserId!);
  const selves = new Map<string, string>();
  for (const userId of new Set(linked)) {
    const self = await selfProfile(db, userId);
    if (self) selves.set(userId, self.id);
  }
  const checkProfile = (p: PatientRow) => (p.linkStatus === 'approved' && p.linkedUserId && selves.get(p.linkedUserId)) || p.profileId;
  const ids = rows.map(({ p }) => checkProfile(p));
  const last = ids.length
    ? await db
        .select({ profileId: sessions.profileId, at: max(sessions.createdAt) })
        .from(sessions)
        .where(and(inArray(sessions.profileId, ids), isNotNull(sessions.verdict)))
        .groupBy(sessions.profileId)
    : [];
  return rows.map(({ p, profile }) => ({
    id: p.id,
    name: profile.name,
    age: profile.age,
    phone: p.phone,
    wearsGlasses: profile.wearsGlasses,
    linkStatus: p.linkStatus as LinkStatus,
    checkProfileId: checkProfile(p),
    lastCheck: last.find((l) => l.profileId === checkProfile(p))?.at?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  }));
}

/** GET /shop/patients: newest first; `q` matches the name or phone. */
export async function listPatients(db: Db, shopId: string, q = '') {
  const term = q.trim();
  const rows = await db
    .select({ p: shopPatients, profile: profiles })
    .from(shopPatients)
    .innerJoin(profiles, eq(profiles.id, shopPatients.profileId))
    .where(and(eq(shopPatients.shopId, shopId), term ? or(ilike(profiles.name, `%${term}%`), ilike(shopPatients.phone, `%${term}%`)) : undefined))
    .orderBy(desc(shopPatients.createdAt));
  return toPatients(db, rows);
}

async function patientRow(db: Db, shopId: string, id: string) {
  if (!isUuid(id)) fail(404, 'Patient not found');
  const [row] = await db
    .select({ p: shopPatients, profile: profiles })
    .from(shopPatients)
    .innerJoin(profiles, eq(profiles.id, shopPatients.profileId))
    .where(and(eq(shopPatients.id, id), eq(shopPatients.shopId, shopId)));
  if (!row) fail(404, 'Patient not found');
  return row;
}

/** GET /shop/patients/:id: the patient and their finished checks (all of them once linked). */
export async function getPatient(db: Db, shopId: string, id: string): Promise<PatientDetail> {
  const row = await patientRow(db, shopId, id);
  const [patient] = await toPatients(db, [row]);
  const { p } = row;
  const linked = p.linkStatus === 'approved' && p.linkedUserId;
  const where = or(
    eq(sessions.profileId, p.profileId), // checks before the link
    linked ? eq(sessions.profileId, patient.checkProfileId) : undefined, // all their checks once linked
    p.linkedUserId ? and(eq(sessions.shopId, shopId), eq(sessions.userId, p.linkedUserId)) : undefined, // ours, even after an unlink
  );
  return { ...patient, sessions: await summaries(db, where) };
}

/**
 * POST /shop/patients: a walk-in. The details go in a profile owned by the shop account. If a Visus
 * account has this phone number, a link request waits for that person's answer.
 */
export async function createPatient(db: Db, shopId: string, ownerId: string, input: z.infer<typeof CreatePatientRequest>) {
  const phone = input.phone.trim() ? normalizePhone(input.phone) : '';
  if (phone === null) fail(400, 'Enter a 10-digit mobile number, or leave it empty.');
  if (phone) {
    const [dup] = await db
      .select({ id: shopPatients.id })
      .from(shopPatients)
      .where(and(eq(shopPatients.shopId, shopId), eq(shopPatients.phone, phone)));
    if (dup) fail(409, 'A patient with this phone number is already in your list.');
  }
  const profile = await createProfile(db, ownerId, {
    name: input.name.trim(),
    age: input.age,
    gender: input.gender,
    isChild: input.age < 13,
    wearsGlasses: input.wearsGlasses,
    eyewear: input.wearsGlasses ? 'glasses' : 'none',
    healthConditions: [],
    screenHoursPerDay: 0,
    relation: 'other', // never the shop account's own "self"
  });
  const account = await accountByPhone(db, phone);
  const [row] = await db
    .insert(shopPatients)
    .values({ shopId, profileId: profile.id, phone, linkedUserId: account?.id ?? null, linkStatus: account ? 'pending' : 'none' })
    .returning();
  return getPatient(db, shopId, row.id);
}

/**
 * PATCH /shop/patients/:id: add or change the mobile number of a walk-in added without one. If a Visus
 * account uses it, the patient gets a link request; once they allow it, the shop sees their past checks.
 */
export async function setPatientPhone(db: Db, shopId: string, id: string, raw: string) {
  const { p } = await patientRow(db, shopId, id);
  if (p.linkStatus === 'approved') fail(400, "This patient's Visus account is linked, so their number can't change here.");
  const phone = raw.trim() ? normalizePhone(raw) : '';
  if (phone === null) fail(400, 'Enter a 10-digit mobile number.');
  if (phone) {
    const [dup] = await db
      .select({ id: shopPatients.id })
      .from(shopPatients)
      .where(and(eq(shopPatients.shopId, shopId), eq(shopPatients.phone, phone), ne(shopPatients.id, id)));
    if (dup) fail(409, 'Another patient in your list has this phone number.');
  }
  const account = await accountByPhone(db, phone);
  await db
    .update(shopPatients)
    .set({ phone, linkedUserId: account?.id ?? null, linkStatus: account ? 'pending' : 'none' })
    .where(eq(shopPatients.id, id));
  return getPatient(db, shopId, id);
}

/** POST /shop/patients/:id/link: ask again (after a decline, or once the patient has an account). */
export async function requestLink(db: Db, shopId: string, id: string) {
  const { p } = await patientRow(db, shopId, id);
  if (p.linkStatus === 'approved') fail(400, 'This patient is already linked.');
  if (!p.phone) fail(400, "Add the patient's phone number first.");
  const account = await accountByPhone(db, p.phone);
  if (!account) fail(404, 'No Visus account uses this phone number yet. Ask the patient to sign up with it.');
  await db.update(shopPatients).set({ linkedUserId: account.id, linkStatus: 'pending' }).where(eq(shopPatients.id, id));
  return getPatient(db, shopId, id);
}

// ---------- The shop's account ----------

/** GET /shop: the shop, who runs it and how many patients it has. */
export async function getShopAccount(db: Db, shopId: string, userId: string): Promise<ShopAccount> {
  const [shop] = await db.select().from(shops).where(eq(shops.id, shopId));
  const [owner] = await db.select({ name: users.name, identifier: users.identifier }).from(users).where(eq(users.id, userId));
  const [{ n }] = await db.select({ n: count() }).from(shopPatients).where(eq(shopPatients.shopId, shopId));
  return { id: shop.id, name: shop.name, address: shop.address, city: shop.city, ownerName: owner.name, identifier: owner.identifier, patients: n };
}

/** PATCH /shop: the shop's name, address and city. */
export async function updateShop(db: Db, shopId: string, userId: string, input: z.infer<typeof UpdateShopRequest>) {
  await db.update(shops).set({ name: input.name.trim(), address: input.address.trim(), city: input.city.trim() }).where(eq(shops.id, shopId));
  return getShopAccount(db, shopId, userId);
}

// ---------- The patient's side (/me) ----------

/** Requests for this account: sent to it, or waiting on its phone number from before it signed up. */
async function requestsFor(db: Db, userId: string) {
  const [me] = await db.select({ phone: users.phone }).from(users).where(eq(users.id, userId));
  const byPhone = me?.phone ? and(isNull(shopPatients.linkedUserId), eq(shopPatients.linkStatus, 'none'), eq(shopPatients.phone, me.phone)) : undefined;
  return or(and(eq(shopPatients.linkedUserId, userId), eq(shopPatients.linkStatus, 'pending')), byPhone)!;
}

const shopRequest = ({ p, shop }: { p: PatientRow; shop: typeof shops.$inferSelect }, status: LinkStatus): ShopRequest => ({
  id: p.id,
  shopName: shop.name,
  city: shop.city,
  status,
  createdAt: p.createdAt.toISOString(),
});

/** GET /me/shop-requests */
export async function listRequests(db: Db, userId: string) {
  const rows = await db
    .select({ p: shopPatients, shop: shops })
    .from(shopPatients)
    .innerJoin(shops, eq(shops.id, shopPatients.shopId))
    .where(await requestsFor(db, userId))
    .orderBy(desc(shopPatients.createdAt));
  return rows.map((r) => shopRequest(r, 'pending'));
}

/**
 * POST /me/shop-requests/:id. Allow: the shop's earlier checks of this patient move into this
 * account, and the shop can see and add to its checks. Decline: nothing is shared.
 */
export async function answerRequest(db: Db, userId: string, id: string, approve: boolean) {
  if (!isUuid(id)) fail(404, 'Request not found');
  const [row] = await db
    .select({ p: shopPatients, shop: shops })
    .from(shopPatients)
    .innerJoin(shops, eq(shops.id, shopPatients.shopId))
    .where(and(eq(shopPatients.id, id), await requestsFor(db, userId)));
  if (!row) fail(404, 'Request not found');
  if (!approve) {
    await db.update(shopPatients).set({ linkedUserId: userId, linkStatus: 'declined' }).where(eq(shopPatients.id, id));
    return shopRequest(row, 'declined');
  }
  const self = await selfProfile(db, userId);
  if (!self) fail(400, 'Finish setting up your profile first, then allow the shop.');
  await db.update(sessions).set({ userId, profileId: self.id }).where(eq(sessions.profileId, row.p.profileId));
  await db.update(shopPatients).set({ linkedUserId: userId, linkStatus: 'approved' }).where(eq(shopPatients.id, id));
  return shopRequest(row, 'approved');
}

/** GET /me/shops: shops that can see this account's checks. */
export async function listLinkedShops(db: Db, userId: string) {
  const rows = await db
    .select({ p: shopPatients, shop: shops })
    .from(shopPatients)
    .innerJoin(shops, eq(shops.id, shopPatients.shopId))
    .where(and(eq(shopPatients.linkedUserId, userId), eq(shopPatients.linkStatus, 'approved')))
    .orderBy(desc(shopPatients.createdAt));
  return rows.map((r) => shopRequest(r, 'approved'));
}

/** DELETE /me/shops/:id: the shop loses access (it keeps only the checks it ran). */
export async function unlinkShop(db: Db, userId: string, id: string) {
  if (!isUuid(id)) fail(404, 'Shop not found');
  const [row] = await db
    .update(shopPatients)
    .set({ linkStatus: 'declined' })
    .where(and(eq(shopPatients.id, id), eq(shopPatients.linkedUserId, userId), eq(shopPatients.linkStatus, 'approved')))
    .returning({ id: shopPatients.id });
  if (!row) fail(404, 'Shop not found');
  return { ok: true };
}
