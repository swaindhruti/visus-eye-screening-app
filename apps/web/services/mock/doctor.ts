// Mock doctor portal (NEXT_PUBLIC_USE_MOCK=1). The doctor registered in this browser (or the demo
// doctor) works with the clinics and consults of the mock world in ./consults.
import type { ConsultPrescription, ConsultSummary, DoctorAccount, DoctorClinic, HoursBlock } from "@visus/shared";

import type { AuthResult } from "../auth";
import type { DoctorDetails, DoctorSignup } from "../doctor";
import { doctorAccount, listConsults, myClinic, MY_CLINIC, rxNow, saveWorld, world, type When } from "./consults";
import { delay, load, save, uid } from "./store";

/** Visus IDs use letters and digits that can't be misread: no 0, O, 1 or I. */
const ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const visusId = () => "VIS-D-" + Array.from({ length: 4 }, () => ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)]).join("");

export async function register(input: DoctorSignup): Promise<AuthResult> {
  await delay();
  const account: DoctorAccount = {
    id: "doc-" + uid(),
    visusId: visusId(),
    name: input.name,
    specialty: input.specialty,
    registrationNo: input.registrationNo,
    languages: input.languages,
    identifier: input.identifier,
  };
  const user = { id: account.id, name: input.name, identifier: input.identifier, role: "doctor" as const, visusId: account.visusId };
  save("user", user);
  save("doctor", account);
  return { token: "mock-" + user.id, user };
}

export async function account(): Promise<DoctorAccount> {
  await delay(150);
  return doctorAccount();
}

export async function updateAccount(input: DoctorDetails): Promise<DoctorAccount> {
  await delay();
  const next = { ...doctorAccount(), ...input };
  save("doctor", next);
  // The login carries the name the sidebar shows.
  const user = load<AuthResult["user"] | null>("user", null);
  if (user?.role === "doctor") save("user", { ...user, name: next.name });
  return next;
}

export async function clinics(): Promise<DoctorClinic[]> {
  await delay(150);
  return world()
    .links.filter((l) => !l.doctorId && (l.status === "pending" || l.status === "active"))
    .map((l): DoctorClinic => ({ linkId: l.linkId, status: l.status, hours: l.hours, createdAt: l.createdAt, clinic: l.clinic.id === MY_CLINIC ? myClinic() : l.clinic }));
}

function changeLink(linkId: string, change: (l: DoctorClinic) => DoctorClinic): DoctorClinic {
  const w = world();
  const link = w.links.find((l) => l.linkId === linkId && !l.doctorId);
  if (!link) throw new Error("That clinic request is no longer there.");
  const next = change(link);
  saveWorld({ ...w, links: w.links.map((l) => (l.linkId === linkId ? next : l)) });
  return next;
}

export async function answer(linkId: string, approve: boolean): Promise<DoctorClinic> {
  await delay();
  return changeLink(linkId, (l) => ({ ...l, status: approve ? "active" : "declined" }));
}

export async function setHours(linkId: string, hours: HoursBlock[]): Promise<DoctorClinic> {
  await delay();
  return changeLink(linkId, (l) => {
    if (l.status !== "active") throw new Error("Approve the clinic first.");
    return { ...l, hours };
  });
}

export async function leave(linkId: string): Promise<void> {
  await delay();
  const link = changeLink(linkId, (l) => ({ ...l, status: "removed" }));
  // Future consults at that clinic are cancelled, as on the server.
  const w = world();
  saveWorld({
    ...w,
    consults: w.consults.map((c) => (!c.doctorId && c.clinic.id === link.clinic.id && c.status === "scheduled" && Date.parse(c.startsAt) > Date.now() ? { ...c, status: "cancelled" } : c)),
  });
}

export async function consults(when: When): Promise<ConsultSummary[]> {
  await delay(200);
  return listConsults(when, (c) => !c.doctorId);
}

export async function prescriptions(): Promise<ConsultPrescription[]> {
  await delay(200);
  const w = world();
  const mine = new Set(w.consults.filter((c) => !c.doctorId).map((c) => c.id));
  return w.prescriptions
    .filter((p) => p.status === "final" && mine.has(p.consultId))
    .map((p) => rxNow(p, w))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}
