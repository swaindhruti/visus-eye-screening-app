"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/Button";
import { PasswordField, TextField } from "@/components/Field";
import { Screen, Spacer } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { login } from "@/services/auth";
import { listProfiles } from "@/services/profiles";
import { useSettings } from "@/store/settings";

export default function LogIn() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const ok = id.trim().length >= 3 && pw.length > 0;

  const m = useMutation({
    mutationFn: async () => {
      await login({ identifier: id.trim(), password: pw });
      return listProfiles();
    },
    onSuccess: (profiles) => {
      // An account without a profile yet (signed up, left onboarding) finishes onboarding first.
      useSettings.getState().set({ onboarded: profiles.length > 0 });
      router.push(profiles.length ? "/home" : "/onboarding");
    },
  });
  const submit = () => ok && !m.isPending && m.mutate();

  return (
    <Screen gap="gap-0">
      <ScreenHeader title="Log in" fallback="/welcome" />
      <h1 className="m-0 mt-5 text-[28px] font-bold leading-[1.15] tracking-[-0.025em]">Welcome back</h1>
      <p className="m-0 mt-1.5 text-[16px] leading-normal text-muted text-pretty">Log in to see your checks and your family&apos;s.</p>
      <form
        className="mt-[22px] flex flex-col gap-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <TextField label="Phone or email" value={id} onChange={(e) => setId(e.target.value)} placeholder="+91 98765 43210 or you@example.com" autoComplete="username" />
        <PasswordField id="pw" label="Password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Your password" autoComplete="current-password" />
        <button type="submit" hidden />
      </form>
      <Spacer />
      {m.isError && <p className="m-0 mb-3 text-center text-[14px] text-doc">{m.error.message || "Couldn't log you in. Check your details."}</p>}
      <Button disabled={!ok || m.isPending} onClick={submit}>
        {m.isPending ? "Logging in…" : "Log in"}
      </Button>
      <p className="m-0 mt-3.5 text-center text-[15px] text-muted">
        New to Visus?{" "}
        <Link href="/signup" className="font-bold text-ink">
          Sign up
        </Link>
      </p>
    </Screen>
  );
}
