import type { AuthResponse, LoginRequest, SignupRequest } from '@visus/shared';

import { mockDelay, request, USE_MOCK } from '@/services/api';
import { mockLogin, mockSignup } from '@/services/mock/auth';
import { useAuth } from '@/store/auth';

export type Auth = ReturnType<typeof AuthResponse.parse>;
export type User = Auth['user'];
export type SignupInput = ReturnType<typeof SignupRequest.parse>;
export type LoginInput = ReturnType<typeof LoginRequest.parse>;

// The token and user are kept on the phone (store/auth.ts), so a restart stays logged in.
function start(auth: Auth) {
  useAuth.getState().signIn(auth);
  return auth.user;
}

/** POST /auth/signup */
export async function signup(input: SignupInput): Promise<User> {
  const auth = USE_MOCK ? await mockDelay(mockSignup(input)) : await request<Auth>('/auth/signup', { method: 'POST', body: input });
  return start(auth);
}

/** POST /auth/login */
export async function login(input: LoginInput): Promise<User> {
  const auth = USE_MOCK ? await mockDelay(mockLogin(input)) : await request<Auth>('/auth/login', { method: 'POST', body: input });
  return start(auth);
}

/** The signed-in user, or null before sign up / log in. */
export function currentUser() {
  return useAuth.getState().user;
}

/** Guest mode (Welcome → Continue as guest): single tests from the library, nothing saved. Log in / sign up ends it. */
export const isGuest = () => useAuth.getState().guest;
export const setGuest = (on: boolean) => useAuth.getState().setGuest(on);

/** Forgets the account on this phone (the saved token too). Screens also reset the check (see Settings). */
export function logout() {
  useAuth.getState().signOut();
  void useAuth.persist.clearStorage();
}
