import type { Language } from '@visus/shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { TextSizes } from '@/constants/theme';
import { phoneStorage } from '@/store/storage';

export type TextSize = keyof typeof TextSizes;
export type Reminder = 'check' | 'breaks' | 'weekly';
/** Screen Coach (7): break every 15 or 20 minutes of screen time; child mode = 2h daily limit. */
export type CoachSettings = { intervalMin: 15 | 20; childMode: boolean };

type SettingsState = {
  textSize: TextSize;
  reminders: Record<Reminder, boolean>;
  /** Re-check reminder (56) "Remind me in a week": the Home banner stays hidden until then (ISO). */
  recheckSnoozedUntil: string | null;
  coach: CoachSettings;
  /** The language Visus AI talks in (chat, voice, instructions). */
  language: Language;
  /** Talk mode: Visus reads its lines aloud and listens for spoken answers. */
  talk: boolean;
  setLanguage: (language: Language) => void;
  setTalk: (talk: boolean) => void;
  setCoach: (patch: Partial<CoachSettings>) => void;
  setTextSize: (size: TextSize) => void;
  snoozeRecheck: (until: string) => void;
  setReminder: (key: Reminder, on: boolean) => void;
};

/** Settings (24), kept on the phone. */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      textSize: 'normal',
      // The check reminder needs notification permission, so it starts off.
      reminders: { check: false, breaks: false, weekly: false },
      recheckSnoozedUntil: null,
      coach: { intervalMin: 20, childMode: false },
      language: 'en',
      talk: false,
      setLanguage: (language) => set({ language }),
      setTalk: (talk) => set({ talk }),
      setCoach: (patch) => set(({ coach }) => ({ coach: { ...coach, ...patch } })),
      setTextSize: (textSize) => set({ textSize }),
      snoozeRecheck: (until) => set({ recheckSnoozedUntil: until }),
      setReminder: (key, on) => set(({ reminders }) => ({ reminders: { ...reminders, [key]: on } })),
    }),
    {
      name: 'visus-settings',
      storage: phoneStorage,
      partialize: ({ textSize, reminders, recheckSnoozedUntil, coach, language, talk }) => ({ textSize, reminders, recheckSnoozedUntil, coach, language, talk }),
    },
  ),
);

/** How much bigger text is than the design: 1, 1.12 (large) or 1.25 (larger). */
export const useTextScale = () => useSettings((s) => TextSizes[s.textSize].scale);

/** Button, option and chip heights for the chosen text size. */
export const useSizes = () => useSettings((s) => TextSizes[s.textSize]);
