// Mock clinic side of the remote consult (NEXT_PUBLIC_USE_MOCK=1): the shop account is clinic c1 of
// the mock consult world (./consults). Doctors, free slots, booking, moving and cancelling.
import type { ClinicDoctor, ConsultSummary, PatientConsults, Slot } from "@visus/shared";
import { CONSULT_MINUTES } from "@visus/shared";

import type { NewConsult, ConsultChange } from "../clinic";
import { dateOnly, doctorKey, doctorOf, doctorPublic, listConsults, myClinic, MY_CLINIC, newId, OTHER_DOCTORS, rxNow, saveWorld, summary, world, type MockConsult, type MockLink, type When } from "./consults";
import { patients } from "./shops";
import { delay } from "./store";

const clinicDoctor = (l: MockLink): ClinicDoctor => ({ linkId: l.linkId, status: l.status, hours: l.hours, createdAt: l.createdAt, doctor: doctorOf(l.doctorId) });
const mine = (l: MockLink) => l.clinic.id === MY_CLINIC;

export async function doctors(): Promise<ClinicDoctor[]> {
  await delay(150);
  return world()
    .links.filter((l) => mine(l) && (l.status === "pending" || l.status === "active"))
    .map(clinicDoctor);
}

export async function addDoctor(visusId: string): Promise<ClinicDoctor> {
  await delay();
  const code = visusId.trim().toUpperCase();
  const doctor = [doctorPublic(), ...OTHER_DOCTORS].find((d) => d.visusId === code);
  if (!doctor) throw new Error(`No doctor has the Visus ID ${code}. Check it with the doctor.`);
  const key = doctorKey(doctor.id);
  const w = world();
  const old = w.links.find((l) => mine(l) && l.doctorId === key);
  if (old && (old.status === "pending" || old.status === "active")) throw new Error(`${doctor.name} is already in your doctors.`);
  const link: MockLink = { linkId: old?.linkId ?? newId("l"), doctorId: key, clinic: myClinic(), status: "pending", hours: old?.hours ?? [], createdAt: new Date().toISOString() };
  saveWorld({ ...w, links: [...w.links.filter((l) => l.linkId !== link.linkId), link] });
  return clinicDoctor(link);
}

export async function removeDoctor(linkId: string): Promise<void> {
  await delay();
  const w = world();
  const link = w.links.find((l) => l.linkId === linkId && mine(l));
  if (!link) throw new Error("That doctor is no longer in your list.");
  link.status = "removed";
  // Their future consults here are cancelled, as on the server.
  for (const c of w.consults) if (c.doctorId === link.doctorId && c.clinic.id === MY_CLINIC && c.status === "scheduled" && Date.parse(c.startsAt) > Date.now()) c.status = "cancelled";
  saveWorld(w);
}

const busy = (c: MockConsult) => c.status === "scheduled" || c.status === "live";
const hm = (t: string) => +t.slice(0, 2) * 60 + +t.slice(3);

/** Free 15-minute slots in the doctor's hours here on that date, not booked at any clinic, not past. */
function freeSlots(doctorId: string, date: string, except?: string): Slot[] {
  const w = world();
  const key = doctorKey(doctorId);
  const link = w.links.find((l) => mine(l) && l.doctorId === key && l.status === "active");
  if (!link) return [];
  const [y, m, d] = date.split("-").map(Number);
  const day = new Date(y, m - 1, d);
  const taken = new Set(w.consults.filter((c) => c.doctorId === key && busy(c) && c.id !== except).map((c) => Date.parse(c.startsAt)));
  const out: Slot[] = [];
  for (const b of link.hours.filter((h) => h.day === day.getDay()))
    for (let t = hm(b.start); t + CONSULT_MINUTES <= hm(b.end); t += CONSULT_MINUTES) {
      const at = new Date(y, m - 1, d, Math.floor(t / 60), t % 60).getTime();
      if (at > Date.now() && !taken.has(at)) out.push({ startsAt: new Date(at).toISOString() });
    }
  return out.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

export async function slots(doctorId: string, date: string): Promise<Slot[]> {
  await delay(200);
  return freeSlots(doctorId, date);
}

export async function book(input: NewConsult): Promise<ConsultSummary> {
  await delay();
  const p = patients().find((x) => x.id === input.patientId);
  if (!p || p.linkStatus !== "approved") throw new Error("Only patients linked to their Visus account can have a consult.");
  if (!freeSlots(input.doctorId, dateOnly(input.startsAt)).some((s) => s.startsAt === input.startsAt)) throw new Error("That slot was just taken. Pick another one.");
  const w = world();
  const { id, name, city } = myClinic();
  const c: MockConsult = {
    id: newId("cs"),
    startsAt: input.startsAt,
    minutes: CONSULT_MINUTES,
    status: "scheduled",
    kind: "first",
    joinFrom: input.joinFrom,
    reason: input.reason,
    language: input.language,
    patient: { profileId: p.checkProfileId, name: p.name, age: p.age },
    clinic: { id, name, city },
    doctorId: doctorKey(input.doctorId),
  };
  w.consults.push(c);
  saveWorld(w);
  return summary(c, w);
}

export async function consults(when: When): Promise<ConsultSummary[]> {
  await delay(200);
  return listConsults(when, (c) => c.clinic.id === MY_CLINIC);
}

export async function update(id: string, input: ConsultChange): Promise<ConsultSummary> {
  await delay();
  const w = world();
  const c = w.consults.find((x) => x.id === id && x.clinic.id === MY_CLINIC);
  if (!c) throw new Error("Consult not found");
  if (c.status !== "scheduled") throw new Error("Only a scheduled consult can be changed.");
  if (input.startsAt && input.startsAt !== c.startsAt) {
    if (!freeSlots(doctorOf(c.doctorId).id, dateOnly(input.startsAt), c.id).some((s) => s.startsAt === input.startsAt)) throw new Error("That slot isn't free. Pick another one.");
    c.startsAt = input.startsAt;
  }
  if (input.joinFrom) c.joinFrom = input.joinFrom;
  if (input.status === "cancelled") c.status = "cancelled";
  saveWorld(w);
  return summary(c, w);
}

export async function patientConsults(patientId: string): Promise<PatientConsults> {
  await delay(200);
  const p = patients().find((x) => x.id === patientId);
  if (!p) throw new Error("Patient not found");
  const w = world();
  const list = w.consults.filter((c) => c.clinic.id === MY_CLINIC && c.patient.profileId === p.checkProfileId).sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
  const ids = new Set(list.map((c) => c.id));
  return {
    consults: list.map((c) => summary(c, w)),
    prescriptions: w.prescriptions.filter((rx) => rx.status === "final" && ids.has(rx.consultId)).map((rx) => rxNow(rx, w)).sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
  };
}
