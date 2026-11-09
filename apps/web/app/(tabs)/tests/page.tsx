"use client";

import { TEST_CATALOG, type TestInfo } from "@visus/shared";
import Link from "next/link";
import { useState } from "react";

import { cn } from "@/components/cn";
import { applyFilters, FilterSheet, hasFilters, NO_FILTERS, type Filters } from "@/components/FilterSheet";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { TestIcon, TestPreview } from "@/components/TestArt";
import { CATEGORIES, categoryOf, eyesLabel, librarySub, TEST_COPY } from "@/lib/tests";
import { useGuest } from "@/lib/useGuest";

export default function Tests() {
  const [sel, setSel] = useState(-1);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sheet, setSheet] = useState(false);
  const guest = useGuest();
  const filtered = hasFilters(filters);
  const cat = sel >= 0 ? CATEGORIES[sel] : null;
  const base = filtered ? applyFilters(filters) : TEST_CATALOG;
  const tests = cat ? base.filter((t) => t.category === cat.id) : base;

  const groups = [{ label: "All tests", count: base.length }, ...CATEGORIES.map((c) => ({ label: c.label, count: base.filter((t) => t.category === c.id).length }))];

  return (
    <>
      <Screen tabs full gap="gap-0">
        {/* Header */}
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-10">
          <div className="flex flex-col gap-3">
            {/* Phones have no top bar: the way back to the landing page lives here. */}
            <Link
              href="/welcome"
              className="mb-2 flex h-9 w-fit items-center gap-1 rounded-full border border-line-strong bg-white pl-2 pr-3.5 text-[14px] font-medium text-ink-soft hover:text-ink md:hidden"
            >
              <Icon name="chevronLeft" size={16} strokeWidth={2.2} />
              Landing page
            </Link>
            <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-faint md:text-[13px]">
              {TEST_CATALOG.length} tests · {CATEGORIES.length} groups
            </span>
            <h1 className="m-0 text-[38px] font-medium leading-[1.02] tracking-[-0.04em] md:text-[56px]">
              Test library<span className="text-faint">.</span>
            </h1>
            <p className="m-0 max-w-[520px] text-[16px] leading-relaxed text-muted text-pretty md:text-[17px]">
              {guest ? "Clinical tests on a plain white screen. Pick one to start, it takes a few minutes." : "Clinical tests on a plain white screen. Pick one yourself, or start an eye check and let the guide choose."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/tests/search"
              className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-full border border-line-strong bg-white px-4 text-[15px] text-faint transition-colors hover:border-ink/30 md:w-[340px] md:flex-none md:text-[16px]"
            >
              <Icon name="search" size={19} color="#5F5F5B" />
              Search tests or symptoms
            </Link>
            <button
              type="button"
              onClick={() => setSheet(true)}
              aria-label="Filter tests"
              title="Filter tests"
              className={cn(
                "relative grid size-12 flex-none place-items-center rounded-full border transition-colors",
                filtered ? "border-ink bg-ink text-white" : "border-line-strong bg-white hover:border-ink/30",
              )}
            >
              <Icon name="filter" size={19} />
              {filtered && <span className="absolute right-0.5 top-0.5 size-3 rounded-full border-2 border-pearl bg-acc" />}
            </button>
          </div>
        </header>

        {/* Groups: one row of pills, pinned under the top bar while scrolling */}
        <nav
          aria-label="Test groups"
          className="no-scrollbar sticky top-0 z-10 -mx-5 mt-7 flex gap-2 overflow-x-auto border-b border-line bg-pearl/90 px-5 py-3 backdrop-blur md:top-[73px] md:-mx-10 md:mt-10 md:px-10 xl:-mx-16 xl:px-16"
        >
          {groups.map((g, i) => {
            const on = sel === i - 1;
            return (
              <button
                key={g.label}
                type="button"
                aria-pressed={on}
                onClick={() => setSel(i - 1)}
                className={cn(
                  "flex h-10 flex-none items-center gap-2 rounded-full border pl-4 pr-2 text-[14px] font-medium transition-colors md:h-11 md:text-[15px]",
                  on ? "border-ink bg-ink text-white" : "border-line-strong bg-white text-ink-soft hover:border-ink/30 hover:text-ink",
                )}
              >
                {g.label}
                <span className={cn("grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-[12px] tabular-nums", on ? "bg-white/15" : "bg-fill text-muted")}>{g.count}</span>
              </button>
            );
          })}
        </nav>

        {/* Current group */}
        <div className="mt-7 flex flex-col gap-4 md:mt-10 md:flex-row md:items-end md:justify-between">
          <div className="flex items-start gap-4">
            {cat && !filtered && (
              <span className="grid size-12 flex-none place-items-center rounded-full bg-acc-soft text-[18px] font-bold text-acc-ink md:size-14">
                {cat.icon === "E" ? "E" : <Icon name={cat.icon} size={24} />}
              </span>
            )}
            <div className="flex flex-col gap-1">
              <h2 className="m-0 text-[24px] font-medium leading-[1.15] tracking-[-0.025em] md:text-[30px]">{filtered ? "Filtered tests" : cat ? cat.name : "All tests"}</h2>
              {!filtered && cat && <p className="m-0 max-w-[560px] text-[15px] leading-relaxed text-muted text-pretty md:text-[16px]">{cat.question}</p>}
            </div>
          </div>
          <div className="flex flex-none items-center gap-3 text-[14px] text-muted">
            {tests.length === 1 ? "1 test" : `${tests.length} tests`}
            {filtered && (
              <button type="button" onClick={() => setFilters(NO_FILTERS)} className="flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-white px-3.5 text-[14px] font-medium text-ink hover:border-ink/30">
                <Icon name="close" size={14} strokeWidth={2.2} />
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Tests (key replays the entrance when the group or filters change) */}
        {tests.length > 0 ? (
          <div key={`${sel}-${JSON.stringify(filters)}`} className="mt-5 grid grid-cols-1 gap-3 md:mt-6 md:grid-cols-2 md:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {tests.map((t, i) => (
              <TestCard key={t.id} t={t} i={i} />
            ))}
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-[28px] border border-dashed border-line-strong bg-white px-6 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-fill text-muted">
              <Icon name="search" size={20} />
            </span>
            <span className="text-[18px] font-medium">No tests match</span>
            <span className="max-w-[340px] text-[15px] text-muted">Try another group, or clear the filters to see every test.</span>
            {filtered && (
              <button type="button" onClick={() => setFilters(NO_FILTERS)} className="mt-2 flex h-11 items-center rounded-full bg-ink px-5 text-[15px] font-medium text-white hover:bg-[#2a2a2a]">
                Clear filters
              </button>
            )}
          </div>
        )}

        {!guest && (
          <Link
            href="/check/glasses"
            className="group mt-5 flex flex-wrap items-center gap-4 rounded-[28px] bg-acc-soft p-4 transition-transform duration-300 active:scale-[.99] md:mt-8 md:gap-5 md:p-6"
          >
            <span className="grid size-12 flex-none place-items-center rounded-full bg-white text-acc-ink md:size-14">
              <Icon name="glasses" size={24} />
            </span>
            <span className="flex min-w-0 flex-[1_1_220px] flex-col gap-0.5">
              <span className="text-[17px] font-medium tracking-[-0.01em] md:text-[20px]">Glasses check</span>
              <span className="text-[14px] text-acc-ink md:text-[15px]">Are your glasses still right? Sharpness with and without them, 3 min.</span>
            </span>
            <span className="hidden h-12 items-center gap-2 rounded-full bg-ink pl-5 pr-1.5 text-[15px] font-medium text-white md:flex">
              Start
              <span className="grid size-9 place-items-center rounded-full bg-white text-ink transition-transform duration-300 group-hover:rotate-[-45deg]">
                <Icon name="arrowRight" size={16} strokeWidth={2.2} />
              </span>
            </span>
          </Link>
        )}
      </Screen>
      {sheet && <FilterSheet value={filters} onChange={setFilters} onClose={() => setSheet(false)} />}
    </>
  );
}

/** A compact row on phones; a card with a preview of the test on desktop. */
function TestCard({ t, i }: { t: TestInfo; i: number }) {
  const copy = TEST_COPY[t.id];
  const meta = [`${t.minutes} min`, t.kind === "questionnaire" ? "Questionnaire" : eyesLabel(t), `Ages ${t.minAge}+`];
  return (
    <Link
      href={`/tests/${t.id}`}
      style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
      className="group flex animate-rise items-center gap-3.5 rounded-[22px] border border-line bg-white p-3 transition-[border-color,box-shadow,transform] duration-300 [animation-duration:.6s] hover:border-line-strong active:scale-[.99] motion-reduce:animate-none md:flex-col md:items-stretch md:gap-0 md:rounded-[28px] md:p-2.5 md:hover:-translate-y-1 md:hover:shadow-[0_24px_44px_-28px_rgba(10,22,38,.3)]"
    >
      {/* Phone thumbnail */}
      <span className="grid size-16 flex-none place-items-center rounded-[16px] border border-divider bg-card-hover text-[24px] font-bold md:hidden">
        <TestIcon id={t.id} size={26} />
      </span>

      {/* Desktop preview */}
      <span className="relative hidden h-[190px] place-items-center overflow-hidden rounded-[22px] bg-white ring-1 ring-line md:grid">
        <span className="absolute left-4 top-3.5 text-[12px] font-medium tabular-nums text-faint">{String(TEST_CATALOG.indexOf(t) + 1).padStart(2, "0")}</span>
        <span className="absolute right-3 top-3 rounded-full bg-fill px-2.5 py-1 text-[12px] font-medium text-ink-soft">{categoryOf(t.category).label}</span>
        <span className="origin-center scale-[.8] transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[.9]">
          <TestPreview id={t.id} />
        </span>
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5 md:gap-1 md:px-3 md:pb-3 md:pt-4">
        <span className="text-[12px] font-semibold text-acc-ink md:hidden">{categoryOf(t.category).label}</span>
        <span className="text-[16px] font-semibold md:text-[20px] md:font-medium md:tracking-[-0.02em]">{copy.title}</span>
        <span className="text-[13px] text-muted md:hidden">{librarySub(t)}</span>
        <span className="hidden text-[14px] text-muted md:block">{copy.subtitle}</span>
        <span className="mt-1 hidden text-[14px] leading-[1.5] text-ink-soft md:line-clamp-2">{copy.checks}</span>
        <span className="mt-3 hidden items-center justify-between gap-2 md:flex">
          <span className="flex flex-wrap gap-1.5">
            {meta.map((m, j) => (
              <span key={m} className="flex h-7 items-center gap-1.5 rounded-full border border-line px-2.5 text-[12px] font-medium text-ink-soft">
                {j === 0 && <Icon name="clock" size={13} />}
                {m}
              </span>
            ))}
          </span>
          <span className="grid size-9 flex-none place-items-center rounded-full bg-fill transition-[transform,background-color,color] duration-300 group-hover:rotate-[-45deg] group-hover:bg-ink group-hover:text-white">
            <Icon name="arrowRight" size={16} strokeWidth={2.2} />
          </span>
        </span>
      </span>

      <span className="grid size-8 flex-none place-items-center rounded-full bg-fill md:hidden">
        <Icon name="chevronRight" size={14} color="#5F5F5B" strokeWidth={2.4} />
      </span>
    </Link>
  );
}
