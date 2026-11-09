"use client";

import { PaymentMethod } from "@visus/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { Segmented } from "@/components/Chip";
import { cn } from "@/components/cn";
import { Icon } from "@/components/Icon";
import { OrderStatusBadge, PaymentBadge } from "@/components/Orders";
import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useShopReady } from "@/components/ShopShell";
import { ErrorState } from "@/components/States";
import { fmtFull, fmtShort } from "@/lib/dates";
import { addPayment, getOrder, ORDER_KIND, ORDER_STATUS, PAYMENT_METHOD, rupees, updateOrder, type OrderStatus, type ShopOrder } from "@/services/orders";

const STEPS: OrderStatus[] = ["new", "in_progress", "ready", "delivered"];
const METHODS = PaymentMethod.options;

/** Shop portal: one order. Move it along (new → in progress → ready → delivered), and record payments. */
export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const ready = useShopReady();
  const q = useQuery({ queryKey: ["shop-order", id], queryFn: () => getOrder(id), enabled: ready });

  if (q.isError) return <ErrorState title="Couldn't open this order" body={q.error.message} onRetry={() => q.refetch()} retrying={q.isFetching} />;
  const o = q.data;
  if (!o)
    return (
      <Screen gap="gap-4">
        <ScreenHeader title="Order" fallback="/shop/orders" />
        <p className="m-0 text-[15px] text-muted">Loading…</p>
      </Screen>
    );

  return (
    <Screen wide gap="gap-5 md:gap-7">
      <ScreenHeader title="" fallback="/shop/orders" />
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[14px] font-semibold text-muted">
            {ORDER_KIND[o.kind]} · Ordered {fmtFull(o.createdAt)}
          </span>
          <h1 className="m-0 text-[28px] font-bold leading-[1.15] tracking-[-0.025em] md:text-[36px]">{o.item}</h1>
          <span className="text-[15px] text-muted md:text-[16px]">
            {o.patientId ? (
              <Link href={`/shop/patients/${o.patientId}`} className="font-semibold text-ink underline-offset-4 hover:underline">
                {o.customerName}
              </Link>
            ) : (
              o.customerName
            )}
            {o.phone ? ` · ${o.phone}` : ""}
          </span>
        </div>
        <div className="flex gap-2">
          <OrderStatusBadge status={o.status} />
          <PaymentBadge o={o} />
        </div>
      </header>

      <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-6">
        <div className="flex min-w-0 flex-col gap-5 md:flex-[3_1_0]">
          <StatusCard o={o} />
          <PaymentsCard o={o} />
        </div>
        <aside className="flex min-w-0 flex-col gap-4 md:flex-[2_1_0]">
          <section className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-[18px]">
            <h2 className="m-0 text-[17px] font-bold">Details</h2>
            <dl className="m-0 flex flex-col gap-2.5 text-[15px]">
              <Row label="Ready by" value={o.dueDate ? fmtFull(o.dueDate) : "Not set"} />
              <Row label="Notes" value={o.notes || "None"} />
              <Row label="Last updated" value={fmtFull(o.updatedAt)} />
            </dl>
          </section>
        </aside>
      </div>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[13px] font-semibold text-muted">{label}</dt>
      <dd className="m-0 whitespace-pre-wrap break-words">{value}</dd>
    </div>
  );
}

function useSave(o: ShopOrder) {
  const client = useQueryClient();
  return (next: ShopOrder) => {
    client.setQueryData(["shop-order", o.id], next);
    void client.invalidateQueries({ queryKey: ["shop-orders"] });
  };
}

/** Where the order stands; tap the next step. Cancel while it isn't delivered. */
function StatusCard({ o }: { o: ShopOrder }) {
  const saved = useSave(o);
  const m = useMutation({ mutationFn: (status: OrderStatus) => updateOrder(o.id, { status }), onSuccess: saved });
  const at = STEPS.indexOf(o.status);
  const cancelled = o.status === "cancelled";

  return (
    <section className="flex flex-col gap-4 rounded-[20px] border border-line bg-white p-[18px] md:p-6">
      <h2 className="m-0 text-[18px] font-bold">Status</h2>
      <ol className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-4">
        {STEPS.map((s, i) => {
          const done = !cancelled && i <= at;
          return (
            <li key={s}>
              <button
                type="button"
                disabled={m.isPending || cancelled || s === o.status}
                onClick={() => m.mutate(s)}
                aria-current={s === o.status ? "step" : undefined}
                className={cn(
                  "flex h-14 w-full items-center gap-2 rounded-[14px] border px-3 text-left text-[14px] font-semibold transition-colors disabled:cursor-default",
                  done ? "border-ink bg-ink text-white" : "border-line-strong bg-white hover:border-ink disabled:opacity-50",
                )}
              >
                <span className={cn("grid size-6 flex-none place-items-center rounded-full text-[12px]", done ? "bg-white/20" : "bg-fill")}>
                  {done ? <Icon name="check" size={13} strokeWidth={3} /> : i + 1}
                </span>
                {ORDER_STATUS[s]}
              </button>
            </li>
          );
        })}
      </ol>
      {m.isError && <p className="m-0 text-[14px] text-doc">{m.error.message}</p>}
      {cancelled ? (
        <button type="button" disabled={m.isPending} onClick={() => m.mutate("new")} className="h-11 self-start rounded-[14px] border border-line-strong px-4 text-[15px] font-semibold hover:border-ink">
          Reopen the order
        </button>
      ) : (
        o.status !== "delivered" && (
          <button type="button" disabled={m.isPending} onClick={() => m.mutate("cancelled")} className="h-11 self-start rounded-[14px] px-3 text-[15px] font-semibold text-doc hover:bg-doc-bg">
            Cancel the order
          </button>
        )
      )}
    </section>
  );
}

/** Total, paid and due, every payment, and a form to record one more. */
function PaymentsCard({ o }: { o: ShopOrder }) {
  const saved = useSave(o);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<(typeof METHODS)[number]>("upi");
  const value = Number(amount || 0);
  const m = useMutation({
    mutationFn: () => addPayment(o.id, value, method),
    onSuccess: (next) => {
      saved(next);
      setAmount("");
    },
  });
  const share = o.total > 0 ? Math.min(100, Math.round((o.paid / o.total) * 100)) : 100;
  const canPay = o.due > 0 && o.status !== "cancelled";

  return (
    <section className="flex flex-col gap-4 rounded-[20px] border border-line bg-white p-[18px] md:p-6">
      <h2 className="m-0 text-[18px] font-bold">Payment</h2>
      <div className="grid grid-cols-3 gap-2.5">
        {(
          [
            ["Total", o.total],
            ["Paid", o.paid],
            ["Due", o.due],
          ] as const
        ).map(([label, n]) => (
          <div key={label} className="flex flex-col gap-0.5 rounded-[14px] bg-card-hover p-3">
            <span className="text-[13px] font-semibold text-muted">{label}</span>
            <span className={cn("text-[20px] font-bold tabular-nums", label === "Due" && n > 0 && "text-doc")}>{rupees(n)}</span>
          </div>
        ))}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-fill" role="progressbar" aria-label="Paid" aria-valuenow={share} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-good transition-[width] duration-300" style={{ width: `${share}%` }} />
      </div>

      {o.payments.length > 0 && (
        <ul className="m-0 flex list-none flex-col p-0">
          {o.payments.map((p, i) => (
            <li key={i} className={cn("flex items-center gap-3 py-2.5 text-[15px]", i > 0 && "border-t border-divider")}>
              <span className="grid size-9 flex-none place-items-center rounded-full bg-good-bg text-good">
                <Icon name="check" size={15} strokeWidth={2.6} />
              </span>
              <span className="flex-1">
                {PAYMENT_METHOD[p.method]} · {fmtShort(p.at)}
              </span>
              <span className="font-bold tabular-nums">{rupees(p.amount)}</span>
            </li>
          ))}
        </ul>
      )}

      {canPay && (
        <form
          className="flex flex-col gap-2.5 rounded-[16px] border border-line bg-card-hover p-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (value > 0 && value <= o.due && !m.isPending) m.mutate();
          }}
        >
          <span className="text-[14px] font-semibold text-ink-soft">Record a payment</span>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Amount</span>
              <span className="pointer-events-none absolute left-3.5 top-0 flex h-12 items-center text-[16px] text-muted">₹</span>
              <input
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 7))}
                placeholder={String(o.due)}
                className="h-12 w-full rounded-[14px] border border-line-strong bg-white pl-8 pr-3.5 text-[16px] tabular-nums outline-none focus:border-ink"
              />
            </label>
            <button type="button" onClick={() => setAmount(String(o.due))} className="h-12 flex-none rounded-[14px] border border-line-strong bg-white px-4 text-[15px] font-semibold hover:border-ink">
              Full {rupees(o.due)}
            </button>
          </div>
          <Segmented options={METHODS.map((x) => PAYMENT_METHOD[x])} value={METHODS.indexOf(method)} onChange={(i) => setMethod(METHODS[i])} />
          {value > o.due && <p className="m-0 text-[14px] text-doc">Only {rupees(o.due)} is due.</p>}
          {m.isError && <p className="m-0 text-[14px] text-doc">{m.error.message}</p>}
          <button type="submit" disabled={value <= 0 || value > o.due || m.isPending} className="flex h-12 items-center justify-center rounded-[14px] bg-ink px-4 text-[15px] font-semibold text-white disabled:opacity-35">
            {m.isPending ? "Saving…" : value > 0 ? `Record ${rupees(value)}` : "Record payment"}
          </button>
        </form>
      )}
    </section>
  );
}
