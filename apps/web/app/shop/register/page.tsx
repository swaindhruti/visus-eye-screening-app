"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthBody, AuthShell, AuthTitle, PanelList, PanelTitle, PillButton } from "@/components/AuthShell";
import { PasswordField, TextField } from "@/components/Field";
import { Spacer } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { registerShop } from "@/services/shops";

/** Shop portal: an optical shop creates its account. */
export default function ShopRegister() {
  const router = useRouter();
  const [f, setF] = useState({ shopName: "", city: "", address: "", ownerName: "", identifier: "", password: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const ok = f.shopName.trim().length >= 2 && f.ownerName.trim() && f.identifier.trim().length >= 3 && f.password.length >= 8;

  const m = useMutation({ mutationFn: () => registerShop({ ...f, identifier: f.identifier.trim() }), onSuccess: () => router.replace("/shop") });
  const submit = () => ok && !m.isPending && m.mutate();

  return (
    <AuthShell
      panel={
        <>
          <PanelTitle title="Visus for optical shops." sub="Screen walk-in customers at the counter in about five minutes, with just a phone or a laptop." />
          <PanelList
            items={[
              ["profile", "Keep a record of every patient you check"],
              ["store", "Link a patient's own Visus account by phone"],
              ["glasses", "ZEISS lens suggestions from each result"],
            ]}
          />
        </>
      }
    >
      <ScreenHeader fallback="/welcome" />
      <AuthBody>
        <div className="mt-6 lg:mt-0">
          <AuthTitle eyebrow="Shop portal" title="Register your shop" sub="One account for your counter. Patients don't need an account." />
        </div>
        <form
          className="mt-8 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <TextField label="Shop name" value={f.shopName} onChange={set("shopName")} placeholder="e.g. Clear View Opticals" autoComplete="organization" />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="City" value={f.city} onChange={set("city")} placeholder="Bhubaneswar" autoComplete="address-level2" />
            <TextField label="Address (optional)" value={f.address} onChange={set("address")} placeholder="Street, area" autoComplete="street-address" />
          </div>
          <TextField label="Your name" value={f.ownerName} onChange={set("ownerName")} placeholder="Owner or manager" autoComplete="name" />
          <TextField label="Phone or email (to log in)" value={f.identifier} onChange={set("identifier")} placeholder="+91 98765 43210 or shop@example.com" autoComplete="username" />
          <PasswordField id="pw" label="Password" value={f.password} onChange={set("password")} placeholder="At least 8 characters" autoComplete="new-password" />
          <button type="submit" hidden />
        </form>
        <Spacer min={28} />
        {m.isError && <p className="m-0 mb-3 text-center text-[14px] text-doc">{m.error.message}</p>}
        <PillButton disabled={!ok || m.isPending} onClick={submit}>
          {m.isPending ? "Creating your shop…" : "Register shop"}
        </PillButton>
        <p className="m-0 mt-5 text-center text-[15px] text-muted">
          Already registered?{" "}
          <Link href="/shop/login" className="font-semibold text-ink underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
      </AuthBody>
    </AuthShell>
  );
}
