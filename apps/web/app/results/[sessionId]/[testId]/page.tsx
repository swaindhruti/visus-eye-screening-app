"use client";

import { useParams } from "next/navigation";

import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { EyeCompare, ScoreRow, TIPS } from "@/components/ResultParts";
import { Screen, Spacer } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ErrorState, LoadingState } from "@/components/States";
import { PeripheralMap } from "@/tests/PeripheralMap";
import { categoryOf, isTestId, TEST_COPY, testInfo } from "@/lib/tests";
import { useStartCheck } from "@/lib/useStartCheck";
import { useVerdict } from "@/lib/useVerdict";

export default function ResultDetail() {
  const { sessionId, testId } = useParams<{ sessionId: string; testId: string }>();
  const q = useVerdict(sessionId);
  const start = useStartCheck();

  if (q.isPending) return <LoadingState />;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} retrying={q.isFetching} />;
  const result = isTestId(testId) ? q.data.results.find((r) => r.testId === testId) : undefined;
  if (!result || !isTestId(testId)) return <ErrorState title="Result not found" body="This check doesn't have that test." />;

  return (
    <Screen gap="gap-0">
      <ScreenHeader small title={categoryOf(testInfo(testId).category).label} fallback={`/results/${sessionId}`} />
      <h1 className="m-0 mt-4 text-[28px] font-bold leading-[1.15] tracking-[-0.025em]">{TEST_COPY[testId].title}</h1>
      <ScoreRow result={result} />

      <h3 className="m-0 mt-[22px] text-[17px] font-bold">What it means</h3>
      <p className="m-0 mt-1.5 text-[16px] leading-normal text-ink-soft text-pretty">{result.meaning ?? `${result.summary}.`}</p>

      {testId === "peripheral_field" ? <PeripheralMap result={result} /> : <EyeCompare result={result} />}

      <div className="mt-3 flex flex-none gap-3 rounded-[20px] bg-acc-soft px-4 py-3.5">
        <Icon name="sparkle" size={22} color="#194F81" className="mt-px flex-none" />
        <div className="flex flex-col gap-[3px]">
          <span className="text-[14px] font-bold text-acc-ink">Tip</span>
          <span className="text-[15px] leading-[1.45] text-ink-soft text-pretty">{result.tip ?? TIPS[result.status]}</span>
        </div>
      </div>

      <Spacer />
      <div className="grid flex-none grid-cols-2 gap-2.5">
        <Button variant="secondary" disabled={start.isPending} onClick={() => start.mutate({ mode: "single", testId })}>
          Retake test
        </Button>
        <Button href={`/results/${sessionId}`}>Done</Button>
      </div>
    </Screen>
  );
}
