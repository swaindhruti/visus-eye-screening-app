"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { STATUS, StatusBadge } from "@/components/Chip";
import { cn } from "@/components/cn";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { LoadingState } from "@/components/States";
import { TestIcon } from "@/components/TestArt";
import { fmtFull } from "@/lib/dates";
import { CATEGORIES, TEST_COPY } from "@/lib/tests";
import { ApiError } from "@/services/api";
import { getReport } from "@/services/sessions";

/** The read-only report a doctor opens from the share QR code. No login. */
export default function Report() {
  const { token } = useParams<{ token: string }>();
  const q = useQuery({ queryKey: ["report", token], queryFn: () => getReport(token), retry: false });

  if (q.isPending) return <LoadingState />;
  if (q.isError) {
    const expired = q.error instanceof ApiError && q.error.status === 404;
    return (
      <Screen gap="gap-0">
        <div className="flex flex-1 flex-col items-center justify-center pb-6 text-center">
          <span className="grid size-[88px] place-items-center rounded-full bg-pill">
            <Icon name="info" size={38} strokeWidth={1.7} className="rotate-180" />
          </span>
          <h1 className="m-0 mt-6 text-[28px] font-bold leading-[1.15] tracking-[-0.025em]">{expired ? "This link has expired" : "Couldn't load the report"}</h1>
          <p className="m-0 mt-2.5 max-w-[320px] text-[16px] leading-normal text-muted text-pretty">
            {expired ? "Report links last 24 hours. Ask for a new one from the Visus app." : q.error.message}
          </p>
        </div>
      </Screen>
    );
  }

  const v = q.data;
  return (
    <Screen gap="gap-0">
      <span className="text-[12px] font-bold tracking-[.06em] text-[#8A8A85]">VISUS EYE CHECK REPORT</span>
      <span className="mt-1 text-[14px] text-muted">
        {v.date ? `${fmtFull(v.date)} · ` : ""}
        {v.results.length} {v.results.length === 1 ? "test" : "tests"}
        {v.minutes ? ` · ${v.minutes} min` : ""}
      </span>
      <h1 className="m-0 mt-3 text-[28px] font-bold leading-[1.15] tracking-[-0.025em]">{v.headline}</h1>
      <p className="m-0 mt-1.5 text-[16px] leading-normal text-ink-soft text-pretty">{v.advice}</p>

      <div className="mt-5 flex flex-none flex-col rounded-[20px] border border-line bg-white px-4 py-1">
        {CATEGORIES.filter((c) => v.areas[c.id]).map((c, i) => {
          const s = STATUS[v.areas[c.id]!];
          return (
            <div key={c.id} className={cn("flex h-12 items-center justify-between text-[15px]", i > 0 && "border-t border-divider")}>
              <span className="font-semibold">{c.label}</span>
              <span className={cn("flex items-center gap-1.5 font-semibold", s.fg)}>
                <span className={cn("size-2 rounded-full", s.dot)} />
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      <h2 className="m-0 mt-6 text-[18px] font-bold tracking-[-0.01em]">Test by test</h2>
      <div className="mt-2.5 flex flex-none flex-col overflow-hidden rounded-[20px] border border-line bg-white">
        {v.results.map((r, i) => (
          <div key={`${r.testId}-${i}`} className={cn("flex min-h-[72px] items-center gap-3.5 px-4 py-3", i > 0 && "border-t border-divider")}>
            <span className={cn("grid size-10 flex-none place-items-center rounded-full text-[18px] font-bold", STATUS[r.status].bg, STATUS[r.status].fg)}>
              <TestIcon id={r.testId} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[16px] font-semibold">{TEST_COPY[r.testId].title}</span>
              <span className="text-[13px] text-muted">{r.summary}</span>
            </span>
            <span className="text-[18px] font-bold">{r.score}</span>
            <StatusBadge status={r.status} className="hidden self-center sm:flex" />
          </div>
        ))}
      </div>

      {v.lens[0] && (
        <p className="m-0 mt-4 text-[14px] leading-normal text-ink-soft text-pretty">
          Suggested lens: <span className="font-semibold">{v.lens[0].product}</span> ({v.lens[0].lensType})
        </p>
      )}
      <p className="m-0 mt-6 text-[13px] leading-normal text-muted text-pretty">
        Screening, not diagnosis. These results come from a self-test on a phone or computer and need confirming with a full eye exam.
      </p>
    </Screen>
  );
}
