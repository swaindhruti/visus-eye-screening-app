import { TEST_CATALOG, type TestId } from "@visus/shared";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/Chip";
import { cn } from "@/components/cn";
import { ContinueAsGuest } from "@/components/GuestDialog";
import { Icon, type IconName } from "@/components/Icon";
import { LandingNav } from "@/components/LandingNav";
import { TestPreview } from "@/components/TestArt";

const STATS: [string, string][] = [
  ["~5 min", "for a full check"],
  [String(TEST_CATALOG.length), "guided vision tests"],
  ["Kids mode", "for the whole family"],
  ["ZEISS", "lens suggestions"],
];

const AREAS: { id: TestId; icon: IconName | "E"; name: string; q: string; className?: string }[] = [
  { id: "tumbling_e", icon: "E", name: "Clarity", q: "How sharp is my vision, far and near?", className: "col-span-2 md:row-span-2" },
  { id: "clock_dial", icon: "focus", name: "Focus", q: "Are my glasses still right?" },
  { id: "amsler", icon: "health", name: "Eye health", q: "Signs worth a doctor’s look." },
  { id: "colour_plates", icon: "colour", name: "Colour", q: "Can I tell colours apart?", className: "col-span-2" },
];

const OUTCOMES: [IconName, string, string][] = [
  ["checkLg", "What looks good", "Each test gets a plain-language result, eye by eye."],
  ["alert", "What to follow up", "Anything worth an optician’s or doctor’s look, and how soon."],
  ["glasses", "Lenses that suit you", "ZEISS lens suggestions matched to your results and habits."],
];

const Eyebrow = ({ children }: { children: ReactNode }) => (
  <span className="flex h-[30px] items-center gap-2 self-start rounded-full border border-line-strong bg-white px-3 text-[13px] font-semibold text-ink-soft">
    <span className="size-1.5 rounded-full bg-acc" />
    {children}
  </span>
);

const H2 = ({ children, className }: { children: ReactNode; className?: string }) => (
  <h2 className={cn("m-0 mt-4 text-[30px] font-bold leading-[1.08] tracking-[-0.025em] text-balance md:text-[44px] md:tracking-[-0.03em]", className)}>{children}</h2>
);

/** Round icon chip, as on Home's quick-check row. */
const Chip = ({ icon, className }: { icon: IconName | "E"; className?: string }) => (
  <span className={cn("grid size-10 flex-none place-items-center rounded-full bg-acc-soft text-[17px] font-bold text-acc-ink", className)}>
    {icon === "E" ? "E" : <Icon name={icon} size={20} />}
  </span>
);

/** Screen 1, as a landing page: floating capsule nav, hero, how it works, test areas, result preview. */
export default function Welcome() {
  return (
    <div className="min-h-dvh overflow-x-clip bg-pearl">
      <LandingNav />

      <main>
        {/* Hero */}
        <section id="top" className="relative mx-auto max-w-[1200px] px-5 pb-12 pt-24 md:px-8 md:pb-20 md:pt-36">
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(122,189,255,.22),transparent)]" />
          <div className="relative flex flex-col-reverse gap-10 lg:flex-row lg:items-center lg:gap-14">
            <div className="flex min-w-0 flex-1 animate-rise flex-col items-start">
              <span className="flex h-[34px] items-center gap-2 rounded-full bg-pill px-3.5 text-[14px] font-semibold text-ink-soft">
                <Icon name="lock" size={16} strokeWidth={1.7} />
                Screening, not diagnosis
              </span>
              <h1 className="m-0 mt-5 max-w-[640px] text-hero font-bold leading-[1.04] tracking-[-0.03em] text-balance md:mt-6 md:text-[64px] md:tracking-[-0.04em] lg:text-[70px]">
                Quick eye checks, <span className="text-faint">right in your browser.</span>
              </h1>
              <p className="m-0 mt-4 max-w-[520px] text-body leading-normal text-muted text-pretty md:mt-6 md:text-[20px]">
                Tell us what&apos;s bothering your eyes. An AI guide picks the right tests, you take them on this screen, and you get a clear result with ZEISS lens suggestions.
              </p>
              <div className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center md:mt-9">
                <Button href="/signup" arrow className="whitespace-nowrap rounded-full! sm:px-7">
                  Get started
                </Button>
                <Button href="/login" variant="secondary" className="whitespace-nowrap rounded-full! sm:px-7">
                  I have an account
                </Button>
                <ContinueAsGuest />
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[15px] text-muted">
                <span className="flex items-center gap-2">
                  <Icon name="clock" size={18} color="#194F81" />
                  About 5 minutes
                </span>
                <span className="flex items-center gap-2">
                  <Icon name="sparkle" size={18} color="#194F81" />
                  Plan adapts after every test
                </span>
                <span className="flex items-center gap-2">
                  <Icon name="kids" size={18} color="#194F81" />
                  Kids mode
                </span>
              </div>
            </div>

            <div className="relative min-w-0 flex-1 animate-rise [animation-delay:120ms]">
              <div className="relative mx-auto aspect-[1.2] w-full max-w-[560px] rounded-[32px] border border-line bg-white p-6 shadow-[0_30px_80px_-30px_rgba(25,79,129,.25)] md:rounded-[40px] md:p-10">
                <Image src="/visus-eye.png" alt="Hand-drawn blue eye" width={960} height={717} priority className="h-full w-full object-contain" />

                {/* Floating cards, echoing the app's Home screen. */}
                <div className="absolute -top-5 left-4 hidden w-[230px] animate-float rounded-[22px] bg-night p-4 text-white shadow-[0_18px_40px_rgba(17,17,17,.25)] sm:block lg:-left-10">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="flex h-6 items-center gap-1.5 rounded-full bg-white/10 px-2.5 font-semibold">
                      <span className="size-1.5 rounded-full bg-acc-bright" />
                      Due today
                    </span>
                    <span className="text-white/60">About 5 min</span>
                  </div>
                  <div className="mt-3 text-[17px] font-bold leading-tight tracking-[-0.01em]">Time for your eye check</div>
                  <div className="mt-3 flex h-9 items-center justify-center gap-1.5 rounded-[12px] bg-white text-[14px] font-semibold text-ink">
                    Start eye check
                    <Icon name="arrowRight" size={16} strokeWidth={2.2} />
                  </div>
                </div>

                <div className="absolute -bottom-6 right-4 hidden w-[250px] animate-float rounded-[20px] border border-line bg-white p-3.5 shadow-[0_18px_40px_rgba(17,17,17,.10)] [animation-delay:-3s] sm:block lg:-right-8">
                  <div className="flex items-center gap-3">
                    <Chip icon="E" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-bold">Distance acuity</div>
                      <div className="text-[13px] text-muted">Right eye · 3 min</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-divider pt-3">
                    <span className="text-[13px] text-muted">Result</span>
                    <StatusBadge status="good" />
                  </div>
                </div>

                <span className="absolute right-4 top-4 flex h-8 items-center gap-1.5 rounded-full bg-acc-soft px-3 text-[13px] font-semibold text-acc-ink md:right-6 md:top-6">
                  <Icon name="sparkle" size={14} />
                  AI-guided
                </span>
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="relative mt-14 grid grid-cols-2 overflow-hidden rounded-[24px] border border-line bg-white md:mt-24 md:grid-cols-4">
            {STATS.map(([value, label], i) => (
              <div key={label} className={cn("flex flex-col gap-1 px-5 py-5 md:px-7 md:py-6", i % 2 === 1 && "border-l border-divider", i >= 2 && "border-t border-divider md:border-t-0", i === 2 && "md:border-l")}>
                <span className="text-[24px] font-bold tracking-[-0.02em] md:text-[30px]">{value}</span>
                <span className="text-[14px] text-muted md:text-[15px]">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-[1200px] scroll-mt-24 px-5 py-12 md:px-8 md:py-20">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-10">
            <div className="flex flex-col">
              <Eyebrow>How it works</Eyebrow>
              <H2>Three steps to a clear answer.</H2>
            </div>
            <p className="m-0 max-w-[420px] text-[16px] leading-normal text-muted text-pretty md:text-[18px]">
              No fixed test list. The guide listens, picks what matters for you, and re-plans after every test.
            </p>
          </div>

          <ol className="m-0 mt-8 grid list-none grid-cols-1 gap-4 p-0 md:mt-12 md:grid-cols-3 md:gap-5">
            <Step n={1} title="Tell us what’s wrong" body="Describe it in your own words, like “road signs look blurry at night”.">
              <div className="flex flex-col gap-2">
                <span className="max-w-[85%] self-end rounded-[18px] rounded-br-[6px] bg-ink px-3.5 py-2.5 text-[14px] leading-snug text-white">Road signs look blurry at night</span>
                <span className="flex max-w-[90%] items-start gap-2 self-start rounded-[18px] rounded-bl-[6px] border border-line bg-white px-3.5 py-2.5 text-[14px] leading-snug text-ink-soft">
                  <Icon name="sparkle" size={14} color="#3C7EBE" className="mt-[3px] flex-none" />
                  Let&apos;s start with distance sharpness.
                </span>
              </div>
            </Step>
            <Step n={2} title="Take the tests it picks" body="Sharpness, focus, contrast, colour. The plan adapts after every test.">
              <div className="flex flex-col gap-2">
                {(
                  [
                    ["Distance acuity", "done"],
                    ["Contrast sensitivity", "now"],
                    ["Glare & night vision", "next"],
                  ] as const
                ).map(([name, state]) => (
                  <span key={name} className={cn("flex h-10 items-center gap-2.5 rounded-[12px] border bg-white px-3 text-[14px] font-semibold", state === "now" ? "border-acc text-ink" : "border-line text-muted")}>
                    <span className={cn("grid size-5 place-items-center rounded-full", state === "done" ? "bg-good-bg text-good" : state === "now" ? "bg-acc-soft" : "bg-fill")}>
                      {state === "done" ? <Icon name="check" size={11} strokeWidth={2.4} /> : state === "now" && <span className="size-1.5 rounded-full bg-acc" />}
                    </span>
                    {name}
                  </span>
                ))}
              </div>
            </Step>
            <Step n={3} title="Get a clear result" body="What looks good, what to follow up, and ZEISS lenses that suit you.">
              <div className="flex flex-col gap-2 rounded-[14px] border border-line bg-white p-3">
                <div className="flex items-center justify-between text-[14px] font-semibold">
                  Sharpness <StatusBadge status="good" />
                </div>
                <div className="flex items-center justify-between border-t border-divider pt-2 text-[14px] font-semibold">
                  Night vision <StatusBadge status="mild" />
                </div>
              </div>
            </Step>
          </ol>
        </section>

        {/* What you can check */}
        <section id="check" className="mx-auto max-w-[1200px] scroll-mt-24 px-5 py-12 md:px-8 md:py-20">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col">
              <Eyebrow>What you can check</Eyebrow>
              <H2>Clinical tests, made simple.</H2>
            </div>
            <Link href="/tests" className="flex h-11 items-center gap-1.5 self-start rounded-full border border-line-strong bg-white px-5 text-[15px] font-semibold hover:bg-card-hover md:self-auto">
              Browse all tests
              <Icon name="chevronRight" size={16} strokeWidth={2.2} />
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 md:mt-12 md:grid-cols-4 md:gap-5">
            {AREAS.map((a) => (
              <div key={a.id} className={cn("group flex flex-col gap-4 rounded-[24px] border border-line bg-white p-3 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong md:p-4", a.className)}>
                <div className="grid min-h-[170px] flex-1 place-items-center overflow-hidden rounded-[18px] bg-white p-4 ring-1 ring-line md:min-h-[190px]">
                  <div className={cn("origin-center", a.id === "tumbling_e" ? "md:scale-125" : "scale-[.85] md:scale-100")}>
                    <TestPreview id={a.id} />
                  </div>
                </div>
                <div className="flex items-start gap-3 px-1 pb-1">
                  <Chip icon={a.icon} className="hidden sm:grid" />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[16px] font-bold md:text-[18px]">{a.name}</span>
                    <span className="text-[13px] leading-[1.45] text-muted md:text-[14px]">{a.q}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {TEST_CATALOG.map((t) => (
              <span key={t.id} className="flex h-8 items-center rounded-full bg-pill px-3 text-[13px] font-semibold text-ink-soft">
                {t.name}
              </span>
            ))}
          </div>
        </section>

        {/* Result preview */}
        <section id="results" className="mx-auto max-w-[1200px] scroll-mt-24 px-5 py-12 md:px-8 md:py-20">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col">
              <Eyebrow>Your result</Eyebrow>
              <H2>A clear answer, not a wall of numbers.</H2>
              <p className="m-0 mt-4 max-w-[480px] text-[16px] leading-normal text-muted text-pretty md:text-[18px]">
                Every check ends with a verdict you can understand and share with your optician or doctor.
              </p>
              <ul className="m-0 mt-8 flex list-none flex-col gap-5 p-0">
                {OUTCOMES.map(([icon, title, body]) => (
                  <li key={title} className="flex items-start gap-4">
                    <Chip icon={icon} />
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[17px] font-bold">{title}</span>
                      <span className="text-[15px] leading-normal text-muted">{body}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div aria-hidden className="pointer-events-none absolute -inset-8 rounded-[48px] bg-[radial-gradient(closest-side,rgba(122,189,255,.25),transparent)]" />
              <div className="relative mx-auto flex max-w-[480px] flex-col gap-4 rounded-[32px] border border-line bg-white p-5 shadow-[0_30px_80px_-30px_rgba(17,17,17,.18)] md:p-7">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-faint">Example result</span>
                  <span className="flex h-7 items-center gap-1.5 rounded-full bg-fill px-2.5 text-[12px] font-semibold text-ink-soft">
                    <Icon name="lock" size={12} strokeWidth={1.8} />
                    Screening
                  </span>
                </div>
                <div>
                  <div className="text-[26px] font-bold leading-tight tracking-[-0.02em]">Mostly looks good</div>
                  <div className="mt-1 text-[15px] text-muted">One thing worth a follow-up.</div>
                </div>
                <div className="flex flex-col rounded-[18px] border border-line">
                  {(
                    [
                      ["tumbling_e", "Distance acuity", "good"],
                      ["near_reading", "Near reading", "good"],
                      ["contrast", "Contrast sensitivity", "mild"],
                    ] as const
                  ).map(([id, name, status], i) => (
                    <div key={id} className={cn("flex items-center gap-3 px-4 py-3", i > 0 && "border-t border-divider")}>
                      <span className="flex-1 text-[15px] font-semibold">{name}</span>
                      <StatusBadge status={status} />
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 rounded-[18px] bg-acc-soft p-4 text-acc-ink">
                  <span className="grid size-10 flex-none place-items-center rounded-full bg-white">
                    <Icon name="glasses" size={20} />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[13px] font-semibold opacity-80">Suggested lens</span>
                    <span className="text-[16px] font-bold">ZEISS DuraVision DriveSafe</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Closing CTA, as the dark hero card on Home. */}
        <section className="mx-auto max-w-[1200px] px-5 pb-12 pt-4 md:px-8 md:pb-20">
          <div className="relative overflow-hidden rounded-[32px] bg-night px-6 py-10 text-white md:rounded-[40px] md:px-14 md:py-16">
            <div aria-hidden className="pointer-events-none absolute -right-24 -top-32 size-[460px] rounded-full bg-[radial-gradient(closest-side,rgba(122,189,255,.28),transparent)]" />
            <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col items-start">
                <span className="flex h-7 items-center gap-1.5 rounded-full bg-white/10 px-3 text-[13px] font-semibold">
                  <span className="size-1.5 rounded-full bg-acc-bright" />
                  About 5 minutes
                </span>
                <h2 className="m-0 mt-5 max-w-[560px] text-[32px] font-bold leading-[1.06] tracking-[-0.03em] text-balance md:text-[52px]">Time for your eye check.</h2>
                <p className="m-0 mt-3 max-w-[460px] text-[16px] leading-normal text-white/65 md:text-[18px]">Sharpness, focus, colour and contrast. All you need is this screen.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button href="/signup" variant="inverted" arrow className="whitespace-nowrap rounded-full! sm:px-7">
                  Get started
                </Button>
                <Link href="/login" className="flex h-btn items-center justify-center whitespace-nowrap rounded-full border border-white/25 px-7 text-btn font-semibold text-white transition-colors hover:bg-white/10">
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-4 px-5 py-6 text-center text-[13px] text-muted md:flex-row md:justify-between md:px-8 md:py-8 md:text-left md:text-[14px]">
          <span className="flex items-center gap-2 text-ink">
            <span className="grid size-7 place-items-center rounded-full bg-ink text-white">
              <Icon name="eye" size={15} strokeWidth={2} />
            </span>
            <span className="text-[16px] font-bold">Visus</span>
          </span>
          <span className="max-w-[520px] text-pretty">Visus is a screening tool, not a diagnosis. Sudden vision loss? See a doctor now.</span>
          <span className="flex justify-center gap-5">
            <Link href="/settings/about" className="font-semibold text-ink">
              Terms
            </Link>
            <Link href="/settings/about" className="font-semibold text-ink">
              Privacy Policy
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}

function Step({ n, title, body, children }: { n: number; title: string; body: string; children: ReactNode }) {
  return (
    <li className="flex flex-col rounded-[24px] border border-line bg-white p-3 md:p-4">
      <div className="flex min-h-[150px] flex-col justify-center rounded-[18px] bg-pearl p-4">{children}</div>
      <div className="flex items-start gap-3 px-1 pb-1 pt-4">
        <span className="grid size-8 flex-none place-items-center rounded-full bg-ink text-[14px] font-bold text-white">{n}</span>
        <span className="flex flex-col gap-1">
          <span className="text-[17px] font-bold md:text-[19px]">{title}</span>
          <span className="text-[14px] leading-[1.5] text-muted md:text-[15px]">{body}</span>
        </span>
      </div>
    </li>
  );
}
