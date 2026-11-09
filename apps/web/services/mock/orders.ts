// Mock shop orders (NEXT_PUBLIC_USE_MOCK=1), kept in localStorage.
import type { OrderStatus, Payment, PaymentMethod, ShopOrder, ShopOrders } from "@visus/shared";

import type { NewOrder, OrderPatch } from "../orders";
import { delay, load, save, uid } from "./store";

type Stored = Omit<ShopOrder, "paid" | "due" | "paymentStatus">;

const all = () => load<Stored[]>("shopOrders", []);

function full(o: Stored): ShopOrder {
  const paid = o.payments.reduce((sum, p) => sum + p.amount, 0);
  return { ...o, paid, due: Math.max(0, o.total - paid), paymentStatus: paid <= 0 ? "unpaid" : paid >= o.total ? "paid" : "partial" };
}

export async function list(filter: { status?: OrderStatus; patientId?: string; q?: string }): Promise<ShopOrders> {
  await delay(150);
  const rows = all().map(full);
  const live = rows.filter((o) => o.status !== "cancelled");
  const q = filter.q?.trim().toLowerCase();
  return {
    orders: rows.filter(
      (o) => (!filter.status || o.status === filter.status) && (!filter.patientId || o.patientId === filter.patientId) && (!q || `${o.customerName} ${o.phone} ${o.item}`.toLowerCase().includes(q)),
    ),
    summary: {
      open: live.filter((o) => o.status === "new" || o.status === "in_progress").length,
      ready: live.filter((o) => o.status === "ready").length,
      collected: rows.reduce((sum, o) => sum + o.paid, 0),
      due: live.reduce((sum, o) => sum + o.due, 0),
    },
  };
}

export async function get(id: string): Promise<ShopOrder> {
  await delay(150);
  const o = all().find((x) => x.id === id);
  if (!o) throw new Error("Order not found");
  return full(o);
}

export async function create(input: NewOrder): Promise<ShopOrder> {
  await delay();
  const now = new Date().toISOString();
  const payments: Payment[] = input.advance ? [{ ...input.advance, at: now }] : [];
  const o: Stored = {
    id: uid(),
    patientId: input.patientId ?? null,
    customerName: input.customerName || "Customer",
    phone: input.phone,
    item: input.item,
    kind: input.kind,
    total: input.total,
    payments,
    status: "new",
    dueDate: input.dueDate ?? null,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
  save("shopOrders", [o, ...all()]);
  return full(o);
}

function put(id: string, change: (o: Stored) => Stored) {
  const next = all().map((o) => (o.id === id ? { ...change(o), updatedAt: new Date().toISOString() } : o));
  save("shopOrders", next);
  return full(next.find((o) => o.id === id)!);
}

export async function update(id: string, patch: OrderPatch): Promise<ShopOrder> {
  await delay();
  return put(id, (o) => ({ ...o, ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) }));
}

export async function pay(id: string, amount: number, method: PaymentMethod): Promise<ShopOrder> {
  await delay();
  return put(id, (o) => ({ ...o, payments: [...o.payments, { amount, method, at: new Date().toISOString() }] }));
}
