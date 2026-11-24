"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { logout } from "@/services/auth";
import { isDoctor } from "@/services/doctor";
import { isShop } from "@/services/shops";
import { useSettings } from "@/store/settings";

import { cn } from "./cn";
import { Icon, type IconName } from "./Icon";
import { useMe } from "./ShopShell";

/** A doctor account is signed in: doctor pages start their data requests only then. */
export const useDoctorReady = () => isDoctor(useMe().data?.user);

/**
 * Doctor portal frame, the same layout as the shop portal: a sidebar with Consults, Clinics and
 * Prescriptions, and Account and Log out at the bottom. It folds to icons on a laptop and opens as
 * a drawer on a phone. Only doctor accounts get in: a signed-out visit goes to the doctor log in,
 * a shop to its portal, anyone else to Home. The page stays invisible until the account is known.
 */
export function DoctorShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const client = useQueryClient();
  const q = useMe();
  const user = q.data?.user;
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    if (!q.isSuccess) return;
    if (!q.data) router.replace("/doctor/login");
    else if (isShop(q.data.user)) router.replace("/shop");
    else if (!isDoctor(q.data.user)) router.replace("/home");
  }, [q.isSuccess, q.data, router]);

  useEffect(() => {
    if (!menu) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menu]);

  const ready = !!user && isDoctor(user);

  const out = () => {
    logout();
    client.clear();
    router.replace("/doctor/login");
  };

  return (
    <div className="min-h-dvh bg-pearl md:flex">
      {ready && (
        <>
          <div className="sticky top-0 hidden h-dvh flex-none md:block">
            <DoctorSidebar name={user.name} onLogout={out} />
          </div>
          <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-white/95 px-3 py-2 backdrop-blur md:hidden">
            <button type="button" aria-label="Open menu" aria-expanded={menu} onClick={() => setMenu(true)} className="grid size-11 flex-none place-items-center rounded-[12px] hover:bg-pressed">
              <Icon name="menu" size={22} />
            </button>
            <span className="text-[18px] font-bold tracking-[-0.01em]">Visus</span>
            <span className="truncate text-[12px] font-semibold uppercase tracking-[0.12em] text-faint">Doctor</span>
          </div>
          {menu && (
            <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
              <button type="button" aria-label="Close menu" tabIndex={-1} onClick={() => setMenu(false)} className="absolute inset-0 bg-black/30" />
              <div className="relative h-full w-[min(300px,85vw)] shadow-xl">
                <DoctorSidebar name={user.name} onLogout={out} onClose={() => setMenu(false)} />
              </div>
            </div>
          )}
        </>
      )}
      <div className={cn("min-w-0 flex-1", !ready && "invisible")}>{children}</div>
    </div>
  );
}

const NAV: { href: "/doctor" | "/doctor/clinics" | "/doctor/prescriptions"; label: string; icon: IconName }[] = [
  { href: "/doctor", label: "Consults", icon: "calendar" },
  { href: "/doctor/clinics", label: "Clinics", icon: "store" },
  { href: "/doctor/prescriptions", label: "Prescriptions", icon: "doc" },
];

/** The portal's sidebar. `onClose` makes it the phone drawer (never folded, closes on every tap). */
function DoctorSidebar({ name, onLogout, onClose }: { name: string; onLogout: () => void; onClose?: () => void }) {
  const pathname = usePathname();
  const folded = useSettings((s) => s.shopSidebarCollapsed) && !onClose;
  const onAccount = pathname.startsWith("/doctor/account");
  const active = (href: string) => (href === "/doctor" ? !onAccount && !NAV.slice(1).some((n) => pathname.startsWith(n.href)) : pathname.startsWith(href));
  const item = cn("flex h-11 w-full items-center gap-3 rounded-[12px] text-[15px] font-semibold transition-colors", folded ? "justify-center px-0" : "px-3");
  const tone = (on: boolean) => (on ? "bg-ink text-white" : "text-muted hover:bg-pressed hover:text-ink");
  const label = (text: string) => <span className={folded ? "sr-only" : "truncate"}>{text}</span>;

  return (
    <nav aria-label="Doctor portal" className={cn("flex h-full flex-col border-r border-line bg-white px-3 py-4 transition-[width] duration-200", folded ? "w-[76px]" : "w-[256px]")}>
      <div className={cn("flex min-h-11 items-center gap-2", folded && "justify-center")}>
        {!folded && (
          <Link href="/doctor" onClick={onClose} className="flex min-w-0 flex-1 flex-col px-2 leading-tight">
            <span className="text-[22px] font-bold tracking-[-0.01em]">Visus</span>
            <span className="truncate text-[12px] font-semibold uppercase tracking-[0.12em] text-faint">{name}</span>
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
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} onClick={onClose} aria-current={active(n.href) ? "page" : undefined} title={folded ? n.label : undefined} className={cn(item, tone(active(n.href)))}>
            <Icon name={n.icon} size={20} strokeWidth={1.8} className="flex-none" />
            {label(n.label)}
          </Link>
        ))}
      </div>

      <div className="flex-1" />

      <div className="flex flex-col gap-1 border-t border-divider pt-3">
        <Link href="/doctor/account" onClick={onClose} aria-current={onAccount ? "page" : undefined} title={folded ? "Account" : undefined} className={cn(item, tone(onAccount))}>
          <Icon name="profile" size={20} strokeWidth={1.8} className="flex-none" />
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
