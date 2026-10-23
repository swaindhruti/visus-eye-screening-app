import type {
  CreateSessionRequest,
  CreateSessionResponse,
  IntakeChatResponse,
  IntakeMessage,
  NextStep,
  SessionSummary,
  ShareLink,
  SubmitResult,
  Verdict,
} from '@visus/shared';

import { mockDelay, request, USE_MOCK } from '@/services/api';
import { mockCreateSession, mockIntakeChat, mockSession, mockSessions, mockShare, mockSubmitResult, mockVerdict } from '@/services/mock/sessions';

export type { SessionSummary };

/** GET /sessions: past checks, newest first. */
export async function listSessions(): Promise<SessionSummary[]> {
  if (USE_MOCK) return mockDelay(mockSessions());
  return request<SessionSummary[]>('/sessions');
}

/** GET /sessions/:id: the verdict of a finished check. */
export async function getSession(sessionId: string): Promise<Verdict> {
  if (USE_MOCK) {
    await mockDelay(null);
    return mockSession(sessionId);
  }
  return request<Verdict>(`/sessions/${sessionId}`);
}

/** POST /sessions/:id/share: a read-only report link for a doctor, valid 24 hours. */
export async function shareSession(sessionId: string): Promise<ShareLink> {
  if (USE_MOCK) return mockDelay(mockShare(sessionId), 600);
  return request<ShareLink>(`/sessions/${sessionId}/share`, { method: 'POST' });
}

export type { IntakeMessage };

/** POST /intake/chat: the AI's next intake question with quick replies, or done. Send the whole chat so far. */
export async function intakeChat(profileId: string, messages: IntakeMessage[]): Promise<IntakeChatResponse> {
  if (USE_MOCK) return mockDelay(mockIntakeChat(messages), 900);
  return request<IntakeChatResponse>('/intake/chat', { method: 'POST', body: { profileId, messages } });
}

/** The chat as the `intake` text of POST /sessions: one line per message, "Visus: …" / "Me: …". */
export const intakeText = (messages: IntakeMessage[]) =>
  messages.map((m) => `${m.from === 'me' ? 'Me' : 'Visus'}: ${m.text.replace(/\s+/g, ' ').trim()}`).join('\n');

export type NewSession = ReturnType<typeof CreateSessionRequest.parse>;
export type Session = ReturnType<typeof CreateSessionResponse.parse>;

/** POST /sessions: the agent reads the intake and returns a test plan. */
export async function createSession(input: NewSession): Promise<Session> {
  if (USE_MOCK) return mockDelay(mockCreateSession(input), 1200);
  return request<Session>('/sessions', { method: 'POST', body: input });
}

/** Guest checks never reach the server's sessions: one test, scored by POST /reports/guest-score, nothing saved. */
export const GUEST_SESSION = 'guest';

export const guestSession = (testId: SubmitResult['testId']): Session => ({
  sessionId: GUEST_SESSION,
  summary: 'The test you picked.',
  plan: [{ testId, reason: 'Picked by you' }],
});

/** POST /sessions/:id/results: raw answers of one test. The server scores them and says what comes next. */
export async function submitResult(sessionId: string, input: SubmitResult): Promise<NextStep> {
  if (USE_MOCK) return mockDelay(mockSubmitResult(sessionId, input), 900);
  if (sessionId === GUEST_SESSION) return request<NextStep>('/reports/guest-score', { method: 'POST', body: input });
  return request<NextStep>(`/sessions/${sessionId}/results`, { method: 'POST', body: input });
}

/** POST /sessions/:id/verdict: overall results and ZEISS lens suggestions once the tests are done. */
export async function getVerdict(sessionId: string): Promise<Verdict> {
  if (USE_MOCK) return mockDelay(mockVerdict(sessionId), 2500);
  return request<Verdict>(`/sessions/${sessionId}/verdict`, { method: 'POST' });
}
