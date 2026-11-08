// The only place the app talks to the server. Screens call services/*,
// never fetch directly. With EXPO_PUBLIC_USE_MOCK=1 every service returns
// data from services/mock/ instead (no server needed).

import { router } from 'expo-router';

import { useAuth } from '@/store/auth';

/** The Visus API. On a phone, your Mac's Wi-Fi IP (apps/mobile/.env.example). */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787').replace(/\/$/, '');
/** The web app: report links, terms and privacy pages. */
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://visus.app';

/** EXPO_PUBLIC_USE_MOCK=1: mock data, no server. */
export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === '1';

/** The AI plan and verdict can take ~10 s on a slow day. */
const TIMEOUT_MS = 30_000;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function request<T>(path: string, init: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const token = useAuth.getState().token;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        // A FormData body (a recording) sets its own multipart Content-Type.
        ...(init.form ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: init.form ?? (init.body === undefined ? undefined : JSON.stringify(init.body)),
      signal: abort.signal,
    });
  } catch {
    throw new ApiError(0, "Can't reach Visus. Check your internet connection and try again.");
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => null);
  // The saved login expired or was revoked: back to Welcome.
  if (res.status === 401 && token) {
    useAuth.getState().signOut();
    try {
      router.replace('/welcome');
    } catch {
      // Navigation isn't ready yet: the start screen sends signed-out users to Welcome anyway.
    }
    throw new ApiError(401, 'Please log in again.');
  }
  if (!res.ok) throw new ApiError(res.status, data?.error ?? 'Something went wrong. Please try again.');
  return data as T;
}

/** Simulates network delay for mock responses. */
export const mockDelay = <T>(value: T, ms = 400) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));
