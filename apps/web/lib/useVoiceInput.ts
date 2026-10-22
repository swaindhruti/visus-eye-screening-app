"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// The browser's speech recognition (Chrome, Edge, Safari). Not in Firefox: the mic button hides there.
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

const getCtor = () => {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};
const noop = () => () => {};

const ERRORS: Record<string, string> = {
  "not-allowed": "Allow the microphone in your browser to speak your answer.",
  "service-not-allowed": "Allow the microphone in your browser to speak your answer.",
  "audio-capture": "No microphone found. Type your answer instead.",
  "no-speech": "Didn't catch that. Tap the mic and try again.",
  network: "Voice input needs internet. Type your answer instead.",
};

/** Speech to text for a text box: `start(current)` fills the box with `current` + what's being said, live. */
export function useVoiceInput(onText: (text: string) => void) {
  const supported = useSyncExternalStore(noop, () => !!getCtor(), () => false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const cb = useRef(onText);

  useEffect(() => {
    cb.current = onText;
  });
  useEffect(() => () => rec.current?.abort(), []);

  const start = (current: string) => {
    const Ctor = getCtor();
    if (!Ctor || rec.current) return;
    const r = new Ctor();
    r.lang = navigator.language || "en-IN";
    r.interimResults = true;
    r.continuous = false; // stops after a pause: one answer at a time
    const prefix = current.trim() ? `${current.trim()} ` : "";
    r.onresult = (e) => {
      let said = "";
      for (let i = 0; i < e.results.length; i++) said += e.results[i][0].transcript;
      cb.current(prefix + said.trimStart());
    };
    r.onerror = (e) => e.error !== "aborted" && setError(ERRORS[e.error] ?? "Couldn't hear that. Try again or type your answer.");
    r.onend = () => {
      rec.current = null;
      setListening(false);
    };
    setError(null);
    try {
      r.start();
      rec.current = r;
      setListening(true);
    } catch {
      setError("Couldn't start the microphone. Type your answer instead.");
    }
  };

  /** Stop and keep what was heard. */
  const stop = () => rec.current?.stop();
  /** Stop and drop anything still being heard (e.g. the answer was just sent). */
  const cancel = () => rec.current?.abort();

  return { supported, listening, error, start, stop, cancel };
}
