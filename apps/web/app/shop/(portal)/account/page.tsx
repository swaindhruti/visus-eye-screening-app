"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/Button";
import { TextField } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { useShopReady } from "@/components/ShopShell";
import { ErrorState } from "@/components/States";
import { getShopAccount, updateShop, type ShopAccount } from "@/services/shops";

/** Shop portal: Account. The shop's details (editable) and the login it uses. */
export default function ShopAccountPage() {
  const ready = useShopReady();
  const q = useQuery({ queryKey: ["shop-account"], queryFn: getShopAccount, enabled: ready });

  if (q.isError) return <ErrorState title="Couldn't open your account" body={q.error.message} onRetry={() => q.refetch()} retrying={q.isFetching} />;
  const a = q.data;

  return (
    <Screen wide gap="gap-5 md:gap-7" eyebrow="Shop portal" title="Account">
      {!a ? (
        <p className="m-0 text-[15px] text-muted">Loading…</p>
      ) : (
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-6">
          <ShopForm a={a} />
          <aside className="flex min-w-0 flex-col gap-4 md:flex-[2_1_0]">
            <section className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-[18px]">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-full bg-fill">
                  <Icon name="profile" size={18} />
                </span>
                <h2 className="m-0 text-[17px] font-bold">Login</h2>
              </div>
              <dl className="m-0 flex flex-col gap-2.5 text-[15px]">
                <Row label="Owner" value={a.ownerName} />
                <Row label="Phone or email" value={a.identifier} />
              </dl>
            </section>
            <section className="flex items-center gap-4 rounded-[20px] border border-line bg-white p-[18px]">
              <span className="text-[34px] font-bold leading-none tracking-[-0.02em] tabular-nums">{a.patients}</span>
              <span className="text-[15px] font-semibold text-muted">{a.patients === 1 ? "patient in your records" : "patients in your records"}</span>
            </section>
          </aside>
        </div>
      )}
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[13px] font-semibold text-muted">{label}</dt>
      <dd className="m-0 break-words font-semibold">{value || "Not set"}</dd>
    </div>
  );
}

/** The shop's name, city and address, saved with PATCH /shop. */
function ShopForm({ a }: { a: ShopAccount }) {
  const client = useQueryClient();
  const [name, setName] = useState(a.name);
  const [city, setCity] = useState(a.city);
  const [address, setAddress] = useState(a.address);
  const changed = name.trim() !== a.name || city.trim() !== a.city || address.trim() !== a.address;
  const ok = name.trim().length >= 2 && changed;
  const m = useMutation({
    mutationFn: () => updateShop({ name: name.trim(), city: city.trim(), address: address.trim() }),
    onSuccess: (next) => {
      client.setQueryData(["shop-account"], next);
      // The sidebar shows the shop name from the login.
      void client.invalidateQueries({ queryKey: ["me"] });
    },
  });

  return (
    <form
      className="flex min-w-0 flex-col gap-4 rounded-[20px] border border-line bg-white p-[18px] md:flex-[3_1_0] md:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (ok && !m.isPending) m.mutate();
      }}
    >
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-full bg-fill">
          <Icon name="store" size={18} />
        </span>
        <h2 className="m-0 text-[17px] font-bold">Your shop</h2>
      </div>
      <TextField label="Shop name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="organization" />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="City" value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" />
        <TextField label="Address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, area" autoComplete="street-address" />
      </div>
      <p className="m-0 text-[14px] text-muted">Patients see your shop name and city when you ask to link their Visus account.</p>
      {m.isError && <p className="m-0 text-[14px] text-doc">{m.error.message}</p>}
      <Button type="submit" disabled={!ok || m.isPending} className="h-12 self-start px-6 text-[15px]">
        {m.isPending ? "Saving…" : m.isSuccess && !changed ? "Saved" : "Save changes"}
      </Button>
    </form>
  );
}
