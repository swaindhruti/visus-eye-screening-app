"use client";

import type { ConsultSummary } from "@visus/shared";
import Link from "next/link";
import type { ReactNode } from "react";

import { canJoin, fmtDay, fmtTime, fmtUntil, JOIN_FROM_LABEL, languageName, STATUS_LABEL, STATUS_TONE } from "@/lib/consults";

import { cn } from "./cn";
import { Icon } from "./Icon";

/**
 * One consult in a list (doctor, clinic, patient). `title` is whoever the viewer needs to see
 * (the patient for a doctor, the doctor for a patient); `href` opens the consult.
 */
export function ConsultRow({
  c,
  now,
  title,
  sub,
  href,
  first,
  calendar = true,
  actions,
}: {
  c: ConsultSummary;
  now: number;
  title: string;
  sub: string;
  href: string;
  first: boolean;
  calendar?: boolean;
  actions?: ReactNode;
}) {
  const upcoming = c.status === "scheduled" && Date.parse(c.startsAt) > now;
  return (
    <div className={cn("flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:gap-5 md:px-5", !first && "border-t border-divider")}>
      <Link href={href} className="flex min-w-0 flex-1 items-start gap-4 rounded-[12px] outline-offset-4">
        <span className="flex w-[78px] flex-none flex-col">
          <span className="text-[17px] font-bold tabular-nums tracking-[-0.01em]">{fmtTime(c.startsAt)}</span>
          <span className="text-[13px] text-muted">{fmtDay(c.startsAt, now)}</span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[16px] font-semibold">{title}</span>
            <StatusPill status={c.status} />
            {c.kind === "follow_up" && <span className="rounded-full bg-pill px-2 py-0.5 text-[12px] font-semibold text-ink-soft">Follow-up</span>}
          </span>
          <span className="line-clamp-2 text-[14px] leading-snug text-ink-soft">{c.reason}</span>
          <span className="text-[13px] text-muted">
            {sub} · {JOIN_FROM_LABEL[c.joinFrom]} · {languageName(c.language)}
            {c.hasPrescription ? " · Prescription saved" : ""}
          </span>
        </span>
      </Link>
      {upcoming && calendar && <CalendarLinks c={c} className="md:flex-col md:items-end" />}
      {canJoin(c, now) && <span className="self-start rounded-full bg-ink px-3 py-1 text-[13px] font-semibold text-white md:self-center">{fmtUntil(c.startsAt, now)}</span>}
      {actions && <div className="flex flex-wrap gap-2 md:flex-col md:items-end">{actions}</div>}
    </div>
  );
}

export function StatusPill({ status }: { status: ConsultSummary["status"] }) {
  return (
    <span className={cn("flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-semibold", STATUS_TONE[status])}>
      {status === "live" && <span className="size-1.5 animate-pulse rounded-full bg-current" />}
      {STATUS_LABEL[status]}
    </span>
  );
}

/** "Add to Google Calendar" and the .ics download (alarms 1 h and 10 min before). */
export function CalendarLinks({ c, className }: { c: ConsultSummary; className?: string }) {
  const link = "flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-white px-3 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-card-hover hover:text-ink";
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <a href={c.calendar.googleUrl} target="_blank" rel="noopener noreferrer" className={link}>
        <Icon name="calendar" size={15} strokeWidth={2} />
        Google Calendar
      </a>
      <a href={c.calendar.icsUrl} download={`visus-consult-${c.id}.ics`} className={link}>
        <Icon name="download" size={15} strokeWidth={2} />
        .ics file
      </a>
    </div>
  );
}

/** "Join now" from 10 minutes before the start until the slot ends. */
export function JoinBanner({ c, now, title, href, extra }: { c: ConsultSummary; now: number; title: string; href: string; extra?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-[22px] bg-ink px-5 py-5 text-white md:flex-row md:items-center md:px-6">
      <span className="grid size-12 flex-none place-items-center rounded-full bg-white/15">
        <Icon name="camera" size={24} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/70">
          {c.status === "live" ? "Live now" : "Join now"} · {fmtTime(c.startsAt)} ({fmtUntil(c.startsAt, now)})
        </span>
        <span className="text-[19px] font-bold tracking-[-0.01em]">{title}</span>
        <span className="line-clamp-1 text-[14px] text-white/75">{c.reason}</span>
      </span>
      <div className="flex flex-wrap gap-2">
        {extra}
        <Link href={href} className="flex h-12 items-center gap-2 rounded-[14px] bg-white px-5 text-[16px] font-semibold text-ink transition-colors hover:bg-[#F4F4F1]">
          Join call
          <Icon name="arrowRight" size={18} />
        </Link>
      </div>
    </div>
  );
}
