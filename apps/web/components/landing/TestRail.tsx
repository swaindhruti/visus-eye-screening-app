"use client";

import { TEST_CATALOG } from "@visus/shared";
import { useRef } from "react";

import { categoryOf, eyesLabel } from "@/lib/tests";

import { Icon } from "../Icon";
import { TestPreview } from "../TestArt";

/** Side-scrolling rail of every test, with arrow buttons and a progress bar. */
export function TestRail() {
  const rail = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);

  const onScroll = () => {
    const el = rail.current;
    if (!el || !bar.current) return;
    const max = el.scrollWidth - el.clientWidth;
    bar.current.style.transform = `scaleX(${max > 0 ? Math.max(0.08, el.scrollLeft / max) : 1})`;
  };
  const page = (dir: 1 | -1) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <div>
      <div
        ref={rail}
        onScroll={onScroll}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-6 pt-2 md:scroll-px-[max(32px,calc((100vw-1200px)/2+32px))] md:gap-5 md:px-[max(32px,calc((100vw-1200px)/2+32px))]"
      >
        {TEST_CATALOG.map((t, i) => (
          <div key={t.id} data-reveal style={{ "--d": `${Math.min(i, 4) * 90}ms` } as React.CSSProperties} className="flex-none snap-start">
            <article className="group w-[260px] flex-none [perspective:900px] md:w-[300px]">
              <div className="flex h-full flex-col rounded-[28px] border border-line bg-white p-3 shadow-[0_1px_0_rgba(17,17,17,.03)] transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(.2,.7,.2,1)] group-hover:[transform:rotateX(6deg)_translateY(-8px)] group-hover:shadow-[0_30px_50px_-20px_rgba(17,17,17,.22)]">
                <div className="grid h-[210px] place-items-center overflow-hidden rounded-[20px] bg-white ring-1 ring-line md:h-[240px]">
                  <div className="scale-90 transition-transform duration-500 group-hover:scale-100">
                    <TestPreview id={t.id} />
                  </div>
                </div>
                <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
                  <span className="text-[12px] font-medium uppercase tracking-[0.12em] text-faint">{categoryOf(t.category).label}</span>
                  <span className="mt-1 text-[19px] font-medium tracking-[-0.01em]">{t.name}</span>
                  <span className="mt-3 flex items-center gap-2 text-[13px] text-muted">
                    <Icon name="clock" size={14} />
                    {t.minutes} min
                    <span className="text-line-strong">•</span>
                    {t.kind === "questionnaire" ? "Questionnaire" : eyesLabel(t)}
                  </span>
                </div>
              </div>
            </article>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-4 flex max-w-[1200px] items-center gap-5 px-5 md:px-8">
        <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-line">
          <div ref={bar} className="h-full origin-left rounded-full bg-ink transition-transform duration-200" style={{ transform: "scaleX(.08)" }} />
        </div>
        <div className="flex gap-2">
          {([-1, 1] as const).map((dir) => (
            <button
              key={dir}
              type="button"
              onClick={() => page(dir)}
              aria-label={dir < 0 ? "Previous tests" : "Next tests"}
              className="grid size-11 place-items-center rounded-full border border-line-strong bg-white transition-colors hover:bg-ink hover:text-white"
            >
              <Icon name={dir < 0 ? "chevronLeft" : "chevronRight"} size={18} strokeWidth={2.2} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
