"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthBody, AuthShell, AuthTitle, PanelList, PanelTitle, PillButton } from "@/components/AuthShell";
import { PasswordField, TextField } from "@/components/Field";
import { Spacer } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { AccountSwitch } from "@/components/ShopShell";
import { login, logout } from "@/services/auth";
import { isDoctor } from "@/services/doctor";

/** R2: doctor log in. Other accounts are told where to log in instead. */
export default function DoctorLogin() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const ok = id.trim().length >= 3 && pw.length > 0;

  const m = useMutation({
    mutationFn: async () => {
      const user = await login({ identifier: id.trim(), password: pw });
      if (!isDoctor(user)) {
        logout();
        throw new Error(user.role === "shop" ? "This is a shop account. Use the shop log in instead." : "This is a personal account. Use the normal log in instead.");
      }
    },
    onSuccess: () => router.replace("/doctor"),
  });
  const submit = () => ok && !m.isPending && m.mutate();

  return (
    <AuthShell
      panel={
        <>
          <PanelTitle title="Your consults, ready." sub="Today's patients, their records and the clinics you work with." />
          <PanelList
            items={[
              ["calendar", "Today's and upcoming consults"],
              ["doc", "Patient files with an AI summary first"],
              ["store", "Requests from clinics and your weekly hours"],
            ]}
          />
        </>
      }
    >
      <ScreenHeader fallback="/welcome" />
      <AuthBody>
        <div className="mt-6 lg:mt-0">
          <AuthTitle eyebrow="Doctor portal" title="Log in as a doctor" />
        </div>
        <form
          className="mt-8 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <TextField label="Phone or email" value={id} onChange={(e) => setId(e.target.value)} placeholder="The login you registered with" autoComplete="username" />
          <PasswordField id="pw" label="Password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Your password" autoComplete="current-password" />
          <button type="submit" hidden />
        </form>
        <Spacer min={28} />
        {m.isError && <p className="m-0 mb-3 text-center text-[14px] text-doc">{m.error.message || "Couldn't log you in. Check your details."}</p>}
        <PillButton disabled={!ok || m.isPending} onClick={submit}>
          {m.isPending ? "Logging in…" : "Log in"}
        </PillButton>
        <p className="m-0 mt-5 text-center text-[15px] text-muted">
          New here?{" "}
          <Link href="/doctor/register" className="font-semibold text-ink underline-offset-4 hover:underline">
            Join as a doctor
          </Link>
        </p>
        <AccountSwitch href="/login" icon="profile" title="Not a doctor? Log in to your own account" sub="Check your eyes and your family's" />
      </AuthBody>
    </AuthShell>
  );
}
