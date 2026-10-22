"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { AgeField, ChoiceGroup, TextField } from "@/components/Field";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ErrorState, LoadingState } from "@/components/States";
import {
  CONDITION_OPTIONS,
  eyewearLabel,
  EYEWEAR_OPTIONS,
  GENDER_OPTIONS,
  initials,
  listProfiles,
  pastLabel,
  PAST_OPTIONS,
  SCREEN_TIME_OPTIONS,
  screenHours,
  screenLabel,
  updateProfile,
  type Profile,
} from "@/services/profiles";

export default function EditProfile() {
  const id = useSearchParams().get("id");
  const q = useQuery({ queryKey: ["profiles"], queryFn: listProfiles });
  if (q.isPending) return <LoadingState />;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} retrying={q.isFetching} />;
  const p = q.data.find((x) => x.id === id) ?? q.data[0];
  if (!p) return <ErrorState title="No profile yet" body="Finish onboarding to create your profile." />;
  return <EditForm key={p.id} profile={p} />;
}

function EditForm({ profile }: { profile: Profile }) {
  const qc = useQueryClient();
  const [d, setD] = useState({
    name: profile.name,
    gender: profile.gender ?? null,
    age: profile.age,
    specs: eyewearLabel(profile.eyewear) ?? (profile.wearsGlasses ? "Glasses" : "Neither"),
    past: pastLabel(profile.pastEyeTest) ?? null,
    cond: profile.healthConditions,
    screen: profile.screenHoursPerDay ? screenLabel(profile.screenHoursPerDay) : null,
  });
  const set = (patch: Partial<typeof d>) => {
    setD((x) => ({ ...x, ...patch }));
    save.reset();
  };
  const save = useMutation({
    mutationFn: () =>
      updateProfile(profile.id, {
        name: d.name.trim(),
        gender: d.gender ?? undefined,
        age: d.age,
        eyewear: EYEWEAR_OPTIONS.find(([, l]) => l === d.specs)?.[0],
        wearsGlasses: d.specs !== "Neither",
        pastEyeTest: PAST_OPTIONS.find(([, l]) => l === d.past)?.[0],
        healthConditions: d.cond.filter((c) => c !== "None of these"),
        screenHoursPerDay: screenHours(d.screen),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profiles"] }),
  });
  const toggleCond = (label: string) => {
    if (label === "None of these") return set({ cond: d.cond.includes(label) ? [] : [label] });
    const base = d.cond.filter((x) => x !== "None of these");
    set({ cond: base.includes(label) ? base.filter((x) => x !== label) : [...base, label] });
  };
  const one = (field: "gender" | "specs" | "past" | "screen", list: string[]) =>
    list.map((label) => <Chip key={label} compact label={label} selected={d[field] === label} onClick={() => set({ [field]: label })} />);

  return (
    <div className="relative mx-auto w-full max-w-[640px] flex min-h-dvh flex-col bg-pearl pt-6 md:pt-10">
      <div className="px-5">
        <ScreenHeader title="Edit profile" fallback="/profile" />
      </div>
      <div className="flex flex-1 flex-col gap-[22px] px-5 pb-6 pt-[18px]">
        <div className="flex flex-none items-end gap-3.5">
          <span className="grid size-[60px] flex-none place-items-center rounded-full bg-acc-soft text-[21px] font-bold text-acc-ink">{initials(d.name) || "A"}</span>
          <div className="min-w-0 flex-1">
            <TextField label="Name" value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="Your name" autoComplete="name" />
          </div>
        </div>
        <ChoiceGroup label="Gender">{one("gender", GENDER_OPTIONS)}</ChoiceGroup>
        <AgeField value={d.age} onChange={(age) => set({ age })} min={5} />
        <ChoiceGroup label="Glasses or lenses">{one("specs", EYEWEAR_OPTIONS.map(([, l]) => l))}</ChoiceGroup>
        <ChoiceGroup label="Past eye test or diagnosis">{one("past", PAST_OPTIONS.map(([, l]) => l))}</ChoiceGroup>
        <ChoiceGroup label="Health conditions">
          {CONDITION_OPTIONS.map((label) => (
            <Chip key={label} compact label={label} selected={d.cond.includes(label)} onClick={() => toggleCond(label)} />
          ))}
        </ChoiceGroup>
        <ChoiceGroup label="Daily screen time">{one("screen", SCREEN_TIME_OPTIONS)}</ChoiceGroup>
      </div>
      <div className="sticky bottom-0 bg-[linear-gradient(rgba(247,247,244,0),#F7F7F4_34%)] px-5 pb-[30px] pt-7">
        <Button className="w-full" disabled={!d.name.trim() || save.isPending} onClick={() => save.mutate()}>
          {save.isSuccess ? "Saved ✓" : save.isPending ? "Saving…" : save.isError ? "Try again" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
