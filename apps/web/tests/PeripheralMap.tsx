"use client";

import type { ScoredResult } from "@visus/shared";

import { useCheck } from "@/store/check";

/** 24 test points: 3 rings × 8 directions. Index = ring * 8 + direction (0 = up, clockwise). */
export const FIELD_POINTS = Array.from({ length: 24 }, (_, i) => {
  const ring = Math.floor(i / 8);
  const dir = i % 8;
  const a = ((-90 + dir * 45) * Math.PI) / 180;
  const f = [0.29, 0.58, 0.86][ring];
  return { x: Math.cos(a) * f, y: Math.sin(a) * f };
});

const RINGS = [
  [12, 34],
  [34, 56],
  [56, 78],
];
const pt = (r: number, a: number) => `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
const sector = (ring: number, dir: number) => {
  const [r1, r2] = RINGS[ring];
  const a1 = ((-112.5 + dir * 45) * Math.PI) / 180;
  const a2 = a1 + Math.PI / 4;
  return `M${pt(r2, a1)}A${r2} ${r2} 0 0 1 ${pt(r2, a2)}L${pt(r1, a2)}A${r1} ${r1} 0 0 0 ${pt(r1, a1)}Z`;
};

function FieldSvg({ seen }: { seen?: boolean[] }) {
  return (
    <svg width="150" height="150" viewBox="-80 -80 160 160" className="block" role="img" aria-label={seen ? `${seen.filter(Boolean).length} of 24 seen` : "No field data"}>
      {FIELD_POINTS.map((_, i) => (
        <path key={i} d={sector(Math.floor(i / 8), i % 8)} fill={seen && !seen[i] ? "#111111" : "#EDEDEA"} stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
      ))}
      <circle r="4" fill="#111" />
    </svg>
  );
}

type EyeAnswers = { seen?: boolean[] };

/** Screen 58: what each eye noticed, from the answers this device sent, else the dots the server echoed. */
export function PeripheralMap({ result }: { result?: ScoredResult }) {
  const raw = useCheck((s) => s.answers.peripheral_field) as { right?: EyeAnswers; left?: EyeAnswers } | undefined;
  const fromServer = (side: "left" | "right") => {
    const dots = result?.field?.[side];
    return dots?.length === FIELD_POINTS.length ? dots.map((d) => d.seen) : undefined;
  };
  const eyes = [
    ["Left eye", raw?.left?.seen ?? fromServer("left")],
    ["Right eye", raw?.right?.seen ?? fromServer("right")],
  ] as const;
  return (
    <>
      <h3 className="m-0 mt-[22px] text-[17px] font-bold">Your field map</h3>
      <p className="m-0 mt-1 text-[15px] leading-normal text-muted text-pretty">What each eye noticed around the centre dot.</p>
      <div className="mt-4 grid flex-none grid-cols-2 gap-3">
        {eyes.map(([label, seen]) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <FieldSvg seen={seen} />
            <span className="mt-2.5 text-[16px] font-bold">{label}</span>
            <span className="text-[14px] text-muted">{seen ? `${seen.filter(Boolean).length} of 24 seen` : "Not on this device"}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-none justify-center gap-5 text-[14px] text-ink-soft">
        <span className="flex items-center gap-2">
          <span className="size-3.5 rounded-[4px] bg-[#EDEDEA]" />
          Seen
        </span>
        <span className="flex items-center gap-2">
          <span className="size-3.5 rounded-[4px] bg-ink" />
          Missed
        </span>
      </div>
      <div className="mt-4 flex flex-none items-start gap-3 rounded-[20px] border border-ink px-4 py-3.5">
        <span className="grid size-7 flex-none place-items-center rounded-full bg-ink">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round">
            <path d="M12 10.5v6M12 7.3v.2" />
          </svg>
        </span>
        <span className="pt-[3px] text-[15px] leading-[1.45] text-pretty">Rough screen only; see a doctor for a full field test.</span>
      </div>
    </>
  );
}
