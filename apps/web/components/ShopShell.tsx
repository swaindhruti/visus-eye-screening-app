"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { logout, me } from "@/services/auth";
import { isShop, LINK_LABEL, type ShopPatient } from "@/services/shops";
import { useCheck } from "@/store/check";
import { useSettings } from "@/store/settings";

import { cn } from "./cn";
import { Icon, type IconName } from "./Icon";

/** The signed-in account (cached), for role checks. */
export const useMe = () => useQuery({ queryKey: ["me"], queryFn: me, staleTime: 60_000 });
/** A shop account is signed in: shop pages start their data requests only then. */
export const useShopReady = () => isShop(useMe().data?.user);

/**
 * Shop portal frame: a sidebar with Patient records, and Account and Log out at the bottom. On a laptop
 * it sits beside the page and folds to icons; on a phone a menu button opens it as a drawer.
 * Only shop accounts get in; others go to Home, and a signed-out visit goes to the shop log in.
 * The page is always rendered (Next.js validates every segment for instant navigation) but stays
 * invisible until the shop account is confirmed; its data requests wait for `useShopReady()`.
 */
export function ShopShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const client = useQueryClient();
  const q = useMe();
  const user = q.data?.user;
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    if (q.isSuccess && !q.data) router.replace("/shop/login");
    else if (q.isSuccess && q.data && !isShop(q.data.user)) router.replace("/home");
  }, [q.isSuccess, q.data, router]);

  useEffect(() => {
    if (!menu) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menu]);

  const ready = !!user && isShop(user);

  const out = () => {
    logout();
    useCheck.getState().setShopPatient(null);
    client.clear();
    router.replace("/shop/login");
  };

  return (
    <div className="min-h-dvh bg-pearl md:flex">
      {ready && (
        <>
          <div className="sticky top-0 hidden h-dvh flex-none md:block">
            <ShopSidebar shopName={user.shopName} onLogout={out} />
          </div>
          <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-white/95 px-3 py-2 backdrop-blur md:hidden">
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={menu}
              onClick={() => setMenu(true)}
              className="grid size-11 flex-none place-items-center rounded-[12px] hover:bg-pressed"
            >
              <Icon name="menu" size={22} />
            </button>
            <span className="text-[18px] font-bold tracking-[-0.01em]">Visus</span>
            <span className="truncate text-[12px] font-semibold uppercase tracking-[0.12em] text-faint">{user.shopName ?? "Shop"}</span>
          </div>
          {menu && (
            <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
              <button type="button" aria-label="Close menu" tabIndex={-1} onClick={() => setMenu(false)} className="absolute inset-0 bg-black/30" />
              <div className="relative h-full w-[min(300px,85vw)] shadow-xl">
                <ShopSidebar shopName={user.shopName} onLogout={out} onClose={() => setMenu(false)} />
              </div>
            </div>
          )}
        </>
      )}
      <div className={cn("min-w-0 flex-1", !ready && "invisible")}>{children}</div>
    </div>
  );
}

/** The portal's sidebar. `onClose` makes it the phone drawer (never folded, closes on every tap). */
function ShopSidebar({ shopName, onLogout, onClose }: { shopName?: string; onLogout: () => void; onClose?: () => void }) {
  const pathname = usePathname();
  const folded = useSettings((s) => s.shopSidebarCollapsed) && !onClose;
  const onAccount = pathname.startsWith("/shop/account");
  const item = cn(
    "flex h-11 w-full items-center gap-3 rounded-[12px] text-[15px] font-semibold transition-colors",
    folded ? "justify-center px-0" : "px-3",
  );
  const tone = (active: boolean) => (active ? "bg-ink text-white" : "text-muted hover:bg-pressed hover:text-ink");
  const label = (text: string) => <span className={folded ? "sr-only" : "truncate"}>{text}</span>;

  return (
    <nav aria-label="Shop portal" className={cn("flex h-full flex-col border-r border-line bg-white px-3 py-4 transition-[width] duration-200", folded ? "w-[76px]" : "w-[256px]")}>
      <div className={cn("flex min-h-11 items-center gap-2", folded && "justify-center")}>
        {!folded && (
          <Link href="/shop" onClick={onClose} className="flex min-w-0 flex-1 flex-col px-2 leading-tight">
            <span className="text-[22px] font-bold tracking-[-0.01em]">Visus</span>
            <span className="truncate text-[12px] font-semibold uppercase tracking-[0.12em] text-faint">{shopName ?? "Shop"}</span>
          </Link>
        )}
        {onClose ? (
          <button type="button" aria-label="Close menu" autoFocus onClick={onClose} className="grid size-11 flex-none place-items-center rounded-[12px] text-muted hover:bg-pressed hover:text-ink">
            <Icon name="close" size={20} />
          </button>
        ) : (
          <button
            type="button"
            aria-label={folded ? "Expand the sidebar" : "Collapse the sidebar"}
            aria-expanded={!folded}
            title={folded ? "Expand" : "Collapse"}
            onClick={() => useSettings.getState().set({ shopSidebarCollapsed: !folded })}
            className="grid size-11 flex-none place-items-center rounded-[12px] text-muted hover:bg-pressed hover:text-ink"
          >
            <Icon name="panel" size={20} strokeWidth={1.8} />
          </button>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-1">
        <Link href="/shop" onClick={onClose} aria-current={!onAccount ? "page" : undefined} title={folded ? "Patient records" : undefined} className={cn(item, tone(!onAccount))}>
          <Icon name="doc" size={20} strokeWidth={1.8} className="flex-none" />
          {label("Patient records")}
        </Link>
      </div>

      <div className="flex-1" />

      <div className="flex flex-col gap-1 border-t border-divider pt-3">
        <Link href="/shop/account" onClick={onClose} aria-current={onAccount ? "page" : undefined} title={folded ? "Account" : undefined} className={cn(item, tone(onAccount))}>
          <Icon name="store" size={20} strokeWidth={1.8} className="flex-none" />
          {label("Account")}
        </Link>
        <button type="button" onClick={onLogout} title={folded ? "Log out" : undefined} className={cn(item, tone(false))}>
          <Icon name="logout" size={20} strokeWidth={1.8} className="flex-none" />
          {label("Log out")}
        </button>
      </div>
    </nav>
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
