// Mock shop portal (NEXT_PUBLIC_USE_MOCK=1): patients live in localStorage, nothing is linked.
import type { PatientDetail, ShopPatient } from "@visus/shared";

import type { AuthResult } from "../auth";
import type { NewPatient, ShopSignup } from "../shops";
import { delay, load, save, uid } from "./store";

export async function register(input: ShopSignup): Promise<AuthResult> {
  await delay();
  const user = { id: uid(), name: input.ownerName, identifier: input.identifier, role: "shop" as const, shopName: input.shopName };
  save("user", user);
  return { token: "mock-" + user.id, user };
}

const all = () => load<ShopPatient[]>("shopPatients", []);

export async function list(q: string): Promise<ShopPatient[]> {
  await delay(150);
  const term = q.trim().toLowerCase();
  return all().filter((p) => !term || p.name.toLowerCase().includes(term) || p.phone.includes(term));
}

export async function create(input: NewPatient): Promise<PatientDetail> {
  await delay();
  const id = uid();
  const patient: ShopPatient = {
    id,
    name: input.name,
    age: input.age,
    phone: input.phone.replace(/\D/g, "").slice(-10),
    wearsGlasses: input.wearsGlasses,
    linkStatus: "none",
    checkProfileId: "p-" + id,
    lastCheck: null,
    createdAt: new Date().toISOString(),
  };
  save("shopPatients", [patient, ...all()]);
  return { ...patient, sessions: [] };
}

export async function get(id: string): Promise<PatientDetail> {
  await delay(150);
  const patient = all().find((p) => p.id === id);
  if (!patient) throw new Error("Patient not found");
  return { ...patient, sessions: [] };
}
