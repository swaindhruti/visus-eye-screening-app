import type {
  ConsultPrescription,
  ConsultSummary,
  DoctorAccount,
  DoctorClinic,
  DoctorRegisterRequest,
  HoursBlock,
  UpdateDoctorRequest,
} from "@visus/shared";

import { api, setToken, USE_MOCK } from "./api";
import type { AuthResult, User } from "./auth";
import { setGuest } from "./auth";
import * as mock from "./mock/doctor";

export type { DoctorAccount, DoctorClinic, HoursBlock };
export type DoctorSignup = ReturnType<typeof DoctorRegisterRequest.parse>;
export type DoctorDetails = ReturnType<typeof UpdateDoctorRequest.parse>;
export type ConsultsWhen = "today" | "upcoming" | "past";

export const isDoctor = (user?: Pick<User, "role"> | null) => user?.role === "doctor";

/** POST /doctors/register: a doctor account with its Visus ID, logged in straight away. */
export async function registerDoctor(input: DoctorSignup): Promise<User> {
  const res = USE_MOCK ? await mock.register(input) : await api<AuthResult>("/doctors/register", { body: input, auth: false });
  setToken(res.token);
  setGuest(false);
  return res.user;
}

/** GET /doctor: the logged-in doctor's own account. */
export async function getDoctor(): Promise<DoctorAccount> {
  if (USE_MOCK) return mock.account();
  return api<DoctorAccount>("/doctor");
}

/** PATCH /doctor: name, specialty, registration number, languages. */
export async function updateDoctor(input: DoctorDetails): Promise<DoctorAccount> {
  if (USE_MOCK) return mock.updateAccount(input);
  return api<DoctorAccount>("/doctor", { method: "PATCH", body: input });
}

/** GET /doctor/clinics: requests (pending) and the clinics the doctor works with (active). */
export async function listDoctorClinics(): Promise<DoctorClinic[]> {
  if (USE_MOCK) return mock.clinics();
  return api<DoctorClinic[]>("/doctor/clinics");
}

/** POST /doctor/clinics/:linkId: approve or decline a clinic's request. */
export async function answerClinic(linkId: string, approve: boolean): Promise<DoctorClinic> {
  if (USE_MOCK) return mock.answer(linkId, approve);
  return api<DoctorClinic>(`/doctor/clinics/${linkId}`, { body: { approve } });
}

/** PUT /doctor/clinics/:linkId/hours: weekly hours at an active clinic, India time. */
export async function setClinicHours(linkId: string, hours: HoursBlock[]): Promise<DoctorClinic> {
  if (USE_MOCK) return mock.setHours(linkId, hours);
  return api<DoctorClinic>(`/doctor/clinics/${linkId}/hours`, { method: "PUT", body: { hours } });
}

/** DELETE /doctor/clinics/:linkId: leave a clinic; its future consults with this doctor are cancelled. */
export async function leaveClinic(linkId: string): Promise<void> {
  if (USE_MOCK) return mock.leave(linkId);
  await api<{ ok: true }>(`/doctor/clinics/${linkId}`, { method: "DELETE" });
}

/** GET /doctor/consults?when=: today and upcoming soonest first, past newest first. */
export async function listDoctorConsults(when: ConsultsWhen): Promise<ConsultSummary[]> {
  if (USE_MOCK) return mock.consults(when);
  return api<ConsultSummary[]>(`/doctor/consults?when=${when}`);
}

/** GET /doctor/prescriptions: every prescription this doctor wrote, newest first. */
export async function listDoctorPrescriptions(): Promise<ConsultPrescription[]> {
  if (USE_MOCK) return mock.prescriptions();
  return api<ConsultPrescription[]>("/doctor/prescriptions");
}
