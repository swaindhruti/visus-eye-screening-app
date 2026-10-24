"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { cn } from "../cn";
import { ContinueAsGuest } from "../GuestDialog";
import { Icon } from "../Icon";
import { scrollToId } from "./Motion";

const LINKS = [
  ["about", "About"],
  ["tests", "Tests"],
  ["how", "How it works"],
  ["results", "Results"],
  ["faq", "FAQ"],
] as const;

/**
 * Landing navbar: a long glass bar over the hero that turns into a floating white capsule on scroll,
 * marks the section in view and shows reading progress along its bottom edge.
 * Sign up lives on the Log in page, so the bar only offers guest mode and Log in.
 */
export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrolled(window.scrollY > 24);
      bar.current?.style.setProperty("transform", `scaleX(${max > 0 ? (window.scrollY / max).toFixed(4) : 0})`);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const id of ["top", ...LINKS.map(([id]) => id)]) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, []);

  const dark = !scrolled;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-30 flex animate-nav justify-center px-3 pt-3 [animation-delay:1300ms] md:px-5 md:pt-5">
      <header
        className={cn(
          "pointer-events-auto relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-full border transition-[max-width,background-color,border-color,box-shadow,padding] duration-700 ease-[cubic-bezier(.16,1,.3,1)]",
          scrolled
            ? "max-w-[1400px] border-white/70 bg-white/75 py-1.5 pl-5 pr-1.5 shadow-[0_18px_50px_-14px_rgba(10,22,38,.28),inset_0_1px_0_rgba(255,255,255,.9)] backdrop-blur-2xl backdrop-saturate-150 md:pl-7"
            : "max-w-[1720px] border-white/10 bg-white/[.04] py-2 pl-5 pr-2 backdrop-blur-md md:pl-8",
        )}
      >
        <a href="#top" onClick={(e) => scrollToId("top", e)} aria-label="Visus, back to top" className={cn("text-[22px] font-semibold tracking-[-0.03em] transition-colors duration-500", dark ? "text-white" : "text-ink")}>
          Visus
        </a>

        <nav aria-label="Sections" className={cn("absolute left-1/2 hidden -translate-x-1/2 items-center gap-0.5 rounded-full p-1 transition-colors duration-500 lg:flex", dark ? "bg-white/[.06]" : "bg-fill/80")}>
          {LINKS.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={(e) => scrollToId(id, e)}
              aria-current={active === id ? "true" : undefined}
              className={cn(
                "rounded-full px-4 py-2 text-[14px] font-medium transition-all duration-300",
                active === id
                  ? dark
                    ? "bg-white/15 text-white"
                    : "bg-white text-ink shadow-[0_1px_3px_rgba(17,17,17,.1)]"
                  : dark
                    ? "text-white/70 hover:text-white"
                    : "text-muted hover:text-ink",
              )}
            >
              {label}
            </a>
          ))}
        </nav>

        <nav aria-label="Account" className="flex items-center gap-1 md:gap-2">
          <ContinueAsGuest
            className={cn(
              "flex h-10 items-center whitespace-nowrap rounded-full px-3 text-[14px] font-medium transition-colors md:px-4 md:text-[15px]",
              dark ? "text-white/80 hover:bg-white/10 hover:text-white" : "text-ink-soft hover:bg-fill hover:text-ink",
            )}
          />
          <Link
            href="/login"
            className={cn(
              "group flex h-10 items-center gap-2 whitespace-nowrap rounded-full pl-4 pr-1.5 text-[14px] font-medium transition-colors duration-500 md:text-[15px]",
              dark ? "bg-white text-ink hover:bg-white/90" : "bg-ink text-white hover:bg-[#2a2a2a]",
            )}
          >
            Log in
            <span className={cn("grid size-7 place-items-center rounded-full transition-[transform,background-color] duration-300 group-hover:rotate-[-45deg]", dark ? "bg-ink text-white" : "bg-white text-ink")}>
              <Icon name="arrowRight" size={14} strokeWidth={2.4} />
            </span>
          </Link>
        </nav>

        <span ref={bar} aria-hidden className={cn("absolute inset-x-6 bottom-0 h-px origin-left transition-colors duration-500", dark ? "bg-white/40" : "bg-acc")} style={{ transform: "scaleX(0)" }} />
      </header>
    </div>
  );
}
