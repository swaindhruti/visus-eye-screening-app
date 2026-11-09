"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { logout, me } from "@/services/auth";
import { isShop, LINK_LABEL, type ShopPatient } from "@/services/shops";
import { useCheck } from "@/store/check";

import { cn } from "./cn";
import { Icon, type IconName } from "./Icon";

/** The signed-in account (cached), for role checks. */
export const useMe = () => useQuery({ queryKey: ["me"], queryFn: me, staleTime: 60_000 });
/** A shop account is signed in: shop pages start their data requests only then. */
export const useShopReady = () => isShop(useMe().data?.user);

/**
 * Shop portal frame: a top bar with the shop name, Patients, New patient and Log out.
 * Only shop accounts get in; others go to Home, and a signed-out visit goes to the shop log in.
 * The page is always rendered (Next.js validates every segment for instant navigation) but stays
 * invisible until the shop account is confirmed; its data requests wait for `useShopReady()`.
 */
export function ShopShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const client = useQueryClient();
  const q = useMe();
  const user = q.data?.user;

  useEffect(() => {
    if (q.isSuccess && !q.data) router.replace("/shop/login");
    else if (q.isSuccess && q.data && !isShop(q.data.user)) router.replace("/home");
  }, [q.isSuccess, q.data, router]);

  const ready = !!user && isShop(user);

  const out = () => {
    logout();
    useCheck.getState().setShopPatient(null);
    client.clear();
    router.replace("/shop/login");
  };
  const tab = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn("flex h-10 items-center rounded-[12px] px-3.5 text-[15px] font-semibold transition-colors", active ? "bg-ink text-white" : "text-muted hover:bg-pressed hover:text-ink")}
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-dvh bg-pearl">
      {ready && (
        <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-5 py-3 md:gap-6 md:px-8 md:py-3.5">
            <Link href="/shop" className="flex min-w-0 flex-col leading-tight">
              <span className="text-[20px] font-bold tracking-[-0.01em] md:text-[22px]">Visus</span>
              <span className="truncate text-[12px] font-semibold uppercase tracking-[0.12em] text-faint">{user?.shopName ?? "Shop"}</span>
            </Link>
            <nav aria-label="Shop" className="hidden flex-1 gap-1 md:flex">
              {tab("/shop", "Patients", pathname === "/shop")}
              {tab("/shop/patients/new", "New patient", pathname === "/shop/patients/new")}
            </nav>
            <span className="flex-1 md:hidden" />
            <Link
              href="/shop/patients/new"
              className="flex h-11 items-center gap-1.5 rounded-[14px] bg-ink px-4 text-[15px] font-semibold text-white transition-colors hover:bg-[#2a2a2a] md:hidden"
            >
              <Icon name="plusSm" size={18} />
              Patient
            </Link>
            <button
              type="button"
              onClick={out}
              className="flex h-11 items-center gap-2 rounded-[14px] border border-line-strong bg-white px-3.5 text-[15px] font-semibold hover:bg-[#FBFBF9]"
            >
              <Icon name="logout" size={18} />
              <span className="hidden md:inline">Log out</span>
            </button>
          </div>
        </header>
      )}
      <div className={ready ? undefined : "invisible"}>{children}</div>
    </div>
  );
}

/**
 * Personal-app screens a shop account lands on (Home after a check, a "Go to Home" button):
 * back to the patient the check was for, else the shop dashboard.
 */
export function ShopRedirect() {
  const router = useRouter();
  const q = useMe();
  useEffect(() => {
    if (!isShop(q.data?.user)) return;
    const patient = useCheck.getState().shopPatient;
    router.replace(patient ? `/shop/patients/${patient.id}` : "/shop");
  }, [q.data, router]);
  return null;
}

const LINK_TONE: Record<ShopPatient["linkStatus"], string> = {
  none: "bg-pill text-ink-soft",
  pending: "bg-mild-bg text-mild",
  approved: "bg-good-bg text-good",
  declined: "bg-pill text-muted",
};

export function LinkBadge({ status, className }: { status: ShopPatient["linkStatus"]; className?: string }) {
  return (
    <span className={cn("flex h-[26px] flex-none items-center gap-1.5 self-start rounded-full px-2.5 text-[13px] font-semibold", LINK_TONE[status], className)}>
      {status === "approved" && <Icon name="check" size={14} strokeWidth={2.4} />}
      {LINK_LABEL[status]}
    </span>
  );
}

/** On the log in and sign up pages: the way into the shop portal, and back to a personal account. */
export function AccountSwitch({ href, icon, title, sub }: { href: Route; icon: IconName; title: string; sub: string }) {
  return (
    <Link
      href={href}
      className="mt-6 flex min-h-[64px] items-center gap-3 rounded-[20px] border border-line bg-white px-4 py-3 transition-colors hover:bg-card-hover"
    >
      <Icon name={icon} size={22} strokeWidth={1.8} className="flex-none" />
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-semibold text-ink">{title}</span>
        <span className="text-[13px] text-muted">{sub}</span>
      </span>
      <Icon name="chevronRight" size={16} strokeWidth={2.2} className="flex-none text-faint" />
    </Link>
  );
}
