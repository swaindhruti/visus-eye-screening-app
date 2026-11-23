import { cn } from "./cn";

/**
 * Grey placeholders in the shape of what's loading (shop and doctor portals).
 * They pulse, except with "reduce motion"; screen readers hear the label once.
 */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block animate-pulse rounded-[8px] bg-pill motion-reduce:animate-none", className)} />;
}

function Status({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** List rows (patients, consults, orders) inside an existing white list box. */
export function SkeletonRows({ rows = 3, label = "Loading…" }: { rows?: number; label?: string }) {
  return (
    <Status label={label}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={cn("flex items-center gap-3 px-4 py-3.5", i > 0 && "border-t border-divider")}>
          <Skeleton className="size-10 flex-none rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3.5 w-3/5" />
          </div>
          <Skeleton className="hidden h-8 w-20 rounded-full sm:block" />
        </div>
      ))}
    </Status>
  );
}

/** Stacked cards (clinics, doctors, prescriptions, records). */
export function SkeletonCards({ count = 2, label = "Loading…" }: { count?: number; label?: string }) {
  return (
    <Status label={label} className="flex flex-col gap-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-[18px]">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 flex-none rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3.5 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-4/5" />
        </div>
      ))}
    </Status>
  );
}

/** A whole page: a form or details card with a side column (account, order, patient). */
export function SkeletonPage({ label = "Loading…" }: { label?: string }) {
  return (
    <Status label={label} className="flex flex-col gap-5 md:flex-row md:items-start md:gap-6">
      <div className="flex min-w-0 flex-col gap-4 rounded-[20px] border border-line bg-white p-[18px] md:flex-[3_1_0] md:p-6">
        <Skeleton className="h-5 w-1/3" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-12 w-full rounded-[14px]" />
          </div>
        ))}
      </div>
      <div className="flex min-w-0 flex-col gap-4 md:flex-[2_1_0]">
        <SkeletonCards count={2} label={label} />
      </div>
    </Status>
  );
}
