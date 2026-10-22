"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Segmented, StatusBadge } from "@/components/Chip";
import { cn } from "@/components/cn";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { ErrorState } from "@/components/States";
import { MONTHS } from "@/lib/dates";
import { sessionSub, sessionTitle, trends } from "@/lib/history";
import { listSessions, type SessionSummary } from "@/services/sessions";

export default function Results() {
  const q = useQuery({ queryKey: ["sessions"], queryFn: listSessions });
  const [metric, setMetric] = useState(0);
  const [all, setAll] = useState(false);

  if (q.isError) return <ErrorState onRetry={() => q.refetch()} retrying={q.isFetching} />;
  const sessions = q.data ?? [];
  const series = trends(sessions);
  const trend = series[Math.min(metric, series.length - 1)];
  const empty = q.isSuccess && sessions.length === 0;

  return (
    <Screen tabs gap="gap-5" eyebrow={q.isPending ? " " : empty ? "No checks yet" : `${sessions.length} ${sessions.length === 1 ? "check" : "checks"}${trend ? ` since ${trend.months[0]}` : ""}`} title="Results">
      {empty ? (
        <div className="flex flex-1 flex-col items-center justify-center px-3 pb-10 text-center">
          <span className="grid size-[72px] place-items-center rounded-full border border-line bg-white">
            <Icon name="results" size={30} strokeWidth={1.8} />
          </span>
          <h2 className="m-0 mt-5 text-[22px] font-bold tracking-[-0.02em]">No results yet</h2>
          <p className="m-0 mt-2 max-w-[280px] text-[16px] leading-normal text-muted text-pretty">Take your first eye check. Your scores and trends will show up here.</p>
          <Button href="/check/who" className="mt-6 h-[52px] px-7 text-[16px]">
            Start eye check
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-6">
          {trend && trend.values.length > 1 && (
            <Card className="flex flex-none flex-col md:flex-[3_1_0] md:rounded-[24px] md:p-6">
              <Segmented pill options={series.map((t) => t.label)} value={metric} onChange={setMetric} />
              <Trend values={trend.values} months={trend.months} />
            </Card>
          )}
          <div className="flex min-w-0 flex-none flex-col gap-2.5 md:flex-[2_1_0]">
            <div className="flex items-center justify-between">
              <h3 className="m-0 text-[18px] font-bold tracking-[-0.01em] md:text-[24px] md:tracking-[-0.02em]">Past checks</h3>
              {sessions.length > 4 && (
                <button type="button" onClick={() => setAll(!all)} className="py-2 text-[15px] font-semibold hover:text-muted">
                  {all ? "Show less" : "See all"}
                </button>
              )}
            </div>
            <Card flush>
              {(all ? sessions : sessions.slice(0, 4)).map((s, i) => (
                <PastCheck key={s.id} s={s} first={i === 0} />
              ))}
            </Card>
          </div>
        </div>
      )}
    </Screen>
  );
}

function Trend({ values, months }: { values: number[]; months: string[] }) {
  const pts = values.map((n, i) => [8 + i * (312 / Math.max(1, values.length - 1)), 100 - ((n - 60) / 40) * 90]);
  const line = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const delta = values[values.length - 1] - values[0];
  const last = pts[pts.length - 1];
  return (
    <>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-1">
          <span className="text-[34px] font-bold leading-none tracking-[-0.03em]">{values[values.length - 1]}</span>
          <span className="text-[15px] text-muted">/ 100</span>
        </div>
        <span className={cn("flex h-7 items-center rounded-full px-2.5 text-[13px] font-semibold", delta >= 0 ? "bg-good-bg text-good" : "bg-mild-bg text-mild")}>
          {delta >= 0 ? "+" : "−"}
          {Math.abs(delta)} since {months[0]}
        </span>
      </div>
      <svg viewBox="0 0 328 110" className="mt-3 block h-auto w-full overflow-visible" role="img" aria-label={`Trend: ${values.join(", ")}`}>
        <path d="M0 10H328M0 55H328M0 100H328" stroke="#F0F0EC" strokeWidth="1" />
        <path d={`M8,100 L${line.split(" ").join(" L")} L320,100 Z`} fill="#E0F1FF" />
        <polyline points={line} fill="none" stroke="#3C7EBE" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={last[0]} cy={last[1]} r="5" fill="#fff" stroke="#3C7EBE" strokeWidth="2.5" />
      </svg>
      <div className="mt-1.5 flex justify-between text-[12px] text-[#8A8A85]">
        {months.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </>
  );
}

function PastCheck({ s, first }: { s: SessionSummary; first: boolean }) {
  const d = new Date(s.date);
  return (
    <Link href={`/results/${s.id}`} className={cn("flex min-h-16 items-center gap-3.5 bg-white px-4 py-2.5 transition-colors hover:bg-card-hover", !first && "border-t border-divider")}>
      <span className="flex size-11 flex-none flex-col items-center justify-center rounded-[12px] bg-fill leading-none">
        <span className="text-[16px] font-bold">{d.getDate()}</span>
        <span className="mt-[3px] text-[10px] font-bold tracking-[.04em] text-muted">{MONTHS[d.getMonth()].toUpperCase()}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[16px] font-semibold">{sessionTitle(s)}</span>
        <span className="text-[13px] text-muted">{sessionSub(s)} · Both eyes</span>
      </span>
      <StatusBadge status={s.status} label={s.status === "good" ? "All clear" : undefined} className="self-center" />
    </Link>
  );
}
