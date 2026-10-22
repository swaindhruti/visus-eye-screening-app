"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useGuest } from "@/lib/useGuest";
import { initials, listProfiles } from "@/services/profiles";

import { cn } from "./cn";
import { Icon, type IconName } from "./Icon";

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/tests", label: "Tests", icon: "eye" },
  { href: "/results", label: "Results", icon: "results" },
  { href: "/profile", label: "Profile", icon: "profile" },
];

/** Phones: the floating pill tab bar from the design. Hidden from md up (TopNav takes over). */
export function TabBar() {
  const pathname = usePathname();
  const guest = useGuest();
  // Guests only have the Tests library: GuestBar takes the tab bar's place.
  if (guest) return null;
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-4 bottom-[26px] z-10 grid h-[66px] grid-cols-4 gap-1 rounded-[24px] border border-line bg-white p-1.5 shadow-[0_10px_30px_rgba(17,17,17,.08)] md:hidden"
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-[3px] rounded-[18px] text-[12px] font-semibold transition-colors duration-150",
              active ? "bg-ink text-white" : "text-tab-off hover:bg-pressed hover:text-ink",
            )}
          >
            <Icon name={tab.icon} size={22} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Desktop: top bar with the same four tabs, Start eye check and the profile avatar. */
export function TopNav() {
  const pathname = usePathname();
  const guest = useGuest();
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: listProfiles, enabled: !guest });
  const tabs = guest ? TABS.filter((t) => t.href === "/tests") : TABS;
  const me = profiles.data?.find((p) => p.relation === "self") ?? profiles.data?.[0];

  return (
    <header className="sticky top-0 z-20 hidden border-b border-line bg-white/95 backdrop-blur md:block">
      <div className="mx-auto flex max-w-[1200px] items-center gap-6 px-8 py-3.5">
        <Link href={guest ? "/tests" : "/home"} className="text-[22px] font-bold tracking-[-0.01em]">
          Visus
        </Link>
        <nav aria-label="Main" className="flex flex-1 flex-wrap gap-1">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn("flex h-10 items-center rounded-[12px] px-3.5 text-[15px] font-semibold transition-colors", active ? "bg-ink text-white" : "text-muted hover:bg-pressed hover:text-ink")}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        {guest ? (
          <>
            <span className="flex h-8 items-center rounded-full bg-pill px-3 text-[13px] font-semibold text-ink-soft">Guest mode</span>
            <Link href="/login" className="flex h-11 items-center rounded-[14px] border border-line-strong bg-white px-4 text-[15px] font-semibold hover:bg-[#FBFBF9]">
              Log in
            </Link>
            <Link href="/signup" className="flex h-11 items-center rounded-[14px] bg-ink px-[18px] text-[15px] font-semibold text-white transition-colors hover:bg-[#2a2a2a]">
              Sign up
            </Link>
          </>
        ) : (
          <>
            <Link href="/check/who" className="flex h-11 items-center gap-2 rounded-[14px] bg-ink px-[18px] text-[15px] font-semibold text-white transition-colors hover:bg-[#2a2a2a]">
              Start eye check
            </Link>
            <Link href="/profile" aria-label="Profile" className="grid size-10 place-items-center rounded-full bg-acc-soft text-[14px] font-bold text-acc-ink">
              {me ? initials(me.name) : <Icon name="profile" size={18} />}
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

/** Phones in guest mode: a bottom bar in place of the tabs, with the way to the full app. */
export function GuestBar() {
  const guest = useGuest();
  if (!guest) return null;
  return (
    <div className="fixed inset-x-4 bottom-[26px] z-10 flex h-[66px] items-center gap-3 rounded-[24px] border border-line bg-white py-1.5 pl-4 pr-1.5 shadow-[0_10px_30px_rgba(17,17,17,.08)] md:hidden">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[14px] font-bold">Guest mode</span>
        <span className="truncate text-[12px] text-muted">Results aren&apos;t saved</span>
      </span>
      <Link href="/login" className="flex h-[52px] items-center rounded-[18px] px-3 text-[15px] font-semibold text-ink-soft hover:bg-pressed">
        Log in
      </Link>
      <Link href="/signup" className="flex h-[52px] items-center rounded-[18px] bg-ink px-4 text-[15px] font-semibold text-white">
        Sign up
      </Link>
    </div>
  );
}
