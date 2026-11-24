import type { AuthResult, User } from "../auth";
import { CLINICS, doctorAccount } from "./consults";
import { list } from "./profiles";
import { delay, load, save, uid } from "./store";

export async function signup(name: string, identifier: string): Promise<AuthResult> {
  await delay();
  const user: User = { id: uid(), name, identifier };
  save("user", user);
  return { token: "mock-" + user.id, user };
}

export async function login(identifier: string): Promise<AuthResult> {
  await delay();
  // A login with "doctor" in it signs in as the mock doctor (registered here, else the demo doctor).
  if (/doctor/i.test(identifier)) {
    const doc = doctorAccount();
    const user: User = { id: doc.id, name: doc.name, identifier, role: "doctor", visusId: doc.visusId };
    save("user", user);
    return { token: "mock-" + user.id, user };
  }
  // A login with "shop" or "clinic" in it signs in as the mock clinic (Clear View Opticals, or the shop registered here).
  if (/shop|clinic/i.test(identifier)) {
    const shop = load("shop", { name: CLINICS.c1.name, address: CLINICS.c1.address, city: CLINICS.c1.city });
    save("shop", shop);
    const user: User = { id: "shop-c1", name: "Clinic owner", identifier, role: "shop", shopName: shop.name };
    save("user", user);
    return { token: "mock-" + user.id, user };
  }
  // Anything else is the patient account (not a clinic or doctor signed in earlier in this browser).
  const stored = load<User | null>("user", null);
  const user = stored && stored.role !== "shop" && stored.role !== "doctor" ? stored : { id: "u1", name: "Asha Sharma", identifier };
  save("user", user);
  return { token: "mock-" + user.id, user };
}

export async function me() {
  const user = load<User | null>("user", null) ?? { id: "u1", name: "Asha Sharma", identifier: "asha@example.com" };
  return { user, profiles: await list() };
}
