"use client";

import type { Eye, NextStep, TestId } from "@visus/shared";
import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { CheckGuard } from "@/components/CheckGuard";
import { ErrorState, LoadingState } from "@/components/States";
import { isTestId, TEST_COPY, testInfo } from "@/lib/tests";
import { distanceOk, TEST_DISTANCE_CM, useDistance } from "@/lib/useDistance";
import { useGuest } from "@/lib/useGuest";
import { submitResult } from "@/services/sessions";
import { useCalibration } from "@/store/calibration";
import { useCheck } from "@/store/check";
import { TESTS } from "@/tests";
import { DistanceWarning, ExitDialog, GlassesOn, PauseSheet, SwitchEye } from "@/tests/Overlays";
import { EYE_LABEL, type Answers } from "@/tests/types";

export default function Run() {
  const { testId } = useParams<{ testId: string }>();
  // Next keeps visited pages alive and can bring this one back with its old state (e.g. "answers sent"
  // from the last try). A new check (Retake starts one) gets a fresh run screen.
  const startedAt = useCheck((s) => s.startedAt);
  if (!isTestId(testId)) return <ErrorState title="Test not found" body="We couldn't find that test." />;
  return (
    <CheckGuard>
      <RunScreen key={`${testId}-${startedAt}`} testId={testId} />
    </CheckGuard>
  );
}

type Phase = "test" | "switch" | "glasses-on";

function RunScreen({ testId }: { testId: TestId }) {
  const router = useRouter();
  const Test = TESTS[testId];
  const info = testInfo(testId);
  const pxPerMm = useCalibration((s) => s.pxPerMm);
  const calibrated = useCalibration((s) => s.calibrated);
  const { sessionId, mode, plan, done } = useCheck();

  const [eye, setEye] = useState<Eye>(info.eachEye ? "right" : "both");
  const [phase, setPhase] = useState<Phase>("test");
  const [overlay, setOverlay] = useState<"pause" | "exit" | null>(null);
  const [attempt, setAttempt] = useState(0);
  // Distance warning (47): too close / too far for 1.5 s pauses the test until the user resumes.
  const target = TEST_DISTANCE_CM[testId];
  const [offDistance, setOffDistance] = useState(false);
  const cm = useDistance(target !== undefined && phase === "test");
  // No face (a hand over one eye, looking away) is not a reason to stop.
  const out = target !== undefined && phase === "test" && overlay === null && cm !== null && !distanceOk(cm, target);
  useEffect(() => {
    if (!out || offDistance) return;
    const t = setTimeout(() => setOffDistance(true), 1500);
    return () => clearTimeout(t);
  }, [out, offDistance]);
  const glasses = mode === "glasses";
  const guest = useGuest();
  const [round, setRound] = useState(0);
  const perEye = useRef<Partial<Record<Eye, Answers>>>({});
  const started = useRef(0);

  useEffect(() => {
    started.current = Date.now();
  }, [attempt]);

  // Escape pauses, as on a phone's back gesture.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOverlay((o) => (o ? null : "pause"));
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const send: UseMutationResult<NextStep, Error, Answers> = useMutation({
    mutationFn: (answers: Answers) =>
      submitResult(sessionId!, {
        testId,
        eye: "both",
        // false = sizes use the default pixels-per-mm guess; the server notes it on acuity.
        answers: { ...answers, calibrated },
        durationSec: Math.round((Date.now() - started.current) / 1000),
      }),
    onSuccess: (step, answers) => {
      useCheck.getState().saveAnswers(testId, answers);
      useCheck.getState().recordStep(step);
      // Glasses check: round 1 (glasses off) is saved; the same test runs again with glasses on.
      if (glasses && answers.round === "glasses_off") {
        perEye.current = {};
        setRound(1);
        setEye("right");
        setPhase("glasses-on");
        return send.reset();
      }
      if (step.type === "red_flag") return router.replace("/check/red-flag");
      if (mode === "single") return router.replace(`/tests/${testId}/done`);
      if (glasses) return router.replace("/check/glasses/result");
      router.replace(step.type === "next_test" ? "/check/next" : "/check/analysing");
    },
  });

  const onDone = (answers: Answers) => {
    if (!info.eachEye) return send.mutate(answers);
    perEye.current[eye] = answers;
    if (eye === "right") return setPhase("switch");
    const both = { right: perEye.current.right, left: perEye.current.left };
    // Glasses check: one result per round, like the mobile app (docs/API.md → Check modes).
    send.mutate(glasses ? { ...both, round: round === 0 ? "glasses_off" : "glasses_on" } : both);
  };

  const restart = () => {
    perEye.current = {};
    setRound(0);
    setEye(info.eachEye ? "right" : "both");
    setPhase("test");
    setOverlay(null);
    setAttempt((n) => n + 1);
  };

  if (send.isPending || send.isSuccess) return <LoadingState label={guest ? "Checking your answers…" : "Saving your answers…"} />;
  if (send.isError)
    return <ErrorState title="Couldn't save your answers" body="Check your connection and try again. Your answers are kept." onRetry={() => send.mutate(send.variables!)} />;

  return (
    <div className="relative min-h-dvh">
      {phase === "glasses-on" ? (
        <GlassesOn
          onReady={() => {
            started.current = Date.now();
            perEye.current = {};
            setRound(1);
            setEye("right");
            setPhase("test");
          }}
        />
      ) : phase === "switch" ? (
        <SwitchEye
          title={TEST_COPY[testId].title}
          onExit={() => setOverlay("exit")}
          onReady={() => {
            setEye("left");
            setPhase("test");
          }}
        />
      ) : (
        <Test
          key={`${attempt}-${round}-${eye}`}
          eye={eye}
          pxPerMm={pxPerMm}
          paused={overlay !== null || offDistance}
          onDone={onDone}
          onExit={() => setOverlay("exit")}
          onPause={() => setOverlay("pause")}
        />
      )}
      {offDistance && overlay === null && target !== undefined && (
        <DistanceWarning title={TEST_COPY[testId].title} cm={cm} target={target} onResume={() => setOffDistance(false)} onExit={() => setOverlay("exit")} />
      )}
      {overlay === "pause" && (
        <PauseSheet
          subtitle={`${TEST_COPY[testId].title} · ${EYE_LABEL[eye]}`}
          onResume={() => setOverlay(null)}
          onRestart={restart}
          onExit={() => setOverlay("exit")}
        />
      )}
      {overlay === "exit" && (
        <ExitDialog
          finished={done.length}
          total={mode === "single" ? 1 : plan.length}
          onStay={() => setOverlay(null)}
          onLeave={() => router.replace(mode === "single" ? `/tests/${testId}` : "/home")}
        />
      )}
    </div>
  );
}
