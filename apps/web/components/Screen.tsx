import type { ReactNode } from "react";

import { cn } from "./cn";

type Props = {
  children?: ReactNode;
  /** Small grey line above the title, e.g. the date on Home. */
  eyebrow?: ReactNode;
  title?: ReactNode;
  /** A tab page: wide container on desktop, room for the bottom tab bar on phones. */
  tabs?: boolean;
  /** Wide (1200px) container instead of the focused 640px column. */
  wide?: boolean;
  /** Full screen width (capped at 1760px), as on the landing page. */
  full?: boolean;
  /** Clinical white background for test screens. */
  white?: boolean;
  /** Gap between children (Tailwind class). */
  gap?: string;
  className?: string;
  /** Buttons to the right of the title. */
  actions?: ReactNode;
};

/**
 * Page wrapper. Phones: full width with the 20px gutter, as in the design.
 * Desktop: a centred container — wide for tab pages, a focused column for flows.
 */
export function Screen({ children, eyebrow, title, tabs, wide, full, white, gap = "gap-4", className, actions }: Props) {
  const isWide = wide || tabs;
  return (
    <div className={cn("min-h-dvh", white ? "bg-white" : "bg-pearl")}>
      <main
        className={cn(
          "mx-auto flex w-full flex-col px-5 pt-6",
          full ? "max-w-[1760px] md:px-10 md:pt-9 xl:px-16" : isWide ? "max-w-[1200px] md:px-8 md:pt-9" : "max-w-[640px] md:pt-10",
          tabs ? "min-h-[calc(100dvh-73px)] pb-[112px] md:pb-16" : "min-h-dvh pb-8 md:pb-12",
          gap,
          className,
        )}
      >
        {(eyebrow || title) && (
          <header className="flex items-end justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              {eyebrow && <span className="text-[14px] font-semibold text-muted md:text-[15px]">{eyebrow}</span>}
              {title && <h1 className="m-0 text-[30px] font-bold leading-[1.15] tracking-[-0.025em] md:text-[40px] md:tracking-[-0.03em]">{title}</h1>}
            </div>
            {actions && <div className="flex flex-none gap-2">{actions}</div>}
          </header>
        )}
        {children}
      </main>
    </div>
  );
}

/** Pushes what follows to the bottom of a Screen. */
export const Spacer = ({ min = 16 }: { min?: number }) => <div className="flex-1" style={{ minHeight: min }} />;

export function Disclaimer({ children = "Screening, not diagnosis." }: { children?: ReactNode }) {
  return <p className="m-0 text-center text-[13px] leading-normal text-muted">{children}</p>;
}
