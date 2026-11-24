import type {
  Caption,
  CaptionRequest,
  ConsultDetail,
  ConsultPrescription,
  ConsultSummary,
  ConsultTest,
  JoinConsultResponse,
  LiveState,
  PatientFile,
  PushTestRequest,
  SavePrescriptionRequest,
  SubmitResult,
} from "@visus/shared";

import { api, ApiError, USE_MOCK } from "./api";
import * as mock from "./mock/consults";

export type { Caption, ConsultDetail, ConsultPrescription, ConsultSummary, ConsultTest, JoinConsultResponse, LiveState, PatientFile, SavePrescriptionRequest };
export type NewCaption = ReturnType<typeof CaptionRequest.parse>;
export type NewTest = ReturnType<typeof PushTestRequest.parse>;

// ---------- The patient's side (only the clinic books) ----------

/** GET /me/consults: this account's consults (all its profiles), upcoming first, then past. */
export async function listMyConsults(): Promise<ConsultSummary[]> {
  if (USE_MOCK) return mock.myConsults();
  return api<ConsultSummary[]>("/me/consults");
}

/** GET /me/prescriptions: final prescriptions, newest first, in the patient's language with the original. */
export async function listMyPrescriptions(): Promise<ConsultPrescription[]> {
  if (USE_MOCK) return mock.myPrescriptions();
  return api<ConsultPrescription[]>("/me/prescriptions");
}

/** GET /consults/:id: the consult, with `role` = how the caller takes part (doctor, patient, clinic). */
export async function getConsult(id: string): Promise<ConsultDetail> {
  if (USE_MOCK) return mock.detail(id);
  return api<ConsultDetail>(`/consults/${id}`);
}

/** GET /consults/:id/file (doctor): the AI summary first, then the patient's full history. */
export async function getPatientFile(id: string): Promise<PatientFile> {
  if (USE_MOCK) return mock.file(id);
  return api<PatientFile>(`/consults/${id}/file`);
}

// ---------- The call (every device polls /live every 2 s; Agora carries only video and voice) ----------

/** POST /consults/:id/join: the Agora App ID, channel, token and uid. The first join sets the consult live. */
export async function joinConsult(id: string): Promise<JoinConsultResponse> {
  if (USE_MOCK) return mock.join(id);
  return api<JoinConsultResponse>(`/consults/${id}/join`, { method: "POST" });
}

/** POST /consults/:id/end (doctor): the consult is completed. */
export async function endConsult(id: string): Promise<ConsultSummary> {
  if (USE_MOCK) return mock.end(id);
  return api<ConsultSummary>(`/consults/${id}/end`, { method: "POST" });
}

/** GET /consults/:id/live?after=: status, the pending test, every test, and captions after `after`. */
export async function getLive(id: string, after?: string): Promise<LiveState> {
  if (USE_MOCK) return mock.live(id, after);
  return api<LiveState>(`/consults/${id}/live${after ? `?after=${encodeURIComponent(after)}` : ""}`);
}

/** POST /consults/:id/captions: one finished sentence in the speaker's language; the server translates it. */
export async function postCaption(id: string, caption: NewCaption): Promise<Caption> {
  if (USE_MOCK) return mock.caption(id, caption);
  return api<Caption>(`/consults/${id}/captions`, { body: caption });
}

/** POST /consults/:id/tests (doctor): show this test on the patient's screen now. */
export async function pushTest(id: string, test: NewTest): Promise<ConsultTest> {
  if (USE_MOCK) return mock.pushTest(id, test);
  return api<ConsultTest>(`/consults/${id}/tests`, { body: test });
}

/** DELETE /consults/:id/tests/:rowId (doctor): take back a test the patient hasn't finished. */
export async function cancelTest(id: string, rowId: string): Promise<ConsultTest> {
  if (USE_MOCK) return mock.cancelTest(id, rowId);
  return api<ConsultTest>(`/consults/${id}/tests/${rowId}`, { method: "DELETE" });
}

/** POST /consults/:id/tests/:rowId/result (patient or clinic): raw answers; the server scores them. */
export async function submitConsultTest(id: string, rowId: string, result: SubmitResult): Promise<ConsultTest> {
  if (USE_MOCK) return mock.submitTest(id, rowId, result);
  return api<ConsultTest>(`/consults/${id}/tests/${rowId}/result`, { body: result });
}

/** PUT /consults/:id/prescription (doctor): a draft while typing, final on "Save and end". */
export async function savePrescription(id: string, rx: SavePrescriptionRequest): Promise<ConsultPrescription> {
  if (USE_MOCK) return mock.savePrescription(id, rx);
  return api<ConsultPrescription>(`/consults/${id}/prescription`, { method: "PUT", body: rx });
}

/** GET /consults/:id/prescription: 404 before the first save (patients only see the final one). */
export async function getPrescription(id: string): Promise<ConsultPrescription | null> {
  if (USE_MOCK) return mock.prescription(id);
  try {
    return await api<ConsultPrescription>(`/consults/${id}/prescription`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}
