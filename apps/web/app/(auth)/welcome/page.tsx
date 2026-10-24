import { TEST_CATALOG } from "@visus/shared";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { StatusBadge } from "@/components/Chip";
import { cn } from "@/components/cn";
import { ContinueAsGuest } from "@/components/GuestDialog";
import { Icon, type IconName } from "@/components/Icon";
import { HeroStage } from "@/components/landing/HeroStage";
import { Iris } from "@/components/landing/Iris";
import { Motion } from "@/components/landing/Motion";
import { LandingNav } from "@/components/landing/Nav";
import { Steps } from "@/components/landing/Steps";
import { TestRail } from "@/components/landing/TestRail";

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

/** Pill link with a round arrow, as in the navbar's Sign up. */
function ArrowLink({ href, children, tone, className, style }: { href: string; children: ReactNode; tone: "light" | "dark"; className?: string; style?: CSSProperties }) {
  return (
    <Link
      href={href}
      style={style}
      className={cn(
        "group flex h-[52px] items-center justify-between gap-3 whitespace-nowrap rounded-full pl-6 pr-1.5 text-[16px] font-medium transition-colors",
        tone === "light" ? "bg-white text-ink hover:bg-white/90" : "bg-ink text-white hover:bg-[#2a2a2a]",
        className,
      )}
    >
      {children}
      <span className={cn("grid size-10 place-items-center rounded-full transition-transform duration-300 group-hover:rotate-[-45deg]", tone === "light" ? "bg-ink text-white" : "bg-white text-ink")}>
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

const H2 = ({ children, className }: { children: ReactNode; className?: string }) => (
  <h2 data-reveal className={cn("m-0 text-[34px] font-medium leading-[1.04] tracking-[-0.035em] text-balance md:text-[56px]", className)}>
    {children}
  </h2>
);

const Tag = ({ children }: { children: ReactNode }) => <span className="flex h-9 items-center rounded-full border border-line-strong bg-white px-4 text-[13px] font-medium text-ink-soft">{children}</span>;

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/** Screen 1, as a landing page. Motion: entry animations in the hero, scroll reveals, a pinned "How it works". */
export default function Welcome() {
  return (
    <div className="landing min-h-dvh overflow-x-clip bg-pearl">
      <Motion />
      <LandingNav />

      <main>
        {/* ───────────── Hero ───────────── */}
        <section id="top" data-scroll="exit" className="relative px-3 pt-3">
          <div className="relative min-h-[calc(100svh-24px)] overflow-hidden rounded-[28px] bg-[radial-gradient(90%_80%_at_72%_45%,#123a63_0%,#0a1b30_40%,#05080e_100%)] text-white md:rounded-[36px]">
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,.07)_1px,transparent_0)] [background-size:28px_28px] [mask-image:radial-gradient(60%_60%_at_70%_50%,black,transparent)]" />

            <div className="absolute left-1/2 top-[7%] aspect-square w-[122vw] max-w-[680px] -translate-x-1/2 lg:left-auto lg:right-[-3%] lg:top-1/2 lg:w-[min(94vh,880px)] lg:max-w-none lg:-translate-y-1/2 lg:translate-x-0">
              <div className="size-full" style={{ transform: "translateY(calc(var(--p, 0) * 22%)) scale(calc(1 + var(--p, 0) * 0.15))", opacity: "calc(1 - var(--p, 0) * 0.7)" }}>
                <HeroStage />
              </div>
            </div>

            <div aria-hidden className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-[#05080e] via-[#05080e]/85 to-transparent lg:inset-y-0 lg:left-0 lg:right-auto lg:h-auto lg:w-[55%] lg:bg-gradient-to-r lg:via-[#05080e]/50" />

            <div className="relative z-10 mx-auto flex min-h-[calc(100svh-24px)] max-w-[1240px] flex-col justify-end px-5 pb-8 pt-28 md:px-10 md:pb-12 lg:justify-center lg:pb-28">
              <div style={{ transform: "translateY(calc(var(--p, 0) * -80px))", opacity: "calc(1 - var(--p, 0) * 1.8)" }}>
                <span className="flex h-8 animate-rise items-center gap-2 self-start rounded-full border border-white/15 bg-white/[.07] px-3.5 text-[13px] font-medium text-white/85 backdrop-blur-md [animation-delay:200ms] w-fit">
                  <Icon name="lock" size={14} strokeWidth={1.7} />
                  Screening, not diagnosis
                </span>

                <h1 className="m-0 mt-6 max-w-[780px] text-[44px] font-medium leading-[1.02] tracking-[-0.04em] sm:text-[56px] lg:text-[72px]">
                  {["Quick eye checks,", "right in your browser."].map((line, i) => (
                    <span key={line} className="block overflow-hidden pb-[0.08em]">
                      <span className={cn("block animate-line", i === 1 && "text-white/45")} style={{ animationDelay: `${350 + i * 140}ms` }}>
                        {line}
                      </span>
                    </span>
                  ))}
                </h1>

                <p className="m-0 mt-5 max-w-[520px] animate-rise text-[16px] leading-relaxed text-white/65 text-pretty [animation-delay:700ms] md:text-[19px]">
                  Tell us what&apos;s bothering your eyes. An AI guide picks the right tests, you take them on this screen, and you get a clear result with ZEISS lens suggestions.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <ArrowLink href="/signup" tone="light" className="animate-rise [animation-delay:850ms]">
                    Get started
                  </ArrowLink>
                  <Link
                    href="/login"
                    className="flex h-[52px] animate-rise items-center justify-center whitespace-nowrap rounded-full border border-white/20 bg-white/[.06] px-6 text-[16px] font-medium backdrop-blur-md transition-colors [animation-delay:930ms] hover:bg-white/15"
                  >
                    I have an account
                  </Link>
                  <ContinueAsGuest className="h-11 animate-rise self-center whitespace-nowrap px-3 text-[15px] font-medium text-white/60 underline-offset-4 [animation-delay:1010ms] hover:text-white hover:underline sm:self-auto" />
                </div>

                <dl className="m-0 mt-10 flex animate-rise flex-wrap gap-x-8 gap-y-4 [animation-delay:1150ms] md:mt-14">
                  {[
                    ["~5 min", "per check"],
                    [String(TEST_CATALOG.length), "guided tests"],
                    ["ZEISS", "lens suggestions"],
                  ].map(([v, l], i) => (
                    <div key={l} className={cn("flex flex-col", i > 0 && "border-l border-white/15 pl-8")}>
                      <dt className="text-[22px] font-medium tracking-[-0.02em] md:text-[26px]">{v}</dt>
                      <dd className="m-0 text-[13px] text-white/50">{l}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            <div aria-hidden className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 animate-rise flex-col items-center gap-2 text-[11px] font-medium uppercase tracking-[0.25em] text-white/40 [animation-delay:1500ms] lg:flex">
              Scroll
              <span className="h-10 w-px animate-float bg-gradient-to-b from-white/60 to-transparent" />
            </div>
          </div>
        </section>

        {/* ───────────── Statement ───────────── */}
        <section className="mx-auto max-w-[1200px] px-5 py-24 md:px-8 md:py-40">
          <div className="grid gap-8 lg:grid-cols-[240px_1fr] lg:gap-12">
            <Label n="01">About Visus</Label>
            <div>
              <p data-scroll className="m-0 text-[28px] font-medium leading-[1.2] tracking-[-0.03em] md:text-[46px] md:leading-[1.15]">
                {STATEMENT.map((w, i) => (
                  <span key={i} className="transition-opacity duration-300" style={{ opacity: `clamp(0.14, calc((var(--p, 1) - 0.12) / 0.4 * ${STATEMENT.length} - ${i}), 1)` }}>
                    {w}{" "}
                  </span>
                ))}
              </p>
              <div data-reveal className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between md:mt-14">
                <div className="flex flex-wrap gap-2">
                  <Tag>Scored on our server</Tag>
                  <Tag>Rule-based red flags</Tag>
                  <Tag>Kids mode</Tag>
                </div>
                <ArrowLink href="/tests" tone="dark" className="self-start">
                  Browse all tests
                </ArrowLink>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────── Tests rail ───────────── */}
        <section id="tests" className="scroll-mt-20 pb-24 md:pb-36">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 md:px-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-5">
              <Label n="02">The tests</Label>
              <H2 className="max-w-[640px]">Clinical tests, made simple enough for anyone.</H2>
            </div>
            <p data-reveal style={delay(120)} className="m-0 max-w-[380px] text-[16px] leading-relaxed text-muted md:text-[18px]">
              Sharpness, focus, contrast, colour and eye health. Plain white screens and black symbols, just like at the optician.
            </p>
          </div>
          <div className="mt-10 md:mt-14">
            <TestRail />
          </div>
        </section>

        {/* ───────────── How it works (pinned) ───────────── */}
        <Steps />

        {/* ───────────── Split: trust ───────────── */}
        <section className="mx-auto max-w-[1200px] px-5 py-24 md:px-8 md:py-36">
          <div className="grid overflow-hidden rounded-[32px] border border-line bg-white lg:grid-cols-2">
            <div className="flex flex-col justify-between gap-10 p-7 md:p-12">
              <div className="flex flex-col gap-5">
                <Label n="03">Why trust it</Label>
                <H2 className="text-[30px] md:text-[44px]">Screening you can rely on. Not a diagnosis.</H2>
              </div>
              <div data-reveal style={delay(150)} className="flex flex-wrap gap-2">
                <Tag>Calibrated to your screen</Tag>
                <Tag>One eye at a time</Tag>
                <Tag>Doctor-ready report</Tag>
              </div>
            </div>
            <div className="flex flex-col justify-between gap-10 border-t border-line p-7 md:p-12 lg:border-l lg:border-t-0">
              <p data-reveal style={delay(100)} className="m-0 text-[20px] leading-[1.45] tracking-[-0.01em] text-ink-soft md:text-[24px]">
                Visus measures how you see today and points out what&apos;s worth a professional look. Scores and red flags come from fixed rules on our server. The AI plans your tests and only steps in when the rules can&apos;t decide.
              </p>
              <div data-reveal style={delay(200)}>
                <ArrowLink href="/settings/about" tone="dark" className="w-fit">
                  About Visus
                </ArrowLink>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────── Result: 3D stack ───────────── */}
        <section id="results" className="mx-auto max-w-[1200px] scroll-mt-20 px-5 pb-24 md:px-8 md:pb-36">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-[1fr_1.1fr]">
            <div className="flex flex-col gap-5">
              <Label n="04">Your result</Label>
              <H2>A clear answer, not a wall of numbers.</H2>
              <ul className="m-0 mt-6 flex list-none flex-col p-0">
                {OUTCOMES.map(([icon, title, body], i) => (
                  <li key={title} data-reveal style={delay(i * 120)} className="flex items-start gap-4 border-t border-line py-5">
                    <span className="grid size-11 flex-none place-items-center rounded-full bg-acc-soft text-acc-ink">
                      <Icon name={icon} size={20} />
                    </span>
                    <span className="flex flex-col gap-1">
                      <span className="text-[18px] font-medium">{title}</span>
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
        <section id="faq" className="scroll-mt-20 border-t border-line bg-white">
          <div className="mx-auto grid max-w-[1200px] gap-12 px-5 py-24 md:px-8 md:py-36 lg:grid-cols-[1fr_1.3fr] lg:gap-20">
            <div className="flex flex-col justify-between gap-10">
              <div className="flex flex-col gap-5">
                <Label n="05">Questions</Label>
                <H2>Answers that help you feel confident.</H2>
              </div>
              <div data-reveal className="flex flex-col gap-4">
                <span className="text-[15px] text-muted">Want the full story?</span>
                <ArrowLink href="/settings/about" tone="dark" className="w-fit">
                  Read about Visus
                </ArrowLink>
              </div>
            </div>
            <div className="border-b border-line">
              {FAQ.map(([q, a], i) => (
                <details key={q} data-reveal style={delay(i * 60)} className="group border-t border-line">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-[18px] font-medium tracking-[-0.01em] md:text-[21px] [&::-webkit-details-marker]:hidden">
                    {q}
                    <span className="grid size-10 flex-none place-items-center rounded-full border border-line-strong transition-[transform,background-color,color] duration-300 group-open:rotate-45 group-open:bg-ink group-open:text-white">
                      <Icon name="plus" size={18} />
                    </span>
                  </summary>
                  <p className="m-0 max-w-[600px] pb-7 pr-14 text-[16px] leading-relaxed text-muted">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────── Closing CTA ───────────── */}
        <section className="px-3 pb-3 pt-3">
          <div data-scroll className="relative overflow-hidden rounded-[28px] bg-[radial-gradient(80%_100%_at_80%_60%,#123a63_0%,#0a1b30_45%,#05080e_100%)] text-white md:rounded-[36px]">
            <div aria-hidden className="absolute -right-[30%] top-1/2 aspect-square w-[110vw] max-w-[900px] -translate-y-1/2 sm:-right-[12%] sm:w-[70vw]">
              <div className="size-full opacity-80" style={{ transform: "rotate(calc(var(--p, .5) * 60deg)) scale(calc(0.85 + var(--p, .5) * 0.3))" }}>
                <div className="absolute inset-0 rounded-full border border-white/10" />
                <div className="absolute inset-[8%] rounded-full border border-dashed border-white/10" />
                <div className="absolute inset-[16%]">
                  <Iris id="cta-iris" still className="size-full" />
                </div>
              </div>
            </div>
            <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#05080e] via-[#05080e]/70 to-transparent" />
            <div className="relative mx-auto flex min-h-[520px] max-w-[1240px] flex-col justify-center px-6 py-16 md:min-h-[640px] md:px-10">
              <span data-reveal className="flex h-8 w-fit items-center gap-2 rounded-full border border-white/15 bg-white/[.07] px-3.5 text-[13px] font-medium text-white/85">
                <span className="size-1.5 rounded-full bg-acc-bright" />
                About 5 minutes
              </span>
              <h2 data-reveal style={delay(100)} className="m-0 mt-6 max-w-[640px] text-[38px] font-medium leading-[1.03] tracking-[-0.04em] text-balance md:text-[68px]">
                Better eye care starts with one quick check.
              </h2>
              <p data-reveal style={delay(200)} className="m-0 mt-5 max-w-[460px] text-[16px] leading-relaxed text-white/60 md:text-[18px]">
                Sharpness, focus, colour and contrast. All you need is this screen.
              </p>
              <div data-reveal style={delay(300)} className="mt-9 flex flex-col gap-3 sm:flex-row">
                <ArrowLink href="/signup" tone="light">
                  Get started
                </ArrowLink>
                <Link href="/login" className="flex h-[52px] items-center justify-center rounded-full border border-white/20 bg-white/[.06] px-6 text-[16px] font-medium backdrop-blur-md transition-colors hover:bg-white/15">
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-8 md:py-20">
          <div className="flex flex-col gap-4">
            <span className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-full bg-ink text-white">
                <Icon name="eye" size={18} strokeWidth={2} />
              </span>
              <span className="text-[19px] font-semibold">Visus</span>
            </span>
            <p className="m-0 max-w-[300px] text-[14px] leading-relaxed text-muted">AI-guided eye screening in your browser. Screening, not diagnosis. Sudden vision loss? See a doctor now.</p>
          </div>
          <FooterCol
            title="Explore"
            links={[
              ["#tests", "Tests"],
              ["#how", "How it works"],
              ["#results", "Results"],
              ["#faq", "FAQ"],
            ]}
          />
          <FooterCol
            title="Account"
            links={[
              ["/signup", "Sign up"],
              ["/login", "Log in"],
              ["/tests", "Browse tests"],
            ]}
          />
          <FooterCol
            title="Legal"
            links={[
              ["/settings/about", "Terms"],
              ["/settings/about", "Privacy Policy"],
            ]}
          />
        </div>
        <div className="bg-night">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-5 py-5 text-[13px] text-white/50 sm:flex-row sm:justify-between md:px-8">
            <span>© 2026 Visus. Built for ZEISS BeyondCode&apos;26.</span>
            <span>Screening, not diagnosis.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-[14px] font-semibold">{title}</span>
      {links.map(([href, label]) => (
        <Link key={label} href={href} className="w-fit text-[14px] text-muted transition-colors hover:text-ink">
          {label}
        </Link>
      ))}
    </div>
  );
}

/** Three result cards in 3D. They sit stacked, then fan out as the section scrolls into view (--p from Motion). */
function ResultStack() {
  const fan = { "--f": "clamp(0, calc((var(--p, 0.6) - 0.15) / 0.35), 1)" } as CSSProperties;
  const card = "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 ease-out";
  return (
    <div data-scroll style={fan} className="relative h-[480px] scale-[.82] [perspective:1600px] sm:scale-100 md:h-[540px]">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,rgba(122,189,255,.35),transparent)]" />
      <div className="absolute inset-0 [transform-style:preserve-3d]" style={{ transform: "rotateX(calc(22deg - var(--f) * 14deg)) rotateY(calc(-18deg + var(--f) * 12deg))" }}>
        {/* Back: report */}
        <div className={cn(card, "w-[280px] rounded-[26px] border border-line bg-white p-5 shadow-[0_30px_60px_-30px_rgba(17,17,17,.3)]")} style={{ transform: "translate3d(calc(var(--f) * -150px), calc(var(--f) * -150px), -140px) rotate(calc(var(--f) * -9deg))" }}>
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
        <div className={cn(card, "w-[290px] rounded-[26px] bg-night p-5 text-white shadow-[0_30px_60px_-24px_rgba(5,8,14,.55)]")} style={{ transform: "translate3d(calc(var(--f) * 150px), calc(var(--f) * -60px), -60px) rotate(calc(var(--f) * 7deg))" }}>
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
        <div className={cn(card, "w-[330px] rounded-[28px] border border-line bg-white p-5 shadow-[0_40px_80px_-30px_rgba(17,17,17,.4)]")} style={{ transform: "translate3d(0, calc(var(--f) * 70px), 40px)" }}>
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
