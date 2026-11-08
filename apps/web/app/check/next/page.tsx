"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { CheckGuard } from "@/components/CheckGuard";
import { StatusBadge } from "@/components/Chip";
import { cn } from "@/components/cn";
import { Screen, Spacer } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { perEye } from "@/lib/results";
import { TEST_COPY, testInfo } from "@/lib/tests";
import { useCheck } from "@/store/check";
import { useSayInTalkMode } from "@/lib/voice";

export default function Next() {
  return (
    <CheckGuard>
      <NextScreen />
    </CheckGuard>
  );
}

function NextScreen() {
  const { lastStep, plan, done } = useCheck();
  const [rest, setRest] = useState(0);
  // Talk mode: say what comes next (the reason is written in the chosen language).
  useSayInTalkMode(lastStep?.type === "next_test" ? lastStep.reason : undefined);

  useEffect(() => {
    if (!rest) return;
    const t = setTimeout(() => setRest(rest - 1), 1000);
    return () => clearTimeout(t);
  }, [rest]);

  if (!lastStep || lastStep.type !== "next_test") {
    return (
      <Screen>
        <ScreenHeader left="close" title="Eye check" fallback="/home" />
        <p className="text-muted">Nothing to show yet.</p>
        <Button href="/home">Go to Home</Button>
      </Screen>
    );
  }

  const { result, testId, reason, added } = lastStep;
  const eyes = perEye(result.summary);
  const total = plan.length;

  return (
    <Screen gap="gap-0">
      <ScreenHeader left="close" leftLabel="Exit check" title="Eye check" right={`${done.length} of ${total}`} fallback="/home" />
      <div className="mt-3.5 grid flex-none gap-1.5" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }} aria-hidden>
        {plan.map((p) => (
          <span key={p.testId} className={cn("h-1.5 rounded-full", done.includes(p.testId) ? "bg-ink" : "bg-line-option")} />
        ))}
      </div>

      <span className="mt-[26px] text-[14px] font-semibold text-muted">Test {done.length} done</span>
      <h1 className="m-0 mt-1 text-[28px] font-bold leading-[1.15] tracking-[-0.025em]">{TEST_COPY[result.testId].title}</h1>

      <div className="mt-[18px] flex flex-none flex-col gap-3.5 rounded-[20px] border border-line bg-white p-4">
        {eyes ? (
          <div className="grid grid-cols-2 gap-3">
            {(["right", "left"] as const).map((e, i) => (
              <div key={e} className={cn("flex flex-col gap-1", i === 1 && "border-l border-divider pl-3")}>
                <span className="text-[13px] font-semibold text-muted">{e === "right" ? "Right eye" : "Left eye"}</span>
                <span className="text-[26px] font-bold leading-[1.1] tracking-[-0.02em]">{eyes[e]}</span>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-[22px] font-bold leading-[1.2] tracking-[-0.02em]">{result.summary}</span>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-divider pt-3">
          <span className="text-[15px] text-ink-soft">Score {result.score} / 100</span>
          <StatusBadge status={result.status} />
        </div>
      </div>

      <div className="mt-3 flex flex-none flex-col gap-1.5 rounded-[20px] bg-acc-soft p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-bold text-acc-ink">Next we&apos;ll check</span>
          {added && <span className="flex h-6 items-center rounded-full bg-white px-2.5 text-[12px] font-semibold text-acc-ink">Added to plan</span>}
        </div>
        <span className="text-[20px] font-bold tracking-[-0.01em]">
          {TEST_COPY[testId].title} · {testInfo(testId).minutes} min
        </span>
        <p className="m-0 text-[15px] leading-[1.45] text-ink-soft text-pretty">{reason}</p>
      </div>

      <Spacer />
      <Button href={`/check/${testId}/instructions`} arrow disabled={rest > 0}>
        Continue
      </Button>
      <Button variant="ghost" className="mt-1" onClick={() => setRest(rest ? 0 : 20)}>
        {rest ? `Look far away… ${rest}s (tap to skip)` : "Rest my eyes for 20 seconds"}
      </Button>
    </Screen>
  );
}
