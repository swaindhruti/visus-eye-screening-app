"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { Segmented } from "@/components/Chip";
import { ConsultRow, JoinBanner } from "@/components/ConsultRow";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { useShopReady } from "@/components/ShopShell";
import { ErrorState } from "@/components/States";
import { SkeletonRows } from "@/components/Skeleton";
import { canJoin, useNow } from "@/lib/consults";
import { fmtFull } from "@/lib/dates";
import { listClinicConsults } from "@/services/clinic";
import type { ConsultsWhen } from "@/services/doctor";
import { listPatients } from "@/services/shops";

const TABS: [ConsultsWhen, string][] = [
  ["today", "Today"],
  ["upcoming", "Upcoming"],
  ["past", "Past"],
];

const EMPTY: Record<ConsultsWhen, [string, string]> = {
  today: ["No consults today", "Book a consult for a linked patient with one of your doctors."],
  upcoming: ["Nothing booked yet", "Consults you book, and follow-ups the doctor sets, show up here."],
  past: ["No past consults", "Finished, missed and cancelled consults stay here."],
};

const ACTION = "flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-white px-3 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-card-hover hover:text-ink";

/** S15: the clinic's consults. Join for patients sitting at the clinic; move or cancel upcoming ones. */
export default function ShopConsults() {
  const ready = useShopReady();
  const now = useNow();
  const [tab, setTab] = useState(0);
  const when = TABS[tab][0];
  const today = useQuery({ queryKey: ["shop-consults", "today"], queryFn: () => listClinicConsults("today"), enabled: ready, refetchInterval: 30_000 });
  const list = useQuery({ queryKey: ["shop-consults", when], queryFn: () => listClinicConsults(when), enabled: ready });
  // Rows open the patient's page, which has their consults and prescriptions.
  const patients = useQuery({ queryKey: ["shop-patients", ""], queryFn: () => listPatients(""), enabled: ready });
  const patientPage = (profileId: string) => {
    const p = patients.data?.find((x) => x.checkProfileId === profileId);
    return p ? `/shop/patients/${p.id}` : "/shop";
  };

  if (list.isError) return <ErrorState onRetry={() => list.refetch()} retrying={list.isFetching} />;
  const joinable = now ? (today.data ?? []).filter((c) => canJoin(c, now) && c.joinFrom === "clinic") : [];
  const consults = list.data ?? [];
  const [emptyTitle, emptyBody] = EMPTY[when];

  return (
    <Screen
      wide
      gap="gap-5 md:gap-7"
      eyebrow={now ? fmtFull(new Date(now)) : " "}
      title="Consults"
      actions={
        <Link href="/shop/consults/new" className="flex h-11 items-center gap-1.5 rounded-full bg-ink px-5 text-[15px] font-semibold text-white hover:bg-[#2a2a2a]">
          <Icon name="plusSm" size={18} strokeWidth={2.2} />
          Book consult
        </Link>
      }
    >
      {now &&
        joinable.map((c) => (
          <JoinBanner key={c.id} c={c} now={now} title={`${c.patient.name} with ${c.doctor.name}`} href={`/shop/consults/${c.id}/call`} />
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
            consults.map((c, i) => {
              const changeable = c.status === "scheduled" && Date.parse(c.startsAt) > now;
              return (
                <ConsultRow
                  key={c.id}
                  c={c}
                  now={now}
                  first={i === 0}
                  title={`${c.patient.name}, ${c.patient.age}`}
                  sub={c.doctor.name}
                  href={patientPage(c.patient.profileId)}
                  actions={
                    (canJoin(c, now) || changeable) && (
                      <>
                        {canJoin(c, now) && (
                          <Link href={`/shop/consults/${c.id}/call`} className="flex h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[13px] font-semibold text-white hover:bg-[#2a2a2a]">
                            <Icon name="camera" size={15} />
                            Join at the clinic
                          </Link>
                        )}
                        {changeable && (
                          <Link href={`/shop/consults/new?move=${c.id}`} className={ACTION}>
                            <Icon name="edit" size={15} strokeWidth={2} />
                            Move or cancel
                          </Link>
                        )}
                      </>
                    )
                  }
                />
              );
            })}
          {(list.isPending || !now) && <SkeletonRows label="Loading consults…" />}
        </div>
      )}
    </Screen>
  );
}
