"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthBody, AuthShell, AuthTitle, PanelList, PanelTitle, PillButton } from "@/components/AuthShell";
import { PasswordField, TextField } from "@/components/Field";
import { ContinueAsGuest } from "@/components/GuestDialog";
import { Spacer } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { AccountSwitch } from "@/components/ShopShell";
import { login } from "@/services/auth";
import { listProfiles } from "@/services/profiles";
import { isShop } from "@/services/shops";
import { useSettings } from "@/store/settings";

export default function LogIn() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const ok = id.trim().length >= 3 && pw.length > 0;

  const m = useMutation({
    mutationFn: async () => {
      const user = await login({ identifier: id.trim(), password: pw });
      return isShop(user) ? null : listProfiles();
    },
    onSuccess: (profiles) => {
      // Optical shops log in here too and go to their portal.
      if (!profiles) return router.push("/shop");
      // An account without a profile yet (signed up, left onboarding) finishes onboarding first.
      useSettings.getState().set({ onboarded: profiles.length > 0 });
      router.push(profiles.length ? "/home" : "/onboarding");
    },
  });
  const submit = () => ok && !m.isPending && m.mutate();

  return (
    <AuthShell
      panel={
        <>
          <PanelTitle title="Welcome back." sub="Pick up where you left off: your checks, results and family profiles." />
          <PanelList
            items={[
              ["results", "Results saved and compared over time"],
              ["profile", "Family profiles in one account"],
              ["glasses", "ZEISS lens suggestions from your results"],
            ]}
          />
        </>
      }
    >
      <ScreenHeader fallback="/welcome" />
      <AuthBody>
        <div className="mt-6 lg:mt-0">
          <AuthTitle eyebrow="Log in" title="Good to see you again" sub="Log in to see your checks and your family's." />
        </div>
        <form
          className="mt-8 flex animate-rise flex-col gap-4 [animation-delay:80ms] [animation-duration:.8s] motion-reduce:animate-none"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <TextField label="Phone or email" value={id} onChange={(e) => setId(e.target.value)} placeholder="+91 98765 43210 or you@example.com" autoComplete="username" />
          <PasswordField id="pw" label="Password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Your password" autoComplete="current-password" />
          <button type="submit" hidden />
        </form>
        <Spacer min={28} />
        <div className="flex animate-rise flex-col [animation-delay:160ms] [animation-duration:.8s] motion-reduce:animate-none">
          {m.isError && <p className="m-0 mb-3 text-center text-[14px] text-doc">{m.error.message || "Couldn't log you in. Check your details."}</p>}
          <PillButton disabled={!ok || m.isPending} onClick={submit}>
            {m.isPending ? "Logging in…" : "Log in"}
          </PillButton>
          <p className="m-0 mt-5 text-center text-[15px] text-muted">
            New to Visus?{" "}
            <Link href="/signup" className="font-semibold text-ink underline-offset-4 hover:underline">
              Sign up
            </Link>
          </p>
          <div className="mt-5 flex items-center gap-3 text-[13px] text-faint" aria-hidden>
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>
          <ContinueAsGuest className="mx-auto mt-2 h-11 px-3 text-[15px] font-medium text-muted underline-offset-4 hover:text-ink hover:underline" />
          <AccountSwitch href="/shop/login" icon="store" title="Log in as an optical shop" sub="Test walk-in customers and keep their records" />
        </div>
      </AuthBody>
    </AuthShell>
  );
}
