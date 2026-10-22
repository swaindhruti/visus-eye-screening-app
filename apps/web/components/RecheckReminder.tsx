"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { CATEGORIES } from "@/lib/tests";
import { fmtFull, fmtShort } from "@/lib/dates";
import { getSession, type SessionSummary } from "@/services/sessions";
import { useSettings } from "@/store/settings";

import { Button } from "./Button";
import { STATUS } from "./Chip";
import { cn } from "./cn";
import { Icon } from "./Icon";
import { HeaderButton } from "./ScreenHeader";

const months = (from: string, to: Date) => Math.max(1, Math.round((to.getTime() - new Date(from).getTime()) / (30 * 864e5)));

/** Screen 56: full-screen reminder over Home when the last check is old. */
export function RecheckReminder({ last, today, onClose }: { last: SessionSummary; today: Date; onClose: () => void }) {
  const v = useQuery({ queryKey: ["session", last.id], queryFn: () => getSession(last.id) });
  const [snoozed, setSnoozed] = useState<string | null>(null);
  const m = months(last.date, today);
  const finding = v.data?.results.find((r) => r.status !== "good");

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-pearl">
    <div className="mx-auto w-full max-w-[640px] flex min-h-full flex-col px-5 pb-8 pt-6 md:pt-10" role="dialog" aria-modal aria-label="Check-up reminder">
      <div className="flex h-11 flex-none items-center">
        <HeaderButton icon="close" label="Close" onClick={onClose} />
      </div>
      <span className="mt-5 flex h-8 flex-none items-center gap-2 self-start rounded-full bg-acc-soft px-3.5 text-[14px] font-semibold text-acc-ink">
        <Icon name="bell" size={16} />
        Check-up reminder
      </span>
      <h1 className="m-0 mt-3.5 text-[30px] font-bold leading-[1.18] tracking-[-0.025em] text-balance">
        It&apos;s been {m} {m === 1 ? "month" : "months"} since your last check
      </h1>
      <p className="m-0 mt-2.5 text-[16px] leading-normal text-muted text-pretty">Eyes can change slowly. A 5-minute check keeps your record up to date.</p>
      <div className="mt-5 flex flex-none flex-col rounded-[20px] border border-line bg-white p-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[16px] font-bold">Last result</span>
          <span className="text-[14px] text-muted">{fmtFull(last.date)}</span>
        </div>
        <div className="mt-2.5 flex flex-col">
          {CATEGORIES.filter((c) => v.data?.areas[c.id]).map((c) => {
            const s = STATUS[v.data!.areas[c.id]!];
            return (
              <div key={c.id} className="flex h-11 items-center justify-between border-t border-divider text-[15px]">
                <span>{c.label}</span>
                <span className={cn("flex items-center gap-1.5 font-semibold", s.fg)}>
                  <span className={cn("size-1.5 rounded-full", s.dot)} />
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
        {finding && <span className="mt-2 border-t border-divider pt-2.5 text-[13px] leading-[1.45] text-muted">{finding.summary}.</span>}
      </div>
      <div className="min-h-4 flex-1" />
      <Button href="/check/who" arrow>
        Start check
      </Button>
      <Button
        variant="ghost"
        className="mt-1"
        onClick={() => {
          const until = new Date(today.getTime() + 7 * 864e5);
          useSettings.getState().set({ reminderSnoozedUntil: until.toISOString() });
          setSnoozed(fmtShort(until));
          setTimeout(onClose, 1200);
        }}
      >
        {snoozed ? `Okay, we'll remind you on ${snoozed}` : "Remind me in a week"}
      </Button>
    </div>
    </div>
  );
}
