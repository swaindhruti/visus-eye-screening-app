"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/Button";
import { Chip, Toggle } from "@/components/Chip";
import { AgeField, ChoiceGroup, TextField } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { Screen, Spacer } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { createProfile, FAMILY_RELATIONS, initials, RELATION_LABEL } from "@/services/profiles";


export default function AddFamily() {
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [age, setAge] = useState(8);
  const [rel, setRel] = useState(0);
  const [kid, setKid] = useState(true);
  const ini = initials(name);

  const save = useMutation({
    mutationFn: () =>
      createProfile({
        name: name.trim(),
        age,
        isChild: kid,
        wearsGlasses: false,
        healthConditions: [],
        screenHoursPerDay: 0,
        relation: FAMILY_RELATIONS[rel],
        prescription: null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
      setTimeout(() => router.back(), 600);
    },
  });

  return (
    <Screen gap="gap-0">
      <ScreenHeader title="Add someone" fallback="/profile" />
      <span className="mt-[18px] grid size-[72px] flex-none place-items-center self-center rounded-full bg-pill text-[24px] font-bold">
        {ini || <Icon name="profile" size={30} color="#8A8A85" strokeWidth={1.8} />}
      </span>
      <div className="mt-[18px] flex flex-none flex-col gap-4">
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Their name" />
        <AgeField value={age} onChange={setAge} />
        <ChoiceGroup label="Relation">
          {FAMILY_RELATIONS.map((r, i) => (
            <Chip key={r} compact label={r === "other" ? "Other" : RELATION_LABEL[r]} selected={rel === i} onClick={() => setRel(i)} />
          ))}
        </ChoiceGroup>
        <div className="flex min-h-[72px] items-center gap-3 rounded-[20px] border border-line bg-white px-4 py-3">
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="text-[16px] font-semibold">This is a child</span>
            <span className="text-[13px] leading-[1.35] text-muted">Uses kids tests, done with a parent</span>
          </span>
          <Toggle on={kid} onClick={() => setKid(!kid)} label="This is a child" />
        </div>
      </div>
      <Spacer />
      {save.isError && <p className="m-0 mb-3 text-center text-[14px] text-doc">Couldn&apos;t save. Try again.</p>}
      <Button disabled={!name.trim() || save.isPending || save.isSuccess} onClick={() => save.mutate()}>
        {save.isSuccess ? "Saved ✓" : save.isPending ? "Saving…" : "Save"}
      </Button>
    </Screen>
  );
}
