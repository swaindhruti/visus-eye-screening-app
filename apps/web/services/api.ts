// The only place the web app talks to the server. Pages call services/*, never fetch.
// NEXT_PUBLIC_USE_MOCK=1: every service returns data from services/mock/ (no server).

/** The Visus API (apps/web/.env.example). */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787").replace(/\/$/, "");

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "1";

/** The AI plan and verdict can take ~10 s on a slow day. */
const TIMEOUT_MS = 30_000;

const TOKEN_KEY = "visus.token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const token = getToken();
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers: {
        "Content-Type": "application/json",
        ...(token && init.auth !== false ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: abort.signal,
    });
  } catch {
    throw new ApiError(0, "Can't reach Visus. Check your internet connection and try again.");
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => null);
  // Not logged in, or the saved login expired: back to Welcome.
  if (res.status === 401 && init.auth !== false) {
    setToken(null);
    if (typeof window !== "undefined" && !location.pathname.startsWith("/welcome")) location.replace("/welcome");
    throw new ApiError(401, "Please log in again.");
  }
  if (!res.ok) throw new ApiError(res.status, data?.error ?? "Something went wrong. Please try again.");
  return data as T;
}
