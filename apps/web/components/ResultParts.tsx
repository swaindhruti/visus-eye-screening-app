import type { EyeResult, ScoredResult, Status } from "@visus/shared";

import { perEye } from "@/lib/results";

import { STATUS, StatusBadge } from "./Chip";
import { cn } from "./cn";

export function BigScore({ score }: { score: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[52px] font-bold leading-none tracking-[-0.04em]">{score}</span>
      <span className="text-[16px] text-muted">/ 100</span>
    </div>
  );
}

const BAR: Record<Status, string> = { good: "bg-acc", mild: "bg-mild-dot", see_doctor: "bg-doc-dot" };

/** Per-eye values: the server's `eyes`, else parsed from a "Right eye X, left eye Y" summary. */
function eyeRows(result: ScoredResult): { label: string; eye?: EyeResult; value: string }[] | null {
  if (result.eyes?.left || result.eyes?.right) {
    return (["left", "right"] as const)
      .filter((s) => result.eyes?.[s])
      .map((s) => ({ label: s === "left" ? "Left eye" : "Right eye", eye: result.eyes![s], value: result.eyes![s]!.value }));
  }
  const parsed = perEye(result.summary);
  return parsed
    ? [
        { label: "Left eye", value: parsed.left },
        { label: "Right eye", value: parsed.right },
      ]
    : null;
}

/** "Left vs right" (screens 18 and 48). Hidden when the result has no per-eye values. */
export function EyeCompare({ result, cards }: { result: ScoredResult; cards?: boolean }) {
  const rows = eyeRows(result);
  if (!rows) return null;
  return (
    <>
      <h3 className="m-0 mt-[22px] text-[17px] font-bold">Left vs right</h3>
      {cards ? (
        <div className="mt-2.5 grid flex-none grid-cols-2 gap-2.5">
          {rows.map((r) => (
            <div key={r.label} className="flex flex-col gap-2 rounded-[20px] border border-line bg-white p-3.5">
              <span className="text-[14px] font-semibold text-muted">{r.label}</span>
              <span className="text-[26px] font-bold leading-[1.1] tracking-[-0.03em]">{r.value}</span>
              {r.eye && (
                <>
                  <div className="h-1.5 overflow-hidden rounded-full bg-line">
                    <div className={cn("h-full rounded-full", BAR[r.eye.status])} style={{ width: `${r.eye.score}%` }} />
                  </div>
                  {r.eye.detail && <span className={cn("text-[13px] font-semibold", STATUS[r.eye.status].fg)}>{r.eye.detail}</span>}
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2.5 flex-none rounded-[20px] border border-line bg-white px-4 py-1">
          {rows.map((r, i) => (
            <div key={r.label} className={cn("flex flex-col gap-2 py-3.5", i > 0 && "border-t border-divider")}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[15px] font-semibold">{r.label}</span>
                <span className="text-[15px] font-bold">{r.value}</span>
              </div>
              {r.eye && (
                <div className="h-2 overflow-hidden rounded-full bg-line">
                  <div className={cn("h-full rounded-full", BAR[r.eye.status])} style={{ width: `${r.eye.score}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/** Used when the server sends no `tip`. */
export const TIPS: Record<Status, string> = {
  good: "Nothing to do for now. A quick re-check every few months keeps your record up to date.",
  mild: "Mention this at your next eye test. A small lens update often fixes it.",
  see_doctor: "Book an eye doctor soon and show them this result.",
};

export function ScoreRow({ result }: { result: ScoredResult }) {
  return (
    <div className="mt-3.5 flex flex-none items-end justify-between gap-3">
      <BigScore score={result.score} />
      <StatusBadge status={result.status} className="mb-1 self-end" />
    </div>
  );
}
