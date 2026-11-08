"use client";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CheckGuard } from "@/components/CheckGuard";
import { Pill } from "@/components/Chip";
import { cn } from "@/components/cn";
import { Icon } from "@/components/Icon";
import { Screen, Spacer } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TEST_COPY, testInfo } from "@/lib/tests";
import { useCheck } from "@/store/check";
import { useSayInTalkMode, VOICE_TEXT } from "@/lib/voice";
import { useSettings } from "@/store/settings";

export default function Plan() {
  return (
    <CheckGuard>
      <PlanScreen />
    </CheckGuard>
  );
}

function PlanScreen() {
  const plan = useCheck((s) => s.plan);
  const summary = useCheck((s) => s.summary);
  const minutes = plan.reduce((n, p) => n + testInfo(p.testId).minutes, 0);
  const lang = useSettings((s) => s.lang);
  useSayInTalkMode(summary ? `${VOICE_TEXT[lang].planned(plan.length, minutes)} ${summary}` : undefined);

  return (
    <Screen gap="gap-0">
      <ScreenHeader title="Your test plan" fallback="/check/intake" />
      <span className="mt-5 text-[14px] font-semibold text-muted">Picked for you</span>
      <h1 className="m-0 mt-1 text-[28px] font-bold leading-[1.15] tracking-[-0.025em]">
        {plan.length} {plan.length === 1 ? "test" : "tests"} · about {minutes} min
      </h1>
      {summary && <p className="m-0 mt-2 text-[16px] leading-normal text-muted text-pretty">{summary}</p>}

      <Card flush className="mt-5 flex-none">
        {plan.map((p, i) => (
          <div key={p.testId} className={cn("flex min-h-[70px] items-center gap-3.5 px-4 py-3", i > 0 && "border-t border-divider")}>
            <span className="grid size-8 flex-none place-items-center rounded-full bg-acc-soft text-[14px] font-bold text-acc-ink">{i + 1}</span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[16px] font-semibold">{TEST_COPY[p.testId].title}</span>
              <span className="text-[13px] text-muted">{p.reason}</span>
            </span>
            <span className="flex-none text-[13px] font-semibold text-ink-soft">{testInfo(p.testId).minutes} min</span>
          </div>
        ))}
      </Card>

      <span className="mt-5 text-[14px] font-semibold text-muted">Before you start</span>
      <div className="mt-2 flex flex-none flex-wrap gap-2">
        <Pill className="h-9" label="Good light" leading={<Icon name="sun" size={16} />} />
        <Pill className="h-9" label="Arm's length" leading={<Icon name="ruler" size={16} />} />
        <Pill className="h-9" label="Your glasses" leading={<Icon name="glasses" size={16} />} />
        <Pill className="h-9" label="Full brightness" leading={<Icon name="bolt" size={16} />} />
      </div>

      <Spacer />
      <Button href="/check/calibrate" arrow>
        Begin
      </Button>
      <Button href="/tests" variant="ghost" className="mt-1">
        Choose tests myself
      </Button>
    </Screen>
  );
}
