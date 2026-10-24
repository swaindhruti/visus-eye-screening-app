"use client";

import Lenis from "lenis";
import { useEffect, type MouseEvent, type ReactNode } from "react";

let lenis: Lenis | null = null;

/** Smooth-scroll to a section by id (Lenis when running, else the browser). */
export function scrollToId(id: string, e?: MouseEvent) {
  const el = document.getElementById(id);
  if (!el) return;
  e?.preventDefault();
  if (lenis) lenis.scrollTo(el, { duration: 1.6 });
  else el.scrollIntoView({ block: "start" });
  history.replaceState(null, "", `#${id}`);
}

/** In-page link that scrolls smoothly to `#id`. */
export function JumpLink({ id, className, children }: { id: string; className?: string; children: ReactNode }) {
  return (
    <a href={`#${id}`} onClick={(e) => scrollToId(id, e)} className={className}>
      {children}
    </a>
  );
}

/**
 * Landing page motion, mounted once:
 * - Lenis smooth (inertia) scrolling. Off with reduced motion.
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
      { rootMargin: "0px 0px -8% 0px", threshold: 0.01 },
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => reveal.observe(el));

    // Reduced motion: leave --p unset, so each effect shows its CSS fallback (the finished state).
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => reveal.disconnect();

    lenis = new Lenis({ autoRaf: true, lerp: 0.085 });

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
      lenis?.destroy();
      lenis = null;
      reveal.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return null;
}
