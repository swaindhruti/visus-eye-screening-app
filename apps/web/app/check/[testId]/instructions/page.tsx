"use client";

import { INSTRUCTIONS_I18N, WEB_STEPS_I18N } from "@visus/shared";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/Button";
import { CheckGuard } from "@/components/CheckGuard";
import { cn } from "@/components/cn";
import { Icon } from "@/components/Icon";
import { Screen, Spacer } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ErrorState } from "@/components/States";
import { TestPreview } from "@/components/TestArt";
import { isTestId, TEST_COPY, testInfo } from "@/lib/tests";
import { speak, stopSpeaking } from "@/lib/voice";
import { useCheck } from "@/store/check";
import { useSettings } from "@/store/settings";

export default function Instructions() {
  const { testId } = useParams<{ testId: string }>();
  if (!isTestId(testId)) return <ErrorState title="Test not found" body="We couldn't find that test." />;
  return (
    <CheckGuard>
      <InstructionsScreen testId={testId} />
    </CheckGuard>
  );
}

function InstructionsScreen({ testId }: { testId: Parameters<typeof testInfo>[0] }) {
  const t = testInfo(testId);
  const copy = TEST_COPY[testId];
  const plan = useCheck((s) => s.plan);
  const mode = useCheck((s) => s.mode);
  const index = plan.findIndex((p) => p.testId === testId);
  const lang = useSettings((s) => s.lang);
  const talk = useSettings((s) => s.talk);
  const [speaking, setSpeaking] = useState(-1);
  const [reading, setReading] = useState(false);
  const playing = useRef(0); // which read-through is running (0 = none)

  // Hindi and Odia from @visus/shared; English is this app's own wording.
  const i18n = lang === "en" ? null : INSTRUCTIONS_I18N[lang][testId];
  const heading = i18n
    ? [i18n.title, i18n.subtitle]
    : t.kind === "questionnaire"
      ? ["A few quick questions", "Answer honestly. There are no wrong answers."]
      : t.eachEye
        ? ["Cover your left eye", "We'll check your right eye first."]
        : ["Keep both eyes open", "This test uses both eyes together."];
  const steps = lang === "en" ? copy.steps : (WEB_STEPS_I18N[lang][testId] ?? i18n!.steps);
  const tip = i18n ? i18n.tip : "Keep your glasses on for this test. Screen brightness up to full.";

  const stop = () => {
    playing.current = 0;
    stopSpeaking();
    setSpeaking(-1);
    setReading(false);
  };

  /** Reads the heading and each step in the Visus voice, highlighting the step being read. */
  const listen = async () => {
    if (reading) return stop();
    const run = Date.now();
    playing.current = run;
    setReading(true);
    const parts = [`${heading[0]}. ${heading[1]}`, ...steps];
    for (let i = 0; i < parts.length; i++) {
      if (playing.current !== run) return;
      setSpeaking(i - 1);
      await speak(parts[i], lang).done;
    }
    if (playing.current === run) stop();
  };

  // Talk mode: read the instructions as soon as the screen opens.
  useEffect(() => {
    const id = talk ? setTimeout(() => void listen(), 400) : undefined;
    return () => {
      clearTimeout(id);
      playing.current = 0;
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per screen
  }, []);

  return (
    <Screen gap="gap-0">
      <ScreenHeader title={copy.title} right={mode !== "single" && index >= 0 ? `${index + 1} of ${plan.length}` : undefined} fallback="/home" />
      <div className="mt-4 grid h-[200px] flex-none place-items-center rounded-[24px] bg-[repeating-linear-gradient(135deg,#F0F0ED_0_10px,#EAEAE6_10px_20px)]">
        <div className="grid h-[168px] w-[calc(100%-32px)] place-items-center rounded-[18px] bg-white">
          <TestPreview id={testId} />
        </div>
      </div>

      <h1 className="m-0 mt-[22px] text-[28px] font-bold leading-[1.15] tracking-[-0.025em]">{heading[0]}</h1>
      <p className="m-0 mt-1 text-[16px] text-muted">{heading[1]}</p>

      <ol className="m-0 mt-5 flex list-none flex-col gap-3 p-0">
        {steps.map((step, i) => (
          <li key={step} className="flex items-start gap-3">
            <span className={cn("grid size-7 flex-none place-items-center rounded-full text-[14px] font-bold transition-colors duration-300", i === speaking ? "bg-ink text-white" : "bg-acc-soft text-acc-ink")}>{i + 1}</span>
            <span className={cn("pt-[3px] text-[16px] leading-[1.45] transition-colors duration-300 text-pretty", speaking === -1 || i === speaking ? "text-ink" : "text-faint")}>{step}</span>
          </li>
        ))}
      </ol>

      {t.kind === "visual" && (
        <div className="mt-4 flex min-h-11 flex-none items-center gap-2.5 rounded-[14px] border border-line bg-white px-3.5 text-[14px] text-ink-soft">
          <Icon name="glasses" size={18} strokeWidth={1.9} className="flex-none" />
          <span>{tip}</span>
        </div>
      )}

      <Spacer />
      <div className="flex flex-none gap-2.5">
        <button
          type="button"
          onClick={() => void listen()}
          aria-label={reading ? "Stop" : "Listen"}
          className={cn(
            "flex h-btn flex-none items-center gap-2 rounded-[16px] border px-[18px] text-[16px] font-semibold transition-colors duration-200",
            reading ? "border-ink bg-ink text-white" : "border-line-strong bg-white text-ink hover:bg-card-hover",
          )}
        >
          <Icon name={reading ? "stop" : "speaker"} size={20} />
          {reading ? "Stop" : "Listen"}
        </button>
        <Button href={`/check/${testId}/run${mode === "single" ? "?mode=single" : ""}`} className="flex-1" onClick={stop}>
          I&apos;m ready
        </Button>
      </div>
    </Screen>
  );
}
