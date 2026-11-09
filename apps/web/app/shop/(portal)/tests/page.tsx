"use client";

import { TEST_CATALOG, type TestId, type TestInfo } from "@visus/shared";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { cn } from "@/components/cn";
import { Icon } from "@/components/Icon";
import { Disclaimer, Screen } from "@/components/Screen";
import { useShopReady } from "@/components/ShopShell";
import { TestIcon } from "@/components/TestArt";
import { CATEGORIES, librarySub, TEST_COPY } from "@/lib/tests";
import { useStartCheck } from "@/lib/useStartCheck";
import type { CheckMode } from "@/services/sessions";
import { listPatients } from "@/services/shops";
import { useCheck } from "@/store/check";

/** Up to this many tests in one picked set (the server allows 8). */
const MAX_SET = 8;

/**
 * Shop portal: Test library, by category. Run one test for a quick analysis, or tick several and run
 * them as a set. A patient is optional: with "No patient" the result isn't saved to anyone's record.
 */
export default function ShopTests() {
  const ready = useShopReady();
  const patients = useQuery({ queryKey: ["shop-patients", ""], queryFn: () => listPatients(""), enabled: ready });
  const start = useStartCheck();
  const [patientId, setPatientId] = useState("");
  const [picked, setPicked] = useState<TestId[]>([]);

  const patient = patients.data?.find((p) => p.id === patientId);
  // A patient's age decides which tests suit them (kids tests under 13); no patient: every test.
  const suits = (t: TestInfo) => !patient || (patient.age >= t.minAge && (t.category === "kids") === patient.age < 13);
  const chosen = picked.filter((id) => suits(TEST_CATALOG.find((t) => t.id === id)!));
  const minutes = chosen.reduce((sum, id) => sum + TEST_CATALOG.find((t) => t.id === id)!.minutes, 0);

  const toggle = (id: TestId) => setPicked((now) => (now.includes(id) ? now.filter((x) => x !== id) : now.length < MAX_SET ? [...now, id] : now));

  const begin = (mode: CheckMode, tests: TestId[]) => {
    if (patient) useCheck.getState().setShopPatient({ id: patient.id, name: patient.name, profileId: patient.checkProfileId });
    else useCheck.getState().setShopPatient(null);
    start.mutate(mode === "single" ? { mode, testId: tests[0] } : { mode, testIds: tests });
  };

  return (
    <Screen wide gap="gap-6 md:gap-8" eyebrow={`${TEST_CATALOG.length} tests · ${CATEGORIES.length} groups`} title="Test library">
      <p className="-mt-2 m-0 max-w-[620px] text-[16px] leading-relaxed text-muted text-pretty">
        Run one test for a quick analysis, or tick several and run them together. Adding a patient is optional.
      </p>

      <section className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-[18px] md:flex-row md:items-center md:gap-5 md:p-5">
        <div className="flex flex-col gap-0.5 md:w-[220px] md:flex-none">
          <h2 className="m-0 text-[17px] font-bold">Who is this for?</h2>
          <p className="m-0 text-[14px] text-muted">{patient ? "Results are saved to their record." : "Results aren't saved to a patient's record."}</p>
        </div>
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="sr-only">Patient</span>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="h-12 w-full rounded-[14px] border border-line-strong bg-white px-3.5 text-[16px] outline-none focus:border-ink focus:shadow-[0_0_0_4px_rgba(17,17,17,.06)]"
            >
              <option value="">No patient (quick analysis)</option>
              {patients.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.age} years{p.phone ? ` · ${p.phone}` : ""}
                </option>
              ))}
            </select>
          </label>
          <Link
            href="/shop/patients/new"
            className="flex h-12 flex-none items-center justify-center gap-1.5 rounded-[14px] border border-line-strong bg-white px-4 text-[15px] font-semibold hover:bg-[#FBFBF9]"
          >
            <Icon name="plusSm" size={18} />
            Add new patient
          </Link>
        </div>
      </section>

      {start.isError && <p className="m-0 text-[14px] text-doc">{start.error.message}</p>}

      {CATEGORIES.map((c) => {
        const tests = TEST_CATALOG.filter((t) => t.category === c.id && suits(t));
        if (!tests.length) return null;
        return (
          <section key={c.id} aria-labelledby={`cat-${c.id}`} className="flex flex-col gap-3">
            <header className="flex items-center gap-3">
              <span className="grid size-10 flex-none place-items-center rounded-full bg-acc-soft text-acc-ink">
                {c.icon === "E" ? <span className="text-[17px] font-bold">E</span> : <Icon name={c.icon} size={20} />}
              </span>
              <div className="flex min-w-0 flex-col">
                <h2 id={`cat-${c.id}`} className="m-0 text-[19px] font-bold tracking-[-0.01em] md:text-[22px]">
                  {c.name}
                </h2>
                <span className="text-[14px] text-muted">{c.question}</span>
              </div>
            </header>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {tests.map((t) => (
                <TestRow key={t.id} t={t} on={chosen.includes(t.id)} full={chosen.length >= MAX_SET} onToggle={() => toggle(t.id)} onRun={() => begin("single", [t.id])} busy={start.isPending} />
              ))}
            </div>
          </section>
        );
      })}

      <Disclaimer>Results are a screening, not a diagnosis. Refer to an eye doctor when a test says so.</Disclaimer>

      {chosen.length > 0 && (
        <div className="sticky bottom-3 z-30 rounded-[20px] border border-line bg-white/95 shadow-[0_18px_40px_-24px_rgba(10,22,38,.45)] backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 md:px-5">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[16px] font-bold">
                {chosen.length} {chosen.length === 1 ? "test" : "tests"} picked · about {minutes} min
              </span>
              <span className="truncate text-[13px] text-muted">{patient ? `For ${patient.name}` : "No patient record"}</span>
            </span>
            <button type="button" onClick={() => setPicked([])} className="h-11 flex-none rounded-[14px] px-3 text-[15px] font-semibold text-muted hover:bg-pressed hover:text-ink">
              Clear
            </button>
            <button
              type="button"
              disabled={start.isPending}
              onClick={() => begin(chosen.length === 1 ? "single" : "custom", chosen)}
              className="flex h-12 flex-none items-center gap-2 rounded-[14px] bg-ink px-5 text-[15px] font-semibold text-white transition-colors hover:bg-[#2a2a2a] disabled:opacity-50"
            >
              {start.isPending ? "Starting…" : chosen.length === 1 ? "Start the test" : `Start ${chosen.length} tests`}
              <Icon name="arrowRight" size={18} />
            </button>
          </div>
        </div>
      )}
    </Screen>
  );
}

/** One test: tick it to add it to the set, or run it on its own straight away. */
function TestRow({ t, on, full, onToggle, onRun, busy }: { t: TestInfo; on: boolean; full: boolean; onToggle: () => void; onRun: () => void; busy: boolean }) {
  const copy = TEST_COPY[t.id];
  return (
    <div className={cn("flex flex-col gap-3 rounded-[20px] border bg-white p-4 transition-colors", on ? "border-ink" : "border-line")}>
      <label className={cn("flex items-start gap-3", !on && full ? "cursor-not-allowed" : "cursor-pointer")}>
        <input type="checkbox" checked={on} disabled={!on && full} onChange={onToggle} className="peer sr-only" />
        <span
          aria-hidden
          className={cn(
            "mt-0.5 grid size-6 flex-none place-items-center rounded-[8px] border-2 transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-ink/15",
            on ? "border-ink bg-ink text-white" : "border-line-strong bg-white",
          )}
        >
          {on && <Icon name="check" size={14} strokeWidth={3} />}
        </span>
        <span className="grid size-11 flex-none place-items-center rounded-[14px] border border-divider bg-card-hover text-[18px] font-bold">
          <TestIcon id={t.id} size={22} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[16px] font-semibold">{copy.title}</span>
          <span className="text-[13px] text-muted">
            {librarySub(t)} · Ages {t.minAge}+
          </span>
        </span>
      </label>
      <p className="m-0 line-clamp-2 text-[14px] leading-normal text-ink-soft">{copy.checks}</p>
      <button
        type="button"
        onClick={onRun}
        disabled={busy}
        className="flex h-10 items-center justify-center gap-1.5 self-start rounded-full border border-line-strong bg-white px-4 text-[14px] font-semibold transition-colors hover:border-ink disabled:opacity-50"
      >
        Run this test
        <Icon name="arrowRight" size={16} />
      </button>
    </div>
  );
}
