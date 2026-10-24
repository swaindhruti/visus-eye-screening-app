"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { cn } from "../cn";
import { Icon } from "../Icon";

const LINKS = [
  ["tests", "Tests"],
  ["how", "How it works"],
  ["results", "Results"],
  ["faq", "FAQ"],
] as const;

/** Landing navbar: sits light-on-dark over the hero, then turns into a floating white capsule on scroll. */
export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
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
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, []);

  const jump = (id: string) => (e: React.MouseEvent) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  };

  const dark = !scrolled;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-30 flex animate-rise justify-center px-3 pt-3 [animation-delay:900ms] md:pt-5">
      <header
        className={cn(
          "pointer-events-auto flex w-full items-center justify-between gap-3 rounded-full border transition-all duration-500 ease-[cubic-bezier(.2,.7,.2,1)]",
          scrolled
            ? "max-w-[880px] border-white/60 bg-white/80 py-1.5 pl-4 pr-1.5 shadow-[0_16px_40px_-12px_rgba(10,22,38,.25),inset_0_1px_0_rgba(255,255,255,.8)] backdrop-blur-xl backdrop-saturate-150"
            : "max-w-[1240px] border-white/10 bg-white/[.04] py-2 pl-5 pr-2 backdrop-blur-md",
        )}
      >
        <a href="#top" onClick={jump("top")} className="flex items-center gap-2" aria-label="Visus, back to top">
          <span className={cn("grid size-8 place-items-center rounded-full transition-colors duration-500", dark ? "bg-white text-ink" : "bg-ink text-white")}>
            <Icon name="eye" size={18} strokeWidth={2} />
          </span>
          <span className={cn("text-[19px] font-semibold tracking-[-0.01em] transition-colors duration-500", dark ? "text-white" : "text-ink")}>Visus</span>
        </a>

        <nav aria-label="Sections" className={cn("hidden items-center gap-0.5 rounded-full p-1 transition-colors duration-500 md:flex", dark ? "bg-white/[.06]" : "bg-fill/80")}>
          {LINKS.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={jump(id)}
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

        <nav aria-label="Account" className="flex items-center gap-1">
          <Link
            href="/login"
            className={cn("flex h-10 items-center rounded-full px-4 text-[15px] font-medium transition-colors", dark ? "text-white/85 hover:bg-white/10 hover:text-white" : "text-ink-soft hover:bg-fill hover:text-ink")}
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className={cn(
              "group flex h-10 items-center gap-2 rounded-full pl-4 pr-1.5 text-[15px] font-medium transition-colors duration-500",
              dark ? "bg-white text-ink hover:bg-white/90" : "bg-ink text-white hover:bg-[#2a2a2a]",
            )}
          >
            Sign up
            <span className={cn("grid size-7 place-items-center rounded-full transition-[transform,background-color] duration-300 group-hover:rotate-[-45deg]", dark ? "bg-ink text-white" : "bg-white text-ink")}>
              <Icon name="arrowRight" size={14} strokeWidth={2.4} />
            </span>
          </Link>
        </nav>
      </header>
    </div>
  );
}
