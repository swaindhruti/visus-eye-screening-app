"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { cn } from "../cn";
import { Icon } from "../Icon";
import { Iris } from "./Iris";

const STEPS = [
  ["Describe", "Tell us what's bothering your eyes, in your own words or by voice. Like “road signs look blurry at night”."],
  ["Plan", "The AI guide picks only the tests that matter for what you described. No fixed checklist."],
  ["Test", "Take each test right on this screen. Symbols are sized to your display after a quick calibration."],
  ["Re-plan", "After every test the server scores your answers, checks its rules and decides the next step."],
  ["Result", "A clear verdict: what looks good, what to follow up, and ZEISS lenses that suit you."],
] as const;

const GAP = 26; // degrees between steps on the arc

/** "How it works": a pinned section. Scrolling turns the arc, so the current step sits on top. */
export function Steps() {
  const box = useRef<HTMLDivElement>(null);
  const arc = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = box.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight)));
      const f = p * (STEPS.length - 1);
      arc.current?.style.setProperty("transform", `rotate(${(-f * GAP).toFixed(2)}deg)`);
      setStep(Math.round(f));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section id="how" ref={box} className="relative h-[380vh] scroll-mt-0 px-3 md:px-5">
      <div className="sticky top-3 h-[calc(100dvh-24px)] overflow-hidden rounded-[28px] md:top-5 md:h-[calc(100dvh-40px)] bg-[radial-gradient(120%_80%_at_50%_100%,#123a63_0%,#0a1a2e_45%,#06090f_100%)] text-white md:rounded-[40px]">
        {/* Arc with step labels, centred on the iris below. */}
        <div className="absolute left-1/2 top-[20%] size-[min(1180px,175vw)] -translate-x-1/2 md:top-[17%]">
          <div className="absolute inset-0 rounded-full border border-white/15" />
          <div className="absolute inset-[6%] rounded-full border border-dashed border-white/[.07]" />
          <div ref={arc} className="absolute inset-0">
            {STEPS.map(([label], i) => (
              <div key={label} className="absolute inset-0" style={{ transform: `rotate(${i * GAP}deg)` }}>
                <span
                  className={cn(
                    "absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-all duration-500 md:px-4 md:py-2 md:text-[14px]",
                    i === step ? "scale-110 border-white bg-white text-ink shadow-[0_0_40px_rgba(122,189,255,.45)]" : "border-white/20 bg-[#0a1a2e] text-white/60",
                  )}
                >
                  <span className="tabular-nums">0{i + 1}</span>
                  <span className={i === step ? "text-ink/30" : "text-white/25"}>·</span>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div className="absolute inset-[22%] opacity-90 transition-transform duration-700" style={{ transform: `scale(${1 + step * 0.04})` }}>
            <Iris id="steps-iris" className="size-full" />
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-[#06090f] via-[#06090f]/60 to-transparent" />

        <div className="relative flex h-full flex-col items-center justify-end px-6 pb-10 text-center md:pb-16">
          <span className="text-[13px] font-medium uppercase tracking-[0.18em] text-white/50">How a check works</span>
          <div className="relative mt-4 grid w-full max-w-[760px] place-items-center">
            {STEPS.map(([label, body], i) => (
              <div
                key={label}
                aria-hidden={i !== step}
                className={cn(
                  "col-start-1 row-start-1 flex flex-col items-center transition-all duration-700 ease-[cubic-bezier(.2,.7,.2,1)]",
                  i === step ? "translate-y-0 opacity-100 blur-0" : i < step ? "-translate-y-6 opacity-0 blur-sm" : "translate-y-6 opacity-0 blur-sm",
                )}
              >
                <h3 className="m-0 text-[34px] font-medium leading-[1.05] tracking-[-0.03em] md:text-[56px]">{label}</h3>
                <p className="m-0 mt-4 max-w-[560px] text-[16px] leading-relaxed text-white/70 text-pretty md:text-[19px]">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex items-center gap-2" aria-hidden>
            {STEPS.map(([label], i) => (
              <span key={label} className={cn("h-1 rounded-full transition-all duration-500", i === step ? "w-8 bg-white" : "w-3 bg-white/25")} />
            ))}
          </div>
          <Link href="/signup" className="group mt-8 flex h-12 items-center gap-2.5 rounded-full bg-white pl-5 pr-1.5 text-[15px] font-medium text-ink transition-colors hover:bg-white/90">
            Start your check
            <span className="grid size-9 place-items-center rounded-full bg-ink text-white transition-transform duration-300 group-hover:rotate-[-45deg]">
              <Icon name="arrowRight" size={16} strokeWidth={2.2} />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
