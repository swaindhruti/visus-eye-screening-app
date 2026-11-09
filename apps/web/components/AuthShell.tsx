import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "./cn";
import { Icon, type IconName } from "./Icon";
import { Iris } from "./landing/Iris";

/**
 * Layout for log in, sign up, onboarding and permissions.
 * Desktop: a dark iris panel on the left (as on the landing hero) and the form on the right.
 * Phones: just the light form column, so nothing gets in the way of typing.
 */
export function AuthShell({ panel, children }: { panel: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-pearl lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <aside className="sticky top-4 m-4 hidden h-[calc(100dvh-32px)] flex-col justify-between overflow-hidden rounded-[36px] bg-[radial-gradient(90%_80%_at_70%_70%,#123a63_0%,#0a1b30_45%,#05080e_100%)] p-10 text-white lg:flex xl:p-12">
        <div aria-hidden className="pointer-events-none absolute -bottom-[18%] -right-[22%] aspect-square w-[85%] opacity-90">
          <div className="absolute inset-0 rounded-full border border-white/10" />
          <div className="absolute inset-[7%] rounded-full border border-dashed border-white/10" />
          <div className="absolute inset-[14%]">
            <Iris id="auth-iris" className="size-full" />
          </div>
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#05080e] via-[#05080e]/60 to-transparent" />

        <Link href="/welcome" className="relative w-fit text-[24px] font-semibold tracking-[-0.03em]">
          Visus
        </Link>
        <div className="relative max-w-[440px] animate-rise motion-reduce:animate-none">{panel}</div>
        <span className="relative flex items-center gap-2 text-[13px] text-white/50">
          <Icon name="lock" size={14} strokeWidth={1.7} />
          Screening, not diagnosis.
        </span>
      </aside>

      <main className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col px-5 pb-8 pt-6 md:pt-10 lg:py-10">{children}</main>
    </div>
  );
}

/** Content block that fills the column on phones (button at the bottom) and centres on desktop. */
export function AuthBody({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 flex-col lg:my-auto lg:flex-none">{children}</div>;
}

/** Big heading block: small uppercase eyebrow, medium-weight title, muted line. */
export function AuthTitle({ eyebrow, title, sub }: { eyebrow?: string; title: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex animate-rise flex-col gap-2.5 [animation-duration:.8s] motion-reduce:animate-none">
      {eyebrow && <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-faint">{eyebrow}</span>}
      <h1 className="m-0 text-[32px] font-medium leading-[1.05] tracking-[-0.035em] text-balance md:text-[40px]">{title}</h1>
      {sub && <p className="m-0 text-[16px] leading-relaxed text-muted text-pretty">{sub}</p>}
    </div>
  );
}

/** Left-panel heading. */
export function PanelTitle({ title, sub }: { title: ReactNode; sub?: ReactNode }) {
  return (
    <>
      <h2 className="m-0 text-[44px] font-medium leading-[1.02] tracking-[-0.04em] text-balance xl:text-[52px]">{title}</h2>
      {sub && <p className="m-0 mt-4 text-[17px] leading-relaxed text-white/60">{sub}</p>}
    </>
  );
}

/** Left-panel list of icon rows. */
export function PanelList({ items }: { items: [IconName, string][] }) {
  return (
    <ul className="m-0 mt-8 flex list-none flex-col gap-3 p-0">
      {items.map(([icon, text]) => (
        <li key={text} className="flex items-center gap-3 text-[15px] text-white/80">
          <span className="grid size-9 flex-none place-items-center rounded-full border border-white/15 bg-white/[.06] text-acc-bright">
            <Icon name={icon} size={17} />
          </span>
          {text}
        </li>
      ))}
    </ul>
  );
}

/** Black pill with a round arrow: the primary action on these pages. */
export function PillButton({ children, onClick, disabled, type = "button", className }: { children: ReactNode; onClick?: () => void; disabled?: boolean; type?: "button" | "submit"; className?: string }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className={cn(
        "group flex h-[56px] w-full items-center justify-between gap-3 rounded-full bg-ink pl-6 pr-1.5 text-[16px] font-medium text-white transition-[background-color,opacity,transform] duration-200 hover:bg-[#2a2a2a] active:scale-[.99]",
        disabled && "pointer-events-none opacity-35",
        className,
      )}
    >
      {children}
      <span className="grid size-[44px] place-items-center rounded-full bg-white text-ink transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:rotate-[-45deg]">
        <Icon name="arrowRight" size={18} strokeWidth={2.2} />
      </span>
    </button>
  );
}
