"use client";

import { useEffect, useRef } from "react";

/** A number that counts up from 0 the first time it scrolls into view. */
export function CountUp({ to, prefix = "", suffix = "" }: { to: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 1600);
        el.textContent = `${prefix}${Math.round(to * (1 - Math.pow(1 - t, 4)))}${suffix}`;
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, prefix, suffix]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {to}
      {suffix}
    </span>
  );
}
