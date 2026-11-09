"use client";

import Lenis from "lenis";
import { useEffect, type MouseEvent, type ReactNode } from "react";

let lenis: Lenis | null = null;
const subs = new Set<() => void>();

/** Run `f` on every scroll frame, in step with Lenis (no one-frame lag). Returns the unsubscribe. */
export function onScrollFrame(f: () => void) {
  subs.add(f);
  f();
  return () => void subs.delete(f);
}

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

const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));

// Last value written per element, so unchanged styles are never re-set (no needless restyle or repaint).
const written = new WeakMap<HTMLElement, Record<string, string>>();
function put(el: HTMLElement, prop: "transform" | "opacity", v: string) {
  const last = written.get(el) ?? {};
  if (last[prop] === v) return;
  last[prop] = v;
  written.set(el, last);
  el.style[prop] = v;
}
const fan = (p: number) => clamp((p - 0.15) / 0.35);

/**
 * Scroll effects, keyed by `data-fx`. Each writes only transform / opacity on its own element,
 * so a frame never re-styles a whole section (setting a CSS variable on a parent would).
 */
const FX: Record<string, (p: number, el: HTMLElement) => void> = {
  "hero-stage": (p, el) => {
    put(el, "transform", `translate3d(0,${(p * 22).toFixed(2)}%,0) scale(${(1 + p * 0.15).toFixed(4)})`);
    put(el, "opacity", (1 - p * 0.7).toFixed(3));
  },
  "hero-text": (p, el) => {
    put(el, "transform", `translate3d(0,${(-p * 90).toFixed(1)}px,0)`);
    put(el, "opacity", clamp(1 - p * 1.8).toFixed(3));
  },
  word: (p, el) => {
    const i = Number(el.dataset.i), n = Number(el.dataset.n);
    put(el, "opacity", clamp(((p - 0.12) / 0.38) * n - i, 0.13, 1).toFixed(3));
  },
  "cta-iris": (p, el) => {
    put(el, "transform", `rotate(${(p * 60).toFixed(2)}deg) scale(${(0.85 + p * 0.3).toFixed(4)})`);
  },
  "stack-tilt": (p, el) => {
    const f = fan(p);
    put(el, "transform", `rotateX(${(22 - f * 14).toFixed(2)}deg) rotateY(${(-18 + f * 12).toFixed(2)}deg)`);
  },
  "stack-back": (p, el) => {
    const f = fan(p);
    put(el, "transform", `translate3d(${(-170 * f).toFixed(1)}px,${(-160 * f).toFixed(1)}px,-140px) rotate(${(-9 * f).toFixed(2)}deg)`);
  },
  "stack-mid": (p, el) => {
    const f = fan(p);
    put(el, "transform", `translate3d(${(170 * f).toFixed(1)}px,${(-70 * f).toFixed(1)}px,-60px) rotate(${(7 * f).toFixed(2)}deg)`);
  },
  "stack-front": (p, el) => {
    put(el, "transform", `translate3d(0,${(80 * fan(p)).toFixed(1)}px,40px)`);
  },
};

/** Where each effect rests with reduced motion. */
const REST: Record<string, number> = { "hero-stage": 0, "hero-text": 0, word: 1, "cta-iris": 0.5, "stack-tilt": 0.6, "stack-back": 0.6, "stack-mid": 0.6, "stack-front": 0.6 };

/**
 * Landing page motion, mounted once:
 * - Lenis smooth (inertia) scrolling. Off with reduced motion.
 * - `data-reveal` elements get `.is-in` when they scroll into view (CSS in globals.css does the rest).
 * - `data-scroll` elements are progress sources (0 → 1): "view" (default) while crossing the viewport,
 *   "exit" while scrolling off the top. Their `data-fx` descendants run the matching FX each frame.
 * Positions are measured on resize only, so a scroll frame never forces layout.
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

    const groups = Array.from(document.querySelectorAll<HTMLElement>("[data-scroll]")).map((src) => ({
      src,
      exit: src.dataset.scroll === "exit",
      targets: [...(src.dataset.fx ? [src] : []), ...Array.from(src.querySelectorAll<HTMLElement>("[data-fx]"))],
      top: 0,
      h: 1,
      last: -1,
    }));
    const runSubs = () => subs.forEach((f) => f());

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      for (const g of groups) for (const t of g.targets) FX[t.dataset.fx!]?.(REST[t.dataset.fx!] ?? 0, t);
      window.addEventListener("scroll", runSubs, { passive: true });
      return () => {
        reveal.disconnect();
        window.removeEventListener("scroll", runSubs);
      };
    }

    let vh = window.innerHeight;
    const measure = () => {
      vh = window.innerHeight;
      const y = window.scrollY;
      for (const g of groups) {
        const r = g.src.getBoundingClientRect();
        g.top = r.top + y;
        g.h = Math.max(1, r.height);
        g.last = -1;
      }
    };
    const frame = () => {
      const y = lenis ? lenis.scroll : window.scrollY;
      for (const g of groups) {
        const top = g.top - y;
        const p = clamp(g.exit ? -top / g.h : (vh - top) / (vh + g.h));
        if (Math.abs(p - g.last) < 0.0002) continue;
        g.last = p;
        for (const t of g.targets) FX[t.dataset.fx!]?.(p, t);
      }
      runSubs();
    };

    lenis = new Lenis({ autoRaf: true, lerp: 0.09 });
    lenis.on("scroll", frame);
    measure();
    frame();

    // Layout can shift after load (fonts, images): re-measure whenever the page height changes.
    const ro = new ResizeObserver(() => {
      measure();
      frame();
    });
    ro.observe(document.body);
    const onResize = () => {
      measure();
      frame();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      lenis?.destroy();
      lenis = null;
      ro.disconnect();
      reveal.disconnect();
    };
  }, []);
  return null;
}
