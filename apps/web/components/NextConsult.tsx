"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { canJoin, fmtDay, fmtTime, JOIN_FROM_LABEL, useNow } from "@/lib/consults";
import { listMyConsults } from "@/services/consults";

import { JoinBanner } from "./ConsultRow";
import { Icon } from "./Icon";

/**
 * Home: the next consult the clinic booked ("Consult with Dr X · Today 4:15 pm"). From 10 minutes
 * before the start it turns into the "Join now" banner. Nothing shows when none is booked.
 */
export function NextConsult() {
  const now = useNow();
  const q = useQuery({ queryKey: ["my-consults"], queryFn: listMyConsults, refetchInterval: 60_000 });
  const next = q.data?.find((c) => c.status === "scheduled" || c.status === "live");
  if (!next || !now || (next.status === "scheduled" && Date.parse(next.startsAt) + next.minutes * 60_000 < now)) return null;

  if (canJoin(next, now)) return <JoinBanner c={next} now={now} title={`Consult with ${next.doctor.name}`} href={`/consults/${next.id}/call`} />;
  return (
    <Link href={`/consults/${next.id}`} className="flex items-center gap-3.5 rounded-[20px] border border-line bg-white p-4 transition-[border-color] hover:border-[#D6D6D1] md:p-5">
      <span className="grid size-11 flex-none place-items-center rounded-full bg-acc-soft text-acc-ink">
        <Icon name="calendar" size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-faint">Next consult</span>
        <span className="text-[16px] font-semibold md:text-[17px]">
          Consult with {next.doctor.name} · {fmtDay(next.startsAt, now)} {fmtTime(next.startsAt)}
        </span>
        <span className="truncate text-[13px] text-muted md:text-[14px]">
          {next.doctor.specialty} · {JOIN_FROM_LABEL[next.joinFrom]}
          {next.joinFrom === "clinic" ? ` (${next.clinic.name})` : ""}
        </span>
      </span>
      <Icon name="chevronRight" size={16} strokeWidth={2.2} className="flex-none text-faint" />
    </Link>
  );
}
