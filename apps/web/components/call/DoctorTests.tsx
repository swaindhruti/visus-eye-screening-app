"use client";

import { TEST_CATALOG, type Eye, type TestId } from "@visus/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { StatusBadge } from "@/components/Chip";
import { cn } from "@/components/cn";
import { Icon } from "@/components/Icon";
import { TestIcon } from "@/components/TestArt";
import { fmtTime } from "@/lib/consults";
import { CATEGORIES, TEST_COPY, testInfo } from "@/lib/tests";
import { cancelTest, pushTest, type ConsultTest, type LiveState } from "@/services/consults";

/** The eye choice, as the doctor reads it. One-eye tests asked for "both" run right, then left. */
const CHOICE: Record<Eye, string> = { right: "Right eye only", left: "Left eye only", both: "Both, one at a time" };

/** What the patient is doing for this test: "Left eye only (right eye covered)", "Both eyes together"… */
function eyeText(testId: TestId, eye: Eye) {
  if (!testInfo(testId).eachEye) return "Both eyes together";
  if (eye === "both") return "Both eyes, right then left";
  return eye === "right" ? "Right eye only (left covered)" : "Left eye only (right covered)";
}

/**
 * The doctor's live tests: pick a test and an eye, send it to the patient's screen, and see the
 * result card when the patient finishes (scored on the server; red flags come from the rules).
 */
export function DoctorTests({ consultId, live }: { consultId: string; live?: LiveState }) {
  const client = useQueryClient();
  const [testId, setTestId] = useState<TestId>("amsler");
  const [eye, setEye] = useState<Eye>("right");
  const eachEye = testInfo(testId).eachEye;
  const refresh = () => client.invalidateQueries({ queryKey: ["live", consultId] });
  const push = useMutation({ mutationFn: () => pushTest(consultId, { testId, eye: eachEye ? eye : "both" }), onSuccess: refresh });
  const cancel = useMutation({ mutationFn: (rowId: string) => cancelTest(consultId, rowId), onSuccess: refresh });
  const pending = live?.pendingTest ?? null;
  const tests = [...(live?.tests ?? [])].reverse();

  return (
    <div className="flex flex-col gap-4 p-4 md:p-5">
      <div className="flex flex-col gap-3 rounded-[18px] border border-line p-4">
        <span className="text-[15px] font-bold">Send a test to the patient&apos;s screen</span>
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
          Test
          <select
            value={testId}
            onChange={(e) => {
              const id = e.target.value as TestId;
              setTestId(id);
              if (!testInfo(id).eachEye) setEye("both");
              else if (eye === "both") setEye("right");
            }}
            className="h-11 rounded-[12px] border border-line-strong bg-white px-3 text-[15px] font-medium text-ink outline-none focus:border-ink"
          >
            {CATEGORIES.map((cat) => (
              <optgroup key={cat.id} label={cat.label}>
                {TEST_CATALOG.filter((t) => t.category === cat.id).map((t) => (
                  <option key={t.id} value={t.id}>
                    {TEST_COPY[t.id].title} ({t.minutes} min)
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
          Eye
          <div className="flex gap-2" role="radiogroup" aria-label="Eye">
            {(eachEye ? (["right", "left", "both"] as Eye[]) : (["both"] as Eye[])).map((e) => (
              <button
                key={e}
                type="button"
                role="radio"
                aria-checked={(eachEye ? eye : "both") === e}
                onClick={() => setEye(e)}
                className={cn("h-10 flex-1 rounded-[12px] border text-[14px] font-semibold transition-colors", (eachEye ? eye : "both") === e ? "border-ink bg-ink text-white" : "border-line-strong bg-white text-ink hover:bg-card-hover")}
              >
                {eachEye ? CHOICE[e] : "Both eyes together"}
              </button>
            ))}
          </div>
          <span className="font-normal">{eachEye ? `Sends: ${eyeText(testId, eye)}.` : "This test is done with both eyes open together."}</span>
        </div>
        <button
          type="button"
          disabled={!!pending || push.isPending}
          onClick={() => push.mutate()}
          className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-ink text-[15px] font-semibold text-white transition-colors hover:bg-[#2a2a2a] disabled:opacity-40"
        >
          <Icon name="send" size={18} />
          {push.isPending ? "Sending…" : "Send to the patient's screen"}
        </button>
        {push.isError && <p className="m-0 text-[13px] text-doc">{push.error.message}</p>}
      </div>

      {pending && (
        <div className="flex items-center gap-3 rounded-[18px] bg-acc-soft p-4">
          <span className="size-5 flex-none animate-spin rounded-full border-[3px] border-acc/30 border-t-acc" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[15px] font-semibold">
              {TEST_COPY[pending.testId].title} · {eyeText(pending.testId, pending.eye)}
            </span>
            <span className="text-[13px] text-ink-soft">On the patient&apos;s screen now. The result shows here when they finish.</span>
          </span>
          <button type="button" disabled={cancel.isPending} onClick={() => cancel.mutate(pending.id)} className="h-9 rounded-[10px] px-3 text-[14px] font-semibold text-doc hover:bg-white/60">
            Cancel
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        <span className="text-[15px] font-bold">Results in this call</span>
        {tests.filter((t) => t.status !== "pushed").length === 0 && <p className="m-0 text-[14px] text-muted">No tests finished yet.</p>}
        {tests
          .filter((t) => t.status !== "pushed")
          .map((t) => (
            <ResultCard key={t.id} t={t} />
          ))}
      </div>
    </div>
  );
}

function ResultCard({ t }: { t: ConsultTest }) {
  const r = t.result;
  if (t.status === "cancelled" || !r)
    return (
      <div className="flex items-center gap-3 rounded-[16px] border border-dashed border-line px-4 py-3 text-[14px] text-muted">
        <TestIcon id={t.testId} />
        {TEST_COPY[t.testId].title} · {eyeText(t.testId, t.eye)} · cancelled
      </div>
    );
  const flagged = r.status === "see_doctor";
  return (
    <div className={cn("flex flex-col gap-2 rounded-[16px] border bg-white p-4", flagged ? "border-[#F2D3CE]" : "border-line")}>
      <div className="flex items-center gap-3">
        <span className="grid size-10 flex-none place-items-center rounded-full bg-fill text-[16px] font-bold">
          <TestIcon id={t.testId} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] font-semibold">{TEST_COPY[t.testId].title}</span>
          <span className="text-[12px] text-muted">
            {eyeText(t.testId, t.eye)} · sent {fmtTime(t.pushedAt)}
          </span>
        </span>
        <span className="text-[22px] font-bold tabular-nums">{r.score}</span>
      </div>
      <StatusBadge status={r.status} className="self-start" />
      <p className="m-0 text-[14px] leading-snug text-ink-soft">{r.summary}</p>
      {r.eyes && (
        <div className="flex gap-2">
          {(t.eye === "both" ? (["right", "left"] as const) : t.eye === "right" ? (["right"] as const) : (["left"] as const)).map(
            (side) =>
              r.eyes?.[side] && (
                <span key={side} className="flex-1 rounded-[10px] bg-fill px-3 py-2 text-[13px]">
                  <span className="text-muted">{side === "right" ? "Right" : "Left"}: </span>
                  <span className="font-semibold">{r.eyes[side]!.value}</span>
                </span>
              ),
          )}
        </div>
      )}
      {flagged && r.meaning && (
        <p className="m-0 flex items-start gap-2 rounded-[10px] bg-doc-bg px-3 py-2 text-[13px] text-doc">
          <Icon name="alert" size={16} className="mt-px flex-none" />
          Red flag (rules): {r.meaning}
        </p>
      )}
    </div>
  );
}
