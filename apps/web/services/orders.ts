import type { CreateOrderRequest, OrderKind, OrderStatus, PaymentMethod, ShopOrder, ShopOrders, UpdateOrderRequest } from "@visus/shared";

import { api, USE_MOCK } from "./api";
import * as mock from "./mock/orders";

export type { OrderKind, OrderStatus, PaymentMethod, ShopOrder, ShopOrders };
export type NewOrder = ReturnType<typeof CreateOrderRequest.parse>;
export type OrderPatch = ReturnType<typeof UpdateOrderRequest.parse>;

/** GET /shop/orders: newest first, with the shop's totals. */
export async function listOrders(filter: { status?: OrderStatus; patientId?: string; q?: string } = {}): Promise<ShopOrders> {
  if (USE_MOCK) return mock.list(filter);
  const qs = new URLSearchParams(Object.entries(filter).filter(([, v]) => v) as [string, string][]).toString();
  return api<ShopOrders>(`/shop/orders${qs ? `?${qs}` : ""}`);
}

export async function getOrder(id: string): Promise<ShopOrder> {
  if (USE_MOCK) return mock.get(id);
  return api<ShopOrder>(`/shop/orders/${id}`);
}

/** POST /shop/orders: for a patient, or a customer without a record. */
export async function createOrder(input: NewOrder): Promise<ShopOrder> {
  if (USE_MOCK) return mock.create(input);
  return api<ShopOrder>("/shop/orders", { body: input });
}

/** PATCH /shop/orders/:id: status, item, total, promised date, notes. */
export async function updateOrder(id: string, patch: OrderPatch): Promise<ShopOrder> {
  if (USE_MOCK) return mock.update(id, patch);
  return api<ShopOrder>(`/shop/orders/${id}`, { method: "PATCH", body: patch });
}

/** POST /shop/orders/:id/payments: money received. */
export async function addPayment(id: string, amount: number, method: PaymentMethod): Promise<ShopOrder> {
  if (USE_MOCK) return mock.pay(id, amount, method);
  return api<ShopOrder>(`/shop/orders/${id}/payments`, { body: { amount, method } });
}

export const ORDER_KIND: Record<OrderKind, string> = {
  spectacles: "Spectacles",
  lenses: "Lenses",
  contact_lenses: "Contact lenses",
  frames: "Frames",
  sunglasses: "Sunglasses",
  other: "Other",
};

export const ORDER_STATUS: Record<OrderStatus, string> = {
  new: "New",
  in_progress: "In progress",
  ready: "Ready for pickup",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const PAYMENT_METHOD: Record<PaymentMethod, string> = { cash: "Cash", upi: "UPI", card: "Card" };

/** ₹4,500 */
export const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
