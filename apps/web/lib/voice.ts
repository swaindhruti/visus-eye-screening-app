"use client";

// Talking with Visus in the browser.
// speak(): the Visus voice (Sarvam via the server), else the browser's speechSynthesis.
// listen(): records until you stop talking, then the server transcribes it; without the server voice,
// the browser's speech recognition. Both can be cancelled (leaving the page, tapping stop).
import { SPEECH_LOCALE, VOICE_TEXT, type Language } from "@visus/shared";
import { useEffect } from "react";

import { hasServerVoice, stt, tts } from "@/services/voice";
import { useSettings } from "@/store/settings";

export { VOICE_TEXT };

export type Speaking = { done: Promise<void>; stop: () => void };

let current: HTMLAudioElement | null = null;

/** Stops whatever Visus is saying. */
export function stopSpeaking() {
  current?.pause();
  current = null;
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
}

/** Says `text` in `lang`. `done` resolves when it finished (or failed: never blocks the flow). */
export function speak(text: string, lang: Language): Speaking {
  let stopped = false;
  const stop = () => {
    stopped = true;
    stopSpeaking();
  };
  const done = (async () => {
    stopSpeaking();
    const url = await tts(text, lang);
    if (stopped) return;
    if (url) {
      const audio = new Audio(url);
      current = audio;
      const ended = new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.onpause = () => resolve();
      });
      try {
        await audio.play();
        return ended;
      } catch {
        // Autoplay blocked before any tap: fall through to the browser voice.
      }
    }
    await browserSpeak(text, lang, () => stopped);
  })();
  return { done, stop };
}

function browserSpeak(text: string, lang: Language, stopped: () => boolean) {
  return new Promise<void>((resolve) => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!synth || stopped()) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = SPEECH_LOCALE[lang];
    const voice = synth.getVoices().find((v) => v.lang.replace("_", "-").startsWith(SPEECH_LOCALE[lang].slice(0, 2)));
    if (voice) u.voice = voice;
    u.rate = 0.95;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    synth.cancel();
    synth.speak(u);
    // Some browsers never fire onend for a language they can't speak.
    setTimeout(resolve, 2500 + text.length * 120);
  });
}

export type Heard = { text: string; language: Language | null };
export type Listening = { done: Promise<Heard | null>; stop: () => void };

/** How loud counts as speech (RMS of the mic signal, 0–1), how long a pause ends the answer. */
const SPEECH_LEVEL = 0.035;
const PAUSE_MS = 1300;
const WAIT_MS = 7000; // nothing said in this time: give up
const MAX_MS = 25_000; // Sarvam's REST speech to text takes up to 30 s

/**
 * Listens for one answer. `onLevel` gets the mic level (0–1) for the visualizer.
 * `done` resolves with what was said, or null (silence, no mic, stopped before speaking).
 */
export function listen(lang: Language, onLevel?: (level: number) => void): Listening {
  if (!hasServerVoice()) return browserListen(lang);
  let finish: () => void = () => {};
  let cancelled = false;
  const done = (async (): Promise<Heard | null> => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      return null;
    }
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));
    recorder.start(250);

    let spoke = false;
    let lastVoice = performance.now();
    const started = performance.now();
    await new Promise<void>((resolve) => {
      finish = resolve;
      const tick = () => {
        if (recorder.state !== "recording") return resolve();
        analyser.getFloatTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, v) => sum + v * v, 0) / samples.length);
        onLevel?.(Math.min(1, rms * 8));
        const now = performance.now();
        if (rms > SPEECH_LEVEL) {
          spoke = true;
          lastVoice = now;
        }
        if ((spoke && now - lastVoice > PAUSE_MS) || (!spoke && now - started > WAIT_MS) || now - started > MAX_MS) return resolve();
        requestAnimationFrame(tick);
      };
      tick();
    });
    if (recorder.state === "recording") recorder.stop();
    await stopped;
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close();
    onLevel?.(0);
    if (cancelled || !spoke) return null;
    const heard = await stt(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }), lang === "en" ? undefined : lang);
    // No server voice after all: one more try with the browser's recognizer.
    if (!heard) return hasServerVoice() ? null : browserListen(lang).done;
    return heard.transcript ? { text: heard.transcript, language: heard.language } : null;
  })();
  return {
    done,
    stop: () => {
      cancelled = true;
      finish();
    },
  };
}

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

/** The browser's speech recognition (Chrome, Edge, Safari), one answer. */
function browserListen(lang: Language): Listening {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return { done: Promise.resolve(null), stop: () => {} };
  const r = new Ctor();
  r.lang = SPEECH_LOCALE[lang];
  r.interimResults = false;
  r.continuous = false;
  const done = new Promise<Heard | null>((resolve) => {
    let said = "";
    r.onresult = (e) => {
      for (let i = 0; i < e.results.length; i++) said += e.results[i][0].transcript;
    };
    r.onerror = () => resolve(null);
    r.onend = () => resolve(said.trim() ? { text: said.trim(), language: null } : null);
  });
  try {
    r.start();
  } catch {
    return { done: Promise.resolve(null), stop: () => {} };
  }
  return { done, stop: () => r.abort() };
}

/** Speech recognition or recording is possible in this browser. */
export const canListen = () =>
  typeof window !== "undefined" &&
  (!!navigator.mediaDevices?.getUserMedia || "SpeechRecognition" in window || "webkitSpeechRecognition" in window);

/** Talk mode: says `text` once when it's set (a screen opened, a result arrived). Stops on leaving. */
export function useSayInTalkMode(text: string | undefined) {
  const talk = useSettings((s) => s.talk);
  useEffect(() => {
    if (!talk || !text) return;
    const id = setTimeout(() => speak(text, useSettings.getState().lang), 300);
    return () => {
      clearTimeout(id);
      stopSpeaking();
    };
  }, [talk, text]);
}
