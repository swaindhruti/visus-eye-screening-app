import type {
  CreateSessionRequest,
  CreateSessionResponse,
  IntakeChatResponse,
  IntakeMessage,
  NextStep,
  SessionMode,
  SessionSummary,
  ShareLink,
  SubmitResult,
  Verdict,
} from "@visus/shared";

import { api, USE_MOCK } from "./api";
import { isGuest } from "./auth";
import * as mock from "./mock/sessions";

export type { IntakeMessage, SessionSummary, ShareLink };
export type CheckMode = SessionMode;
export type NewSession = ReturnType<typeof CreateSessionRequest.parse>;
export type CreatedSession = ReturnType<typeof CreateSessionResponse.parse>;

/** POST /intake/chat: the AI's next intake question with quick replies, or done. Send the whole chat so far. */
export async function intakeChat(profileId: string, messages: IntakeMessage[]): Promise<IntakeChatResponse> {
  if (USE_MOCK) return mock.intakeChat(messages);
  return api<IntakeChatResponse>("/intake/chat", { body: { profileId, messages } });
}

/** The chat as the `intake` text of POST /sessions: one line per message, "Visus: …" / "Me: …". */
export const intakeText = (messages: IntakeMessage[]) => messages.map((m) => `${m.from === "me" ? "Me" : "Visus"}: ${m.text.replace(/\s+/g, " ").trim()}`).join("\n");

/** Guest checks never reach the server's sessions: one test, scored by POST /reports/guest-score, nothing saved. */
export const GUEST_SESSION = "guest";

/** POST /sessions: the agent reads the intake and returns a test plan. */
export async function createSession(input: NewSession): Promise<CreatedSession> {
  if (isGuest()) {
    if (input.mode !== "single" || !input.testId) throw new Error("Sign up to use this check.");
    return { sessionId: GUEST_SESSION, summary: "The test you picked.", plan: [{ testId: input.testId, reason: "The test you picked." }] };
  }
  if (USE_MOCK) return mock.create(input);
  return api<CreatedSession>("/sessions", { body: input });
}

/** Raw answers only. The server scores them and decides what comes next. */
export async function submitResult(sessionId: string, result: SubmitResult): Promise<NextStep> {
  if (sessionId === GUEST_SESSION) return USE_MOCK ? mock.guestScore(result) : api<NextStep>("/reports/guest-score", { body: result, auth: false });
  if (USE_MOCK) return mock.submit(sessionId, result);
  return api<NextStep>(`/sessions/${sessionId}/results`, { body: result });
}

/** POST /sessions/:id/verdict: overall results and ZEISS lens suggestions (calling again returns the same one). */
export async function getVerdict(sessionId: string): Promise<Verdict> {
  if (USE_MOCK) return mock.verdict(sessionId);
  return api<Verdict>(`/sessions/${sessionId}/verdict`, { method: "POST" });
}

/** GET /sessions/:id: the verdict of a finished check. */
export async function getSession(sessionId: string): Promise<Verdict> {
  if (USE_MOCK) return mock.verdict(sessionId);
  return api<Verdict>(`/sessions/${sessionId}`);
}

/** GET /sessions: finished checks, newest first. */
export async function listSessions(): Promise<SessionSummary[]> {
  if (USE_MOCK) return mock.list();
  return api<SessionSummary[]>("/sessions");
}

/** POST /sessions/:id/share: a read-only report link for a doctor, valid 24 hours. */
export async function shareSession(sessionId: string): Promise<ShareLink> {
  if (USE_MOCK) return mock.share(sessionId);
  return api<ShareLink>(`/sessions/${sessionId}/share`, { method: "POST" });
}

/** GET /reports/:token (no login): the verdict behind a share link. 404 once it expired. */
export async function getReport(token: string): Promise<Verdict> {
  if (USE_MOCK) return mock.verdict(token);
  return api<Verdict>(`/reports/${token}`, { auth: false });
}
