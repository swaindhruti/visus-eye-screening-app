"use client";

import type { ConsultTest, Eye } from "@visus/shared";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/Button";
import { CardMatch } from "@/components/CardMatch";
import { Icon } from "@/components/Icon";
import { TEST_COPY, testInfo } from "@/lib/tests";
import { submitConsultTest } from "@/services/consults";
import { useCalibration } from "@/store/calibration";
import { TESTS } from "@/tests";
import { SwitchEye } from "@/tests/Overlays";
import { COVER_LABEL, EYE_LABEL, type Answers } from "@/tests/types";

type Phase = "calibrate" | "ready" | "test" | "switch";

/**
 * A test the doctor sent, full screen on the patient's (or the clinic's) device with the normal test
 * component: clinical white page, sizes from the calibration (set up first on a device that has none).
 * One-eye-at-a-time tests run right then left when the doctor asked for both eyes. Raw answers only:
 * the server scores them and the doctor sees the result card.
 */
export function LiveTest({ consultId, test, doctorName, onClose }: { consultId: string; test: ConsultTest; doctorName: string; onClose: () => void }) {
  const info = testInfo(test.testId);
  const Test = TESTS[test.testId];
  const copy = TEST_COPY[test.testId];
  const pxPerMm = useCalibration((s) => s.pxPerMm);
  const calibrated = useCalibration((s) => s.calibrated);
  const eyes: Eye[] = info.eachEye && test.eye === "both" ? ["right", "left"] : info.eachEye ? [test.eye] : ["both"];
  const [phase, setPhase] = useState<Phase>(calibrated ? "ready" : "calibrate");
  const [eyeIndex, setEyeIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const answers = useRef<Partial<Record<Eye, Answers>>>({});
  const started = useRef(0);
  const eye = eyes[eyeIndex];

  const send = useMutation({
    mutationFn: () => {
      const a = answers.current;
      return submitConsultTest(consultId, test.id, {
        testId: test.testId,
        eye: eyes.length === 2 ? "both" : eyes[0],
        // false = sizes use the default pixels-per-mm guess; the server notes it on acuity.
        answers: { ...(info.eachEye ? Object.fromEntries(eyes.map((e) => [e, a[e]])) : a.both), calibrated },
        durationSec: Math.round((Date.now() - started.current) / 1000),
      });
    },
  });

  // "Sent to your doctor" for a moment, then back to the call.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    if (!send.isSuccess) return;
    const t = setTimeout(() => close.current(), 1500);
    return () => clearTimeout(t);
  }, [send.isSuccess]);

  const onDone = (a: Answers) => {
    answers.current[eye] = a;
    if (eyeIndex < eyes.length - 1) {
      setEyeIndex(eyeIndex + 1);
      setPhase("switch");
    } else send.mutate();
  };

  if (send.isPending || send.isSuccess || send.isError)
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        {send.isSuccess ? (
          <span className="grid size-16 place-items-center rounded-full bg-good-bg text-good">
            <Icon name="checkLg" size={30} strokeWidth={2.2} />
          </span>
        ) : (
          !send.isError && <span className="size-10 animate-spin rounded-full border-[3px] border-line border-t-ink" aria-hidden />
        )}
        <p className="m-0 text-[20px] font-semibold">{send.isSuccess ? `Sent to ${doctorName}` : send.isError ? "Couldn't send your answers" : "Sending your answers…"}</p>
        {send.isError && (
          <>
            <p className="m-0 max-w-[340px] text-[15px] text-muted">{send.error.message}</p>
            <Button onClick={() => send.mutate()}>Try again</Button>
          </>
        )}
      </div>
    );

  if (phase === "calibrate")
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-5 pb-8 pt-6">
        <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-faint">Screen setup for {copy.title}</span>
        <CardMatch
          footer={(px) => (
            <div className="mt-auto flex flex-col gap-2 pt-8">
              <Button
                onClick={() => {
                  useCalibration.getState().setPxPerMm(px);
                  setPhase("ready");
                }}
              >
                Done
              </Button>
              <button type="button" onClick={onClose} className="h-11 text-[15px] font-semibold text-muted hover:text-ink">
                Back to the call
              </button>
            </div>
          )}
        />
      </div>
    );

  if (phase === "ready")
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-5 pb-8 pt-10">
        <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-faint">{doctorName} sent a test</span>
        <h1 className="m-0 mt-2 text-[30px] font-bold tracking-[-0.025em]">{copy.title}</h1>
        <span className="mt-1 text-[16px] text-muted">
          {copy.subtitle} · {test.eye === "both" && info.eachEye ? "Right eye, then left eye" : EYE_LABEL[eyes[0]]}
        </span>
        <ol className="m-0 mt-6 flex list-none flex-col gap-3 p-0">
          {copy.steps.map((s, i) => (
            <li key={s} className="flex gap-3 text-[16px] leading-normal">
              <span className="grid size-7 flex-none place-items-center rounded-full bg-fill text-[13px] font-bold">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        {info.eachEye && <p className="m-0 mt-5 rounded-[14px] bg-fill px-4 py-3 text-[15px] font-semibold">First: {COVER_LABEL[eyes[0]].toLowerCase()}.</p>}
        <p className="m-0 mt-4 text-[14px] text-muted">Turn the screen brightness up to full. The doctor can still hear you.</p>
        <div className="mt-auto flex flex-col gap-2 pt-8">
          <Button
            onClick={() => {
              started.current = Date.now();
              setPhase("test");
            }}
          >
            Start the test
          </Button>
          <button type="button" onClick={onClose} className="h-11 text-[15px] font-semibold text-muted hover:text-ink">
            Back to the call
          </button>
        </div>
      </div>
    );

  if (phase === "switch") return <SwitchEye title={copy.title} onExit={onClose} onReady={() => setPhase("test")} />;

  return (
    <div className="relative min-h-dvh bg-white">
      <Test key={eye} eye={eye} pxPerMm={pxPerMm} paused={paused} onDone={onDone} onExit={onClose} onPause={() => setPaused(true)} />
      {paused && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-5">
          <div className="flex w-full max-w-[380px] flex-col gap-3 rounded-[24px] bg-white p-6">
            <h2 className="m-0 text-[21px] font-bold">Paused</h2>
            <Button onClick={() => setPaused(false)}>Resume</Button>
            <button type="button" onClick={onClose} className="h-11 text-[15px] font-semibold text-muted hover:text-ink">
              Back to the call
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
