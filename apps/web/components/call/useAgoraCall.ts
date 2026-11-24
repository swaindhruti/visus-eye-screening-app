"use client";

import type { JoinConsultResponse } from "@visus/shared";
import type { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";
import { useEffect, useRef, useState, type RefObject } from "react";

export type CallState = "waiting" | "joining" | "in-call" | "no-video" | "error";

/**
 * The last call's leave. A new join waits for it: joining again with the same uid before the old
 * client has left fails with UID_CONFLICT (React mounts pages twice in development, and a quick
 * rejoin does the same).
 */
let lastLeave: Promise<void> = Promise.resolve();

/**
 * The Agora part of a consult: video and voice only (captions, tests and the prescription go
 * through our server). The SDK is loaded in the browser only, with a dynamic import. An empty App
 * ID (mock data without NEXT_PUBLIC_AGORA_TEST_APP_ID) leaves the call without video: "no-video".
 */
export function useAgoraCall(join: JoinConsultResponse | undefined, remoteRef: RefObject<HTMLDivElement | null>, localRef: RefObject<HTMLDivElement | null>) {
  const [state, setState] = useState<CallState>("waiting");
  const [error, setError] = useState<string | null>(null);
  const [remote, setRemote] = useState({ here: false, video: false });
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [audioOnly, setAudioOnly] = useState(false);
  const parts = useRef<{ client?: IAgoraRTCClient; mic?: IMicrophoneAudioTrack | null; cam?: ICameraVideoTrack | null }>({});
  const audioOnlyRef = useRef(false);

  useEffect(() => {
    if (!join?.appId) return;
    let cancelled = false;
    const p = parts.current;
    (async () => {
      try {
        setState("joining");
        await lastLeave;
        if (cancelled) return;
        const { default: AgoraRTC } = await import("agora-rtc-sdk-ng");
        AgoraRTC.setLogLevel(3); // errors only
        const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        p.client = client;
        if (cancelled) return;
        client.on("user-joined", () => setRemote((r) => ({ ...r, here: true })));
        client.on("user-left", () => setRemote({ here: false, video: false }));
        client.on("user-published", async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          if (mediaType === "audio") user.audioTrack?.play();
          if (mediaType === "video" && !audioOnlyRef.current && remoteRef.current) user.videoTrack?.play(remoteRef.current);
          setRemote((r) => ({ here: true, video: r.video || mediaType === "video" }));
        });
        client.on("user-unpublished", (_user, mediaType) => mediaType === "video" && setRemote((r) => ({ ...r, video: false })));
        await client.join(join.appId, join.channel, join.token, join.uid);
        if (cancelled) return;
        // Camera and mic; with no camera (or it's refused) the call carries on with voice only.
        let mic: IMicrophoneAudioTrack | null = null;
        let cam: ICameraVideoTrack | null = null;
        try {
          [mic, cam] = await AgoraRTC.createMicrophoneAndCameraTracks();
        } catch {
          mic = await AgoraRTC.createMicrophoneAudioTrack().catch(() => null);
        }
        p.mic = mic;
        p.cam = cam;
        if (cancelled) return;
        if (cam && localRef.current) cam.play(localRef.current);
        setCamOn(!!cam);
        setMicOn(!!mic);
        const tracks = [mic, cam].filter((t): t is IMicrophoneAudioTrack | ICameraVideoTrack => !!t);
        if (tracks.length) await client.publish(tracks);
        setState("in-call");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setState("error");
      }
    })();
    return () => {
      cancelled = true;
      p.mic?.close();
      p.cam?.close();
      lastLeave = p.client?.leave().catch(() => {}) ?? lastLeave;
      parts.current = {};
    };
  }, [join, remoteRef, localRef]);

  const toggleMic = async () => {
    await parts.current.mic?.setEnabled(!micOn);
    setMicOn(!micOn);
  };
  const toggleCam = async () => {
    await parts.current.cam?.setEnabled(!camOn);
    setCamOn(!camOn);
  };
  /** Weak network: stop sending and receiving video; the voice stays. */
  const toggleAudioOnly = async () => {
    const next = !audioOnly;
    audioOnlyRef.current = next;
    setAudioOnly(next);
    const { client, cam } = parts.current;
    if (cam) await cam.setEnabled(!next && camOn);
    for (const user of client?.remoteUsers ?? []) {
      if (!user.hasVideo) continue;
      if (next) await client!.unsubscribe(user, "video");
      else {
        const track = await client!.subscribe(user, "video");
        if (remoteRef.current) track.play(remoteRef.current);
      }
    }
  };
  const leave = async () => {
    const { client, mic, cam } = parts.current;
    mic?.close();
    cam?.close();
    lastLeave = client?.leave().catch(() => {}) ?? lastLeave;
    await lastLeave;
    parts.current = {};
  };

  // No App ID (mock data without NEXT_PUBLIC_AGORA_TEST_APP_ID): the call runs without video.
  return { state: join && !join.appId ? ("no-video" as const) : state, error, remote, micOn, camOn, audioOnly, toggleMic, toggleCam, toggleAudioOnly, leave };
}
