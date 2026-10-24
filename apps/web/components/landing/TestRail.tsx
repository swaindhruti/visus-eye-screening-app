"use client";

import { TEST_CATALOG, type Category } from "@visus/shared";
import { useRef, useState } from "react";

import { CATEGORIES, categoryOf, eyesLabel, TEST_COPY } from "@/lib/tests";

import { cn } from "../cn";
import { Icon } from "../Icon";
import { TestPreview } from "../TestArt";

const FILTERS: (Category | "all")[] = ["all", ...CATEGORIES.map((c) => c.id).filter((id) => TEST_CATALOG.some((t) => t.category === id))];

/** Side-scrolling rail of every test: category filter, drag with the mouse, arrow buttons and a progress bar. */
export function TestRail() {
  const rail = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const [filter, setFilter] = useState<Category | "all">("all");
  const [changed, setChanged] = useState(false);
  const [dragging, setDragging] = useState(false);

  const tests = TEST_CATALOG.filter((t) => filter === "all" || t.category === filter);

  const onScroll = () => {
    const el = rail.current;
    if (!el || !bar.current) return;
    const max = el.scrollWidth - el.clientWidth;
    bar.current.style.transform = `scaleX(${max > 0 ? Math.max(0.06, el.scrollLeft / max) : 1})`;
  };
  const page = (dir: 1 | -1) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth * 0.75, behavior: "smooth" });
  const pick = (f: Category | "all") => {
    setFilter(f);
    setChanged(true);
    rail.current?.scrollTo({ left: 0 });
    requestAnimationFrame(onScroll);
  };
  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  return (
    <div>
      <div className="mx-auto flex w-full max-w-[1760px] flex-col gap-4 px-5 md:flex-row md:items-center md:justify-between md:px-10 xl:px-16">
        <div role="tablist" aria-label="Filter tests" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0">
          {FILTERS.map((f) => {
            const on = f === filter;
            const count = f === "all" ? TEST_CATALOG.length : TEST_CATALOG.filter((t) => t.category === f).length;
            return (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => pick(f)}
                className={cn(
                  "flex h-11 flex-none items-center gap-2 rounded-full border px-4 text-[14px] font-medium transition-all duration-300",
                  on ? "border-ink bg-ink text-white" : "border-line-strong bg-white text-ink-soft hover:border-ink/40",
                )}
              >
                {f === "all" ? "All tests" : categoryOf(f).label}
                <span className={cn("rounded-full px-1.5 text-[12px] tabular-nums", on ? "bg-white/15" : "bg-fill")}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="hidden gap-2 md:flex">
          {([-1, 1] as const).map((dir) => (
            <button
              key={dir}
              type="button"
              onClick={() => page(dir)}
              aria-label={dir < 0 ? "Previous tests" : "Next tests"}
              className="grid size-12 place-items-center rounded-full border border-line-strong bg-white transition-colors duration-300 hover:border-ink hover:bg-ink hover:text-white"
            >
              <Icon name={dir < 0 ? "chevronLeft" : "chevronRight"} size={18} strokeWidth={2.2} />
            </button>
          ))}
        </div>
      </div>

      <div
        ref={rail}
        data-lenis-prevent-horizontal
        onScroll={onScroll}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse" || !rail.current) return;
          drag.current = { x: e.clientX, left: rail.current.scrollLeft, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || !rail.current) return;
          if (!d.moved && Math.abs(e.clientX - d.x) < 6) return;
          if (!d.moved) {
            d.moved = true;
            setDragging(true);
          }
          rail.current.scrollLeft = d.left - (e.clientX - d.x);
        }}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        className={cn(
          "no-scrollbar mt-8 flex gap-4 overflow-x-auto px-5 pb-10 pt-4 md:mt-10 md:gap-5 md:px-[max(40px,calc((100vw-1760px)/2+64px))]",
          dragging ? "cursor-grabbing select-none" : "cursor-grab snap-x snap-mandatory scroll-px-5 md:scroll-px-[max(40px,calc((100vw-1760px)/2+64px))]",
        )}
      >
        {tests.map((t, i) => (
          <article
            key={`${filter}-${t.id}`}
            className={cn("group w-[290px] flex-none snap-start [perspective:1000px] md:w-[340px]", changed && "animate-rise")}
            style={changed ? { animationDelay: `${Math.min(i, 5) * 70}ms` } : undefined}
          >
            <div className="flex h-full flex-col rounded-[30px] border border-line bg-white p-3 transition-[transform,box-shadow,border-color] duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:border-line-strong group-hover:shadow-[0_40px_60px_-30px_rgba(10,22,38,.3)] group-hover:[transform:rotateX(5deg)_translateY(-10px)]">
              <div className="relative grid h-[230px] place-items-center overflow-hidden rounded-[22px] bg-white ring-1 ring-line md:h-[270px]">
                <span className="absolute left-4 top-4 text-[12px] font-medium tabular-nums text-faint">{String(TEST_CATALOG.indexOf(t) + 1).padStart(2, "0")}</span>
                <span className="absolute right-3 top-3 rounded-full bg-fill px-2.5 py-1 text-[12px] font-medium text-ink-soft">{categoryOf(t.category).label}</span>
                <div className="pointer-events-none scale-90 transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-100">
                  <TestPreview id={t.id} />
                </div>
              </div>
              <div className="flex flex-1 flex-col px-2 pb-2 pt-5">
                <span className="text-[21px] font-medium tracking-[-0.02em]">{t.name}</span>
                <span className="mt-1 text-[14px] text-muted">{TEST_COPY[t.id].subtitle}</span>
                <span className="mt-5 flex flex-wrap items-center gap-1.5 text-[12px] font-medium text-ink-soft">
                  <span className="flex h-7 items-center gap-1.5 rounded-full border border-line px-2.5">
                    <Icon name="clock" size={13} />
                    {t.minutes} min
                  </span>
                  <span className="flex h-7 items-center rounded-full border border-line px-2.5">{t.kind === "questionnaire" ? "Questionnaire" : eyesLabel(t)}</span>
                  <span className="flex h-7 items-center rounded-full border border-line px-2.5">Ages {t.minAge}+</span>
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mx-auto flex w-full max-w-[1760px] items-center gap-6 px-5 md:px-10 xl:px-16">
        <div className="h-[2px] flex-1 overflow-hidden rounded-full bg-line">
          <div ref={bar} className="h-full origin-left rounded-full bg-ink transition-transform duration-300" style={{ transform: "scaleX(.06)" }} />
        </div>
        <span className="text-[13px] font-medium tabular-nums text-muted">
          {tests.length} {tests.length === 1 ? "test" : "tests"}
        </span>
      </div>
    </div>
  );
}
