"use client";

import type { TestId } from "@visus/shared";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/Chip";
import { Icon, type IconName } from "@/components/Icon";
import { RecheckReminder } from "@/components/RecheckReminder";
import { Screen } from "@/components/Screen";
import { TestIcon } from "@/components/TestArt";
import { daysAgo, fmtLong, fmtShort, MONTHS, useToday } from "@/lib/dates";
import { categoryOf, TEST_COPY, testInfo } from "@/lib/tests";
import { sessionSub, sessionTitle, trends, type Trend } from "@/lib/history";
import { initials, isOwner, listProfiles, relationLabel } from "@/services/profiles";
import { listSessions, type SessionSummary } from "@/services/sessions";
import { useHydrated } from "@/store/hydrated";
import { useSettings } from "@/store/settings";

const POPULAR: TestId[] = ["tumbling_e", "colour_plates", "amsler", "eye_strain"];

export default function Home() {
  const today = useToday();
  const history = useQuery({ queryKey: ["sessions"], queryFn: listSessions });
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: listProfiles });
  const last = history.data?.[0];
  const me = profiles.data?.find(isOwner);
  const trend = history.data ? trends(history.data)[0] : undefined;

  const preview = useSearchParams().get("reminder") === "1";
  const snoozed = useSettings((s) => s.reminderSnoozedUntil);
  const hydrated = useHydrated();
  const [closed, setClosed] = useState(false);
  const due =
    hydrated && !closed && !!last && !!today && (preview || (today.getTime() - new Date(last.date).getTime() > 90 * 864e5 && !(snoozed && new Date(snoozed) > today)));

  return (
    <>
      <Screen tabs gap="gap-4 md:gap-7" eyebrow={today ? fmtLong(today) : " "} title={me ? `Hello, ${me.name.split(" ")[0]}` : "Today"}>
        <div className="flex flex-col gap-4 md:flex-row md:gap-5">
          <div className="flex min-w-0 flex-col gap-4 md:flex-[2_1_0]">
            <section className="flex flex-col gap-1.5 rounded-[24px] bg-night p-5 text-white md:flex-row md:flex-wrap md:items-end md:justify-between md:gap-6 md:rounded-[28px] md:p-8">
              <div className="flex flex-col gap-1.5 md:flex-[1_1_320px] md:gap-2.5">
                <span className="flex h-7 items-center gap-[7px] self-start rounded-full bg-white/12 px-3 text-[13px] font-semibold">
                  <span className="size-[7px] rounded-full bg-acc-bright" />
                  Due today · about 5 min
                </span>
                <h2 className="m-0 mt-2.5 text-[24px] font-bold leading-[1.2] tracking-[-0.02em] md:mt-2 md:text-[32px] md:leading-[1.15] md:tracking-[-0.025em]">Time for your eye check?</h2>
                <p className="m-0 max-w-[440px] text-[15px] leading-[1.45] text-white/75 md:text-[17px] md:leading-normal">Sharpness, focus, colour and contrast. Tell us what&apos;s bothering you and we&apos;ll pick the tests.</p>
              </div>
              <Button href="/check/who" variant="inverted" arrow className="mt-3.5 md:mt-0 md:px-[26px]">
                Start eye check
              </Button>
            </section>
            <div className="grid gap-3 md:grid-cols-2 md:gap-4">
              <ShortcutCard href="/check/quick" icon="bolt" accent title="1-minute quick check" sub="Tumbling E · Amsler · Clock dial" />
              <ShortcutCard href="/check/glasses" icon="glasses" title="Glasses check" sub="Are your glasses still right?" />
            </div>
          </div>

          <LastCheck last={last} today={today} pending={history.isPending} trend={trend} />
        </div>

        <section className="flex flex-col gap-2.5 md:gap-3.5">
          <div className="flex items-baseline justify-between">
            <h2 className="m-0 text-[18px] font-bold tracking-[-0.01em] md:text-[24px] md:tracking-[-0.02em]">Popular tests</h2>
            <Link href="/tests" className="py-2 text-[15px] font-semibold hover:text-muted">
              See all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-4">
            {POPULAR.map((id) => {
              const t = testInfo(id);
              return (
                <Link key={id} href={`/tests/${id}`} className="flex flex-col gap-0.5 rounded-[18px] border border-line bg-white p-3.5 transition-[border-color,transform] hover:border-[#D6D6D1] active:scale-[.98] md:gap-1 md:rounded-[20px] md:p-5">
                  <span className="grid size-[38px] place-items-center rounded-full bg-fill text-[18px] font-bold md:size-11 md:text-[20px]">
                    <TestIcon id={id} />
                  </span>
                  <span className="mt-2.5 text-[15px] font-bold md:mt-3.5 md:text-[17px]">{TEST_COPY[id].title}</span>
                  <span className="text-[13px] text-muted md:text-[14px]">
                    {categoryOf(t.category).label} · {t.minutes} min
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <div className="flex flex-col gap-4 md:flex-row md:gap-5">
          <section className="flex min-w-0 flex-col gap-2.5 md:flex-[2_1_0] md:gap-3.5">
            <h2 className="m-0 text-[18px] font-bold tracking-[-0.01em] md:text-[24px] md:tracking-[-0.02em]">Recent checks</h2>
            <div className="overflow-hidden rounded-[20px] border border-line bg-white">
              {(history.data ?? []).slice(0, 3).map((s, i) => (
                <RecentRow key={s.id} s={s} first={i === 0} />
              ))}
              {history.isSuccess && history.data.length === 0 && <p className="m-0 p-4 text-[15px] text-muted">No checks yet.</p>}
            </div>
          </section>
          <section className="flex min-w-0 flex-col gap-2.5 md:flex-[1_1_0] md:gap-3.5">
            <h2 className="m-0 text-[18px] font-bold tracking-[-0.01em] md:text-[24px] md:tracking-[-0.02em]">Family</h2>
            <div className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-[18px]">
              {(profiles.data ?? []).map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className={`grid size-10 flex-none place-items-center rounded-full text-[14px] font-bold ${i === 0 ? "bg-acc-soft text-acc-ink" : "bg-fill"}`}>{initials(p.name)}</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[15px] font-semibold">{isOwner(p) ? "You" : `${p.name.split(" ")[0]}, ${p.age}`}</span>
                    <span className="text-[13px] text-muted">{p.isChild ? "Kids mode" : relationLabel(p)}</span>
                  </span>
                </div>
              ))}
              <Link href="/profile/family/new" className="mt-1 flex h-11 items-center justify-center gap-1.5 rounded-[14px] border border-dashed border-[#BDBDB8] text-[15px] font-semibold hover:bg-pearl">
                <Icon name="plusSm" size={18} />
                Add someone
              </Link>
            </div>
          </section>
        </div>
      </Screen>
      {due && <RecheckReminder last={last} today={today} onClose={() => setClosed(true)} />}
    </>
  );
}

function ShortcutCard({ href, icon, title, sub, accent }: { href: string; icon: IconName; title: string; sub: string; accent?: boolean }) {
  return (
    <Link href={href} className="flex min-h-[62px] items-center gap-3 rounded-[20px] border border-line bg-white py-2.5 pl-3.5 pr-3 transition-[transform,border-color] duration-150 hover:border-[#D6D6D1] active:scale-[.98] md:gap-3.5 md:p-[18px]">
      <span className={`grid size-[38px] flex-none place-items-center rounded-full md:size-11 ${accent ? "bg-acc-soft text-acc-ink" : "bg-fill"}`}>
        <Icon name={icon} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="text-[16px] font-semibold md:text-[17px] md:font-bold">{title}</span>
        <span className="text-[13px] text-muted md:text-[14px]">{sub}</span>
      </span>
      <span className="grid h-9 flex-none place-items-center rounded-full bg-ink px-3.5 text-[14px] font-semibold text-white md:hidden">Start</span>
    </Link>
  );
}

function LastCheck({ last, today, pending, trend }: { last?: SessionSummary; today: Date | null; pending: boolean; trend?: Trend }) {
  const pts = trend?.values.map((n, i) => [8 + i * (312 / Math.max(1, trend.values.length - 1)), 100 - ((n - 60) / 40) * 90]) ?? [];
  const line = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const delta = trend ? trend.values[trend.values.length - 1] - trend.values[0] : 0;
  return (
    <Link href={last ? `/results/${last.id}` : "/results"} className="flex min-w-0 flex-col gap-1 rounded-[20px] border border-line bg-white p-4 transition-[border-color] hover:border-[#D6D6D1] md:flex-[1_1_0] md:rounded-[24px] md:p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[14px] font-semibold text-muted md:text-[15px]">Last eye check</span>
        {last && <StatusBadge status={last.status} label={last.status === "good" ? "All clear" : undefined} />}
      </div>
      <span className="mt-1.5 text-[26px] font-bold leading-[1.1] tracking-[-0.02em] md:text-[34px]">{last ? fmtShort(last.date) : pending ? "…" : "None yet"}</span>
      <span className="text-[13px] text-muted md:text-[14px]">
        {last && today ? `${daysAgo(last.date, today)} · ${sessionSub(last)}` : "Take your first check"}
      </span>
      {trend && pts.length > 1 && (
        <div className="mt-4 hidden flex-col gap-2 md:flex">
          <div className="flex items-baseline justify-between text-[14px] font-semibold">
            <span>{trend.label}</span>
            <span className={delta >= 0 ? "text-good" : "text-mild"}>
              {delta >= 0 ? "+" : "−"}
              {Math.abs(delta)} since {trend.months[0]}
            </span>
          </div>
          <svg viewBox="0 0 328 110" className="block h-auto w-full" role="img" aria-label={`${trend.label} trend: ${trend.values.join(", ")}`}>
            <path d="M0 10H328M0 55H328M0 100H328" stroke="#F0F0EC" strokeWidth="1" />
            <path d={`M8,100 L${line.split(" ").join(" L")} L320,100 Z`} fill="#E0F1FF" />
            <polyline points={line} fill="none" stroke="#3C7EBE" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="5" fill="#fff" stroke="#3C7EBE" strokeWidth="2.5" />
          </svg>
          <span className="mt-auto pt-2 text-[15px] font-semibold">View all results</span>
        </div>
      )}
    </Link>
  );
}

function RecentRow({ s, first }: { s: SessionSummary; first: boolean }) {
  const d = new Date(s.date);
  return (
    <Link href={`/results/${s.id}`} className={`flex min-h-16 items-center gap-3.5 px-4 py-2.5 transition-colors hover:bg-card-hover md:min-h-[68px] md:gap-4 md:px-5 ${first ? "" : "border-t border-divider"}`}>
      <span className="flex size-11 flex-none flex-col items-center justify-center rounded-[12px] bg-fill leading-none">
        <span className="text-[16px] font-bold">{d.getDate()}</span>
        <span className="mt-[3px] text-[10px] font-bold tracking-[.04em] text-muted">{MONTHS[d.getMonth()].toUpperCase()}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[16px] font-semibold">{sessionTitle(s)}</span>
        <span className="text-[13px] text-muted">{sessionSub(s)}</span>
      </span>
      <StatusBadge status={s.status} label={s.status === "good" ? "All clear" : undefined} className="self-center" />
    </Link>
  );
}
