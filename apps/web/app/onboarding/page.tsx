"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthShell, PillButton } from "@/components/AuthShell";
import { Button } from "@/components/Button";
import { Chip, OptionRow } from "@/components/Chip";
import { cn } from "@/components/cn";
import { AgeStepper } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { Spacer } from "@/components/Screen";
import { HeaderButton } from "@/components/ScreenHeader";
import { CONDITION_OPTIONS, createProfile, EYEWEAR_OPTIONS, GENDER_OPTIONS, PAST_OPTIONS, SCREEN_TIME_OPTIONS, screenHours } from "@/services/profiles";
import { useCheck } from "@/store/check";
import { useSettings } from "@/store/settings";

const SPECS_LABELS = EYEWEAR_OPTIONS.map(([, l]) => l);
const PAST_LABELS = PAST_OPTIONS.map(([, l]) => l);

type Data = { name: string; gender: string | null; age: number | ""; specs: string | null; past: string | null; note: string; cond: string[]; screen: string | null };

const STEP_NAMES = ["Your name", "Gender", "Age", "Glasses or lenses", "Eye history", "Health", "Screen time"];

const Q = ({ children }: { children: React.ReactNode }) => <h1 className="m-0 mt-3 text-[32px] font-medium leading-[1.05] tracking-[-0.035em] text-balance md:text-[40px]">{children}</h1>;
const Sub = ({ children }: { children: React.ReactNode }) => <p className="m-0 mt-3 text-body leading-relaxed text-muted text-pretty">{children}</p>;

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Data>({ name: "", gender: null, age: 30, specs: null, past: null, note: "", cond: [], screen: null });
  const set = (patch: Partial<Data>) => setD((x) => ({ ...x, ...patch }));
  const go = (n: number) => setStep(Math.max(0, Math.min(7, n)));
  const canNext = step !== 0 || d.name.trim().length > 0;

  const save = useMutation({
    mutationFn: () =>
      createProfile({
        name: d.name.trim(),
        age: d.age === "" ? 30 : d.age,
        gender: d.gender ?? undefined,
        isChild: d.age !== "" && d.age < 13,
        wearsGlasses: d.specs != null && d.specs !== "Neither",
        healthConditions: d.cond.filter((c) => c !== "None of these"),
        screenHoursPerDay: screenHours(d.screen),
        relation: "self",
        eyewear: EYEWEAR_OPTIONS.find(([, l]) => l === d.specs)?.[0],
        pastEyeTest: PAST_OPTIONS.find(([, l]) => l === d.past)?.[0],
        pastEyeNote: d.past === "Yes" && d.note.trim() ? d.note.trim() : undefined,
      }),
    onSuccess: (p) => {
      useCheck.getState().setProfile(p.id);
      useSettings.getState().set({ onboarded: true });
    },
  });

  const single = (field: "gender" | "specs" | "past" | "screen", list: string[]) => (
    <div className="mt-6 flex flex-col gap-2.5" role="radiogroup">
      {list.map((label) => (
        <OptionRow key={label} label={label} selected={d[field] === label} onClick={() => set({ [field]: d[field] === label ? null : label })} />
      ))}
    </div>
  );

  const toggleCond = (label: string) => {
    if (label === "None of these") return set({ cond: d.cond.includes(label) ? [] : [label] });
    const base = d.cond.filter((x) => x !== "None of these");
    set({ cond: base.includes(label) ? base.filter((x) => x !== label) : [...base, label] });
  };

  // The last question saves the profile, whether answered or skipped.
  const advance = () => {
    if (step === 6) save.mutate();
    go(step + 1);
  };
  const next = () => canNext && advance();

  const rows: [string, string | null][] = [
    ["Gender", d.gender],
    ["Age", d.age ? `${d.age} years` : null],
    ["Glasses / lenses", d.specs],
    ["Past eye tests", d.past ? (d.past === "Yes" && d.note.trim() ? `Yes — ${d.note.trim()}` : d.past) : null],
    ["Health conditions", d.cond.length ? d.cond.join(", ") : null],
    ["Screen time", d.screen],
  ];

  return (
    <AuthShell
      panel={
        <>
          <h2 className="m-0 text-[44px] font-medium leading-[1.02] tracking-[-0.04em] text-balance xl:text-[52px]">A few questions, then your first check.</h2>
          <ol className="m-0 mt-9 flex list-none flex-col gap-1 p-0">
            {STEP_NAMES.map((label, i) => (
              <li key={label} className={cn("flex items-center gap-3.5 rounded-full py-1.5 pr-4 text-[15px] transition-colors duration-500", i === step ? "text-white" : i < step ? "text-white/70" : "text-white/35")}>
                <span
                  className={cn(
                    "grid size-8 flex-none place-items-center rounded-full border text-[13px] font-medium tabular-nums transition-colors duration-500",
                    i === step ? "border-white bg-white text-ink" : i < step ? "border-acc-bright/50 bg-acc-bright/15 text-acc-bright" : "border-white/15",
                  )}
                >
                  {i < step ? <Icon name="check" size={12} strokeWidth={2.4} /> : i + 1}
                </span>
                {label}
              </li>
            ))}
          </ol>
        </>
      }
    >
      <div
        className="flex flex-1 flex-col"
        onKeyDown={(e) => {
          if (e.key === "Enter" && step < 7 && (e.target as HTMLElement).tagName !== "TEXTAREA") next();
        }}
      >
        <div className="flex h-11 items-center gap-3.5">
          <HeaderButton icon="chevronLeft" label="Back" onClick={() => (step === 0 ? router.back() : go(step - 1))} className={cn(step === 0 && "opacity-35")} />
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-option" role="progressbar" aria-valuenow={step + 1} aria-valuemax={8}>
            <div className="h-full rounded-full bg-acc transition-[width] duration-400 ease-[cubic-bezier(.2,.7,.3,1)]" style={{ width: `${Math.round(((step + 1) / 8) * 100)}%` }} />
          </div>
          <button type="button" onClick={advance} className={cn("h-11 rounded-full px-4 text-[15px] font-medium text-muted transition-colors hover:bg-fill hover:text-ink", (step === 0 || step === 7) && "invisible")}>
            Skip
          </button>
        </div>

        {/* key: each step rises in when it appears */}
        <div key={step} className="mt-8 flex animate-rise flex-col [animation-duration:.7s] motion-reduce:animate-none lg:mt-[12vh]">
          <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-faint">{step < 7 ? `Step ${step + 1} of 7` : "All done"}</div>

          {step === 0 && (
            <>
              <Q>What should we call you?</Q>
              <Sub>Just your first name is fine.</Sub>
              <input
                autoFocus
                value={d.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="Your name"
                aria-label="Your name"
                className="mt-8 h-[60px] w-full rounded-[18px] border border-line-strong bg-white px-5 text-[18px] outline-none transition-[border-color,box-shadow] focus:border-ink focus:shadow-[0_0_0_4px_rgba(17,17,17,.06)] focus-visible:outline-none"
              />
            </>
          )}
          {step === 1 && (
            <>
              <Q>How do you identify?</Q>
              <Sub>Some eye conditions show up differently, so this helps tune your checks.</Sub>
              {single("gender", GENDER_OPTIONS)}
            </>
          )}
          {step === 2 && (
            <>
              <Q>How old are you?</Q>
              <Sub>Eyes change with age, so we adjust each test to match.</Sub>
              <div className="mt-10">
                <AgeStepper value={d.age} onChange={(age) => set({ age })} />
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <Q>Do you wear glasses or lenses?</Q>
              {single("specs", SPECS_LABELS)}
            </>
          )}
          {step === 4 && (
            <>
              <Q>Had an eye test or diagnosis before?</Q>
              {single("past", PAST_LABELS)}
              {d.past === "Yes" && (
                <textarea
                  value={d.note}
                  onChange={(e) => set({ note: e.target.value })}
                  placeholder="What was it, and roughly when? (optional)"
                  rows={3}
                  className="mt-2.5 w-full resize-none rounded-[16px] border border-line-strong bg-white px-4 py-3.5 text-[16px] leading-[1.45] outline-none focus:border-ink focus-visible:outline-none"
                />
              )}
            </>
          )}
          {step === 5 && (
            <>
              <Q>Any health conditions right now?</Q>
              <Sub>Some affect your eyes. Pick all that apply.</Sub>
              <div className="mt-6 flex flex-wrap gap-2.5">
                {CONDITION_OPTIONS.map((label) => (
                  <Chip key={label} label={label} selected={d.cond.includes(label)} onClick={() => toggleCond(label)} />
                ))}
              </div>
            </>
          )}
          {step === 6 && (
            <>
              <Q>How long are you on screens each day?</Q>
              <Sub>Phone, laptop and TV together.</Sub>
              {single("screen", SCREEN_TIME_OPTIONS)}
            </>
          )}
          {step === 7 && (
            <>
              <div className="mt-2 grid size-[60px] place-items-center rounded-full bg-acc-soft text-acc-ink">
                <Icon name="checkLg" size={28} strokeWidth={2.4} />
              </div>
              <h1 className="m-0 mt-5 text-[32px] font-medium leading-[1.05] tracking-[-0.035em] md:text-[40px]">You&apos;re all set, {d.name.trim().split(" ")[0] || "friend"}</h1>
              <Sub>Here&apos;s what Visus will use to tailor your checks.</Sub>
              <div className="mt-7 rounded-[24px] border border-line bg-white px-5">
                {rows.map(([k, v], i) => (
                  <div key={k} className={cn("flex items-baseline justify-between gap-4 py-[13px] text-[15px]", i > 0 && "border-t border-divider")}>
                    <span className="flex-none text-muted">{k}</span>
                    <span className={cn("text-right font-medium", !v && "text-faint")}>{v || "Skipped"}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <Spacer min={28} />
        {step < 7 ? (
          <PillButton onClick={next} disabled={!canNext}>
            {step === 6 ? "Finish" : "Continue"}
          </PillButton>
        ) : (
          <>
            {save.isError && <p className="m-0 mb-3 text-center text-[14px] text-doc">Couldn&apos;t save your profile. Try again.</p>}
            <PillButton onClick={() => (save.isError ? save.mutate() : router.push("/permissions"))} disabled={save.isPending}>
              {save.isPending ? "Saving…" : save.isError ? "Try again" : "Start my first eye check"}
            </PillButton>
            <Button variant="ghost" className="mt-2 rounded-full!" disabled={!save.isSuccess} onClick={() => router.push("/home")}>
              Later
            </Button>
            <div className="mt-2 text-center text-[14px] text-muted">You can change these anytime in Profile.</div>
          </>
        )}
      </div>
    </AuthShell>
  );
}
