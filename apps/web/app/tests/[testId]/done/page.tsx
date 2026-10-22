"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/Chip";
import { Icon } from "@/components/Icon";
import { BigScore, EyeCompare } from "@/components/ResultParts";
import { Screen, Spacer } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ErrorState } from "@/components/States";
import { categoryOf, isTestId, TEST_COPY, testInfo } from "@/lib/tests";
import { useGuest } from "@/lib/useGuest";
import { useStartCheck } from "@/lib/useStartCheck";
import { useCheck } from "@/store/check";
import { useHydrated } from "@/store/hydrated";
import { PeripheralMap } from "@/tests/PeripheralMap";

export default function SingleDone() {
  const { testId } = useParams<{ testId: string }>();
  const hydrated = useHydrated();
  const result = useCheck((s) => s.results.find((r) => r.testId === testId));
  const start = useStartCheck();
  const guest = useGuest();

  if (!hydrated) return <Screen />;
  if (!isTestId(testId) || !result) return <ErrorState title="No result yet" body="Take the test to see your result here." />;

  return (
    <Screen gap="gap-0">
      <ScreenHeader left="close" small title={categoryOf(testInfo(testId).category).label} fallback="/tests" />
      <div className="mt-[18px] flex flex-none items-center gap-2">
        <span className="grid size-7 place-items-center rounded-full bg-acc-soft text-acc-ink">
          <Icon name="check" size={14} strokeWidth={2.4} />
        </span>
        <span className="text-[14px] font-semibold text-muted">Test complete</span>
      </div>
      <h1 className="m-0 mt-2 text-[28px] font-bold leading-[1.15] tracking-[-0.025em]">{TEST_COPY[testId].title}</h1>

      <div className="mt-4 flex flex-none items-end justify-between gap-3 rounded-[20px] border border-line bg-white p-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[14px] font-semibold text-muted">Your score</span>
          <BigScore score={result.score} />
        </div>
        <StatusBadge status={result.status} className="mb-1.5 self-end" />
      </div>

      {testId === "peripheral_field" ? <PeripheralMap result={result} /> : <EyeCompare result={result} cards />}
      <p className="m-0 mt-4 text-[16px] leading-normal text-ink-soft text-pretty">{result.meaning ?? `${result.summary}.`}</p>

      <Spacer />
      <div className="mb-3 flex flex-none items-center justify-center gap-2 text-[13px] text-muted">
        {guest ? (
          <span className="text-center text-pretty">
            Guest mode: this result disappears when you close the tab.{" "}
            <Link href="/signup" className="font-semibold text-ink underline-offset-2 hover:underline">
              Sign up
            </Link>{" "}
            to keep it.
          </span>
        ) : (
          <>
            <Icon name="checkLg" size={16} />
            <span>Saved to Results</span>
          </>
        )}
      </div>
      <div className="grid flex-none grid-cols-2 gap-2.5">
        <Button variant="secondary" disabled={start.isPending} onClick={() => start.mutate({ mode: "single", testId })}>
          Retake
        </Button>
        <Button href="/tests">Done</Button>
      </div>
    </Screen>
  );
}
