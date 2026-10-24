import { TEST_CATALOG } from "@visus/shared";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { StatusBadge } from "@/components/Chip";
import { cn } from "@/components/cn";
import { ContinueAsGuest } from "@/components/GuestDialog";
import { Icon, type IconName } from "@/components/Icon";
import { CountUp } from "@/components/landing/CountUp";
import { HeroStage } from "@/components/landing/HeroStage";
import { Iris } from "@/components/landing/Iris";
import { JumpLink, Motion } from "@/components/landing/Motion";
import { LandingNav } from "@/components/landing/Nav";
import { Steps } from "@/components/landing/Steps";
import { TestRail } from "@/components/landing/TestRail";

/** Page width: edge to edge with generous gutters, capped only on very wide screens. */
const WRAP = "mx-auto w-full max-w-[1760px] px-5 md:px-10 xl:px-16";

const HEADLINE = ["Quick", "eye", "checks,", "right", "in", "your", "browser."];

const STATEMENT =
  "Visus helps you notice changes in your vision early. Describe what feels off, take a few guided tests on your screen, and get a clear next step, with ZEISS lenses that fit how you live.".split(" ");

const OUTCOMES: [IconName, string, string][] = [
  ["checkLg", "What looks good", "Each test gets a plain-language result, eye by eye."],
  ["alert", "What to follow up", "Anything worth an optician’s or doctor’s look, and how soon."],
  ["glasses", "Lenses that suit you", "ZEISS lens suggestions matched to your results and habits."],
];

const FAQ: [string, string][] = [
  ["Is Visus a diagnosis?", "No. Visus is a screening tool. It shows how you see today and tells you when something is worth an optician’s or doctor’s look. Sudden vision loss, flashes or eye pain need a doctor right away."],
  ["How long does a check take?", "About five minutes. The AI guide only picks the tests that matter for what you describe, and re-plans after each one."],
  ["What do I need?", "A phone, tablet or laptop with the brightness turned up. A short screen calibration makes every symbol the right size, and the camera can help you keep the right distance."],
  ["Do I need an account?", "No. As a guest you can take any test from the library and see your result. An account adds the AI check, saved results, family profiles and lens suggestions."],
  ["Can my children use it?", "Yes. Kids mode has playful versions of the sharpness and colour tests for children from age 5, done together with a parent."],
  ["Where are my results kept?", "In your Visus account, so you can follow changes over time and share a report with your optician."],
];

/** Pill link with a round arrow, as in the navbar's Log in. */
function ArrowLink({ href, children, tone, className, style }: { href: string; children: ReactNode; tone: "light" | "dark"; className?: string; style?: CSSProperties }) {
  return (
    <Link
      href={href}
      style={style}
      className={cn(
        "group flex h-[54px] w-fit items-center justify-between gap-3 whitespace-nowrap rounded-full pl-6 pr-1.5 text-[16px] font-medium transition-colors duration-300",
        tone === "light" ? "bg-white text-ink hover:bg-white/90" : "bg-ink text-white hover:bg-[#2a2a2a]",
        className,
      )}
    >
      {children}
      <span className={cn("grid size-[42px] place-items-center rounded-full transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:rotate-[-45deg]", tone === "light" ? "bg-ink text-white" : "bg-white text-ink")}>
        <Icon name="arrowRight" size={18} strokeWidth={2.2} />
      </span>
    </Link>
  );
}

const Label = ({ n, children, dark }: { n: string; children: ReactNode; dark?: boolean }) => (
  <span data-reveal className={cn("flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.16em]", dark ? "text-white/50" : "text-faint")}>
    <span className={dark ? "text-white" : "text-ink"}>({n})</span>
    {children}
  </span>
);

const H2 = ({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) => (
  <h2 data-reveal style={style} className={cn("m-0 text-[clamp(34px,4.2vw,76px)] font-medium leading-[1.02] tracking-[-0.04em] text-balance", className)}>
    {children}
  </h2>
);

const Tag = ({ children }: { children: ReactNode }) => <span className="flex h-9 items-center rounded-full border border-line-strong bg-white px-4 text-[13px] font-medium text-ink-soft">{children}</span>;

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/** Screen 1, as a landing page. Motion: an eye-opening intro, scroll reveals, a pinned "How it works", Lenis smooth scrolling. */
export default function Welcome() {
  return (
    <div className="landing min-h-dvh overflow-x-clip bg-pearl">
      <Motion />
      <LandingNav />

      <main>
        <Hero />

        {/* ───────────── About ───────────── */}
        <section id="about" className="scroll-mt-24 py-28 md:py-44">
          <div className={WRAP}>
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
              <div className="flex flex-col gap-6 lg:col-span-3">
                <Label n="01">About Visus</Label>
                <p data-reveal style={delay(100)} className="m-0 max-w-[280px] text-[15px] leading-relaxed text-muted">
                  Screening, not diagnosis. A quick, guided way to know when your eyes need a closer look.
                </p>
              </div>
              <p data-scroll className="m-0 text-[clamp(30px,3.7vw,66px)] font-medium leading-[1.12] tracking-[-0.035em] lg:col-span-9">
                {STATEMENT.map((w, i) => (
                  <span key={i} className="transition-opacity duration-300" style={{ opacity: `clamp(0.13, calc((var(--p, 1) - 0.12) / 0.38 * ${STATEMENT.length} - ${i}), 1)` }}>
                    {w}{" "}
                  </span>
                ))}
              </p>
            </div>

            <div className="mt-20 grid gap-4 md:mt-28 md:grid-cols-2 md:gap-5 xl:grid-cols-4">
              <Bento className="xl:col-span-2" d={0} dark title="An AI guide that listens." body="Describe it in your own words or by voice. The guide builds a test plan around what you said.">
                <div className="flex w-full flex-col gap-2.5">
                  <span className="max-w-[80%] self-end rounded-[20px] rounded-br-[6px] bg-white px-4 py-3 text-[15px] leading-snug text-ink">My eyes feel tired after work and road signs look blurry at night.</span>
                  <span className="flex max-w-[85%] items-start gap-2.5 self-start rounded-[20px] rounded-bl-[6px] border border-white/10 bg-white/[.06] px-4 py-3 text-[15px] leading-snug text-white/85">
                    <Icon name="sparkle" size={16} color="#7abdff" className="mt-0.5 flex-none" />
                    Got it. We&apos;ll start with distance sharpness, then check glare and night vision.
                  </span>
                  <span className="flex gap-1 self-start rounded-full bg-white/[.06] px-3.5 py-2.5" aria-hidden>
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="size-1.5 animate-blink rounded-full bg-white/70" style={{ animationDelay: `${i * 180}ms` }} />
                    ))}
                  </span>
                </div>
              </Bento>

              <Bento d={90} title="Sized to your screen." body="A quick calibration with any bank card makes every symbol the right size, on any device.">
                <div className="relative mx-auto w-full max-w-[260px]">
                  <div className="aspect-[1.586] rounded-[14px] bg-gradient-to-br from-[#2b5f93] to-[#0d2744] p-4 shadow-[0_20px_40px_-20px_rgba(13,39,68,.6)]">
                    <span className="block h-6 w-8 rounded-[5px] bg-[#e6c37a]/80" />
                  </div>
                  <div className="mt-3 flex items-end justify-between" aria-hidden>
                    {Array.from({ length: 27 }, (_, i) => (
                      <span key={i} className={cn("w-px bg-ink/40", i % 5 === 0 ? "h-3" : "h-1.5")} />
                    ))}
                  </div>
                  <div className="mt-1.5 text-center text-[12px] font-medium tabular-nums text-muted">85.6 mm</div>
                </div>
              </Bento>

              <Stat d={180} label="Tests" body="Guided tests across clarity, focus, colour, eye health and comfort.">
                <CountUp to={TEST_CATALOG.length} />
              </Stat>

              <Stat d={0} label="Minutes" body="For a full check, from the first question to your result.">
                <CountUp to={5} prefix="~" />
              </Stat>

              <Bento d={90} title="Rules first, AI second." body="Answers are scored on our server by fixed rules. Red flags never come from the AI alone.">
                <div className="flex flex-col items-center gap-2 text-[13px] font-medium">
                  <span className="rounded-full border border-line-strong bg-white px-4 py-2">Your answers</span>
                  <span className="h-4 w-px bg-line-strong" />
                  <span className="rounded-full bg-ink px-4 py-2 text-white">Server rules</span>
                  <div className="flex items-start gap-6">
                    <div className="flex flex-col items-center gap-2">
                      <span className="h-4 w-px bg-line-strong" />
                      <span className="rounded-full bg-acc-soft px-4 py-2 text-acc-ink">Next step</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <span className="h-4 w-px border-l border-dashed border-faint" />
                      <span className="flex items-center gap-1.5 rounded-full border border-dashed border-faint px-4 py-2 text-muted">
                        <Icon name="sparkle" size={13} />
                        AI if unsure
                      </span>
                    </div>
                  </div>
                </div>
              </Bento>

              <Bento className="xl:col-span-2" d={180} title="For the whole family." body="Add family profiles and switch to Kids mode: playful sharpness and colour tests for ages 5 and up, done with a parent.">
                <div className="flex flex-wrap items-center justify-center gap-6">
                  <div className="flex -space-x-3">
                    {["A", "M", "R"].map((c, i) => (
                      <span key={c} className={cn("grid size-14 place-items-center rounded-full border-4 border-white text-[18px] font-semibold", ["bg-acc-soft text-acc-ink", "bg-good-bg text-good", "bg-mild-bg text-mild"][i])}>
                        {c}
                      </span>
                    ))}
                  </div>
                  <span className="flex h-12 items-center gap-2 rounded-full bg-ink px-5 text-[15px] font-medium text-white">
                    <Icon name="kids" size={20} />
                    Kids mode · 5+
                  </span>
                </div>
              </Bento>
            </div>
          </div>
        </section>

        {/* ───────────── Tests ───────────── */}
        <section id="tests" className="scroll-mt-24 pb-28 md:pb-44">
          <div className={cn(WRAP, "grid gap-8 lg:grid-cols-12 lg:items-end")}>
            <div className="flex flex-col gap-6 lg:col-span-7">
              <Label n="02">The tests</Label>
              <H2>Clinical tests, made simple enough for anyone.</H2>
            </div>
            <div className="flex flex-col gap-6 lg:col-span-4 lg:col-start-9">
              <p data-reveal style={delay(100)} className="m-0 text-[16px] leading-relaxed text-muted md:text-[18px]">
                Plain white screens and black symbols, just like at the optician. Filter by what you want to check, or let the guide choose for you.
              </p>
              <div data-reveal style={delay(180)}>
                <ArrowLink href="/tests" tone="dark">
                  Browse all tests
                </ArrowLink>
              </div>
            </div>
          </div>
          <div data-reveal style={delay(120)} className="mt-14 md:mt-20">
            <TestRail />
          </div>
        </section>

        {/* ───────────── How it works (pinned) ───────────── */}
        <Steps />

        {/* ───────────── Trust ───────────── */}
        <section className={cn(WRAP, "py-28 md:py-44")}>
          <div data-reveal="tilt" className="grid overflow-hidden rounded-[36px] border border-line bg-white lg:grid-cols-2">
            <div className="flex flex-col justify-between gap-12 p-7 md:p-14">
              <div className="flex flex-col gap-6">
                <Label n="03">Why trust it</Label>
                <H2 className="text-[clamp(30px,3.2vw,56px)]">Screening you can rely on. Not a diagnosis.</H2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Tag>Calibrated to your screen</Tag>
                <Tag>One eye at a time</Tag>
                <Tag>Doctor-ready report</Tag>
              </div>
            </div>
            <div className="flex flex-col justify-between gap-12 border-t border-line p-7 md:p-14 lg:border-l lg:border-t-0">
              <p className="m-0 text-[clamp(19px,1.7vw,28px)] leading-[1.45] tracking-[-0.01em] text-ink-soft">
                Visus measures how you see today and points out what&apos;s worth a professional look. Scores and red flags come from fixed rules on our server. The AI plans your tests and only steps in when the rules can&apos;t decide.
              </p>
              <ArrowLink href="/settings/about" tone="dark">
                About Visus
              </ArrowLink>
            </div>
          </div>
        </section>

        {/* ───────────── Result: 3D stack ───────────── */}
        <section id="results" className={cn(WRAP, "scroll-mt-24 pb-28 md:pb-44")}>
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            <div className="flex flex-col gap-6">
              <Label n="04">Your result</Label>
              <H2>A clear answer, not a wall of numbers.</H2>
              <ul className="m-0 mt-6 flex max-w-[620px] list-none flex-col p-0">
                {OUTCOMES.map(([icon, title, body], i) => (
                  <li key={title} data-reveal style={delay(i * 120)} className="flex items-start gap-5 border-t border-line py-6">
                    <span className="grid size-12 flex-none place-items-center rounded-full bg-acc-soft text-acc-ink">
                      <Icon name={icon} size={22} />
                    </span>
                    <span className="flex flex-col gap-1">
                      <span className="text-[19px] font-medium">{title}</span>
                      <span className="text-[15px] leading-normal text-muted">{body}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <ResultStack />
          </div>
        </section>

        {/* ───────────── FAQ ───────────── */}
        <section id="faq" className="scroll-mt-24 border-t border-line bg-white">
          <div className={cn(WRAP, "grid gap-14 py-28 md:py-44 lg:grid-cols-12")}>
            <div className="flex flex-col justify-between gap-10 lg:col-span-5">
              <div className="flex flex-col gap-6">
                <Label n="05">Questions</Label>
                <H2>Answers that help you feel confident.</H2>
              </div>
              <div data-reveal className="flex flex-col gap-4">
                <span className="text-[15px] text-muted">Want the full story?</span>
                <ArrowLink href="/settings/about" tone="dark">
                  Read about Visus
                </ArrowLink>
              </div>
            </div>
            <div className="border-b border-line lg:col-span-7">
              {FAQ.map(([q, a], i) => (
                <details key={q} data-reveal style={delay(i * 60)} className="group border-t border-line">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-7 text-[clamp(18px,1.5vw,24px)] font-medium tracking-[-0.015em] [&::-webkit-details-marker]:hidden">
                    {q}
                    <span className="grid size-11 flex-none place-items-center rounded-full border border-line-strong transition-[transform,background-color,color] duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-open:rotate-45 group-open:bg-ink group-open:text-white">
                      <Icon name="plus" size={18} />
                    </span>
                  </summary>
                  <p className="m-0 max-w-[680px] pb-8 pr-14 text-[16px] leading-relaxed text-muted md:text-[17px]">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────── Closing CTA ───────────── */}
        <section className="px-3 pt-3 md:px-5 md:pt-5">
          <div data-scroll className="relative overflow-hidden rounded-[28px] bg-[radial-gradient(80%_100%_at_80%_60%,#123a63_0%,#0a1b30_45%,#05080e_100%)] text-white md:rounded-[40px]">
            <div aria-hidden className="absolute -right-[30%] top-1/2 aspect-square w-[110vw] max-w-[1000px] -translate-y-1/2 sm:-right-[8%] sm:w-[62vw]">
              <div className="size-full opacity-85" style={{ transform: "rotate(calc(var(--p, .5) * 60deg)) scale(calc(0.85 + var(--p, .5) * 0.3))" }}>
                <div className="absolute inset-0 rounded-full border border-white/10" />
                <div className="absolute inset-[8%] rounded-full border border-dashed border-white/10" />
                <div className="absolute inset-[16%]">
                  <Iris id="cta-iris" still className="size-full" />
                </div>
              </div>
            </div>
            <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#05080e] via-[#05080e]/70 to-transparent" />
            <div className={cn(WRAP, "relative flex min-h-[560px] flex-col justify-center py-20 md:min-h-[700px]")}>
              <span data-reveal className="flex h-8 w-fit items-center gap-2 rounded-full border border-white/15 bg-white/[.07] px-3.5 text-[13px] font-medium text-white/85">
                <span className="size-1.5 animate-blink rounded-full bg-acc-bright" />
                About 5 minutes
              </span>
              <h2 data-reveal style={delay(100)} className="m-0 mt-7 max-w-[860px] text-[clamp(40px,5.4vw,96px)] font-medium leading-none tracking-[-0.045em] text-balance">
                Better eye care starts with one quick check.
              </h2>
              <p data-reveal style={delay(200)} className="m-0 mt-6 max-w-[480px] text-[16px] leading-relaxed text-white/60 md:text-[19px]">
                Sharpness, focus, colour and contrast. All you need is this screen.
              </p>
              <div data-reveal style={delay(300)} className="mt-10 flex flex-col gap-3 sm:flex-row">
                <ArrowLink href="/signup" tone="light">
                  Get started
                </ArrowLink>
                <Link href="/login" className="flex h-[54px] w-fit items-center justify-center rounded-full border border-white/20 bg-white/[.06] px-7 text-[16px] font-medium backdrop-blur-md transition-colors hover:bg-white/15">
                  I have an account
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

/* ───────────── Hero ───────────── */

function Hero() {
  return (
    <section id="top" data-scroll="exit" className="relative px-3 pt-3 md:px-5 md:pt-5">
      <div className="relative min-h-[calc(100svh-24px)] animate-panel overflow-hidden rounded-[28px] bg-[radial-gradient(90%_80%_at_72%_45%,#123a63_0%,#0a1b30_40%,#05080e_100%)] text-white md:min-h-[calc(100svh-40px)] md:rounded-[40px]">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,.07)_1px,transparent_0)] [background-size:30px_30px] [mask-image:radial-gradient(60%_60%_at_70%_50%,black,transparent)]" />

        <div className="absolute left-1/2 top-[6%] aspect-square w-[122vw] max-w-[700px] -translate-x-1/2 lg:left-auto lg:right-[-2%] lg:top-[47%] lg:w-[min(100vh,54vw)] lg:max-w-none lg:-translate-y-1/2 lg:translate-x-0">
          <div className="size-full" style={{ transform: "translateY(calc(var(--p, 0) * 22%)) scale(calc(1 + var(--p, 0) * 0.15))", opacity: "calc(1 - var(--p, 0) * 0.7)" }}>
            <HeroStage />
          </div>
        </div>

        <div aria-hidden className="absolute inset-x-0 bottom-0 h-[64%] bg-gradient-to-t from-[#05080e] via-[#05080e]/85 to-transparent lg:inset-y-0 lg:left-0 lg:right-auto lg:h-auto lg:w-[58%] lg:bg-gradient-to-r lg:via-[#05080e]/50" />

        <div className="relative z-10 flex min-h-[inherit] flex-col px-5 md:px-12 xl:px-20">
          <div className="flex flex-1 flex-col justify-end pb-10 pt-28 lg:max-w-[56%] lg:justify-center lg:pb-6 lg:pt-32" style={{ transform: "translateY(calc(var(--p, 0) * -90px))", opacity: "calc(1 - var(--p, 0) * 1.8)" }}>
            <span className="flex h-8 w-fit animate-rise items-center gap-2 rounded-full border border-white/15 bg-white/[.07] px-3.5 text-[13px] font-medium text-white/85 backdrop-blur-md [animation-delay:800ms]">
              <Icon name="lock" size={14} strokeWidth={1.7} />
              Screening, not diagnosis
            </span>

            <h1 className="m-0 mt-7 text-[clamp(44px,5.9vw,110px)] font-medium leading-[0.98] tracking-[-0.045em]">
              {HEADLINE.map((w, i) => (
                <span key={i} className={cn("inline-block animate-focus pr-[0.22em]", i > 2 && "text-white/45")} style={{ animationDelay: `${950 + i * 75}ms` }}>
                  {w}
                </span>
              ))}
            </h1>

            <p className="m-0 mt-7 max-w-[560px] animate-rise text-[16px] leading-relaxed text-white/65 text-pretty [animation-delay:1450ms] md:text-[19px]">
              Tell us what&apos;s bothering your eyes. An AI guide picks the right tests, you take them on this screen, and you get a clear result with ZEISS lens suggestions.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ArrowLink href="/signup" tone="light" className="animate-rise [animation-delay:1600ms]">
                Get started
              </ArrowLink>
              <Link
                href="/login"
                className="flex h-[54px] w-fit animate-rise items-center justify-center whitespace-nowrap rounded-full border border-white/20 bg-white/[.06] px-7 text-[16px] font-medium backdrop-blur-md transition-colors [animation-delay:1680ms] hover:bg-white/15"
              >
                I have an account
              </Link>
            </div>
          </div>

          {/* Bottom bar: quick facts and a scroll cue. */}
          <div className="flex animate-rise flex-col gap-6 border-t border-white/10 py-6 [animation-delay:1850ms] md:flex-row md:items-center md:justify-between md:py-7">
            <dl className="m-0 flex flex-wrap gap-x-10 gap-y-4">
              {[
                ["~5 min", "per check"],
                [String(TEST_CATALOG.length), "guided tests"],
                ["Ages 5+", "with Kids mode"],
                ["ZEISS", "lens suggestions"],
              ].map(([v, l]) => (
                <div key={l} className="flex items-baseline gap-2.5">
                  <dt className="text-[20px] font-medium tracking-[-0.02em] md:text-[24px]">{v}</dt>
                  <dd className="m-0 text-[13px] text-white/50">{l}</dd>
                </div>
              ))}
            </dl>
            <JumpLink id="about" className="group hidden items-center gap-3 text-[13px] font-medium uppercase tracking-[0.2em] text-white/50 transition-colors hover:text-white md:flex">
              Scroll to explore
              <span className="grid size-10 place-items-center rounded-full border border-white/20 transition-transform duration-500 group-hover:translate-y-1">
                <Icon name="chevronDown" size={16} strokeWidth={2.2} />
              </span>
            </JumpLink>
          </div>
        </div>

        {/* Intro: the "eyelids" open on load, revealing the hero. */}
        <svg aria-hidden className="pointer-events-none absolute inset-0 z-20 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <mask id="eyelid-mask">
              <rect width="100" height="100" fill="white" />
              <path d="M-2 50Q50 8 102 50Q50 92 -2 50Z" fill="black" className="animate-eye-open" style={{ transformBox: "view-box", transformOrigin: "50px 50px", transform: "scale(3.2)" }} />
            </mask>
          </defs>
          <rect width="100" height="100" fill="#03050a" mask="url(#eyelid-mask)" />
        </svg>
      </div>
    </section>
  );
}

/* ───────────── About bento cards ───────────── */

function Bento({ title, body, children, className, dark, d }: { title: string; body: string; children: ReactNode; className?: string; dark?: boolean; d: number }) {
  return (
    <div data-reveal="tilt" style={delay(d)} className={cn("group min-h-[340px] md:min-h-[400px]", className)}>
      <div
        className={cn(
          "flex h-full flex-col gap-8 rounded-[32px] p-7 transition-[transform,box-shadow] duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:-translate-y-1.5 md:p-8",
          dark ? "bg-night text-white group-hover:shadow-[0_40px_70px_-30px_rgba(5,8,14,.6)]" : "border border-line bg-white group-hover:shadow-[0_40px_70px_-34px_rgba(10,22,38,.28)]",
        )}
      >
        <div className="grid flex-1 place-items-center">{children}</div>
        <div className="flex flex-col gap-2">
          <span className="text-[22px] font-medium tracking-[-0.02em] md:text-[24px]">{title}</span>
          <span className={cn("max-w-[460px] text-[15px] leading-relaxed", dark ? "text-white/60" : "text-muted")}>{body}</span>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, body, children, d }: { label: string; body: string; children: ReactNode; d: number }) {
  return (
    <div data-reveal="tilt" style={delay(d)} className="group min-h-[340px] md:min-h-[400px]">
      <div className="flex h-full flex-col justify-between rounded-[32px] border border-line bg-white p-7 transition-[transform,box-shadow] duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:-translate-y-1.5 group-hover:shadow-[0_40px_70px_-34px_rgba(10,22,38,.28)] md:p-8">
        <span className="text-[13px] font-medium uppercase tracking-[0.14em] text-faint">{label}</span>
        <div>
          <div className="text-[clamp(80px,7.5vw,136px)] font-medium leading-none tracking-[-0.06em]">{children}</div>
          <p className="m-0 mt-4 max-w-[300px] text-[15px] leading-relaxed text-muted">{body}</p>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Footer ───────────── */

function Footer() {
  const col = "flex flex-col gap-3.5";
  const head = "mb-1 text-[13px] font-medium uppercase tracking-[0.14em] text-faint";
  const link = "w-fit text-[16px] text-ink-soft transition-colors hover:text-ink";
  return (
    <footer className="overflow-hidden">
      <div className={cn(WRAP, "pt-24 md:pt-32")}>
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="flex flex-col gap-7 lg:col-span-5">
            <span data-reveal className="text-[clamp(30px,2.6vw,46px)] font-medium leading-[1.08] tracking-[-0.035em]">
              Your eyes, checked
              <br />
              <span className="text-faint">in about five minutes.</span>
            </span>
            <div data-reveal style={delay(100)} className="flex flex-wrap items-center gap-3">
              <ArrowLink href="/signup" tone="dark">
                Get started
              </ArrowLink>
              <JumpLink id="top" className="group flex h-[54px] items-center gap-2 rounded-full border border-line-strong bg-white px-5 text-[15px] font-medium transition-colors hover:border-ink">
                Back to top
                <Icon name="chevronDown" size={16} strokeWidth={2.2} className="rotate-180 transition-transform duration-500 group-hover:-translate-y-0.5" />
              </JumpLink>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-6 lg:col-start-7">
            <div data-reveal style={delay(60)} className={col}>
              <span className={head}>Explore</span>
              {(
                [
                  ["about", "About"],
                  ["tests", "Tests"],
                  ["how", "How it works"],
                  ["results", "Results"],
                  ["faq", "FAQ"],
                ] as const
              ).map(([id, label]) => (
                <JumpLink key={id} id={id} className={link}>
                  {label}
                </JumpLink>
              ))}
            </div>
            <div data-reveal style={delay(120)} className={col}>
              <span className={head}>Account</span>
              <Link href="/login" className={link}>
                Log in
              </Link>
              <Link href="/signup" className={link}>
                Sign up
              </Link>
              <Link href="/tests" className={link}>
                Browse tests
              </Link>
              <ContinueAsGuest className={cn(link, "text-left")} />
            </div>
            <div data-reveal style={delay(180)} className={col}>
              <span className={head}>Legal</span>
              <Link href="/settings/about" className={link}>
                Terms
              </Link>
              <Link href="/settings/about" className={link}>
                Privacy Policy
              </Link>
              <Link href="/settings/about" className={link}>
                About Visus
              </Link>
            </div>
          </div>
        </div>

        <div data-reveal className="mt-16 flex items-start gap-4 rounded-[24px] border border-line bg-white p-5 md:mt-20 md:items-center md:px-7">
          <span className="grid size-11 flex-none place-items-center rounded-full bg-doc-bg text-doc">
            <Icon name="alert" size={20} />
          </span>
          <p className="m-0 text-[15px] leading-relaxed text-ink-soft">
            <span className="font-semibold text-ink">Visus is a screening tool, not a diagnosis.</span> Sudden vision loss, flashes of light or eye pain? See a doctor now.
          </p>
        </div>
      </div>

      {/* Giant wordmark, letters rising one by one. */}
      <div aria-hidden className="mt-10 flex select-none justify-center px-3 md:mt-16">
        {"Visus".split("").map((c, i) => (
          <span
            key={i}
            data-reveal
            style={delay(i * 80)}
            className="inline-block bg-gradient-to-b from-ink via-ink/70 to-ink/0 bg-clip-text text-[27vw] font-semibold leading-[0.8] tracking-[-0.07em] text-transparent"
          >
            {c}
          </span>
        ))}
      </div>

      <div className="border-t border-line">
        <div className={cn(WRAP, "flex flex-col gap-2 py-6 text-[13px] text-muted sm:flex-row sm:justify-between")}>
          <span>© 2026 Visus. Built for ZEISS BeyondCode&apos;26.</span>
          <span>Screening, not diagnosis.</span>
        </div>
      </div>
    </footer>
  );
}

/* ───────────── Result: 3D stack ───────────── */

/** Three result cards in 3D. They sit stacked, then fan out as the section scrolls into view (--p from Motion). */
function ResultStack() {
  const fan = { "--f": "clamp(0, calc((var(--p, 0.6) - 0.15) / 0.35), 1)" } as CSSProperties;
  const card = "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2";
  return (
    <div data-scroll style={fan} className="relative h-[480px] scale-[.8] [perspective:1600px] sm:scale-100 md:h-[600px]">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,rgba(122,189,255,.35),transparent)]" />
      <div className="absolute inset-0 [transform-style:preserve-3d]" style={{ transform: "rotateX(calc(22deg - var(--f) * 14deg)) rotateY(calc(-18deg + var(--f) * 12deg))" }}>
        {/* Back: report */}
        <div className={cn(card, "w-[290px] rounded-[26px] border border-line bg-white p-5 shadow-[0_30px_60px_-30px_rgba(17,17,17,.3)]")} style={{ transform: "translate3d(calc(var(--f) * -170px), calc(var(--f) * -160px), -140px) rotate(calc(var(--f) * -9deg))" }}>
          <div className="flex items-center justify-between">
            <span className="grid size-10 place-items-center rounded-full bg-fill">
              <Icon name="doc" size={20} />
            </span>
            <Icon name="qr" size={34} strokeWidth={1.6} />
          </div>
          <div className="mt-5 text-[17px] font-medium">Report for your optician</div>
          <div className="mt-1 text-[13px] text-muted">Share a link or download a PDF.</div>
        </div>

        {/* Middle: lens */}
        <div className={cn(card, "w-[300px] rounded-[26px] bg-night p-5 text-white shadow-[0_30px_60px_-24px_rgba(5,8,14,.55)]")} style={{ transform: "translate3d(calc(var(--f) * 170px), calc(var(--f) * -70px), -60px) rotate(calc(var(--f) * 7deg))" }}>
          <div className="flex items-center justify-between">
            <span className="grid size-10 place-items-center rounded-full bg-white/10">
              <Icon name="glasses" size={20} />
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[12px] font-medium text-white/70">Suggested lens</span>
          </div>
          <div className="mt-5 text-[19px] font-medium tracking-[-0.01em]">ZEISS DuraVision DriveSafe</div>
          <div className="mt-1 text-[13px] text-white/55">Matched to your night-vision result.</div>
        </div>

        {/* Front: result */}
        <div className={cn(card, "w-[340px] rounded-[28px] border border-line bg-white p-5 shadow-[0_40px_80px_-30px_rgba(17,17,17,.4)]")} style={{ transform: "translate3d(0, calc(var(--f) * 80px), 40px)" }}>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-faint">Example result</span>
            <span className="flex h-7 items-center gap-1.5 rounded-full bg-fill px-2.5 text-[12px] font-semibold text-ink-soft">
              <Icon name="lock" size={12} strokeWidth={1.8} />
              Screening
            </span>
          </div>
          <div className="mt-4 text-[26px] font-medium leading-tight tracking-[-0.02em]">Mostly looks good</div>
          <div className="mt-1 text-[14px] text-muted">One thing worth a follow-up.</div>
          <div className="mt-4 flex flex-col rounded-[18px] border border-line">
            {(
              [
                ["Distance acuity", "good"],
                ["Near reading", "good"],
                ["Glare & night vision", "mild"],
              ] as const
            ).map(([name, status], i) => (
              <div key={name} className={cn("flex items-center gap-3 px-4 py-3", i > 0 && "border-t border-divider")}>
                <span className="flex-1 text-[14px] font-medium">{name}</span>
                <StatusBadge status={status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
