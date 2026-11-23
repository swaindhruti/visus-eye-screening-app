// Create a user, check login, load the current user.
import type { AuthResponse, LoginRequest, Role, SignupRequest } from '@visus/shared';
import { eq, inArray, or } from 'drizzle-orm';
import { sign } from 'hono/jwt';
import type { z } from 'zod';

import type { Db } from '../../db/client';
import { doctors, shops, users } from '../../db/schema';
import type { Bindings } from '../../lib/env';
import { fail } from '../../lib/errors';
import { hashPassword, verifyPassword } from './password';

const TOKEN_DAYS = 30;

/** Phone or email, compared without case or spaces. */
const normalize = (identifier: string) => identifier.trim().toLowerCase().replace(/\s+/g, '');

/**
 * An Indian mobile number as its last 10 digits ("+91 98765 43210" → "9876543210"), or null.
 * Shops find a patient's account by this.
 */
export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 13 && !value.includes('@') ? digits.slice(-10) : null;
}

type User = typeof users.$inferSelect;
type PublicUser = z.infer<typeof AuthResponse>['user'];

async function publicUser(db: Db, u: User): Promise<PublicUser> {
  const role = u.role as Role;
  const [shop] = role === 'shop' ? await db.select({ name: shops.name }).from(shops).where(eq(shops.ownerId, u.id)) : [];
  const [doctor] = role === 'doctor' ? await db.select({ visusId: doctors.visusId }).from(doctors).where(eq(doctors.userId, u.id)) : [];
  return { id: u.id, name: u.name, identifier: u.identifier, role, shopName: shop?.name, phone: u.phone ?? undefined, visusId: doctor?.visusId };
}

export async function issue(db: Db, env: Bindings, user: User): Promise<z.infer<typeof AuthResponse>> {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_DAYS * 86_400;
  const token = await sign({ sub: user.id, exp }, env.JWT_SECRET, 'HS256');
  return { token, user: await publicUser(db, user) };
}

/** A new account (a person, a shop owner from POST /shops/register, a doctor from POST /doctors/register). Not yet logged in. */
export async function createUser(db: Db, env: Bindings, input: z.infer<typeof SignupRequest>, role: Role = 'user') {
  const identifier = normalize(input.identifier);
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.identifier, identifier));
  if (existing) fail(409, 'An account with this phone or email already exists. Try logging in.');
  const passwordHash = await hashPassword(input.password, env.PASSWORD_PEPPER);
  const [user] = await db
    .insert(users)
    .values({ name: input.name.trim(), identifier, passwordHash, role, phone: normalizePhone(identifier) })
    .returning();
  return user;
}

export async function signup(db: Db, env: Bindings, input: z.infer<typeof SignupRequest>) {
  return issue(db, env, await createUser(db, env, input));
}

export async function login(db: Db, env: Bindings, input: z.infer<typeof LoginRequest>) {
  let [user] = await db.select().from(users).where(eq(users.identifier, normalize(input.identifier)));
  let ok = !!user && (await verifyPassword(input.password, env.PASSWORD_PEPPER, user.passwordHash));
  // A phone typed another way than at signup ("9876543210" for "+91 98765 43210", or with a 0):
  // find the account by its 10-digit phone, or by the usual ways of writing that number.
  const typed = !ok ? normalizePhone(input.identifier) : null;
  if (typed) {
    const forms = [typed, `+91${typed}`, `91${typed}`, `0${typed}`];
    const matches = await db
      .select()
      .from(users)
      .where(or(eq(users.phone, typed), inArray(users.identifier, forms)));
    for (const m of matches) {
      if (await verifyPassword(input.password, env.PASSWORD_PEPPER, m.passwordHash)) {
        [user, ok] = [m, true];
        break;
      }
    }
  }
  if (!ok) fail(401, 'Wrong phone, email or password.');
  // Accounts from before phone numbers were stored: fill it in from a phone login.
  const phone = normalizePhone(user.identifier);
  if (!user.phone && phone) [user] = await db.update(users).set({ phone }).where(eq(users.id, user.id)).returning();
  return issue(db, env, user);
}

export async function getUser(db: Db, userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) fail(401, 'Please log in again.');
  return publicUser(db, user);
}

/** PATCH /me: the phone number shops can find this account by. */
export async function setPhone(db: Db, userId: string, value: string) {
  const phone = normalizePhone(value);
  if (!phone) fail(400, 'Enter a 10-digit mobile number.');
  await db.update(users).set({ phone }).where(eq(users.id, userId));
  return getUser(db, userId);
}
