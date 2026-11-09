// Shop orders (spectacles, lenses…) and their payments: shop portal → Orders.
import type { CreateOrderRequest, OrderKind, OrderStatus, Payment, ShopOrder, ShopOrders, UpdateOrderRequest } from '@visus/shared';
import { and, desc, eq } from 'drizzle-orm';
import type { z } from 'zod';

import type { Db } from '../../db/client';
import { profiles, shopOrders, shopPatients } from '../../db/schema';
import { fail } from '../../lib/errors';
import { isUuid } from '../../lib/validate';
import { normalizePhone } from '../auth/auth.service';

type Row = typeof shopOrders.$inferSelect;

function toOrder(r: Row): ShopOrder {
  const paid = r.payments.reduce((sum, p) => sum + p.amount, 0);
  return {
    id: r.id,
    patientId: r.patientId,
    customerName: r.customerName,
    phone: r.phone,
    item: r.item,
    kind: r.kind as OrderKind,
    total: r.total,
    paid,
    due: Math.max(0, r.total - paid),
    paymentStatus: paid <= 0 ? 'unpaid' : paid >= r.total ? 'paid' : 'partial',
    payments: r.payments,
    status: r.status as OrderStatus,
    dueDate: r.dueDate,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

/**
 * GET /shop/orders: newest first. `status`, `patientId` and `q` (customer, phone or item) narrow the
 * list; the totals are for all orders. Filtered in memory: a shop has hundreds of orders, not millions.
 */
export async function listOrders(db: Db, shopId: string, filter: { status?: string; patientId?: string; q?: string }): Promise<ShopOrders> {
  const rows = (await db.select().from(shopOrders).where(eq(shopOrders.shopId, shopId)).orderBy(desc(shopOrders.createdAt))).map(toOrder);
  const live = rows.filter((o) => o.status !== 'cancelled');
  const summary = {
    open: live.filter((o) => o.status === 'new' || o.status === 'in_progress').length,
    ready: live.filter((o) => o.status === 'ready').length,
    collected: rows.reduce((sum, o) => sum + o.paid, 0),
    due: live.reduce((sum, o) => sum + o.due, 0),
  };
  const q = filter.q?.trim().toLowerCase();
  const orders = rows.filter(
    (o) =>
      (!filter.status || o.status === filter.status) &&
      (!filter.patientId || o.patientId === filter.patientId) &&
      (!q || o.customerName.toLowerCase().includes(q) || o.phone.includes(q) || o.item.toLowerCase().includes(q)),
  );
  return { orders, summary };
}

async function orderRow(db: Db, shopId: string, id: string) {
  if (!isUuid(id)) fail(404, 'Order not found');
  const [row] = await db.select().from(shopOrders).where(and(eq(shopOrders.id, id), eq(shopOrders.shopId, shopId)));
  if (!row) fail(404, 'Order not found');
  return row;
}

export async function getOrder(db: Db, shopId: string, id: string) {
  return toOrder(await orderRow(db, shopId, id));
}

/** POST /shop/orders: for one of the shop's patients, or a customer without a record. */
export async function createOrder(db: Db, shopId: string, input: z.infer<typeof CreateOrderRequest>) {
  let customerName = input.customerName.trim();
  let phone = input.phone.trim() ? normalizePhone(input.phone) : '';
  if (phone === null) fail(400, 'Enter a 10-digit mobile number, or leave it empty.');
  if (input.patientId) {
    if (!isUuid(input.patientId)) fail(404, 'Patient not found');
    const [p] = await db
      .select({ name: profiles.name, phone: shopPatients.phone })
      .from(shopPatients)
      .innerJoin(profiles, eq(profiles.id, shopPatients.profileId))
      .where(and(eq(shopPatients.id, input.patientId), eq(shopPatients.shopId, shopId)));
    if (!p) fail(404, 'Patient not found');
    customerName ||= p.name;
    phone ||= p.phone;
  }
  if (!customerName) fail(400, "customerName: who is this order for? Pick a patient or type the customer's name.");
  if (input.advance && input.advance.amount > input.total) fail(400, "The advance can't be more than the total.");
  const payments: Payment[] = input.advance ? [{ ...input.advance, at: new Date().toISOString() }] : [];
  const [row] = await db
    .insert(shopOrders)
    .values({
      shopId,
      patientId: input.patientId ?? null,
      customerName,
      phone,
      item: input.item.trim(),
      kind: input.kind,
      total: input.total,
      payments,
      dueDate: input.dueDate ?? null,
      notes: input.notes.trim(),
    })
    .returning();
  return toOrder(row);
}

/** PATCH /shop/orders/:id */
export async function updateOrder(db: Db, shopId: string, id: string, patch: z.infer<typeof UpdateOrderRequest>) {
  const row = await orderRow(db, shopId, id);
  const paid = row.payments.reduce((sum, p) => sum + p.amount, 0);
  if (patch.total !== undefined && patch.total < paid) fail(400, `The total can't be less than what's already paid (₹${paid}).`);
  const [next] = await db
    .update(shopOrders)
    .set({
      ...(patch.status && { status: patch.status }),
      ...(patch.item && { item: patch.item.trim() }),
      ...(patch.total !== undefined && { total: patch.total }),
      ...(patch.dueDate !== undefined && { dueDate: patch.dueDate }),
      ...(patch.notes !== undefined && { notes: patch.notes.trim() }),
      updatedAt: new Date(),
    })
    .where(eq(shopOrders.id, id))
    .returning();
  return toOrder(next);
}

/** POST /shop/orders/:id/payments: money received against the order. */
export async function addPayment(db: Db, shopId: string, id: string, payment: z.infer<typeof Payment>) {
  const row = await orderRow(db, shopId, id);
  if (row.status === 'cancelled') fail(400, 'This order is cancelled.');
  const due = row.total - row.payments.reduce((sum, p) => sum + p.amount, 0);
  if (payment.amount > due) fail(400, due > 0 ? `Only ₹${due} is due on this order.` : 'This order is already paid in full.');
  const [next] = await db
    .update(shopOrders)
    .set({ payments: [...row.payments, { ...payment, at: new Date().toISOString() }], updatedAt: new Date() })
    .where(eq(shopOrders.id, id))
    .returning();
  return toOrder(next);
}
