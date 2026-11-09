// Mock shop portal (NEXT_PUBLIC_USE_MOCK=1): patients live in localStorage, nothing is linked.
import type { PatientDetail, ShopAccount, ShopPatient } from "@visus/shared";

import type { AuthResult } from "../auth";
import type { NewPatient, ShopDetails, ShopSignup } from "../shops";
import { delay, load, save, uid } from "./store";

export async function register(input: ShopSignup): Promise<AuthResult> {
  await delay();
  const user = { id: uid(), name: input.ownerName, identifier: input.identifier, role: "shop" as const, shopName: input.shopName };
  save("user", user);
  save("shop", { name: input.shopName, address: input.address, city: input.city });
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

export async function setPhone(id: string, phone: string): Promise<PatientDetail> {
  await delay();
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits && digits.length < 10) throw new Error("Enter a 10-digit mobile number.");
  save("shopPatients", all().map((p) => (p.id === id ? { ...p, phone: digits } : p)));
  return get(id);
}

export async function account(): Promise<ShopAccount> {
  await delay(150);
  const user = load<{ id: string; name: string; identifier: string }>("user", { id: "shop", name: "Shop owner", identifier: "" });
  const shop = load("shop", { name: "My shop", address: "", city: "" });
  return { id: user.id, ...shop, ownerName: user.name, identifier: user.identifier, patients: all().length };
}

export async function updateAccount(input: ShopDetails): Promise<ShopAccount> {
  await delay();
  save("shop", input);
  return account();
}
