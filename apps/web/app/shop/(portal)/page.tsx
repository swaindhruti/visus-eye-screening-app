"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useDeferredValue, useState } from "react";

import { Button } from "@/components/Button";
import { cn } from "@/components/cn";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { LinkBadge, useShopReady } from "@/components/ShopShell";
import { ErrorState } from "@/components/States";
import { fmtFull, fmtShort, useToday } from "@/lib/dates";
import { initials } from "@/services/profiles";
import { listPatients, type ShopPatient } from "@/services/shops";

/** Shop portal home: find a patient, add a walk-in, see today's checks. */
export default function ShopHome() {
  const today = useToday();
  const [q, setQ] = useState("");
  const term = useDeferredValue(q);
  const ready = useShopReady();
  const list = useQuery({ queryKey: ["shop-patients", term], queryFn: () => listPatients(term), enabled: ready });
  const all = useQuery({ queryKey: ["shop-patients", ""], queryFn: () => listPatients(""), enabled: ready });

  if (list.isError) return <ErrorState onRetry={() => list.refetch()} retrying={list.isFetching} />;
  const patients = list.data ?? [];
  const everyone = all.data ?? [];
  const isToday = (d: string | null) => !!d && !!today && new Date(d).toDateString() === today.toDateString();
  const stats: [string, number][] = [
    ["Patients", everyone.length],
    ["Checked today", everyone.filter((p) => isToday(p.lastCheck)).length],
    ["Linked accounts", everyone.filter((p) => p.linkStatus === "approved").length],
  ];

  return (
    <Screen wide gap="gap-5 md:gap-7" eyebrow={today ? fmtFull(today) : " "} title="Patients" actions={<Button href="/shop/patients/new" leading={<Icon name="plusSm" size={18} />} className="hidden md:flex">New patient</Button>}>
      <div className="grid grid-cols-3 gap-2.5 md:gap-4">
        {stats.map(([label, n]) => (
          <div key={label} className="flex flex-col gap-0.5 rounded-[20px] border border-line bg-white p-3.5 md:p-5">
            <span className="text-[26px] font-bold leading-none tracking-[-0.02em] tabular-nums md:text-[34px]">{all.isPending ? "…" : n}</span>
            <span className="mt-1.5 text-[13px] font-semibold text-muted md:text-[15px]">{label}</span>
          </div>
        ))}
      </div>

      <label className="relative block">
        <span className="sr-only">Search patients by name or phone</span>
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
          <Icon name="search" size={20} />
        </span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or phone"
          className="h-[52px] w-full rounded-[16px] border border-line-strong bg-white pl-12 pr-4 text-[16px] outline-none focus:border-ink focus:shadow-[0_0_0_4px_rgba(17,17,17,.06)]"
        />
      </label>

      {list.isSuccess && patients.length === 0 ? (
        <div className="flex flex-col items-center px-3 py-12 text-center">
          <span className="grid size-[72px] place-items-center rounded-full border border-line bg-white">
            <Icon name="profile" size={30} strokeWidth={1.8} />
          </span>
          <h2 className="m-0 mt-5 text-[22px] font-bold tracking-[-0.02em]">{q ? "No patient found" : "No patients yet"}</h2>
          <p className="m-0 mt-2 max-w-[320px] text-[16px] leading-normal text-muted text-pretty">
            {q ? "Check the spelling or the phone number, or add them as a new patient." : "Add your first walk-in to start an eye check for them."}
          </p>
          <Button href="/shop/patients/new" className="mt-6 h-[52px] px-7 text-[16px]">
            New patient
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[20px] border border-line bg-white" aria-busy={list.isPending}>
          {patients.map((p, i) => (
            <PatientRow key={p.id} p={p} first={i === 0} />
          ))}
          {list.isPending && <p className="m-0 p-4 text-[15px] text-muted">Loading patients…</p>}
        </div>
      )}
    </Screen>
  );
}

function PatientRow({ p, first }: { p: ShopPatient; first: boolean }) {
  return (
    <Link
      href={`/shop/patients/${p.id}`}
      className={cn("flex min-h-16 items-center gap-3.5 px-4 py-3 transition-colors hover:bg-card-hover md:gap-4 md:px-5", !first && "border-t border-divider")}
    >
      <span className="grid size-11 flex-none place-items-center rounded-full bg-acc-soft text-[15px] font-bold text-acc-ink">{initials(p.name)}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[16px] font-semibold">{p.name}</span>
        <span className="truncate text-[13px] text-muted">
          {p.age} years{p.phone ? ` · ${p.phone}` : ""}
          {p.lastCheck ? ` · Last check ${fmtShort(p.lastCheck)}` : " · No checks yet"}
        </span>
      </span>
      <LinkBadge status={p.linkStatus} className="hidden self-center sm:flex" />
      <Icon name="chevronRight" size={18} className="flex-none text-faint" />
    </Link>
  );
}
