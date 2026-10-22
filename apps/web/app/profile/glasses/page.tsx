"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/Button";
import { Toggle } from "@/components/Chip";
import { cn } from "@/components/cn";
import { Icon } from "@/components/Icon";
import { Screen, Spacer } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ErrorState, LoadingState } from "@/components/States";
import { fmtFull } from "@/lib/dates";
import { fmtPower, listProfiles, parsePower, updateProfile, type Prescription, type Profile } from "@/services/profiles";

export default function Glasses() {
  const id = useSearchParams().get("id");
  const q = useQuery({ queryKey: ["profiles"], queryFn: listProfiles });
  if (q.isPending) return <LoadingState />;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} retrying={q.isFetching} />;
  const p = q.data.find((x) => x.id === id) ?? q.data[0];
  if (!p) return <ErrorState title="No profile yet" body="Finish onboarding to create your profile." />;
  return <GlassesForm key={p.id} profile={p} />;
}

/** The six boxes as typed. Saved as the shared numeric Prescription. */
type Rx = { rS: string; rC: string; rA: string; lS: string; lC: string; lA: string };
const EMPTY: Rx = { rS: "", rC: "", rA: "", lS: "", lC: "", lA: "" };
const toRx = (p: Prescription): Rx => ({ rS: fmtPower(p.right.sph), rC: fmtPower(p.right.cyl), rA: String(p.right.axis), lS: fmtPower(p.left.sph), lC: fmtPower(p.left.cyl), lA: String(p.left.axis) });
const axis = (s: string) => Math.min(180, Math.max(0, Math.round(Number(s) || 0)));
const fromRx = (r: Rx): Prescription => ({
  right: { sph: parsePower(r.rS), cyl: parsePower(r.rC), axis: axis(r.rA) },
  left: { sph: parsePower(r.lS), cyl: parsePower(r.lC), axis: axis(r.lA) },
  updatedAt: new Date().toISOString().slice(0, 10),
});
const ROWS = [
  ["Right", "OD", "r", "Right eye"],
  ["Left", "OS", "l", "Left eye"],
] as const;
const COLS = [
  ["S", "sphere", "decimal"],
  ["C", "cylinder", "decimal"],
  ["A", "axis", "numeric"],
] as const;

function GlassesForm({ profile }: { profile: Profile }) {
  const qc = useQueryClient();
  const [rx, setRx] = useState<Rx>(profile.prescription ? toRx(profile.prescription) : EMPTY);
  const [unknown, setUnknown] = useState(profile.prescription === null && profile.eyewear !== undefined && profile.eyewear !== "none");
  const save = useMutation({
    mutationFn: () => updateProfile(profile.id, { prescription: unknown ? null : fromRx(rx) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profiles"] }),
  });
  const edit = (k: keyof Rx, v: string) => {
    setRx({ ...rx, [k]: v });
    save.reset();
  };

  return (
    <Screen gap="gap-0">
      <ScreenHeader title="My glasses" fallback="/profile" />
      <h1 className="m-0 mt-5 text-[28px] font-bold leading-[1.15] tracking-[-0.025em]">Your prescription</h1>
      <div className="mt-2 flex flex-none items-center gap-2 text-[14px] text-muted">
        <Icon name="calendar" size={16} strokeWidth={1.9} />
        <span>{save.isSuccess ? "Updated today" : profile.prescription ? `Last updated ${fmtFull(profile.prescription.updatedAt)}` : "Not added yet"}</span>
      </div>

      <div className={cn("mt-[18px] flex flex-none flex-col gap-2.5 rounded-[20px] border border-line bg-white px-3.5 pb-3.5 pt-3 transition-opacity duration-[250ms]", unknown && "pointer-events-none opacity-40")} aria-disabled={unknown}>
        <div className="grid grid-cols-[64px_repeat(3,minmax(0,1fr))] gap-2 text-center text-[12px] font-bold tracking-[.04em] text-[#8A8A85]">
          <span />
          <span>SPH</span>
          <span>CYL</span>
          <span>AXIS</span>
        </div>
        {ROWS.map(([label, code, side, aria]) => (
          <div key={side} className="grid grid-cols-[64px_repeat(3,minmax(0,1fr))] items-center gap-2">
            <span className="flex flex-col gap-px">
              <span className="text-[15px] font-bold">{label}</span>
              <span className="text-[12px] text-[#8A8A85]">{code}</span>
            </span>
            {COLS.map(([c, name, mode]) => {
              const k = `${side}${c}` as keyof Rx;
              return (
                <input
                  key={k}
                  value={rx[k]}
                  onChange={(e) => edit(k, e.target.value)}
                  aria-label={`${aria} ${name}`}
                  inputMode={mode}
                  tabIndex={unknown ? -1 : 0}
                  className="h-12 w-full min-w-0 rounded-[12px] border border-line-strong bg-white px-1 text-center text-[17px] font-semibold tabular-nums outline-none transition-[border-color] focus:border-ink focus-visible:outline-none"
                />
              );
            })}
          </div>
        ))}
      </div>
      <p className="m-0 mx-1 mt-2 text-[13px] leading-[1.4] text-muted">SPH and CYL are in dioptres. AXIS is 0–180°.</p>

      <div className="mt-3.5 flex min-h-[72px] flex-none items-center gap-3 rounded-[20px] border border-line bg-white px-4 py-3">
        <span className="flex flex-1 flex-col gap-0.5">
          <span className="text-[16px] font-semibold">I don&apos;t know my prescription</span>
          <span className="text-[13px] leading-[1.35] text-muted">We&apos;ll go by your test results instead</span>
        </span>
        <Toggle
          on={unknown}
          label="I don't know my prescription"
          onClick={() => {
            setUnknown(!unknown);
            save.reset();
          }}
        />
      </div>

      <div className="mt-3 flex flex-none gap-3 rounded-[20px] bg-acc-soft px-4 py-3.5">
        <Icon name="sparkle" size={22} color="#194F81" className="mt-px flex-none" />
        <span className="text-[15px] leading-[1.45] text-ink-soft text-pretty">These numbers are on the slip from your last eye test. Your optician can also share them.</span>
      </div>

      <Spacer />
      <Button disabled={save.isPending} onClick={() => save.mutate()}>
        {save.isSuccess ? "Saved ✓" : save.isPending ? "Saving…" : "Save"}
      </Button>
    </Screen>
  );
}
