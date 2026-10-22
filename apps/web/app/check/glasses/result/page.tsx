"use client";

import { Button } from "@/components/Button";
import { CheckGuard } from "@/components/CheckGuard";
import { cn } from "@/components/cn";
import { Icon } from "@/components/Icon";
import { Screen, Spacer } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { perEye } from "@/lib/results";
import { useCheck } from "@/store/check";

/** "20/40" → bar width in %. Display only: 20/20 fills the bar. */
const width = (snellen: string) => {
  const [a, b] = snellen.split("/").map(Number);
  return a && b ? Math.min(100, Math.round((a / b) * 100)) : 0;
};

export default function GlassesResult() {
  return (
    <CheckGuard>
      <GlassesResultScreen />
    </CheckGuard>
  );
}

/** Screen 61: round 1 (results[0], glasses off) against round 2 (results[1], glasses on). */
function GlassesResultScreen() {
  const { results, sessionId } = useCheck();
  const [off, on] = results;
  if (!off || !on) return <Screen />;
  const good = on.status === "good";
  const value = (r: typeof on, side: "left" | "right") => r.eyes?.[side]?.value ?? perEye(r.summary)?.[side] ?? "—";
  const rows = (["left", "right"] as const).map((side) => ({ eye: side === "left" ? "Left eye" : "Right eye", wo: value(off, side), wi: value(on, side) }));

  return (
    <Screen gap="gap-0">
      <ScreenHeader title="Glasses check" fallback="/check/glasses" />
      <span className={cn("mt-5 grid size-14 flex-none place-items-center rounded-full", good ? "bg-good-bg text-good" : "bg-mild-bg text-mild")}>
        {good ? (
          <Icon name="checkLg" size={26} strokeWidth={2.4} />
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
            <path d="M12 6.5v7M12 17.3v.2" />
          </svg>
        )}
      </span>
      <h1 className="m-0 mt-4 text-[28px] font-bold leading-[1.15] tracking-[-0.025em] text-balance">{good ? "Your glasses still work well" : "Your glasses may need an update"}</h1>
      <p className="m-0 mt-2 text-[16px] leading-normal text-muted text-pretty">
        {good ? "Both eyes see much sharper with them on. No update needed for now." : "One eye still isn't fully sharp with them on. An optician can check the lens."}
      </p>

      {rows.length > 0 && (
        <>
          <h3 className="m-0 mt-[22px] text-[17px] font-bold">Without vs with glasses</h3>
          <div className="mt-2.5 flex-none rounded-[20px] border border-line bg-white px-4 py-0.5">
            {rows.map((e, i) => (
              <div key={e.eye} className={cn("flex flex-col gap-2.5 py-3.5", i > 0 && "border-t border-divider")}>
                <span className="text-[16px] font-bold">{e.eye}</span>
                {[
                  ["Without", e.wo, "#BDBDB8", false],
                  ["With", e.wi, width(e.wi) >= 80 ? "#3C7EBE" : "#C98A1B", true],
                ].map(([label, v, color, strong]) => (
                  <div key={label as string} className="grid grid-cols-[64px_minmax(0,1fr)_48px] items-center gap-2.5 text-[14px]">
                    <span className={strong ? "font-semibold" : "text-muted"}>{label as string}</span>
                    <div className="h-2 overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full transition-[width] duration-400" style={{ width: `${width(v as string)}%`, background: color as string }} />
                    </div>
                    <span className={cn("text-right", strong ? "font-bold" : "font-semibold text-muted")}>{v as string}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p className="m-0 mx-1 mt-2.5 text-[13px] text-muted">20/20 is typical sharp vision.</p>
        </>
      )}

      <Spacer />
      <Button href={`/results/${sessionId}/lens`}>See lens suggestions</Button>
      <Button href="/home" variant="ghost" className="mt-1">
        Done
      </Button>
    </Screen>
  );
}
