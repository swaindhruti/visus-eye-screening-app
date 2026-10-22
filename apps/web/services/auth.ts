import type { AuthResponse, Profile } from "@visus/shared";

import { api, getToken, setToken, USE_MOCK } from "./api";
import * as mock from "./mock/auth";

export type AuthResult = ReturnType<typeof AuthResponse.parse>;
export type User = AuthResult["user"];

const GUEST_KEY = "visus.guest";

/** Guest mode (web): the Tests library only, one test at a time, nothing saved to an account. */
export function isGuest() {
  try {
    return localStorage.getItem(GUEST_KEY) === "1" && !getToken();
  } catch {
    return false;
  }
}

export function setGuest(on: boolean) {
  try {
    if (on) localStorage.setItem(GUEST_KEY, "1");
    else localStorage.removeItem(GUEST_KEY);
  } catch {}
}

export async function signup(input: { name: string; identifier: string; password: string }): Promise<User> {
  const res = USE_MOCK ? await mock.signup(input.name, input.identifier) : await api<AuthResult>("/auth/signup", { body: input, auth: false });
  setToken(res.token);
  setGuest(false);
  return res.user;
}

export async function login(input: { identifier: string; password: string }): Promise<User> {
  const res = USE_MOCK ? await mock.login(input.identifier) : await api<AuthResult>("/auth/login", { body: input, auth: false });
  setToken(res.token);
  setGuest(false);
  return res.user;
}

/** GET /me: the signed-in user and their profiles (owner first). Null when not signed in. */
export async function me(): Promise<{ user: User; profiles: Profile[] } | null> {
  if (!getToken()) return null;
  if (USE_MOCK) return mock.me();
  return api<{ user: User; profiles: Profile[] }>("/me");
}

export const isSignedIn = () => !!getToken();

export function logout() {
  setToken(null);
  setGuest(false);
}
