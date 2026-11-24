"use client";

import { SPEECH_LOCALE, type Language } from "@visus/shared";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { getCtor, type Recognition } from "@/lib/useVoiceInput";
import { postCaption } from "@/services/consults";

const noop = () => () => {};

/**
 * Live captions of this device's own speaker: the browser's speech recognition in their language.
 * The words still being said show only here ("You: …"); each finished sentence (max 300 characters)
 * goes to POST /consults/:id/captions, which translates it for the other side.
 */
export function useCaptions(consultId: string, language: Language, on: boolean) {
  const supported = useSyncExternalStore(noop, () => !!getCtor(), () => false);
  const [partial, setPartial] = useState("");
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);

  useEffect(() => {
    const Ctor = getCtor();
    if (!on || !Ctor) return;
    let stopped = false;
    const start = () => {
      const r = new Ctor();
      r.lang = SPEECH_LOCALE[language];
      r.continuous = true;
      r.interimResults = true;
      r.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex ?? 0; i < e.results.length; i++) {
          const text = e.results[i][0].transcript.trim();
          if (!text) continue;
          if (e.results[i].isFinal) postCaption(consultId, { text: text.slice(0, 300), language }).catch(() => {});
          else interim += `${text} `;
        }
        setPartial(interim.trim());
      };
      r.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          stopped = true;
          setError("Allow the microphone for captions.");
        } else if (e.error === "language-not-supported") {
          stopped = true;
          setError("This browser can't caption this language.");
        }
      };
      // Chrome stops after a silence: start again while captions are on.
      r.onend = () => {
        setPartial("");
        if (!stopped) setTimeout(() => !stopped && start(), 250);
      };
      rec.current = r;
      try {
        r.start();
        setError(null);
      } catch {}
    };
    start();
    return () => {
      stopped = true;
      rec.current?.abort();
      rec.current = null;
      setPartial("");
    };
  }, [consultId, language, on]);

  return { supported, partial: on ? partial : "", error: on ? error : null };
}
