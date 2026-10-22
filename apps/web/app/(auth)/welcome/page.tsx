import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/Button";
import { ContinueAsGuest } from "@/components/GuestDialog";
import { Icon, type IconName } from "@/components/Icon";

const STEPS = [
  ["Tell us what's wrong", "Describe it in your own words, like “road signs look blurry at night”."],
  ["Take the tests it picks", "Sharpness, focus, contrast, colour. The plan adapts after every test."],
  ["Get a clear result", "What looks good, what to follow up, and ZEISS lenses that suit you."],
];

const AREAS: [IconName | "E", string, string][] = [
  ["E", "Clarity", "How sharp is my vision, far and near?"],
  ["focus", "Focus", "Are my glasses still right?"],
  ["health", "Eye health", "Signs worth a doctor’s look."],
  ["colour", "Colour", "Can I tell colours apart?"],
];

/** Screen 1, as a landing page: hero beside the illustration on desktop, stacked on phones. */
export default function Welcome() {
  return (
    <div className="min-h-dvh bg-pearl">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-5 py-3 md:px-8 md:py-4">
          <span className="text-[20px] font-bold tracking-[-0.01em] md:text-[22px]">Visus</span>
          <nav aria-label="Account" className="flex items-center gap-2">
            <a href="#how" className="hidden px-3.5 py-2.5 text-[15px] font-semibold text-muted hover:text-ink md:block">
              How it works
            </a>
            <Link href="/login" className="flex h-10 items-center rounded-[12px] border border-line-strong bg-white px-4 text-[15px] font-semibold hover:bg-[#FBFBF9] md:h-11 md:rounded-[14px]">
              Log in
            </Link>
            <Link href="/signup" className="hidden h-11 items-center rounded-[14px] bg-ink px-[18px] text-[15px] font-semibold text-white hover:bg-[#2a2a2a] md:flex">
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto flex max-w-[1200px] flex-col-reverse gap-6 px-5 pb-8 pt-6 md:flex-row md:items-center md:gap-12 md:px-8 md:pb-14 md:pt-[72px]">
          <div className="flex min-w-0 flex-1 flex-col items-start">
            <span className="flex h-8 items-center gap-2 rounded-full bg-pill px-3 text-[13px] font-semibold text-ink-soft md:h-[34px] md:px-3.5 md:text-[14px]">
              <Icon name="lock" size={16} strokeWidth={1.7} />
              Screening, not diagnosis
            </span>
            <h1 className="m-0 mt-4 max-w-[620px] text-hero font-bold leading-[1.06] tracking-[-0.03em] text-balance md:mt-[22px] md:text-[60px] md:leading-[1.04] md:tracking-[-0.035em]">
              Quick eye checks, right in your browser.
            </h1>
            <p className="m-0 mt-3.5 max-w-[520px] text-body leading-normal text-muted text-pretty md:mt-5 md:text-[20px]">
              Tell us what&apos;s bothering your eyes. An AI guide picks the right tests, you take them on this screen, and you get a clear result with ZEISS lens suggestions.
            </p>
            <div className="mt-6 flex w-full flex-col gap-3 md:mt-8 md:w-auto md:flex-row md:flex-wrap md:items-center">
              <Button href="/signup" arrow className="whitespace-nowrap md:px-7">
                Get started
              </Button>
              <Button href="/login" variant="secondary" className="whitespace-nowrap md:px-7">
                I have an account
              </Button>
              <ContinueAsGuest />
            </div>
            <div className="mt-7 hidden flex-wrap gap-6 text-[15px] text-muted md:flex">
              <span className="flex items-center gap-2">
                <Icon name="clock" size={18} color="#194F81" />
                About 5 minutes
              </span>
              <span className="flex items-center gap-2">
                <Icon name="eye" size={18} color="#194F81" />
                14 tests
              </span>
              <span className="flex items-center gap-2">
                <Icon name="kids" size={18} color="#194F81" />
                Kids mode for families
              </span>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 justify-center">
            <div className="flex h-[240px] w-full items-center justify-center rounded-[28px] border border-line bg-white p-5 md:aspect-[1.15] md:h-auto md:max-w-[540px] md:rounded-[32px] md:p-8">
              <Image src="/visus-eye.png" alt="Hand-drawn blue eye" width={960} height={717} priority className="h-full w-full object-contain" />
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-[1200px] px-5 pb-8 md:px-8 md:pb-14">
          <h2 className="m-0 text-[24px] font-bold tracking-[-0.02em] md:text-[32px] md:tracking-[-0.025em]">How a check works</h2>
          <ol className="m-0 mt-3.5 grid list-none grid-cols-1 gap-2.5 p-0 md:mt-6 md:grid-cols-3 md:gap-4">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="flex items-start gap-3.5 rounded-[20px] border border-line bg-white p-4 md:flex-col md:gap-2.5 md:p-6">
                <span className="grid size-8 flex-none place-items-center rounded-full bg-acc-soft text-[14px] font-bold text-acc-ink md:size-9 md:text-[15px]">{i + 1}</span>
                <span className="flex flex-col gap-1">
                  <span className="text-[16px] font-bold md:mt-1.5 md:text-[19px]">{title}</span>
                  <span className="text-[14px] leading-[1.45] text-muted md:text-[16px] md:leading-normal">{body}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-[1200px] px-5 pb-10 md:px-8 md:pb-14">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="m-0 text-[24px] font-bold tracking-[-0.02em] md:text-[32px] md:tracking-[-0.025em]">What you can check</h2>
            <Link href="/tests" className="text-[15px] font-semibold hover:text-muted md:text-[16px]">
              Browse all tests
            </Link>
          </div>
          <div className="mt-3.5 grid grid-cols-2 gap-2.5 md:mt-6 md:grid-cols-4 md:gap-4">
            {AREAS.map(([icon, name, q]) => (
              <div key={name} className="flex flex-col gap-1 rounded-[18px] border border-line bg-white p-4 md:rounded-[20px] md:p-5">
                {icon === "E" ? <span className="text-[24px] font-bold leading-none md:text-[28px]">E</span> : <Icon name={icon} size={26} />}
                <span className="mt-2.5 text-[16px] font-bold md:mt-3.5 md:text-[17px]">{name}</span>
                <span className="text-[13px] leading-[1.45] text-muted md:text-[14px]">{q}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-5 py-5 text-center text-[13px] text-muted md:flex-row md:justify-between md:px-8 md:py-7 md:text-left md:text-[14px]">
          <span>Visus is a screening tool, not a diagnosis. Sudden vision loss? See a doctor now.</span>
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
