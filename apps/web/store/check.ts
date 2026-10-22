import type { NextStep, ScoredResult, TestId, Verdict } from "@visus/shared";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { CheckMode, CreatedSession } from "@/services/sessions";

type CheckState = {
  sessionId: string | null;
  mode: CheckMode;
  profileId: string | null;
  intake: string;
  summary: string;
  plan: { testId: TestId; reason: string }[];
  done: TestId[];
  results: ScoredResult[];
  lastStep: NextStep | null;
  verdict: Verdict | null;
  startedAt: number;
  /** Raw answers this device sent, for screens that draw them back (field map). */
  answers: Partial<Record<TestId, Record<string, unknown>>>;

  setProfile: (profileId: string) => void;
  start: (session: CreatedSession, mode: CheckMode, intake: string) => void;
  recordStep: (step: NextStep) => void;
  saveAnswers: (testId: TestId, answers: Record<string, unknown>) => void;
  setVerdict: (verdict: Verdict) => void;
  reset: () => void;
};

const empty = {
  sessionId: null,
  mode: "full" as CheckMode,
  intake: "",
  summary: "",
  plan: [],
  done: [],
  results: [],
  lastStep: null,
  verdict: null,
  startedAt: 0,
  answers: {},
};

/** The check in progress. Kept in sessionStorage so a refresh mid-check doesn't lose it. */
export const useCheck = create<CheckState>()(
  persist(
    (set) => ({
      ...empty,
      profileId: null,
      setProfile: (profileId) => set({ profileId }),
      start: (session, mode, intake) =>
        set({ ...empty, sessionId: session.sessionId, summary: session.summary, plan: session.plan, mode, intake, startedAt: Date.now() }),
      recordStep: (step) =>
        set((s) => {
          let plan = s.plan;
          if (step.type === "next_test" && step.added && !s.plan.some((p) => p.testId === step.testId)) {
            const at = s.plan.findIndex((p) => p.testId === step.result.testId) + 1;
            plan = [...s.plan.slice(0, at), { testId: step.testId, reason: step.reason }, ...s.plan.slice(at)];
          }
          return {
            plan,
            lastStep: step,
            done: [...s.done.filter((id) => id !== step.result.testId), step.result.testId],
            // A glasses check has Tumbling E twice (without, then with glasses): keep both.
            results: s.mode === "glasses" ? [...s.results, step.result] : [...s.results.filter((r) => r.testId !== step.result.testId), step.result],
          };
        }),
      saveAnswers: (testId, answers) => set((s) => ({ answers: { ...s.answers, [testId]: answers } })),
      setVerdict: (verdict) => set({ verdict }),
      reset: () => set(empty),
    }),
    { name: "visus.check", storage: createJSONStorage(() => sessionStorage), skipHydration: true },
  ),
);

/** First test in the plan that hasn't been done yet. */
export function nextPlannedTest(s: Pick<CheckState, "plan" | "done">): TestId | null {
  return s.plan.find((p) => !s.done.includes(p.testId))?.testId ?? null;
}
