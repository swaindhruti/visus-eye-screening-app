import type { Profile } from "@visus/shared";

import type { NewProfile } from "../profiles";
import { delay, load, save, uid } from "./store";

const SEED: Profile[] = [
  {
    id: "p1",
    name: "Asha Sharma",
    age: 34,
    gender: "Female",
    isChild: false,
    wearsGlasses: true,
    healthConditions: ["Migraines"],
    screenHoursPerDay: 5,
    relation: "self",
    eyewear: "glasses",
    pastEyeTest: "yes",
    prescription: { right: { sph: -1.25, cyl: -0.5, axis: 180 }, left: { sph: -1, cyl: -0.25, axis: 170 }, updatedAt: "2026-03-12" },
  },
  { id: "p2", name: "Riya Sharma", age: 8, gender: "Female", isChild: true, wearsGlasses: false, healthConditions: [], screenHoursPerDay: 2, relation: "child", eyewear: "none", prescription: null },
  {
    id: "p3",
    name: "Raj Sharma",
    age: 67,
    gender: "Male",
    isChild: false,
    wearsGlasses: true,
    healthConditions: ["High blood pressure"],
    screenHoursPerDay: 3,
    relation: "parent",
    eyewear: "glasses",
    prescription: { right: { sph: 2, cyl: 0, axis: 0 }, left: { sph: 2.25, cyl: 0, axis: 0 }, updatedAt: "2026-01-20" },
  },
];

// v2: the shared Profile shape (older saved mock data used web-only fields).
const all = () => load<Profile[]>("profiles-v2", SEED);

export async function list() {
  await delay(150);
  return all();
}

export async function create(input: NewProfile) {
  await delay();
  const profile = { ...input, id: uid() };
  save("profiles-v2", [...all(), profile]);
  return profile;
}

export async function update(id: string, patch: Partial<NewProfile>) {
  await delay();
  const next = all().map((p) => (p.id === id ? { ...p, ...patch } : p));
  save("profiles-v2", next);
  return next.find((p) => p.id === id)!;
}
