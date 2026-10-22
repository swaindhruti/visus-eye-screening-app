import type { Eyewear, Prescription, Profile, Relation } from "@visus/shared";

import { api, USE_MOCK } from "./api";
import * as mock from "./mock/profiles";

export type { Profile, Prescription };
export type NewProfile = Omit<Profile, "id">;

/** GET /me → profiles of this account, owner first. */
export async function listProfiles(): Promise<Profile[]> {
  if (USE_MOCK) return mock.list();
  return (await api<{ profiles: Profile[] }>("/me")).profiles;
}

/** POST /profiles: the owner (onboarding) or a family member. */
export async function createProfile(input: NewProfile): Promise<Profile> {
  if (USE_MOCK) return mock.create(input);
  return api<Profile>("/profiles", { body: input });
}

/** PATCH /profiles/:id */
export async function updateProfile(id: string, patch: Partial<NewProfile>): Promise<Profile> {
  if (USE_MOCK) return mock.update(id, patch);
  return api<Profile>(`/profiles/${id}`, { method: "PATCH", body: patch });
}

// ---------- Labels the screens show for the shared Profile fields ----------

export const RELATION_LABEL: Record<Relation, string> = { self: "You", child: "Child", partner: "Partner", parent: "Parent", sibling: "Sibling", other: "Family" };
export const FAMILY_RELATIONS: Relation[] = ["child", "partner", "parent", "sibling", "other"];
export const relationLabel = (p: Profile) => RELATION_LABEL[p.relation ?? (p.isChild ? "child" : "other")];
export const isOwner = (p: Profile) => p.relation === "self";

export const GENDER_OPTIONS = ["Female", "Male", "Non-binary", "Prefer not to say"];

export const EYEWEAR_OPTIONS: [Eyewear, string][] = [
  ["glasses", "Glasses"],
  ["contacts", "Contact lenses"],
  ["both", "Both"],
  ["none", "Neither"],
];
export const eyewearLabel = (e?: Eyewear) => EYEWEAR_OPTIONS.find(([k]) => k === e)?.[1];

export const PAST_OPTIONS: [NonNullable<Profile["pastEyeTest"]>, string][] = [
  ["yes", "Yes"],
  ["no", "No"],
  ["not_sure", "Not sure"],
];
export const pastLabel = (v?: Profile["pastEyeTest"]) => PAST_OPTIONS.find(([k]) => k === v)?.[1];

export const CONDITION_OPTIONS = ["Diabetes", "High blood pressure", "Thyroid", "Migraines", "Dry eyes", "Allergies", "Other", "None of these"];

/** Screen-time answers and the hours each one is saved as. */
export const SCREEN_TIME: [string, number][] = [
  ["Under 2 hours", 1],
  ["2–4 hours", 3],
  ["4–6 hours", 5],
  ["6–8 hours", 7],
  ["More than 8 hours", 9],
];
export const SCREEN_TIME_OPTIONS = SCREEN_TIME.map(([l]) => l);
export const screenHours = (label: string | null | undefined) => SCREEN_TIME.find(([l]) => l === label)?.[1] ?? 0;
export const screenLabel = (hours: number) => (hours < 2 ? SCREEN_TIME[0] : hours < 4 ? SCREEN_TIME[1] : hours < 6 ? SCREEN_TIME[2] : hours < 8 ? SCREEN_TIME[3] : SCREEN_TIME[4])[0];

/** −1.25 style: a real minus sign, two decimals, a plus for positive powers. */
export const fmtPower = (n: number) => (n === 0 ? "0.00" : `${n > 0 ? "+" : "−"}${Math.abs(n).toFixed(2)}`);
export const parsePower = (s: string) => Number(s.replace(/[−–]/g, "-").replace(/[^\d.+-]/g, "")) || 0;

export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0].toUpperCase())
    .join("");
