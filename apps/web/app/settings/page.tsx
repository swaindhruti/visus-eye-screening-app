"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Segmented, Toggle } from "@/components/Chip";
import { cn } from "@/components/cn";
import { Icon } from "@/components/Icon";
import { Screen, Spacer } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { logout, me } from "@/services/auth";
import { useHydrated } from "@/store/hydrated";
import { TEXT_SIZES, useSettings } from "@/store/settings";

const LANGUAGES = ["English", "हिन्दी", "தமிழ்", "বাংলা", "मराठी"];
const NOTIFICATIONS = [
  ["Check reminders", "Once a month"],
  ["Break reminders", "Every 20 min of screen time"],
  ["Weekly report", "Sunday evening"],
];

const mask = (id: string) => (id.includes("@") ? id.replace(/^(.).*(@.*)$/, "$1•••$2") : id.replace(/\d(?=\d{4})/g, "•"));

const Label = ({ children }: { children: string }) => <span className="mb-2 ml-1 mt-[18px] text-[13px] font-bold text-muted">{children}</span>;

export default function Settings() {
  const router = useRouter();
  const qc = useQueryClient();
  const s = useSettings();
  const user = useQuery({ queryKey: ["me"], queryFn: me });
  const [armed, setArmed] = useState(false);
  const hydrated = useHydrated();
  if (!hydrated) return <Screen />;

  return (
    <Screen gap="gap-0">
      <ScreenHeader title="Settings" fallback="/profile" />

      <span className="mb-2 ml-1 mt-5 text-[13px] font-bold text-muted">General</span>
      <div className="flex flex-none flex-col rounded-[20px] border border-line bg-white px-4">
        <button type="button" onClick={() => s.set({ language: (s.language + 1) % LANGUAGES.length })} className="flex min-h-14 items-center gap-3 text-left">
          <Icon name="globe" size={20} strokeWidth={1.8} className="flex-none" />
          <span className="flex-1 text-[16px] font-semibold">Language</span>
          <span className="text-[15px] text-muted">{LANGUAGES[s.language]}</span>
          <Icon name="chevronRight" size={16} color="#9A9A95" strokeWidth={2.2} />
        </button>
        <div className="flex flex-col gap-3 border-t border-divider pb-4 pt-3.5">
          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-none">
              <path d="M3 19l5-14 5 14M4.8 14h6.4M15 19l3-8 3 8M15.9 16.5h4.2" />
            </svg>
            <span className="flex-1 text-[16px] font-semibold">Text size</span>
            <span className="text-muted transition-[font-size] duration-200" style={{ fontSize: [15, 19, 23][s.textSize] }}>
              Aa
            </span>
          </div>
          <Segmented pill className="h-10" options={TEXT_SIZES} value={s.textSize} onChange={(textSize) => s.set({ textSize })} />
        </div>
      </div>

      <Label>Notifications</Label>
      <div className="flex flex-none flex-col rounded-[20px] border border-line bg-white px-4">
        {NOTIFICATIONS.map(([label, sub], i) => (
          <div key={label} className={cn("flex min-h-[60px] items-center gap-3", i > 0 && "border-t border-divider")}>
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="text-[16px] font-semibold">{label}</span>
              <span className="text-[13px] text-muted">{sub}</span>
            </span>
            <Toggle on={s.notifications[i]} label={label} onClick={() => s.set({ notifications: s.notifications.map((v, k) => (k === i ? !v : v)) })} />
          </div>
        ))}
      </div>

      <Label>Data</Label>
      <div className="flex flex-none flex-col rounded-[20px] border border-line bg-white px-4">
        <div className="flex min-h-16 items-center gap-3">
          <Icon name="database" size={20} strokeWidth={1.8} className="flex-none" />
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="text-[16px] font-semibold">Offline data</span>
            <span className="text-[13px] text-muted">{s.offlineCleared ? "Tests ready offline" : "Tests and cached results"}</span>
          </span>
          <button
            type="button"
            disabled={s.offlineCleared}
            onClick={() => {
              qc.clear();
              s.set({ offlineCleared: true });
            }}
            className="h-[34px] rounded-full border border-line-strong bg-white px-3.5 text-[14px] font-semibold transition-opacity hover:bg-pearl disabled:opacity-50"
          >
            {s.offlineCleared ? "Cleared" : "Clear"}
          </button>
        </div>
        <Link href="/settings/about" className="flex min-h-14 items-center gap-3 border-t border-divider">
          <Icon name="info" size={20} strokeWidth={1.8} className="flex-none" />
          <span className="flex-1 text-[16px] font-semibold">About &amp; disclaimer</span>
          <Icon name="chevronRight" size={16} color="#9A9A95" strokeWidth={2.2} />
        </Link>
      </div>

      <Spacer />
      {user.data ? (
        <button
          type="button"
          onClick={() => {
            if (!armed) return setArmed(true);
            logout();
            qc.clear();
            router.replace("/welcome");
          }}
          onBlur={() => setArmed(false)}
          className={cn("h-[52px] flex-none rounded-[16px] border text-[16px] font-semibold transition-colors duration-200", armed ? "border-doc bg-doc text-white" : "border-line bg-white text-doc")}
        >
          {armed ? "Tap again to log out" : "Log out"}
        </button>
      ) : (
        <Link href="/login" className="grid h-[52px] flex-none place-items-center rounded-[16px] border border-line bg-white text-[16px] font-semibold">
          Log in
        </Link>
      )}
      <span className="mt-2.5 flex-none text-center text-[12px] text-[#8A8A85]">
        Visus 1.0 · {user.data ? `Signed in as ${mask(user.data.user.identifier)}` : "Not signed in"}
      </span>
    </Screen>
  );
}
