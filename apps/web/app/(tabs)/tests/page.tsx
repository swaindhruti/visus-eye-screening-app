"use client";

import { TEST_CATALOG, type TestInfo } from "@visus/shared";
import Link from "next/link";
import { useState } from "react";

import { cn } from "@/components/cn";
import { applyFilters, FilterSheet, hasFilters, NO_FILTERS, type Filters } from "@/components/FilterSheet";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { HeaderButton } from "@/components/ScreenHeader";
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
  const pick = (i: number) => setSel(i);

  const groups = [{ label: "All tests", count: base.length }, ...CATEGORIES.map((c) => ({ label: c.label, count: base.filter((t) => t.category === c.id).length }))];

  return (
    <>
      <Screen
        tabs
        gap="gap-4 md:gap-7"
        eyebrow={`${TEST_CATALOG.length} tests in ${CATEGORIES.length} groups`}
        title="Tests"
        actions={
          <>
            <Link href="/tests/search" aria-label="Search tests" title="Search tests" className="grid size-11 place-items-center rounded-full bg-pill transition-transform hover:bg-[#E3E3DF] active:scale-[.94] md:hidden">
              <Icon name="search" size={19} />
            </Link>
            <Link href="/tests/search" className="hidden h-12 w-[340px] items-center gap-3 rounded-full border border-line-strong bg-white px-4 text-[16px] text-faint hover:border-[#CFCFCA] md:flex">
              <Icon name="search" size={20} color="#5F5F5B" />
              Search tests or symptoms
            </Link>
            <span className="relative">
              <HeaderButton icon="filter" label="Filter tests" onClick={() => setSheet(true)} className="md:size-12" />
              {filtered && <span className="absolute right-0.5 top-0.5 size-2.5 rounded-full border-2 border-pearl bg-acc" />}
            </span>
          </>
        }
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-7">
          {/* Groups: scrolling chips on phones, a sidebar on desktop */}
          <nav aria-label="Test groups" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 md:sticky md:top-24 md:mx-0 md:w-[240px] md:flex-none md:flex-col md:gap-0.5 md:overflow-visible md:rounded-[20px] md:border md:border-line md:bg-white md:p-2">
            {groups.map((g, i) => {
              const on = sel === i - 1;
              return (
                <button
                  key={g.label}
                  type="button"
                  aria-pressed={on}
                  onClick={() => pick(i - 1)}
                  className={cn(
                    "flex h-10 flex-none items-center justify-between gap-3 rounded-full border px-4 text-[15px] font-semibold transition-colors md:h-[46px] md:rounded-[12px] md:border-0 md:px-3",
                    on ? "border-ink bg-ink text-white" : "border-line-strong bg-white hover:bg-pressed",
                  )}
                >
                  <span>{i === 0 ? <span className="md:hidden">All</span> : g.label}{i === 0 && <span className="hidden md:inline">All tests</span>}</span>
                  <span className={cn("hidden text-[13px] md:inline", on ? "text-white/70" : "text-muted")}>{g.count}</span>
                </button>
              );
            })}
          </nav>

          <section className="flex min-w-0 flex-1 flex-col gap-3 md:gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="m-0 text-[22px] font-bold leading-[1.2] tracking-[-0.02em]">{filtered ? "Filtered" : cat ? cat.name : "All tests"}</h2>
                <span className="flex-none text-[14px] text-muted">{tests.length === 1 ? "1 test" : `${tests.length} tests`}</span>
              </div>
              {filtered ? (
                <button type="button" onClick={() => setFilters(NO_FILTERS)} className="self-start text-[16px] font-semibold text-acc-ink hover:underline">
                  Clear filters
                </button>
              ) : (
                cat && <p className="m-0 text-[16px] leading-[1.45] text-muted text-pretty">{cat.question}</p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] md:gap-4">
              {tests.map((t) => (
                <TestCard key={t.id} t={t} />
              ))}
            </div>
            {!guest && (
              <Link href="/check/glasses" className="mt-1 flex min-h-[66px] flex-wrap items-center gap-3.5 rounded-[20px] bg-acc-soft px-4 py-3 transition-transform active:scale-[.98] md:rounded-[22px] md:px-6 md:py-5">
                <span className="grid size-11 flex-none place-items-center rounded-full bg-white text-acc-ink md:size-12">
                  <Icon name="glasses" size={22} />
                </span>
                <span className="flex min-w-0 flex-[1_1_200px] flex-col gap-0.5">
                  <span className="text-[16px] font-bold md:text-[18px]">Glasses check</span>
                  <span className="text-[13px] text-acc-ink md:text-[15px]">Are your glasses still right? Sharpness with and without them, 3 min.</span>
                </span>
                <span className="hidden h-11 items-center rounded-[14px] bg-ink px-[18px] text-[15px] font-semibold text-white md:flex">Start</span>
              </Link>
            )}
          </section>
        </div>
      </Screen>
      {sheet && <FilterSheet value={filters} onChange={setFilters} onClose={() => setSheet(false)} />}
    </>
  );
}

/** Row with a thumbnail on phones; a card with a test preview on desktop. */
function TestCard({ t }: { t: TestInfo }) {
  const copy = TEST_COPY[t.id];
  return (
    <Link
      href={`/tests/${t.id}`}
      className="flex items-center gap-3.5 rounded-[20px] border border-line bg-white p-3.5 transition-[border-color,transform] hover:border-[#D6D6D1] active:scale-[.99] md:flex-col md:items-stretch md:gap-0 md:overflow-hidden md:rounded-[22px] md:p-0"
    >
      <span className="grid size-16 flex-none place-items-center overflow-hidden rounded-[16px] border border-divider bg-card-hover text-[24px] font-bold md:hidden">
        <TestIcon id={t.id} size={26} />
      </span>
      <span className="hidden h-[150px] place-items-center overflow-hidden border-b border-divider bg-card-hover md:grid">
        <span className="origin-center scale-[.85]">
          <TestPreview id={t.id} />
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 md:gap-1 md:px-[18px] md:pb-[18px] md:pt-4">
        <span className="text-[12px] font-semibold text-acc-ink md:text-[13px]">{categoryOf(t.category).label}</span>
        <span className="text-[16px] font-bold md:text-[18px]">{copy.title}</span>
        <span className="hidden text-[14px] leading-[1.45] text-muted md:block">{copy.checks}</span>
        <span className="text-[13px] text-muted md:mt-2 md:font-semibold md:text-ink-soft">
          <span className="md:hidden">{librarySub(t)}</span>
          <span className="hidden md:inline">
            {t.minutes} min · Ages {t.minAge}+ · {t.kind === "questionnaire" ? "Questionnaire" : eyesLabel(t)}
          </span>
        </span>
      </span>
      <Icon name="chevronRight" size={16} color="#9A9A95" strokeWidth={2.2} className="flex-none md:hidden" />
    </Link>
  );
}
