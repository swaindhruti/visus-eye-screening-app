// Remote consult on the patient's side: the consults a clinic booked for you, joining the video call,
// captions, the tests the doctor sends during the call, and your prescriptions. Only the clinic books.
import type { Caption, ConsultDetail, ConsultPrescription, ConsultSummary, ConsultTest, JoinConsultResponse, Language, LiveState, SubmitResult } from '@visus/shared';

import { ApiError, mockDelay, request, USE_MOCK } from '@/services/api';
import { MOCK_CONSULTS, MOCK_LIVE, MOCK_PRESCRIPTIONS, mockConsult } from '@/services/mock/consults';

export type { Caption, ConsultDetail, ConsultPrescription, ConsultSummary, ConsultTest, JoinConsultResponse, LiveState };

/** Joining opens 10 minutes before the start (the server decides; this only shows the button). */
export const JOIN_EARLY_MS = 10 * 60_000;

/** Show "Join now": from 10 minutes before the start until it ends. */
export function joinable(c: Pick<ConsultSummary, 'status' | 'startsAt' | 'minutes'>, now = Date.now()) {
  if (c.status === 'live') return true;
  if (c.status !== 'scheduled') return false;
  const start = Date.parse(c.startsAt);
  return now >= start - JOIN_EARLY_MS && now <= start + c.minutes * 60_000;
}

/** GET /me/consults: upcoming first, then past. */
export async function listMyConsults(): Promise<ConsultSummary[]> {
  if (USE_MOCK) return mockDelay(MOCK_CONSULTS, 200);
  return request<ConsultSummary[]>('/me/consults');
}

/** GET /consults/:id */
export async function getConsult(id: string): Promise<ConsultDetail> {
  if (USE_MOCK) return mockDelay(mockConsult(id), 150);
  return request<ConsultDetail>(`/consults/${id}`);
}

/** GET /consults/:id/prescription, or null before the doctor saves it. */
export async function getConsultPrescription(id: string): Promise<ConsultPrescription | null> {
  if (USE_MOCK) return mockDelay(MOCK_PRESCRIPTIONS.find((p) => p.consultId === id) ?? null, 150);
  try {
    return await request<ConsultPrescription>(`/consults/${id}/prescription`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

/** GET /me/prescriptions: final ones, newest first. */
export async function listMyPrescriptions(): Promise<ConsultPrescription[]> {
  if (USE_MOCK) return mockDelay(MOCK_PRESCRIPTIONS, 200);
  return request<ConsultPrescription[]>('/me/prescriptions');
}

/** POST /consults/:id/join: the Agora App ID, channel, token and uid. */
export async function joinConsult(id: string): Promise<JoinConsultResponse> {
  return request<JoinConsultResponse>(`/consults/${id}/join`, { method: 'POST' });
}

/** GET /consults/:id/live?after=: polled every 2 s during the call. */
export async function getLive(id: string, after?: string): Promise<LiveState> {
  if (USE_MOCK) return mockDelay(MOCK_LIVE, 100);
  return request<LiveState>(`/consults/${id}/live${after ? `?after=${after}` : ''}`);
}

/** POST /consults/:id/captions: one finished sentence in your language. */
export async function sendCaption(id: string, text: string, language: Language): Promise<Caption> {
  return request<Caption>(`/consults/${id}/captions`, { method: 'POST', body: { text: text.slice(0, 300), language } });
}

/** POST /consults/:id/tests/:rowId/result: the raw answers of a test the doctor sent. */
export async function submitConsultTest(id: string, rowId: string, result: SubmitResult): Promise<ConsultTest> {
  return request<ConsultTest>(`/consults/${id}/tests/${rowId}/result`, { method: 'POST', body: result });
}
