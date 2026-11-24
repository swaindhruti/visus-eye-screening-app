"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useState } from "react";

import { useDoctorReady } from "@/components/DoctorShell";
import { Icon } from "@/components/Icon";
import { PrescriptionCard } from "@/components/PrescriptionCard";
import { Screen } from "@/components/Screen";
import { ErrorState } from "@/components/States";
import { SkeletonCards } from "@/components/Skeleton";
import { listDoctorPrescriptions } from "@/services/doctor";

/** R7: every prescription this doctor saved, newest first. `?consult=<id>` opens that one. */
export default function DoctorPrescriptions() {
  const ready = useDoctorReady();
  const target = useSearchParams().get("consult");
  const [q, setQ] = useState("");
  const term = useDeferredValue(q).trim().toLowerCase();
  const list = useQuery({ queryKey: ["doctor-prescriptions"], queryFn: listDoctorPrescriptions, enabled: ready });

  useEffect(() => {
    if (target && list.data) document.getElementById(`rx-${target}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [target, list.data]);

  if (list.isError) return <ErrorState onRetry={() => list.refetch()} retrying={list.isFetching} />;
  const all = list.data ?? [];
  const shown = term ? all.filter((rx) => rx.patient.name.toLowerCase().includes(term) || rx.clinic.name.toLowerCase().includes(term)) : all;

  return (
    <Screen wide gap="gap-5 md:gap-6" eyebrow="Doctor portal" title="Prescriptions">
      <label className="relative block">
        <span className="sr-only">Search by patient or clinic</span>
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
          <Icon name="search" size={20} />
        </span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by patient or clinic"
          className="h-[52px] w-full rounded-[16px] border border-line-strong bg-white pl-12 pr-4 text-[16px] outline-none focus:border-ink focus:shadow-[0_0_0_4px_rgba(17,17,17,.06)]"
        />
      </label>

      {list.isPending && <SkeletonCards count={3} label="Loading prescriptions…" />}
      {list.isSuccess && shown.length === 0 && (
        <div className="flex flex-col items-center px-3 py-12 text-center">
          <span className="grid size-[72px] place-items-center rounded-full border border-line bg-white">
            <Icon name="doc" size={30} strokeWidth={1.8} />
          </span>
          <h2 className="m-0 mt-5 text-[22px] font-bold tracking-[-0.02em]">{q ? "Nothing found" : "No prescriptions yet"}</h2>
          <p className="m-0 mt-2 max-w-[340px] text-[16px] leading-normal text-muted text-pretty">
            {q ? "Check the patient's or the clinic's name." : "Prescriptions you save at the end of a consult show up here, and in the patient's and the clinic's records."}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {shown.map((rx) => (
          <PrescriptionCard
            key={rx.id}
            id={`rx-${rx.consultId}`}
            rx={rx}
            compact={rx.consultId !== target}
            footer={
              <Link href={`/doctor/consults/${rx.consultId}`} className="flex items-center gap-1.5 self-start border-t border-divider pt-3 text-[14px] font-semibold text-ink-soft hover:text-ink">
                <Icon name="profile" size={16} />
                {rx.patient.name}&apos;s patient file
                <Icon name="chevronRight" size={14} strokeWidth={2.2} />
              </Link>
            }
          />
        ))}
      </div>
    </Screen>
  );
}
