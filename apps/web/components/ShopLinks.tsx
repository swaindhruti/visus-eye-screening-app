"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { me } from "@/services/auth";
import { answerShopRequest, listLinkedShops, listShopRequests, setMyPhone, unlinkShop } from "@/services/shops";

import { cn } from "./cn";
import { Icon } from "./Icon";

/**
 * Home: an optical shop asked to see this account's eye records (the shop added you by phone).
 * Allow: the shop's earlier checks of you move into your account, and it can see your checks.
 */
export function ShopRequestsCard() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["shop-requests"], queryFn: listShopRequests });
  const answer = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) => answerShopRequest(id, approve),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["shop-requests"] });
      void qc.invalidateQueries({ queryKey: ["linked-shops"] });
      void qc.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
  if (!q.data?.length) return null;

  return (
    <section aria-label="Shop requests" className="flex flex-col gap-2.5">
      {q.data.map((r) => (
        <div key={r.id} className="flex flex-col gap-3 rounded-[20px] border border-acc-soft bg-white p-4 md:flex-row md:items-center md:gap-5 md:p-5">
          <span className="grid size-11 flex-none place-items-center rounded-full bg-acc-soft text-acc-ink">
            <Icon name="store" size={20} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[16px] font-bold">
              {r.shopName}
              {r.city ? `, ${r.city}` : ""} wants to see your eye records
            </span>
            <span className="text-[14px] leading-normal text-muted text-pretty">
              If you allow it, the shop can see your checks and the checks it runs for you are saved here. You can remove it any time in Settings.
            </span>
          </div>
          <div className="flex flex-none gap-2">
            <button
              type="button"
              disabled={answer.isPending}
              onClick={() => answer.mutate({ id: r.id, approve: false })}
              className="h-11 flex-1 rounded-[14px] border border-line-strong bg-white px-4 text-[15px] font-semibold hover:bg-[#FBFBF9] disabled:opacity-50 md:flex-none"
            >
              Decline
            </button>
            <button
              type="button"
              disabled={answer.isPending}
              onClick={() => answer.mutate({ id: r.id, approve: true })}
              className="h-11 flex-1 rounded-[14px] bg-ink px-4 text-[15px] font-semibold text-white hover:bg-[#2a2a2a] disabled:opacity-50 md:flex-none"
            >
              Allow
            </button>
          </div>
        </div>
      ))}
      {answer.isError && <p className="m-0 text-[14px] text-doc">{answer.error.message}</p>}
    </section>
  );
}

/** Settings: the phone number shops find you by, and the shops that can see your checks. */
export function LinkedShopsSection() {
  const qc = useQueryClient();
  const user = useQuery({ queryKey: ["me"], queryFn: me });
  const shops = useQuery({ queryKey: ["linked-shops"], queryFn: listLinkedShops });
  const [phone, setPhone] = useState("");
  const [editing, setEditing] = useState(false);
  const save = useMutation({
    mutationFn: () => setMyPhone(phone),
    onSuccess: () => {
      setEditing(false);
      void qc.invalidateQueries({ queryKey: ["me"] });
      void qc.invalidateQueries({ queryKey: ["shop-requests"] });
    },
  });
  const remove = useMutation({ mutationFn: unlinkShop, onSuccess: () => qc.invalidateQueries({ queryKey: ["linked-shops"] }) });
  const current = user.data?.user.phone;
  if (!user.data) return null;

  return (
    <div className="flex flex-none flex-col rounded-[20px] border border-line bg-white px-4">
      <div className="flex min-h-16 items-center gap-3 py-2">
        <Icon name="store" size={20} strokeWidth={1.8} className="flex-none" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[16px] font-semibold">Mobile number</span>
          <span className="text-[13px] text-muted">{current ? `${current} · optical shops can send you a request` : "Add it so an optical shop can link your account"}</span>
        </span>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="h-[34px] rounded-full border border-line-strong bg-white px-3.5 text-[14px] font-semibold hover:bg-pearl">
            {current ? "Change" : "Add"}
          </button>
        )}
      </div>
      {editing && (
        <form
          className="flex gap-2 pb-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (phone.replace(/\D/g, "").length >= 10) save.mutate();
          }}
        >
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            aria-label="Mobile number"
            placeholder="98765 43210"
            className="h-11 min-w-0 flex-1 rounded-[14px] border border-line-strong px-3.5 text-[16px] outline-none focus:border-ink"
          />
          <button type="submit" disabled={phone.replace(/\D/g, "").length < 10 || save.isPending} className="h-11 rounded-[14px] bg-ink px-4 text-[15px] font-semibold text-white disabled:opacity-40">
            Save
          </button>
        </form>
      )}
      {save.isError && <p className="m-0 pb-3 text-[14px] text-doc">{save.error.message}</p>}
      {(shops.data ?? []).map((s) => (
        <div key={s.id} className={cn("flex min-h-[60px] items-center gap-3 border-t border-divider")}>
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="text-[16px] font-semibold">{s.shopName}</span>
            <span className="text-[13px] text-muted">{s.city ? `${s.city} · ` : ""}Can see your checks</span>
          </span>
          <button
            type="button"
            disabled={remove.isPending}
            onClick={() => remove.mutate(s.id)}
            className="h-[34px] rounded-full border border-line-strong bg-white px-3.5 text-[14px] font-semibold text-doc hover:bg-pearl disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
