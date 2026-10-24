"use client";

import { useEffect } from "react";

/**
 * Landing page motion, mounted once:
 * - `data-reveal` elements get `.is-in` when they scroll into view (CSS in globals.css does the rest).
 * - `data-scroll` elements get a `--p` CSS variable from 0 to 1 as they scroll:
 *   "view" (default) while crossing the viewport, "exit" while scrolling off the top.
 */
export function Motion() {
  useEffect(() => {
    const reveal = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          reveal.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.01 },
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => reveal.observe(el));

    // Reduced motion: leave --p unset, so each effect shows its CSS fallback (the finished state).
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => reveal.disconnect();

    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-scroll]"));
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      for (const el of els) {
        const r = el.getBoundingClientRect();
        const p = el.dataset.scroll === "exit" ? -r.top / r.height : (vh - r.top) / (vh + r.height);
        el.style.setProperty("--p", Math.min(1, Math.max(0, p)).toFixed(4));
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      reveal.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return null;
}
