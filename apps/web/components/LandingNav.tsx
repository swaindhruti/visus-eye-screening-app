"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { cn } from "./cn";
import { Icon } from "./Icon";

const LINKS = [
  ["how", "How it works"],
  ["check", "What you can check"],
  ["results", "Your result"],
] as const;

/** Landing page navbar: a floating capsule that tightens on scroll and marks the section in view. */
export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const [id] of LINKS) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    const hero = document.getElementById("top");
    if (hero) io.observe(hero);

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

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-20 flex justify-center px-3 pt-3 md:pt-4">
      <header
        className={cn(
          "pointer-events-auto flex w-full items-center justify-between gap-3 rounded-full border transition-[max-width,background-color,box-shadow,border-color,padding] duration-300 ease-[cubic-bezier(.2,.7,.3,1)]",
          scrolled
            ? "max-w-[860px] border-line-strong bg-white/85 py-1.5 pl-4 pr-1.5 shadow-[0_10px_30px_rgba(17,17,17,.08)] backdrop-blur-xl"
            : "max-w-[1160px] border-transparent bg-white/50 py-2 pl-4 pr-2 backdrop-blur-md md:pl-5",
        )}
      >
        <a href="#top" onClick={jump("top")} className="flex items-center gap-2" aria-label="Visus, back to top">
          <span className="grid size-8 place-items-center rounded-full bg-ink text-white">
            <Icon name="eye" size={18} strokeWidth={2} />
          </span>
          <span className="text-[19px] font-bold tracking-[-0.01em]">Visus</span>
        </a>

        <nav aria-label="Sections" className="hidden items-center gap-1 rounded-full bg-fill/70 p-1 md:flex">
          {LINKS.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={jump(id)}
              aria-current={active === id ? "true" : undefined}
              className={cn(
                "rounded-full px-3.5 py-2 text-[14px] font-semibold transition-colors duration-200",
                active === id ? "bg-white text-ink shadow-[0_1px_3px_rgba(17,17,17,.08)]" : "text-muted hover:text-ink",
              )}
            >
              {label}
            </a>
          ))}
        </nav>

        <nav aria-label="Account" className="flex items-center gap-1.5">
          <Link href="/login" className="flex h-10 items-center rounded-full px-4 text-[15px] font-semibold text-ink-soft hover:bg-fill hover:text-ink">
            Log in
          </Link>
          <Link href="/signup" className="flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[15px] font-semibold text-white transition-colors hover:bg-[#2a2a2a]">
            Sign up
            <Icon name="arrowRight" size={16} strokeWidth={2.2} className="hidden sm:block" />
          </Link>
        </nav>
      </header>
    </div>
  );
}
