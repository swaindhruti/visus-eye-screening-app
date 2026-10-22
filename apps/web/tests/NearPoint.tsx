"use client";

import { useState } from "react";

import { cn } from "@/components/cn";
import { useDistance } from "@/lib/useDistance";

import { TestFrame } from "./TestFrame";
import type { TestProps } from "./types";

/** N5 print, small enough to blur near the near point. */
const LINE_MM = 5 * 0.3528;

/**
 * Screen 28. The user moves the screen closer until the line blurs. With the camera the cm is
 * measured live (lib/useDistance.ts); without it the user enters it after stopping.
 */
export function NearPoint({ eye, pxPerMm, onDone, onExit, onPause }: TestProps) {
  const live = useDistance();
  const [stopped, setStopped] = useState<number | null>(null);
  const [asking, setAsking] = useState(false);
  const [estimate, setEstimate] = useState(20);
  const finished = stopped != null || asking;
  const shown = stopped ?? estimate;
  const cm = stopped ?? live;

  const stop = () => {
    if (live != null) setStopped(Math.round(live));
    else setAsking(true);
  };

  const pos = (((40 - Math.min(40, Math.max(10, cm ?? 40))) / 30) * 100).toFixed(1);

  return (
    <TestFrame title="Near point" eye={eye} progress="Glasses on" onExit={onExit} onPause={onPause}>
      <h1 className="m-0 mt-[18px] flex-none text-[26px] font-bold leading-[1.2] tracking-[-0.025em]">{finished ? "Near point found" : "Bring the screen closer"}</h1>
      <p className="m-0 mt-1.5 flex-none text-[16px] leading-normal text-muted text-pretty">
        {!finished
          ? "Move slowly. Stop when the text starts to blur."
          : live != null
            ? `The text blurred at ${shown} cm for your ${eye} eye.`
            : "How far is the screen now? Measure or estimate the distance."}
      </p>
      <div className="relative mt-4 grid min-h-[160px] flex-1 place-items-center rounded-[24px] border border-line bg-white">
        <span
          className={cn(
            "absolute left-1/2 top-[18px] flex h-10 -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-[18px] font-bold tabular-nums transition-colors duration-[250ms]",
            finished ? "border-ink bg-ink text-white" : "border-line-strong bg-white",
          )}
        >
          <span className={cn("size-2 rounded-full", finished ? "bg-white" : "bg-acc")} />
          {finished ? `${shown} cm` : cm != null ? `${Math.round(cm)} cm` : "Moving…"}
        </span>
        <span className="whitespace-nowrap font-medium" style={{ fontSize: LINE_MM * pxPerMm * 1.4 }}>
          Read this line as you move closer
        </span>
      </div>
      {asking && stopped == null ? (
        <div className="mt-[18px] flex flex-none flex-col gap-2">
          <input type="range" min={5} max={60} value={estimate} onChange={(e) => setEstimate(+e.target.value)} aria-label="Distance in cm" className="h-8 w-full cursor-pointer accent-ink" />
          <div className="flex justify-between text-[12px] text-[#8A8A85]">
            <span>5 cm</span>
            <span>60 cm</span>
          </div>
        </div>
      ) : (
        <>
          <div className="relative mt-[18px] h-2 flex-none rounded-full bg-line">
            <div className="absolute top-1/2 -ml-2.5 -mt-2.5 size-5 rounded-full border-[3px] border-white bg-ink shadow-[0_1px_4px_rgba(0,0,0,.25)] transition-[left] duration-1000 ease-linear" style={{ left: `${pos}%` }} />
          </div>
          <div className="mt-2 flex flex-none justify-between text-[12px] text-[#8A8A85]">
            <span>40 cm</span>
            <span>10 cm</span>
          </div>
        </>
      )}
      <button
        type="button"
        onClick={() => (finished ? onDone({ cm: shown, measured: live != null ? "camera" : "estimate" }) : stop())}
        className="mt-[18px] flex h-[68px] flex-none items-center justify-center gap-2.5 rounded-[18px] bg-ink text-[19px] font-semibold text-white transition-transform active:scale-[.98]"
      >
        {!finished && (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" />
            <path d="M4 4l16 16" />
          </svg>
        )}
        {finished ? "Continue" : "It's blurry now"}
      </button>
      <button
        type="button"
        onClick={() => {
          setStopped(null);
          setAsking(false);
        }}
        className={cn("mt-1 h-11 flex-none text-[15px] font-semibold text-muted", !finished && "invisible")}
      >
        Start over
      </button>
    </TestFrame>
  );
}
