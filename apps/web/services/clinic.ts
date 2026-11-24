import type { AddDoctorRequest, ClinicDoctor, ConsultSummary, CreateConsultRequest, PatientConsults, Slot, UpdateConsultRequest } from "@visus/shared";

import { api, USE_MOCK } from "./api";
import type { ConsultsWhen } from "./doctor";
import * as mock from "./mock/clinic";

// The clinic's side of the remote consult (shop portal). Only the clinic books, only for linked patients.

export type { ClinicDoctor, ConsultSummary, PatientConsults, Slot };
export type NewConsult = ReturnType<typeof CreateConsultRequest.parse>;
export type ConsultChange = ReturnType<typeof UpdateConsultRequest.parse>;

/** GET /shop/doctors: pending and active doctors of this clinic. */
export async function listClinicDoctors(): Promise<ClinicDoctor[]> {
  if (USE_MOCK) return mock.doctors();
  return api<ClinicDoctor[]>("/shop/doctors");
}

/** POST /shop/doctors: add a doctor by their Visus ID; they approve it in their portal. */
export async function addClinicDoctor(visusId: string): Promise<ClinicDoctor> {
  if (USE_MOCK) return mock.addDoctor(visusId);
  const body: ReturnType<typeof AddDoctorRequest.parse> = { visusId: visusId.trim().toUpperCase() };
  return api<ClinicDoctor>("/shop/doctors", { body });
}

/** DELETE /shop/doctors/:linkId: their future consults here are cancelled. */
export async function removeClinicDoctor(linkId: string): Promise<void> {
  if (USE_MOCK) return mock.removeDoctor(linkId);
  await api(`/shop/doctors/${linkId}`, { method: "DELETE" });
}

/** GET /shop/doctors/:doctorId/slots?date=YYYY-MM-DD: free 15-minute slots. */
export async function listSlots(doctorId: string, date: string): Promise<Slot[]> {
  if (USE_MOCK) return mock.slots(doctorId, date);
  return api<Slot[]>(`/shop/doctors/${doctorId}/slots?date=${date}`);
}

/** POST /shop/consults: book a consult for a linked patient. */
export async function bookConsult(input: NewConsult): Promise<ConsultSummary> {
  if (USE_MOCK) return mock.book(input);
  return api<ConsultSummary>("/shop/consults", { body: input });
}

/** GET /shop/consults?when=: today and upcoming soonest first, past newest first. */
export async function listClinicConsults(when: ConsultsWhen): Promise<ConsultSummary[]> {
  if (USE_MOCK) return mock.consults(when);
  return api<ConsultSummary[]>(`/shop/consults?when=${when}`);
}

/** PATCH /shop/consults/:id: move (free slot only), change where they join, or cancel. */
export async function updateConsult(id: string, change: ConsultChange): Promise<ConsultSummary> {
  if (USE_MOCK) return mock.update(id, change);
  return api<ConsultSummary>(`/shop/consults/${id}`, { method: "PATCH", body: change });
}

/** GET /shop/patients/:id/consults: this patient's consults here and their prescriptions. */
export async function getPatientConsults(patientId: string): Promise<PatientConsults> {
  if (USE_MOCK) return mock.patientConsults(patientId);
  return api<PatientConsults>(`/shop/patients/${patientId}/consults`);
}
