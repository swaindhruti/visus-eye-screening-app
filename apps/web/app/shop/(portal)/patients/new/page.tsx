"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { AgeField, ChoiceGroup, TextField } from "@/components/Field";
import { Disclaimer, Screen, Spacer } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { createPatient } from "@/services/shops";

const GENDERS = ["Female", "Male", "Other"];

/** Shop portal: add a walk-in. A phone number lets their own Visus account be linked. */
export default function NewPatient() {
  const router = useRouter();
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [age, setAge] = useState(35);
  const [gender, setGender] = useState<string>();
  const [phone, setPhone] = useState("");
  const [glasses, setGlasses] = useState<boolean>();
  const digits = phone.replace(/\D/g, "");
  const phoneOk = !digits || digits.length >= 10;
  const ok = name.trim().length > 0 && glasses !== undefined && phoneOk;

  const m = useMutation({
    mutationFn: () => createPatient({ name: name.trim(), age, gender: gender?.toLowerCase(), phone, wearsGlasses: !!glasses }),
    onSuccess: (p) => {
      void client.invalidateQueries({ queryKey: ["shop-patients"] });
      router.replace(`/shop/patients/${p.id}`);
    },
  });
  const submit = () => ok && !m.isPending && m.mutate();

  return (
    <Screen gap="gap-0">
      <ScreenHeader title="New patient" fallback="/shop" />
      <h1 className="m-0 mt-5 text-[28px] font-bold leading-[1.15] tracking-[-0.025em]">Add a walk-in</h1>
      <p className="m-0 mt-1.5 text-[16px] leading-normal text-muted text-pretty">Just enough to run the check. No email needed.</p>
      <form
        className="mt-6 flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Patient's name" autoComplete="off" />
        <AgeField value={age} onChange={setAge} min={3} max={110} />
        <ChoiceGroup label="Gender (optional)">
          {GENDERS.map((g) => (
            <Chip key={g} label={g} compact selected={gender === g} onClick={() => setGender(gender === g ? undefined : g)} />
          ))}
        </ChoiceGroup>
        <ChoiceGroup label="Wears glasses?">
          <Chip label="Yes" compact selected={glasses === true} onClick={() => setGlasses(true)} />
          <Chip label="No" compact selected={glasses === false} onClick={() => setGlasses(false)} />
        </ChoiceGroup>
        <TextField
          label="Mobile number (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="98765 43210"
          inputMode="tel"
          autoComplete="off"
          aria-invalid={!phoneOk}
          hint={
            <span className={phoneOk ? "text-[13px] leading-normal text-muted" : "text-[13px] text-doc"}>
              {phoneOk
                ? "If they use Visus with this number, they'll get a request in their app to share their eye records with your shop."
                : "Enter a 10-digit mobile number, or leave it empty."}
            </span>
          }
        />
        <button type="submit" hidden />
      </form>
      <Spacer min={28} />
      {m.isError && <p className="m-0 mb-3 text-center text-[14px] text-doc">{m.error.message}</p>}
      <Button disabled={!ok || m.isPending} onClick={submit}>
        {m.isPending ? "Adding…" : "Add patient"}
      </Button>
      <div className="mt-3">
        <Disclaimer>Ask the patient before saving their details. Screening, not diagnosis.</Disclaimer>
      </div>
    </Screen>
  );
}
