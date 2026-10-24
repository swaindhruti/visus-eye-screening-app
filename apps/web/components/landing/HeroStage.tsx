"use client";

import { useEffect, useRef } from "react";

import { cn } from "../cn";
import { Iris } from "./Iris";

// Label, angle on the ring (0° = right, negative = up), shown on phones too.
const CHIPS: [string, number, boolean][] = [
  ["Sharpness", -100, true],
  ["Focus", -62, true],
  ["Contrast", -26, false],
  ["Colour", 10, false],
  ["Amsler grid", 46, false],
  ["Kids mode", 82, false],
];

const f2 = (n: number) => +n.toFixed(2);
const TICKS = Array.from({ length: 120 }, (_, i) => {
  const a = (i / 120) * Math.PI * 2;
  const r2 = i % 10 === 0 ? 160 : 166;
  return { x1: f2(170 * Math.cos(a)), y1: f2(170 * Math.sin(a)), x2: f2(r2 * Math.cos(a)), y2: f2(r2 * Math.sin(a)) };
});

/**
 * Hero picture: rings, iris and chips on separate depth layers inside a 3D stage.
 * The stage tilts towards the pointer (eased), so the layers slide past each other.
 */
export function HeroStage() {
  const tilt = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
    let x = 0,
      y = 0,
      tx = 0,
      ty = 0,
      raf = 0;
    const tick = () => {
      x += (tx - x) * 0.06;
      y += (ty - y) * 0.06;
      tilt.current?.style.setProperty("transform", `rotateX(${(-y * 10).toFixed(2)}deg) rotateY(${(x * 14).toFixed(2)}deg)`);
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.001 ? requestAnimationFrame(tick) : 0;
    };
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="size-full [perspective:1400px]">
      <div ref={tilt} className="relative size-full [transform-style:preserve-3d]">
        {/* Back layer: orbit rings that draw themselves in, and a slow dial of tick marks. */}
        <svg viewBox="-200 -200 400 400" className="absolute inset-0 size-full [transform:translateZ(-90px)]" aria-hidden fill="none">
          <circle r="196" stroke="white" strokeOpacity="0.14" pathLength={1} strokeDasharray="1" className="animate-draw [animation-delay:600ms]" />
          <circle r="186" stroke="#7abdff" strokeOpacity="0.5" strokeWidth="1.4" pathLength={1} strokeDasharray="0.16 0.84" className="animate-draw [animation-delay:1000ms]" />
        </svg>
        <div className="absolute inset-0 [transform:translateZ(-60px)]">
          <svg viewBox="-200 -200 400 400" className="size-full animate-spin-rev" aria-hidden fill="none">
            {TICKS.map((t, i) => (
              <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="white" strokeOpacity={i % 10 === 0 ? 0.4 : 0.14} strokeWidth={i % 10 === 0 ? 1.2 : 0.8} />
            ))}
          </svg>
        </div>
        {/* Scan sweep: a soft wedge of light turning behind the iris. */}
        <div className="absolute inset-[8%] [transform:translateZ(-20px)]">
          <div className="size-full animate-spin-slow rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(122,189,255,.16)_40deg,transparent_70deg)] [animation-duration:9s]" />
        </div>

        {/* Middle layer: the iris. */}
        <div className="absolute inset-[11%] [transform:translateZ(40px)]">
          <Iris id="hero-iris" className="size-full animate-iris [animation-delay:300ms]" />
        </div>

        {/* Front layer: floating chips on the outer ring. */}
        {CHIPS.map(([label, deg, phone], i) => {
          const a = (deg * Math.PI) / 180;
          return (
            <div
              key={label}
              className={cn("absolute [transform:translate(-50%,-50%)_translateZ(120px)]", !phone && "hidden lg:block")}
              style={{ left: `${(50 + 48 * Math.cos(a)).toFixed(2)}%`, top: `${(50 + 48 * Math.sin(a)).toFixed(2)}%` }}
            >
              <span
                className="flex animate-pop items-center gap-1.5 whitespace-nowrap rounded-full border border-white/15 bg-[#12304f]/90 px-3 py-1.5 text-[12px] font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,.25)] md:px-3.5 md:py-2 md:text-[13px]"
                style={{ animationDelay: `${1500 + i * 110}ms` }}
              >
                <span className="size-1.5 rounded-full bg-acc-bright" />
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
