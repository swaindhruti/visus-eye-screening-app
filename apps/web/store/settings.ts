import type { Language } from "@visus/shared";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const TEXT_SIZES = ["Default", "Large", "Larger"] as const;

type SettingsState = {
  /** Index into TEXT_SIZES. Anything above Default turns on large text mode. */
  textSize: number;
  /** The language Visus AI talks in (chat, voice, instructions). */
  lang: Language;
  /** Talk mode: Visus reads its lines aloud and listens for spoken answers. */
  talk: boolean;
  notifications: boolean[];
  offlineCleared: boolean;
  onboarded: boolean;
  /** ISO date until which the re-check reminder stays hidden. */
  reminderSnoozedUntil: string | null;
  /** Shop portal: the sidebar shows icons only. */
  shopSidebarCollapsed: boolean;
  set: (patch: Partial<Omit<SettingsState, "set">>) => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      textSize: 0,
      lang: "en",
      talk: false,
      notifications: [true, true, false],
      offlineCleared: false,
      onboarded: false,
      reminderSnoozedUntil: null,
      shopSidebarCollapsed: false,
      set: (patch) => set(patch),
    }),
    { name: "visus.settings", storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);
