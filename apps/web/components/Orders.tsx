"use client";

import Link from "next/link";

import { fmtShort } from "@/lib/dates";
import { ORDER_KIND, ORDER_STATUS, rupees, type OrderStatus, type ShopOrder } from "@/services/orders";

import { cn } from "./cn";

const STATUS_TONE: Record<OrderStatus, string> = {
  new: "bg-acc-soft text-acc-ink",
  in_progress: "bg-mild-bg text-mild",
  ready: "bg-good-bg text-good",
  delivered: "bg-pill text-ink-soft",
  cancelled: "bg-pill text-muted line-through",
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return <span className={cn("flex h-[26px] flex-none items-center rounded-full px-2.5 text-[13px] font-semibold", STATUS_TONE[status], className)}>{ORDER_STATUS[status]}</span>;
}

/** "Paid", "₹3,000 due" or "Unpaid". */
export function PaymentBadge({ o, className }: { o: ShopOrder; className?: string }) {
  if (o.status === "cancelled") return null;
  const paid = o.paymentStatus === "paid";
  return (
    <span className={cn("flex h-[26px] flex-none items-center rounded-full px-2.5 text-[13px] font-semibold tabular-nums", paid ? "bg-good-bg text-good" : "bg-doc-bg text-doc", className)}>
      {paid ? "Paid" : `${rupees(o.due)} due`}
    </span>
  );
}

/** One order in a list: who, what, when, and where it stands. */
export function OrderRow({ o, first }: { o: ShopOrder; first: boolean }) {
  return (
    <Link
      href={`/shop/orders/${o.id}`}
      className={cn("flex min-h-[68px] items-center gap-3.5 px-4 py-3 transition-colors hover:bg-card-hover md:gap-4 md:px-5", !first && "border-t border-divider")}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[16px] font-semibold">
          {o.customerName} <span className="font-normal text-muted">· {o.item}</span>
        </span>
        <span className="truncate text-[13px] text-muted">
          {ORDER_KIND[o.kind]} · {fmtShort(o.createdAt)}
          {o.dueDate && o.status !== "delivered" && o.status !== "cancelled" ? ` · Ready by ${fmtShort(o.dueDate)}` : ""}
        </span>
      </span>
      <span className="hidden flex-none text-[16px] font-bold tabular-nums sm:block">{rupees(o.total)}</span>
      <span className="flex flex-none flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
        <OrderStatusBadge status={o.status} />
        <PaymentBadge o={o} />
      </span>
    </Link>
  );
}
