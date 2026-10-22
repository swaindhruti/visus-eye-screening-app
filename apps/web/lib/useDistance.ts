"use client";

import type { FaceLandmarker, NormalizedLandmark } from "@mediapipe/tasks-vision";
import { useEffect, useSyncExternalStore } from "react";

// Face-to-screen distance from the front camera, measured in the browser with MediaPipe
// FaceLandmarker. One camera and one model for the whole app: every useDistance() shares them.
//
// From the iris: almost every iris is about 11.7 mm across (adults and children over ~2), so
// distance = 11.7 mm × focal length (px) ÷ iris width (px). Webcams don't report their focal
// length, so we assume a typical 60° horizontal field of view.

/** Same version as @mediapipe/tasks-vision in package.json (13 MB of WASM, so from the CDN). */
const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm";
const MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const IRIS_MM = 11.7;
const HFOV_DEG = 60;
/** About 10 measurements a second is plenty and keeps laptops cool. */
const EVERY_MS = 100;

/** Target distance per test (cm). Tests not listed aren't watched: Tumbling E is done from 2 m, Near point moves on purpose. */
export const TEST_DISTANCE_CM: Partial<Record<string, number>> = {
  near_reading: 40,
  clock_dial: 40,
  duochrome: 40,
  amsler: 40,
  contrast: 40,
  kids_tumbling_e: 40,
  peripheral_field: 30,
};

/** Within ±5 cm of the target. */
export const distanceOk = (cm: number, target: number) => Math.abs(cm - target) <= 5;

export type DistanceState = "none" | "close" | "far" | "ok";
export function distanceState(cm: number | null, target: number): DistanceState {
  if (cm === null) return "none";
  if (cm < target - 5) return "close";
  if (cm > target + 5) return "far";
  return "ok";
}

/** Iris width in px (the larger of its width and height, so a turned or tilted head still measures), averaged over both eyes. */
function irisPx(lm: NormalizedLandmark[], w: number, h: number) {
  const d = (a: number, b: number) => Math.hypot((lm[a].x - lm[b].x) * w, (lm[a].y - lm[b].y) * h);
  // 468–472: one iris (centre, then 4 edge points), 473–477: the other.
  const one = Math.max(d(469, 471), d(470, 472));
  const two = Math.max(d(474, 476), d(475, 477));
  return (one + two) / 2;
}

function distanceCm(lm: NormalizedLandmark[] | undefined, w: number, h: number) {
  if (!lm || lm.length < 478 || !w) return null;
  const px = irisPx(lm, w, h);
  if (px < 3) return null;
  const focalPx = w / 2 / Math.tan((HFOV_DEG * Math.PI) / 360);
  return (IRIS_MM * focalPx) / px / 10;
}

// ---------- One shared camera ----------

export type CameraStatus = "idle" | "starting" | "on" | "off";
type State = { cm: number | null; status: CameraStatus; stream: MediaStream | null };

const IDLE: State = { cm: null, status: "idle", stream: null };
let state = IDLE;
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/**
 * MediaPipe's WASM prints routine start-up notes ("INFO: Created TensorFlow Lite XNNPACK delegate…")
 * through console.error, which the Next.js dev overlay shows as an error. Drop only those lines.
 */
function quietMediaPipeInfo() {
  const error = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].startsWith("INFO: ")) return;
    error(...args);
  };
}

let model: Promise<FaceLandmarker> | null = null;
/** Loaded once and kept: switching screens only stops the camera, not the model. */
function loadModel() {
  model ??= (async () => {
    quietMediaPipeInfo();
    const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
    const files = await FilesetResolver.forVisionTasks(WASM);
    const create = (delegate: "GPU" | "CPU") => FaceLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: "VIDEO", numFaces: 1 });
    return create("GPU").catch(() => create("CPU"));
  })();
  model.catch(() => (model = null)); // try again next time
  return model;
}

let users = 0;
let stop: (() => void) | null = null;
let stopTimer: ReturnType<typeof setTimeout> | undefined;

function start() {
  let cancelled = false;
  let stream: MediaStream | null = null;
  let raf = 0;
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  stop = () => {
    cancelled = true;
    cancelAnimationFrame(raf);
    stream?.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
    set(IDLE);
  };
  set({ status: "starting" });

  (async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    } catch {
      if (!cancelled) set({ status: "off" });
      return;
    }
    if (cancelled) return stream.getTracks().forEach((t) => t.stop());
    video.srcObject = stream;
    await video.play().catch(() => {});
    set({ status: "on", stream });

    const landmarker = await loadModel().catch(() => null);
    if (!landmarker || cancelled) return;
    let last = 0;
    let lastFace = 0;
    let smooth: number | null = null;
    const tick = () => {
      if (cancelled) return;
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      if (now - last < EVERY_MS || video.readyState < 2) return;
      last = now;
      const cm = distanceCm(landmarker.detectForVideo(video, now).faceLandmarks[0], video.videoWidth, video.videoHeight);
      if (cm === null) {
        // A blink or a hand over one eye keeps the last value for a second.
        if (now - lastFace > 1000 && state.cm !== null) {
          smooth = null;
          set({ cm: null });
        }
        return;
      }
      lastFace = now;
      smooth = smooth === null ? cm : smooth * 0.7 + cm * 0.3;
      if (Math.round(smooth) !== state.cm) set({ cm: Math.round(smooth) });
    };
    tick();
  })();
}

function acquire() {
  users++;
  clearTimeout(stopTimer);
  if (!stop) start();
}

function release() {
  users--;
  // A short grace period, so moving between two screens that both measure keeps the camera on.
  if (users === 0)
    stopTimer = setTimeout(() => {
      stop?.();
      stop = null;
    }, 1500);
}

/** Distance from the screen to the user's eyes in cm while `enabled`, or null (no camera, no face, still loading). */
export function useDistance(enabled = true): number | null {
  useEffect(() => {
    if (!enabled) return;
    acquire();
    return release;
  }, [enabled]);
  return useSyncExternalStore(subscribe, () => (enabled ? state.cm : null), () => null);
}

/** Distance setup: the distance plus the camera stream for a live preview. */
export function useDistanceCamera(): State {
  useEffect(() => {
    acquire();
    return release;
  }, []);
  return useSyncExternalStore(subscribe, () => state, () => IDLE);
}
