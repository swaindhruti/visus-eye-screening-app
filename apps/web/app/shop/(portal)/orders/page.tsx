"use client";

import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";

import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { Icon } from "@/components/Icon";
import { OrderRow } from "@/components/Orders";
import { Screen } from "@/components/Screen";
import { useShopReady } from "@/components/ShopShell";
import { ErrorState } from "@/components/States";
import { listOrders, ORDER_STATUS, rupees, type OrderStatus } from "@/services/orders";

const FILTERS: (OrderStatus | undefined)[] = [undefined, "new", "in_progress", "ready", "delivered", "cancelled"];

/** Shop portal: Orders. The shop's orders and payments: what's open, ready, collected and still due. */
export default function ShopOrdersPage() {
  const ready = useShopReady();
  const [status, setStatus] = useState<OrderStatus>();
  const [q, setQ] = useState("");
  const term = useDeferredValue(q);
  const list = useQuery({ queryKey: ["shop-orders", status ?? "", term], queryFn: () => listOrders({ status, q: term }), enabled: ready });

  if (list.isError) return <ErrorState title="Couldn't load your orders" body={list.error.message} onRetry={() => list.refetch()} retrying={list.isFetching} />;
  const s = list.data?.summary;
  const orders = list.data?.orders ?? [];
  const stats: [string, string][] = [
    ["Open orders", s ? String(s.open) : "…"],
    ["Ready for pickup", s ? String(s.ready) : "…"],
    ["Collected", s ? rupees(s.collected) : "…"],
    ["Due", s ? rupees(s.due) : "…"],
  ];

  return (
    <Screen
      wide
      gap="gap-5 md:gap-7"
      eyebrow="Orders and payments"
      title="Orders"
      actions={
        <Button href="/shop/orders/new" leading={<Icon name="plusSm" size={18} />} className="h-12 px-4 text-[15px]">
          New order
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-4">
        {stats.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5 rounded-[20px] border border-line bg-white p-3.5 md:p-5">
            <span className="text-[24px] font-bold leading-none tracking-[-0.02em] tabular-nums md:text-[30px]">{value}</span>
            <span className="mt-1.5 text-[13px] font-semibold text-muted md:text-[15px]">{label}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <label className="relative block">
          <span className="sr-only">Search orders by customer, phone or item</span>
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
            <Icon name="search" size={20} />
          </span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by customer, phone or item"
            className="h-[52px] w-full rounded-[16px] border border-line-strong bg-white pl-12 pr-4 text-[16px] outline-none focus:border-ink focus:shadow-[0_0_0_4px_rgba(17,17,17,.06)]"
          />
        </label>
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <Chip key={f ?? "all"} compact label={f ? ORDER_STATUS[f] : "All"} selected={status === f} onClick={() => setStatus(f)} />
          ))}
        </div>
      </div>

      {list.isSuccess && orders.length === 0 ? (
        <div className="flex flex-col items-center px-3 py-12 text-center">
          <span className="grid size-[72px] place-items-center rounded-full border border-line bg-white">
            <Icon name="bag" size={30} strokeWidth={1.8} />
          </span>
          <h2 className="m-0 mt-5 text-[22px] font-bold tracking-[-0.02em]">{q || status ? "No orders found" : "No orders yet"}</h2>
          <p className="m-0 mt-2 max-w-[340px] text-[16px] leading-normal text-muted text-pretty">
            {q || status ? "Try another search or status." : "Add an order for spectacles, lenses or frames, and track its payment here."}
          </p>
          {!q && !status && (
            <Button href="/shop/orders/new" className="mt-6 h-[52px] px-7 text-[16px]">
              New order
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[20px] border border-line bg-white" aria-busy={list.isPending}>
          {orders.map((o, i) => (
            <OrderRow key={o.id} o={o} first={i === 0} />
          ))}
          {list.isPending && <p className="m-0 p-4 text-[15px] text-muted">Loading orders…</p>}
        </div>
      )}
    </Screen>
  );
}
