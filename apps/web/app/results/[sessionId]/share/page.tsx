"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { Button } from "@/components/Button";
import { STATUS } from "@/components/Chip";
import { cn } from "@/components/cn";
import { Icon } from "@/components/Icon";
import { Screen, Spacer } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ErrorState, LoadingState } from "@/components/States";
import { fmtFull, useToday } from "@/lib/dates";
import { qrPath } from "@/lib/qr";
import { CATEGORIES } from "@/lib/tests";
import { useVerdict } from "@/lib/useVerdict";
import { listProfiles } from "@/services/profiles";
import { listSessions, shareSession } from "@/services/sessions";
import { useCheck } from "@/store/check";

export default function Share() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const q = useVerdict(sessionId);
  const link = useQuery({ queryKey: ["share", sessionId], queryFn: () => shareSession(sessionId), staleTime: Infinity });
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: listProfiles });
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: listSessions });
  const current = useCheck((s) => s.profileId);
  const profileId = sessions.data?.find((s) => s.id === sessionId)?.profileId ?? current;
  const today = useToday();

  if (q.isPending) return <LoadingState />;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} retrying={q.isFetching} />;
  const v = q.data;
  const who = profiles.data?.find((p) => p.id === profileId) ?? profiles.data?.[0];
  const qr = link.data ? qrPath(link.data.url) : null;
  const notes = v.results.filter((r) => r.status !== "good").slice(0, 3);
  const message = `My Visus eye check report (screening, not diagnosis): ${link.data?.url ?? ""}`;

  return (
    <Screen gap="gap-0">
      <ScreenHeader title="Share report" fallback={`/results/${sessionId}`} />

      <article id="report" className="mt-4 flex flex-none flex-col rounded-[20px] border border-line bg-white p-[18px] shadow-[0_8px_24px_rgba(17,17,17,.06)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] font-bold tracking-[.06em] text-[#8A8A85]">VISUS EYE CHECK REPORT</span>
            <span className="text-[18px] font-bold">{who ? `${who.name}, ${who.age}` : "Eye check"}</span>
          </div>
          <span className="text-right text-[12px] text-muted">
            {v.date ? fmtFull(v.date) : today ? fmtFull(today) : ""}
            <br />
            {v.results.length} {v.results.length === 1 ? "test" : "tests"}
          </span>
        </div>
        <div className="mt-3.5 flex flex-col">
          {CATEGORIES.filter((c) => v.areas[c.id]).map((c) => {
            const s = STATUS[v.areas[c.id]!];
            return (
              <div key={c.id} className="flex h-9 items-center justify-between border-t border-divider text-[14px]">
                <span>{c.label}</span>
                <span className={cn("flex items-center gap-1.5 font-semibold", s.fg)}>
                  <span className={cn("size-1.5 rounded-full", s.dot)} />
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
        {notes.length > 0 && (
          <div className="mt-1.5 flex flex-col gap-1 border-t border-divider pt-3 text-[13px] leading-[1.4] text-ink-soft">
            {notes.map((r) => (
              <span key={r.testId}>{r.summary}</span>
            ))}
          </div>
        )}
        <span className="mt-3 text-[11px] text-[#8A8A85]">Screening, not diagnosis.</span>
      </article>

      <div className="mt-3 flex flex-none items-center gap-4 rounded-[20px] border border-line bg-white p-3.5">
        <div className="grid size-[92px] flex-none place-items-center rounded-[8px] bg-white">
          {qr ? (
            <svg width="92" height="92" viewBox={`-1 -1 ${qr.size + 2} ${qr.size + 2}`} shapeRendering="crispEdges" role="img" aria-label="QR code for the report link">
              <path d={qr.d} fill="#111" />
            </svg>
          ) : (
            <span className="size-6 animate-spin rounded-full border-[3px] border-line-option border-t-ink" />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[16px] font-bold">Show to your doctor</span>
          <span className="text-[13px] leading-[1.45] text-muted text-pretty">They scan it to open the full report. The link expires in 24 hours.</span>
        </div>
      </div>

      <Spacer />
      <div className="flex flex-none flex-col gap-2.5">
        <Button onClick={() => window.print()} leading={<Icon name="download" size={20} />}>
          Download PDF
        </Button>
        <Button
          variant="secondary"
          disabled={!link.data}
          onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener")}
          leading={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1F9D55" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.5 19.5l1.2-3.8A8 8 0 1 1 8.6 18.5z" />
            </svg>
          }
        >
          Share on WhatsApp
        </Button>
      </div>
    </Screen>
  );
}
