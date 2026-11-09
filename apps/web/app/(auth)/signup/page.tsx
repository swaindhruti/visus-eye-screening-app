"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthBody, AuthShell, AuthTitle, PanelTitle, PillButton } from "@/components/AuthShell";
import { cn } from "@/components/cn";
import { PasswordField, TextField } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { Spacer } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { AccountSwitch } from "@/components/ShopShell";
import { signup } from "@/services/auth";

const STEPS = [
  ["Tell us what's wrong", "In your own words, or by voice."],
  ["Take the tests it picks", "The plan adapts after every test."],
  ["Get a clear result", "And ZEISS lenses that suit you."],
];

export default function SignUp() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const longEnough = pw.length >= 8;
  const match = pw2.length > 0 && pw === pw2;
  const ok = name.trim() && id.trim().length >= 3 && longEnough && match;

  const m = useMutation({
    mutationFn: () => signup({ name: name.trim(), identifier: id.trim(), password: pw }),
    onSuccess: () => router.push("/onboarding"),
  });

  return (
    <AuthShell
      panel={
        <>
          <PanelTitle title="Five minutes to know your eyes better." />
          <ol className="m-0 mt-9 flex list-none flex-col gap-5 p-0">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="flex items-start gap-4">
                <span className="grid size-9 flex-none place-items-center rounded-full border border-white/20 text-[14px] font-medium tabular-nums">{i + 1}</span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-[17px] font-medium">{title}</span>
                  <span className="text-[14px] text-white/55">{body}</span>
                </span>
              </li>
            ))}
          </ol>
        </>
      }
    >
      <ScreenHeader fallback="/welcome" />
      <AuthBody>
        <div className="mt-6 lg:mt-0">
          <AuthTitle eyebrow="Sign up" title="Create your account" sub="Save your results and see how your eyes change over time." />
        </div>
        <form
          className="mt-8 flex animate-rise flex-col gap-4 [animation-delay:80ms] [animation-duration:.8s] motion-reduce:animate-none"
          onSubmit={(e) => {
            e.preventDefault();
            if (ok) m.mutate();
          }}
        >
          <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" />
          <TextField label="Phone or email" value={id} onChange={(e) => setId(e.target.value)} placeholder="+91 98765 43210 or you@example.com" autoComplete="username" />
          <PasswordField
            id="pw"
            label="Password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Create a password"
            autoComplete="new-password"
            hint={
              <span className={cn("flex items-center gap-1.5 text-[13px] transition-colors", longEnough ? "text-good" : "text-[#8A8A85]")}>
                <Icon name="check" size={14} strokeWidth={2.2} />
                At least 8 characters
              </span>
            }
          />
          <PasswordField
            id="pw2"
            label="Confirm password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            placeholder="Type it again"
            autoComplete="new-password"
            hint={
              <span className={cn("min-h-[18px] text-[13px]", match ? "text-good" : "text-mild")}>
                {pw2 ? (match ? "Passwords match" : "Passwords don't match yet") : ""}
              </span>
            }
          />
          <button type="submit" hidden />
        </form>
        <Spacer min={24} />
        <div className="flex animate-rise flex-col [animation-delay:160ms] [animation-duration:.8s] motion-reduce:animate-none">
          {m.isError && <p className="m-0 mb-3 text-center text-[14px] text-doc">{m.error.message || "Couldn't create your account. Try again."}</p>}
          <PillButton disabled={!ok || m.isPending} onClick={() => ok && m.mutate()}>
            {m.isPending ? "Creating account…" : "Create account"}
          </PillButton>
          <p className="m-0 mt-5 text-center text-[15px] text-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-ink underline-offset-4 hover:underline">
              Log in
            </Link>
          </p>
          <AccountSwitch href="/shop/register" icon="store" title="Sign up as an optical shop" sub="Register your shop to test customers and keep records" />
        </div>
      </AuthBody>
    </AuthShell>
  );
}
