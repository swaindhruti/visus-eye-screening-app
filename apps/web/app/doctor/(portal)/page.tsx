"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { Segmented } from "@/components/Chip";
import { ConsultRow, JoinBanner } from "@/components/ConsultRow";
import { useDoctorReady } from "@/components/DoctorShell";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { ErrorState } from "@/components/States";
import { SkeletonRows } from "@/components/Skeleton";
import { canJoin, useNow } from "@/lib/consults";
import { fmtFull } from "@/lib/dates";
import { listDoctorConsults, type ConsultsWhen } from "@/services/doctor";

const TABS: [ConsultsWhen, string][] = [
  ["today", "Today"],
  ["upcoming", "Upcoming"],
  ["past", "Past"],
];

const EMPTY: Record<ConsultsWhen, [string, string]> = {
  today: ["No consults today", "Consults that clinics book for you today show up here."],
  upcoming: ["Nothing booked yet", "Clinics book consults in your weekly hours. Set them in Clinics."],
  past: ["No past consults", "Finished, missed and cancelled consults stay here."],
};

/** R3: the doctor's consults. Join now from 10 minutes before; Today, Upcoming and Past. */
export default function DoctorConsults() {
  const ready = useDoctorReady();
  const now = useNow();
  const [tab, setTab] = useState(0);
  const when = TABS[tab][0];
  const today = useQuery({ queryKey: ["doctor-consults", "today"], queryFn: () => listDoctorConsults("today"), enabled: ready, refetchInterval: 30_000 });
  const list = useQuery({ queryKey: ["doctor-consults", when], queryFn: () => listDoctorConsults(when), enabled: ready });

  if (list.isError) return <ErrorState onRetry={() => list.refetch()} retrying={list.isFetching} />;
  const joinable = now ? (today.data ?? []).filter((c) => canJoin(c, now)) : [];
  const consults = list.data ?? [];
  const [emptyTitle, emptyBody] = EMPTY[when];

  return (
    <Screen wide gap="gap-5 md:gap-7" eyebrow={now ? fmtFull(new Date(now)) : " "} title="Consults">
      {now &&
        joinable.map((c) => (
          <JoinBanner
            key={c.id}
            c={c}
            now={now}
            title={`${c.patient.name}, ${c.patient.age} · ${c.clinic.name}`}
            href={`/doctor/consults/${c.id}/call`}
            extra={
              <Link href={`/doctor/consults/${c.id}`} className="flex h-12 items-center rounded-[14px] border border-white/30 px-4 text-[16px] font-semibold text-white transition-colors hover:bg-white/10">
                Patient file
              </Link>
            }
          />
        ))}

      <Segmented pill options={TABS.map(([w, label]) => (w === "today" && today.data ? `${label} · ${today.data.length}` : label))} value={tab} onChange={setTab} className="self-start" />

      {list.isSuccess && consults.length === 0 ? (
        <div className="flex flex-col items-center px-3 py-12 text-center">
          <span className="grid size-[72px] place-items-center rounded-full border border-line bg-white">
            <Icon name="calendar" size={30} strokeWidth={1.8} />
          </span>
          <h2 className="m-0 mt-5 text-[22px] font-bold tracking-[-0.02em]">{emptyTitle}</h2>
          <p className="m-0 mt-2 max-w-[340px] text-[16px] leading-normal text-muted text-pretty">{emptyBody}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[20px] border border-line bg-white" aria-busy={list.isPending}>
          {now &&
            consults.map((c, i) => (
              <ConsultRow key={c.id} c={c} now={now} first={i === 0} title={`${c.patient.name}, ${c.patient.age}`} sub={`${c.clinic.name}, ${c.clinic.city}`} href={`/doctor/consults/${c.id}`} />
            ))}
          {(list.isPending || !now) && <SkeletonRows label="Loading consults…" />}
        </div>
      )}
    </Screen>
  );
}
