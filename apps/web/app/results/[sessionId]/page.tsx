"use client";

import type { Category } from "@visus/shared";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { STATUS, StatusBadge } from "@/components/Chip";
import { cn } from "@/components/cn";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { HeaderButton, ScreenHeader } from "@/components/ScreenHeader";
import { ErrorState, LoadingState } from "@/components/States";
import { TestIcon } from "@/components/TestArt";
import { fmtShort } from "@/lib/dates";
import { CATEGORIES, TEST_COPY, testInfo } from "@/lib/tests";
import { useVerdict } from "@/lib/useVerdict";
import { useCheck } from "@/store/check";

const ORDER = ["see_doctor", "mild", "good"];
const MAPS = "https://www.google.com/maps/search/eye+doctor+near+me";

export default function Results() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const q = useVerdict(sessionId);
  const check = useCheck();

  if (q.isPending) return <LoadingState />;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} retrying={q.isFetching} />;

  const v = q.data;
  const isToday = v.date ? new Date(v.date).toDateString() === new Date().toDateString() : check.sessionId === sessionId;
  const minutes = v.minutes ?? v.results.reduce((n, r) => n + testInfo(r.testId).minutes, 0);
  const areas = CATEGORIES.filter((c) => v.areas[c.id]);
  const ordered = [...v.results].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
  const doctor = v.results.some((r) => r.status === "see_doctor");
  const [best, ...others] = v.lens;

  return (
    <Screen wide gap="gap-0">
      <ScreenHeader
        left="close"
        title="Your results"
        onLeft={() => router.push("/home")}
        right={<HeaderButton icon="share" label="Share report" onClick={() => router.push(`/results/${sessionId}/share`)} />}
      />

      <section className="mt-4 flex flex-none flex-col gap-1 rounded-[24px] bg-night px-5 py-[18px] text-white md:mt-6 md:flex-row md:flex-wrap md:items-end md:justify-between md:gap-6 md:rounded-[28px] md:p-8">
        <div className="flex flex-col gap-1 md:flex-[1_1_480px] md:gap-2">
          <span className="text-[13px] font-semibold text-white/70 md:text-[14px]">
            {isToday ? "Today · " : v.date ? `${fmtShort(v.date)} · ` : ""}
            {v.results.length} {v.results.length === 1 ? "test" : "tests"} · {minutes} min
          </span>
          <h1 className="m-0 mt-1 text-[24px] font-bold leading-[1.2] tracking-[-0.02em] md:mt-0 md:text-[36px] md:leading-[1.15] md:tracking-[-0.025em]">{v.headline}</h1>
          <p className="m-0 mt-0.5 text-[15px] leading-[1.45] text-white/75 md:text-[17px]">{v.advice}</p>
        </div>
        <div className="hidden flex-wrap gap-2.5 md:flex">
          {doctor && (
            <button type="button" onClick={() => window.open(MAPS, "_blank", "noopener")} className="flex h-[52px] items-center gap-2 rounded-[16px] bg-white px-5 text-[16px] font-semibold text-ink hover:bg-[#F4F4F1]">
              <Icon name="pin" size={18} />
              Find eye doctors
            </button>
          )}
          <Link href={`/results/${sessionId}/share`} className="flex h-[52px] items-center gap-2 rounded-[16px] border border-white/28 px-5 text-[16px] font-semibold text-white hover:bg-white/8">
            <Icon name="share" size={18} />
            Share report
          </Link>
        </div>
      </section>

      <div className="mt-3 grid flex-none grid-cols-2 gap-2.5 md:mt-5 md:grid-cols-4 md:gap-3.5">
        {areas.map((c) => {
          const s = v.areas[c.id as Category]!;
          return (
            <div key={c.id} className={cn("flex flex-col gap-1.5 rounded-[18px] border bg-white px-3.5 py-3 md:rounded-[20px] md:p-[18px]", s === "see_doctor" ? "border-[#F2D3CE]" : "border-line")}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[15px] font-bold md:text-[17px]">{c.label}</span>
                <span className={cn("size-2 rounded-full md:size-2.5", STATUS[s].dot)} />
              </div>
              <span className={cn("text-[13px] md:text-[14px]", s === "see_doctor" ? "font-semibold text-doc" : "text-muted")}>{STATUS[s].label}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-start">
        <section className="flex min-w-0 flex-col gap-2.5 md:flex-[3_1_0] md:gap-3.5">
          <h2 className="m-0 text-[18px] font-bold tracking-[-0.01em] md:text-[24px] md:tracking-[-0.02em]">Test by test</h2>
          <div className="flex flex-col gap-2.5 md:gap-0 md:overflow-hidden md:rounded-[22px] md:border md:border-line md:bg-white">
            {ordered.map((r, i) => (
              <Link
                key={r.testId}
                href={`/results/${sessionId}/${r.testId}`}
                className={cn(
                  "flex min-h-[72px] items-center gap-3.5 rounded-[20px] border border-line bg-white px-4 py-3 transition-[border-color,background] hover:border-[#D6D6D1] md:min-h-[84px] md:gap-4 md:rounded-none md:border-0 md:px-5 md:hover:bg-card-hover",
                  i > 0 && "md:border-t md:border-divider",
                )}
              >
                <span className={cn("grid size-10 flex-none place-items-center rounded-full text-[18px] font-bold md:size-11", STATUS[r.status].bg, STATUS[r.status].fg)}>
                  <TestIcon id={r.testId} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[16px] font-semibold md:text-[17px]">{TEST_COPY[r.testId].title}</span>
                  <span className="text-[13px] text-muted md:text-[14px]">{r.summary}</span>
                </span>
                <span className="hidden text-[22px] font-bold md:inline">{r.score}</span>
                <StatusBadge status={r.status} className="hidden self-center md:flex" />
                <Icon name="chevronRight" size={16} color="#9A9A95" strokeWidth={2.2} className="md:hidden" />
              </Link>
            ))}
          </div>
        </section>

        {best && (
          <aside className="flex min-w-0 flex-col gap-2.5 md:flex-[2_1_0] md:gap-3.5">
            <h2 className="m-0 text-[18px] font-bold tracking-[-0.01em] md:text-[24px] md:tracking-[-0.02em]">Lenses that suit you</h2>
            <div className="flex flex-col gap-2.5 rounded-[22px] border border-ink bg-white p-4 md:p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex h-6 items-center rounded-full bg-ink px-2.5 text-[12px] font-semibold text-white">Best match</span>
                <span className="text-[13px] text-muted">{best.lensType}</span>
              </div>
              <span className="text-[21px] font-bold tracking-[-0.015em] md:text-[22px]">{best.product}</span>
              <div className="flex flex-col gap-[3px] rounded-[14px] bg-acc-soft p-3">
                <span className="text-[13px] font-bold text-acc-ink">Why this suits you</span>
                <span className="text-[15px] leading-[1.45] text-ink-soft text-pretty">{best.reason}</span>
              </div>
              <div className="mt-1 hidden flex-col gap-2.5 md:flex">
                {best.coatings.map((c) => (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="grid size-9 flex-none place-items-center rounded-full bg-fill">
                      <Icon name={/blue/i.test(c.name) ? "comfort" : "shield"} size={18} strokeWidth={1.9} />
                    </span>
                    <span className="flex flex-col">
                      <span className="text-[15px] font-semibold">{c.name}</span>
                      <span className="text-[13px] text-muted">{c.reason}</span>
                    </span>
                  </div>
                ))}
              </div>
              <Button href={`/results/${sessionId}/lens`} variant="secondary" className="mt-1 h-12 text-[15px]!">
                {others.length ? `See all ${v.lens.length} lens suggestions` : "See lens details"}
              </Button>
            </div>
            <p className="m-0 text-[13px] leading-normal text-muted">Screening, not diagnosis. Your optician will confirm the final prescription and lens.</p>
          </aside>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-2.5 md:hidden">
        {doctor && (
          <Button onClick={() => window.open(MAPS, "_blank", "noopener")} leading={<Icon name="pin" size={20} />}>
            Find eye doctors nearby
          </Button>
        )}
        <Button href="/home" variant={doctor ? "ghost" : "primary"}>
          Done
        </Button>
      </div>
    </Screen>
  );
}
