"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { setGuest } from "@/services/auth";
import { useCheck } from "@/store/check";

import { Button } from "./Button";
import { Icon } from "./Icon";

const MISSING = ["AI eye check chat and a test plan made for you", "Saved results and trends over time", "Family profiles", "ZEISS lens suggestions and doctor reports"];

/** Before guest mode: what a guest gets and what needs an account. */
export function GuestDialog({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-30 bg-[rgba(17,17,17,.42)]" onClick={onBack} />
      <div
        role="alertdialog"
        aria-modal
        aria-labelledby="guest-title"
        className="fixed inset-x-5 top-1/2 z-40 mx-auto flex max-h-[90dvh] max-w-[440px] -translate-y-1/2 flex-col overflow-y-auto rounded-[28px] bg-white px-5 pb-5 pt-6 shadow-[0_20px_50px_rgba(0,0,0,.2)] md:px-7 md:pt-7"
      >
        <span className="grid size-14 flex-none place-items-center self-center rounded-full bg-acc-soft text-acc-ink">
          <Icon name="profile" size={26} />
        </span>
        <h2 id="guest-title" className="m-0 mt-4 text-center text-[22px] font-bold tracking-[-0.015em]">
          Continue as a guest?
        </h2>
        <p className="m-0 mt-2 text-center text-[16px] leading-normal text-muted text-pretty">
          You can take any test from the Tests library and see your result. Results aren&apos;t saved to an account.
        </p>
        <div className="mt-4 flex flex-col gap-2.5 rounded-[18px] bg-fill px-4 py-3.5">
          <span className="text-[13px] font-bold text-ink-soft">Needs an account</span>
          {MISSING.map((m) => (
            <span key={m} className="flex items-start gap-2.5 text-[15px] leading-[1.4] text-ink-soft">
              <span className="mt-[7px] size-1.5 flex-none rounded-full bg-muted" />
              {m}
            </span>
          ))}
        </div>
        <p className="m-0 mt-3 text-center text-[13px] leading-normal text-muted text-pretty">Sign up any time to get the full Visus check.</p>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <Button variant="secondary" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onContinue}>Continue</Button>
        </div>
      </div>
    </>
  );
}

/** Welcome: "Continue as guest" → the dialog → the Tests library. */
export function ContinueAsGuest() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="h-11 self-center whitespace-nowrap text-[15px] font-semibold text-muted underline-offset-4 hover:text-ink hover:underline md:self-auto md:px-2">
        Continue as guest
      </button>
      {open && (
        <GuestDialog
          onBack={() => setOpen(false)}
          onContinue={() => {
            setGuest(true);
            useCheck.getState().reset();
            router.push("/tests");
          }}
        />
      )}
    </>
  );
}
