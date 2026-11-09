"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { createPatient, listPatients, type ShopPatient } from "@/services/shops";
import { useCheck } from "@/store/check";

import { cn } from "./cn";
import { Icon } from "./Icon";
import { useShopReady } from "./ShopShell";

const FIELD = "h-12 w-full rounded-[14px] border border-line-strong bg-white px-3.5 text-[16px] outline-none focus:border-ink focus:shadow-[0_0_0_4px_rgba(17,17,17,.06)]";

/**
 * Shop portal: who a check or a chat is for. One of the shop's patients, no patient record, or a new
 * patient added right here (name, age, glasses, optional mobile number).
 */
export function ShopPatientPicker({ value, onChange }: { value: Pick<ShopPatient, "id" | "name"> | null; onChange: (p: ShopPatient | null) => void }) {
  const client = useQueryClient();
  const ready = useShopReady();
  const patients = useQuery({ queryKey: ["shop-patients", ""], queryFn: () => listPatients(""), enabled: ready });
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [glasses, setGlasses] = useState(false);
  const years = Number(age);
  const digits = phone.replace(/\D/g, "");
  const ok = name.trim().length > 0 && Number.isInteger(years) && years >= 3 && years <= 120 && (!digits || digits.length >= 10);

  const add = useMutation({
    mutationFn: () => createPatient({ name: name.trim(), age: years, phone, wearsGlasses: glasses }),
    onSuccess: (p) => {
      void client.invalidateQueries({ queryKey: ["shop-patients"] });
      onChange(p);
      setAdding(false);
      setName("");
      setAge("");
      setPhone("");
      setGlasses(false);
    },
  });

  const options = patients.data ?? [];
  // The picked patient may be new and not in the list yet.
  const missing = value && !options.some((p) => p.id === value.id) ? value : null;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Who is this for</span>
          <select
            value={value?.id ?? ""}
            onChange={(e) => (e.target.value === missing?.id ? undefined : onChange(options.find((p) => p.id === e.target.value) ?? null))}
            className={FIELD}
          >
            <option value="">No patient record</option>
            {missing && <option value={missing.id}>{missing.name}</option>}
            {options.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.age} years{p.phone ? ` · ${p.phone}` : ""}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          aria-expanded={adding}
          onClick={() => setAdding(!adding)}
          className={cn(
            "flex h-12 flex-none items-center justify-center gap-1.5 rounded-[14px] border px-4 text-[15px] font-semibold transition-colors",
            adding ? "border-ink bg-ink text-white" : "border-line-strong bg-white hover:bg-[#FBFBF9]",
          )}
        >
          <Icon name={adding ? "close" : "plusSm"} size={18} />
          {adding ? "Cancel" : "Add new patient"}
        </button>
      </div>

      {adding && (
        <form
          className="flex flex-col gap-2.5 rounded-[16px] border border-line bg-card-hover p-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (ok && !add.isPending) add.mutate();
          }}
        >
          <div className="grid gap-2.5 sm:grid-cols-[1fr_110px]">
            <input aria-label="Name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" className={FIELD} />
            <input aria-label="Age" placeholder="Age" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 3))} className={FIELD} />
          </div>
          <input aria-label="Mobile number (optional)" placeholder="Mobile number (optional)" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="off" className={FIELD} />
          <label className="flex min-h-11 items-center gap-2.5 text-[15px]">
            <input type="checkbox" checked={glasses} onChange={(e) => setGlasses(e.target.checked)} className="size-5 accent-[#111]" />
            Wears glasses
          </label>
          {add.isError && <p className="m-0 text-[14px] text-doc">{add.error.message}</p>}
          <button type="submit" disabled={!ok || add.isPending} className="flex h-11 items-center justify-center rounded-[14px] bg-ink px-4 text-[15px] font-semibold text-white disabled:opacity-40">
            {add.isPending ? "Adding…" : "Add patient"}
          </button>
        </form>
      )}
    </div>
  );
}

/**
 * In the AI chat, for a shop: who the chat is for, and a way to pick or add the patient mid-chat.
 * The next AI turn and the test plan then use that patient's age and record.
 */
export function ShopChatFor() {
  const patient = useCheck((s) => s.shopPatient);
  const [open, setOpen] = useState(false);
  const pick = (p: ShopPatient | null) => {
    useCheck.getState().setShopPatient(p && { id: p.id, name: p.name, profileId: p.checkProfileId });
    if (p) setOpen(false);
  };
  return (
    <div className="mt-3 flex flex-col gap-2.5 rounded-[16px] border border-line bg-white p-3 md:border-line-option">
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 flex-none place-items-center rounded-full bg-fill">
          <Icon name="profile" size={18} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-faint">For</span>
          <span className="truncate text-[15px] font-semibold">{patient ? patient.name : "No patient record"}</span>
        </span>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="h-10 flex-none rounded-full border border-line-strong bg-white px-3.5 text-[14px] font-semibold hover:border-ink"
        >
          {open ? "Close" : patient ? "Change" : "Add patient"}
        </button>
      </div>
      {open && <ShopPatientPicker value={patient} onChange={pick} />}
    </div>
  );
}
