"use client";

import { OrderKind, PaymentMethod } from "@visus/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Chip, Segmented } from "@/components/Chip";
import { cn } from "@/components/cn";
import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ShopPatientPicker } from "@/components/ShopPatientPicker";
import { useShopReady } from "@/components/ShopShell";
import { createOrder, ORDER_KIND, PAYMENT_METHOD, rupees } from "@/services/orders";
import { listPatients, type ShopPatient } from "@/services/shops";

const KINDS = OrderKind.options;
const METHODS = PaymentMethod.options;
const FIELD = "h-12 w-full rounded-[14px] border border-line-strong bg-white px-3.5 text-[16px] outline-none focus:border-ink focus:shadow-[0_0_0_4px_rgba(17,17,17,.06)]";
const money = (v: string) => v.replace(/\D/g, "").slice(0, 7);

/** Shop portal: a new order. `?patient=<id>` (from a patient's page) picks that patient. */
export default function NewOrderPage() {
  return (
    <Suspense fallback={null}>
      <NewOrder />
    </Suspense>
  );
}

function NewOrder() {
  const router = useRouter();
  const client = useQueryClient();
  const ready = useShopReady();
  const from = useSearchParams().get("patient");
  const patients = useQuery({ queryKey: ["shop-patients", ""], queryFn: () => listPatients(""), enabled: ready && !!from });
  const [picked, setPicked] = useState<ShopPatient | null | undefined>(undefined);
  // Until the shop picks someone, the patient from the link (once the list has loaded).
  const patient = picked === undefined ? (patients.data?.find((p) => p.id === from) ?? null) : picked;

  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [kind, setKind] = useState<OrderKind>("spectacles");
  const [item, setItem] = useState("");
  const [total, setTotal] = useState("");
  const [advance, setAdvance] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const sum = Number(total || 0);
  const paid = Number(advance || 0);
  const digits = phone.replace(/\D/g, "");
  const ok = (patient || customer.trim()) && item.trim() && total !== "" && paid <= sum && (!digits || digits.length >= 10);

  const m = useMutation({
    mutationFn: () =>
      createOrder({
        patientId: patient?.id,
        customerName: patient ? "" : customer.trim(),
        phone: patient ? "" : phone,
        item: item.trim(),
        kind,
        total: sum,
        advance: paid > 0 ? { amount: paid, method } : undefined,
        dueDate: dueDate || undefined,
        notes: notes.trim(),
      }),
    onSuccess: (o) => {
      void client.invalidateQueries({ queryKey: ["shop-orders"] });
      router.replace(`/shop/orders/${o.id}`);
    },
  });
  const submit = () => ok && !m.isPending && m.mutate();

  return (
    <Screen gap="gap-0">
      <ScreenHeader title="New order" fallback="/shop/orders" />
      <form
        className="mt-5 flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Group label="For">
          <ShopPatientPicker value={patient} onChange={setPicked} />
          {!patient && (
            <div className="grid gap-2.5 sm:grid-cols-2">
              <input aria-label="Customer name" placeholder="Customer name" value={customer} onChange={(e) => setCustomer(e.target.value)} autoComplete="off" className={FIELD} />
              <input aria-label="Mobile number (optional)" placeholder="Mobile number (optional)" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="off" className={FIELD} />
            </div>
          )}
        </Group>

        <Group label="What">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Type">
            {KINDS.map((k) => (
              <Chip key={k} compact label={ORDER_KIND[k]} selected={kind === k} onClick={() => setKind(k)} />
            ))}
          </div>
          <input aria-label="Item" placeholder="e.g. ZEISS SmartLife progressive lenses + frame" value={item} onChange={(e) => setItem(e.target.value)} className={FIELD} />
        </Group>

        <Group label="Payment">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Money label="Total" value={total} onChange={setTotal} />
            <Money label="Paid now (advance)" value={advance} onChange={setAdvance} />
          </div>
          {paid > 0 && <Segmented options={METHODS.map((x) => PAYMENT_METHOD[x])} value={METHODS.indexOf(method)} onChange={(i) => setMethod(METHODS[i])} />}
          {paid > sum && <p className="m-0 text-[14px] text-doc">The advance can&apos;t be more than the total.</p>}
          {total !== "" && paid <= sum && <p className="m-0 text-[14px] text-muted">{paid > 0 ? `${rupees(sum - paid)} will be due.` : `${rupees(sum)} will be due.`}</p>}
        </Group>

        <Group label="Ready by (optional)">
          <input type="date" aria-label="Ready by" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={cn(FIELD, "sm:max-w-[240px]")} />
        </Group>

        <Group label="Notes (optional)">
          <textarea
            aria-label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 500))}
            placeholder="Prescription, frame colour, lab…"
            rows={3}
            className="w-full resize-y rounded-[14px] border border-line-strong bg-white px-3.5 py-3 text-[16px] outline-none focus:border-ink focus:shadow-[0_0_0_4px_rgba(17,17,17,.06)]"
          />
        </Group>

        {m.isError && <p className="m-0 text-[14px] text-doc">{m.error.message}</p>}
        <button type="submit" disabled={!ok || m.isPending} className="flex h-14 items-center justify-center rounded-[16px] bg-ink px-6 text-[16px] font-semibold text-white disabled:opacity-35">
          {m.isPending ? "Saving…" : "Save order"}
        </button>
      </form>
    </Screen>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
      <legend className="mb-2.5 p-0 text-[14px] font-semibold text-ink-soft">{label}</legend>
      {children}
    </fieldset>
  );
}

function Money({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="relative flex flex-col gap-1">
      <span className="text-[13px] font-semibold text-muted">{label}</span>
      <span className="pointer-events-none absolute bottom-0 left-3.5 flex h-12 items-center text-[16px] text-muted">₹</span>
      <input inputMode="numeric" value={value} onChange={(e) => onChange(money(e.target.value))} placeholder="0" className={cn(FIELD, "pl-8 tabular-nums")} />
    </label>
  );
}
