"use client";

import { useEffect, useRef } from "react";

import { distanceState, type DistanceState } from "@/lib/useDistance";

import { cn } from "./cn";

const MIN_CM = 15;
const RANGE_CM = 60;
const at = (cm: number) => `${Math.min(100, Math.max(0, ((cm - MIN_CM) / RANGE_CM) * 100)).toFixed(1)}%`;

const MESSAGE: Record<DistanceState, [string, string]> = {
  none: ["Looking for your face", "bg-pill text-ink-soft"],
  close: ["Move back a little", "bg-mild-bg text-mild"],
  far: ["Move a bit closer", "bg-mild-bg text-mild"],
  ok: ["Perfect, hold still", "bg-good-bg text-good"],
};

/**
 * Camera card + distance gauge, shared by Distance setup (12) and Distance warning (47).
 * `stream`: live preview (Distance setup); without it the card stays dark. `off`: no camera.
 */
export function DistancePanel({ cm, target, stream, off }: { cm: number | null; target: number; stream?: MediaStream | null; off?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const state = distanceState(cm, target);
  const [message, pill] = off ? ["Camera is off", "bg-mild-bg text-mild"] : MESSAGE[state];
  // The ring grows when you're too close and shrinks when you're too far.
  const scale = cm === null ? 1 : Math.min(1.35, Math.max(0.62, target / cm));

  useEffect(() => {
    if (video.current && video.current.srcObject !== (stream ?? null)) video.current.srcObject = stream ?? null;
  }, [stream]);

  return (
    <>
      <div className="relative mt-4 h-[390px] max-h-[48dvh] min-h-[220px] flex-none overflow-hidden rounded-[28px] bg-[#1F1F1E]">
        {stream && <video ref={video} autoPlay playsInline muted className="absolute inset-0 size-full -scale-x-100 object-cover" />}
        <div className="absolute left-1/2 top-[52%] h-[250px] max-h-[64%] w-[190px] max-w-[48%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-dashed border-white/40" />
        {!off && (
          <div
            className={cn("absolute left-1/2 top-[52%] h-[232px] max-h-[60%] w-[176px] max-w-[45%] rounded-[50%] border-[2.5px] transition-[transform,border-color] duration-300", state === "ok" ? "border-[#5FD08F]" : "border-white")}
            style={{ transform: `translate(-50%,-50%) scale(${scale.toFixed(3)})` }}
          />
        )}
        <div className={cn("absolute left-1/2 top-4 flex h-9 -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-[15px] font-semibold", pill)}>
          <span className="size-[7px] rounded-full bg-current" />
          {message}
        </div>
        <div className="absolute bottom-3.5 left-4 flex items-center gap-1.5 text-[12px] font-semibold text-white/65">
          <span className="size-1.5 rounded-full bg-white/65" />
          Front camera
        </div>
      </div>

      <div className="mt-5 flex flex-none items-baseline justify-between gap-3">
        <span className="text-[34px] font-bold leading-none tracking-[-0.03em] tabular-nums">{cm === null ? `~${target} cm` : `${cm} cm`}</span>
        <span className="text-[14px] text-muted">
          Aim for {target - 5}–{target + 5} cm
        </span>
      </div>
      <div className="relative mt-4 h-2 flex-none rounded-full bg-line">
        <div className="absolute inset-y-0 rounded-full bg-[#BFE3CC]" style={{ left: at(target - 5), width: `${((10 / RANGE_CM) * 100).toFixed(1)}%` }} />
        {cm !== null && (
          <div className="absolute top-1/2 -ml-2.5 -mt-2.5 size-5 rounded-full border-[3px] border-white bg-ink shadow-[0_1px_4px_rgba(0,0,0,.25)] transition-[left] duration-300" style={{ left: at(cm) }} />
        )}
      </div>
      <div className="mt-2 flex flex-none justify-between text-[12px] text-[#8A8A85]">
        <span>Closer</span>
        <span>Further</span>
      </div>
    </>
  );
}
