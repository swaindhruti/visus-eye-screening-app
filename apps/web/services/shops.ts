import type { CreatePatientRequest, PatientDetail, ShopAccount, ShopPatient, ShopRegisterRequest, ShopRequest, UpdateShopRequest } from "@visus/shared";

import { api, setToken, USE_MOCK } from "./api";
import type { AuthResult, User } from "./auth";
import { setGuest } from "./auth";
import * as mock from "./mock/shops";

export type { PatientDetail, ShopAccount, ShopPatient, ShopRequest };
export type ShopDetails = ReturnType<typeof UpdateShopRequest.parse>;
export type NewPatient = ReturnType<typeof CreatePatientRequest.parse>;
export type ShopSignup = ReturnType<typeof ShopRegisterRequest.parse>;

export const isShop = (user?: Pick<User, "role"> | null) => user?.role === "shop";

/** POST /shops/register: a shop account, logged in straight away. */
export async function registerShop(input: ShopSignup): Promise<User> {
  const res = USE_MOCK ? await mock.register(input) : await api<AuthResult>("/shops/register", { body: input, auth: false });
  setToken(res.token);
  setGuest(false);
  return res.user;
}

/** GET /shop/patients: newest first; `q` matches the name or phone. */
export async function listPatients(q = ""): Promise<ShopPatient[]> {
  if (USE_MOCK) return mock.list(q);
  return api<ShopPatient[]>(`/shop/patients${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
}

/** POST /shop/patients: a walk-in. A Visus account with this phone gets a link request. */
export async function createPatient(input: NewPatient): Promise<PatientDetail> {
  if (USE_MOCK) return mock.create(input);
  return api<PatientDetail>("/shop/patients", { body: input });
}

/** GET /shop/patients/:id: the patient and their checks (all of them once linked). */
export async function getPatient(id: string): Promise<PatientDetail> {
  if (USE_MOCK) return mock.get(id);
  return api<PatientDetail>(`/shop/patients/${id}`);
}

/** POST /shop/patients/:id/link: ask the patient again to link their account. */
export async function requestLink(id: string): Promise<PatientDetail> {
  if (USE_MOCK) return mock.get(id);
  return api<PatientDetail>(`/shop/patients/${id}/link`, { method: "POST" });
}

/**
 * PATCH /shop/patients/:id: add or change the mobile number of a walk-in added without one. If they
 * use Visus with it, they get a request; once they allow it, their past checks show here.
 */
export async function setPatientPhone(id: string, phone: string): Promise<PatientDetail> {
  if (USE_MOCK) return mock.setPhone(id, phone);
  return api<PatientDetail>(`/shop/patients/${id}`, { method: "PATCH", body: { phone } });
}

/** GET /shop: the shop, who runs it and how many patients it has. */
export async function getShopAccount(): Promise<ShopAccount> {
  if (USE_MOCK) return mock.account();
  return api<ShopAccount>("/shop");
}

/** PATCH /shop: the shop's name, address and city. */
export async function updateShop(input: ShopDetails): Promise<ShopAccount> {
  if (USE_MOCK) return mock.updateAccount(input);
  return api<ShopAccount>("/shop", { method: "PATCH", body: input });
}

// ---------- The patient's side ----------

/** GET /me/shop-requests: shops asking to see this account's eye records. */
export async function listShopRequests(): Promise<ShopRequest[]> {
  if (USE_MOCK) return [];
  return api<ShopRequest[]>("/me/shop-requests");
}

/** POST /me/shop-requests/:id: allow or decline. */
export async function answerShopRequest(id: string, approve: boolean): Promise<ShopRequest> {
  return api<ShopRequest>(`/me/shop-requests/${id}`, { body: { approve } });
}

/** GET /me/shops: shops that can see this account's checks. */
export async function listLinkedShops(): Promise<ShopRequest[]> {
  if (USE_MOCK) return [];
  return api<ShopRequest[]>("/me/shops");
}

/** DELETE /me/shops/:id */
export async function unlinkShop(id: string): Promise<void> {
  await api(`/me/shops/${id}`, { method: "DELETE" });
}

/** PATCH /me: the phone number shops can find this account by. */
export async function setMyPhone(phone: string): Promise<User> {
  return api<User>("/me", { method: "PATCH", body: { phone } });
}

export const LINK_LABEL: Record<ShopPatient["linkStatus"], string> = {
  none: "No Visus account",
  pending: "Waiting for the patient",
  approved: "Linked",
  declined: "Declined",
};
