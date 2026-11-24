"use client";

import { useState } from "react";

import { CARD_MM, useCalibration } from "@/store/calibration";

import { Icon } from "./Icon";

const MIN = 150;
const MAX = 380;

/**
 * Screen-size setup: match a bank card's outline on screen (its short edge, 53.98 mm, since on most
 * phones a landscape card is wider than the screen). `footer` gets the pixels per mm for its Done button.
 * Used by the check flow and by a live test in a consult on a device that hasn't been set up.
 */
export function CardMatch({ footer }: { footer: (pxPerMm: number) => React.ReactNode }) {
  const saved = useCalibration((s) => s.pxPerMm);
  const [w, setW] = useState(() => Math.round(Math.min(MAX, Math.max(MIN, saved * CARD_MM.h))));
  const h = Math.round((w * CARD_MM.w) / CARD_MM.h);

  return (
    <>
      <h1 className="m-0 mt-6 text-[28px] font-bold leading-[1.15] tracking-[-0.025em]">Match a bank card</h1>
      <p className="m-0 mt-2 text-[16px] leading-normal text-muted text-pretty">
        Hold any bank card upright against the screen, short edge at the top. Drag the slider until the outline lines up with its edges.
      </p>

      <div className="relative mt-6 flex h-[236px] flex-none justify-center overflow-hidden rounded-[24px] border border-line bg-white">
        <div className="absolute top-5 rounded-[12px] border-2 border-ink transition-[width,height] duration-75 ease-linear" style={{ width: w, height: h }}>
          <span className="absolute left-[30%] top-[9%] w-[20%] rounded-[4px] border-[1.5px] border-[#BDBDB8]" style={{ height: w * 0.13 }} />
          <span className="absolute bottom-[58%] left-[9%] h-1.5 w-[58%] rounded-[3px] bg-line" />
          <span className="absolute bottom-[54%] left-[9%] h-1.5 w-[30%] rounded-[3px] bg-line" />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-white/0" />
      </div>

      <div className="mt-6 flex flex-none items-center gap-3">
        <button type="button" aria-label="Smaller" onClick={() => setW(Math.max(MIN, w - 1))} className="grid size-11 flex-none place-items-center rounded-full border border-line-strong bg-white hover:bg-card-hover active:scale-[.94]">
          <Icon name="minus" size={18} />
        </button>
        <input type="range" min={MIN} max={MAX} step={1} value={w} onChange={(e) => setW(+e.target.value)} aria-label="Card size" className="h-11 min-w-0 flex-1 cursor-pointer accent-ink" />
        <button type="button" aria-label="Larger" onClick={() => setW(Math.min(MAX, w + 1))} className="grid size-11 flex-none place-items-center rounded-full border border-line-strong bg-white hover:bg-card-hover active:scale-[.94]">
          <Icon name="plusSm" size={18} />
        </button>
      </div>
      <div className="mt-0.5 flex flex-none justify-between px-14 text-[12px] text-[#8A8A85]">
        <span>Smaller</span>
        <span>Larger</span>
      </div>
      {footer(w / CARD_MM.h)}
    </>
  );
}
