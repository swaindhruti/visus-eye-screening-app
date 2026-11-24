"use client";

import { LANGUAGE_OPTIONS, type ConsultStatus, type ConsultSummary, type JoinFrom, type Language } from "@visus/shared";
import { useCallback, useSyncExternalStore } from "react";

/** Join opens 10 minutes before the start and stays open until the slot ends (CONSULT.md). */
export const JOIN_EARLY_MIN = 10;

/** The time now, ticking every `everyMs`; null on the server render so pages hydrate the same. */
export function useNow(everyMs = 30_000): number | null {
  const subscribe = useCallback(
    (cb: () => void) => {
      const t = setInterval(cb, everyMs);
      return () => clearInterval(t);
    },
    [everyMs],
  );
  return useSyncExternalStore(subscribe, () => Math.floor(Date.now() / everyMs) * everyMs, () => null);
}

export const canJoin = (c: Pick<ConsultSummary, "startsAt" | "minutes" | "status">, now: number) => {
  const start = Date.parse(c.startsAt);
  return (c.status === "scheduled" || c.status === "live") && now >= start - JOIN_EARLY_MIN * 60_000 && now <= start + c.minutes * 60_000;
};

/** "4:15 pm" */
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });

/** "Today", "Tomorrow", "Yesterday", else "Wed, 25 Nov". */
export function fmtDay(iso: string, now: number) {
  const d = new Date(iso);
  const day = (t: number) => new Date(t).toDateString();
  if (day(d.getTime()) === day(now)) return "Today";
  if (day(d.getTime()) === day(now + 86_400_000)) return "Tomorrow";
  if (day(d.getTime()) === day(now - 86_400_000)) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/** "in 5 min", "started 3 min ago". */
export function fmtUntil(iso: string, now: number) {
  const min = Math.round((Date.parse(iso) - now) / 60_000);
  if (min > 0) return `in ${min} min`;
  if (min === 0) return "now";
  return `started ${-min} min ago`;
}

export const STATUS_LABEL: Record<ConsultStatus, string> = {
  scheduled: "Scheduled",
  live: "Live",
  completed: "Completed",
  missed: "Missed",
  cancelled: "Cancelled",
};

export const STATUS_TONE: Record<ConsultStatus, string> = {
  scheduled: "bg-pill text-ink-soft",
  live: "bg-acc-soft text-acc-ink",
  completed: "bg-good-bg text-good",
  missed: "bg-mild-bg text-mild",
  cancelled: "bg-pill text-muted",
};

export const JOIN_FROM_LABEL: Record<JoinFrom, string> = { home: "From home", clinic: "At the clinic" };

export const languageName = (l: Language) => LANGUAGE_OPTIONS.find((o) => o.code === l)?.name ?? l;

const RETURN_KEY = "visus.doctorReturn";
/** A doctor opening a check (the shared result screens) comes back here when they close it. */
export function setDoctorReturn(path: string) {
  try {
    sessionStorage.setItem(RETURN_KEY, path);
  } catch {}
}
export function doctorReturn(): string | null {
  try {
    return sessionStorage.getItem(RETURN_KEY);
  } catch {
    return null;
  }
}
