// Optical shops on the patient's side: a shop that added you by phone asks to see your eye records.
// Allow: the shop sees your checks and the checks it runs are saved in your account. Remove it any time.
import type { ShopRequest } from '@visus/shared';

import { mockDelay, request, USE_MOCK } from '@/services/api';
import type { User } from '@/services/auth';

export type { ShopRequest };

/** GET /me/shop-requests */
export async function listShopRequests(): Promise<ShopRequest[]> {
  if (USE_MOCK) return mockDelay([], 150);
  return request<ShopRequest[]>('/me/shop-requests');
}

/** POST /me/shop-requests/:id: allow or decline. */
export async function answerShopRequest(id: string, approve: boolean): Promise<ShopRequest> {
  return request<ShopRequest>(`/me/shop-requests/${id}`, { method: 'POST', body: { approve } });
}

/** GET /me/shops: shops that can see your checks. */
export async function listLinkedShops(): Promise<ShopRequest[]> {
  if (USE_MOCK) return mockDelay([], 150);
  return request<ShopRequest[]>('/me/shops');
}

/** DELETE /me/shops/:id */
export async function unlinkShop(id: string): Promise<void> {
  await request(`/me/shops/${id}`, { method: 'DELETE' });
}

/** The phone number shops find you by (GET /me). */
export async function getMyPhone(): Promise<string | null> {
  if (USE_MOCK) return null;
  return (await request<{ user: User }>('/me')).user.phone ?? null;
}

/** PATCH /me */
export async function setMyPhone(phone: string): Promise<string | null> {
  return (await request<User>('/me', { method: 'PATCH', body: { phone } })).phone ?? null;
}
