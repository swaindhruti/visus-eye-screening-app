"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthBody, AuthShell, AuthTitle, PanelList, PanelTitle, PillButton } from "@/components/AuthShell";
import { PasswordField, TextField } from "@/components/Field";
import { Spacer } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { login, logout } from "@/services/auth";
import { isShop } from "@/services/shops";

/** Shop portal log in. A personal account is told to use the normal log in. */
export default function ShopLogin() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const ok = id.trim().length >= 3 && pw.length > 0;

  const m = useMutation({
    mutationFn: async () => {
      const user = await login({ identifier: id.trim(), password: pw });
      if (!isShop(user)) {
        logout();
        throw new Error("This is a personal account. Use the normal log in instead.");
      }
    },
    onSuccess: () => router.replace("/shop"),
  });
  const submit = () => ok && !m.isPending && m.mutate();

  return (
    <AuthShell
      panel={
        <>
          <PanelTitle title="Your counter, ready." sub="Your patients, their checks and link requests are waiting." />
          <PanelList
            items={[
              ["search", "Find a patient by name or phone"],
              ["eye", "Run a full AI check, quick check or single test"],
              ["results", "Results saved to the patient's record"],
            ]}
          />
        </>
      }
    >
      <ScreenHeader fallback="/welcome" />
      <AuthBody>
        <div className="mt-6 lg:mt-0">
          <AuthTitle eyebrow="Shop portal" title="Log in to your shop" />
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
          New shop?{" "}
          <Link href="/shop/register" className="font-semibold text-ink underline-offset-4 hover:underline">
            Register your shop
          </Link>
        </p>
      </AuthBody>
    </AuthShell>
  );
}
