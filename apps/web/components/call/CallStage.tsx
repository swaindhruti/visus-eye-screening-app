"use client";

import type { CallRole, ConsultDetail } from "@visus/shared";
import { useState, type ReactNode, type RefObject } from "react";

import { cn } from "@/components/cn";
import { Icon } from "@/components/Icon";
import { useNow } from "@/lib/consults";
import { initials } from "@/services/profiles";

import type { useAgoraCall } from "./useAgoraCall";

type Call = ReturnType<typeof useAgoraCall>;

/** Who is on the other side of the call, as this role sees it. */
export function otherSide(c: ConsultDetail, role: CallRole) {
  return role === "doctor" ? c.patient.name : c.doctor.name;
}

/**
 * The call screen shared by the doctor, the patient and the clinic: the other side's video big,
 * your own small, and the controls. `side` is the panel next to the video: the doctor's tabs (tests,
 * prescription, captions), or the captions panel on the patient's side while captions are on; `takeover` is a live test on the patient's side, shown
 * full screen with the video shrunk to a corner (the voice stays on). Used by the doctor's room and by
 * `PatientRoom` (the patient at home, or the clinic's laptop with the patient there).
 */
export function CallStage({
  c,
  role,
  call,
  remoteRef,
  localRef,
  captionsOn,
  onToggleCaptions,
  onLeave,
  leaveLabel = "Leave",
  side,
  takeover,
  notice,
}: {
  c: ConsultDetail;
  role: CallRole;
  call: Call;
  remoteRef: RefObject<HTMLDivElement | null>;
  localRef: RefObject<HTMLDivElement | null>;
  captionsOn: boolean;
  onToggleCaptions: () => void;
  onLeave: () => void;
  leaveLabel?: string;
  side?: ReactNode;
  takeover?: ReactNode;
  /** Over the top of the video, e.g. "The doctor sent a test" with a way back into it. */
  notice?: ReactNode;
}) {
  const now = useNow(1000);
  const [since] = useState(() => Date.now());
  const elapsed = now ? Math.max(0, Math.floor((now - since) / 1000)) : 0;
  const other = otherSide(c, role);
  const placeholder =
    call.state === "no-video"
      ? "Video isn't set up here (mock data without an Agora App ID). Captions, tests and the prescription still work."
      : call.state === "error"
        ? `Video couldn't connect${call.error ? `: ${call.error}` : ""}. Captions, tests and the prescription still work.`
        : call.state !== "in-call"
          ? "Connecting…"
          : call.audioOnly
            ? "Audio only. Video is paused to save the connection."
            : !call.remote.here
              ? `Waiting for ${other} to join…`
              : !call.remote.video
                ? `${other}'s camera is off.`
                : null;

  return (
    <div className="flex h-dvh flex-col bg-[#0f1011] text-white lg:flex-row">
      <section className="relative flex min-h-0 flex-1 flex-col">
        <header className="flex items-center gap-3 px-4 py-3 md:px-6">
          <span className="grid size-10 flex-none place-items-center rounded-full bg-white/12 text-[14px] font-bold">{initials(other)}</span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[16px] font-semibold">{other}</span>
            <span className="truncate text-[13px] text-white/60">
              {role === "doctor" ? `${c.patient.age} years · ${c.clinic.name}` : `${c.doctor.specialty} · ${c.clinic.name}`}
            </span>
          </span>
          <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-semibold tabular-nums">
            <span className="size-2 animate-pulse rounded-full bg-[#ff5a4e]" />
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
          </span>
        </header>

        <div className="relative mx-3 min-h-0 flex-1 overflow-hidden rounded-[24px] bg-black md:mx-6">
          <div
            ref={remoteRef}
            className={cn(
              "overflow-hidden bg-black [&_video]:!object-cover",
              takeover ? "fixed bottom-24 right-4 z-40 aspect-[4/3] w-[150px] rounded-[16px] shadow-xl ring-2 ring-white" : "absolute inset-0",
            )}
          />
          {placeholder && !takeover && !(call.remote.video && !call.audioOnly) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
              <span className="grid size-24 place-items-center rounded-full bg-white/10 text-[30px] font-bold">{initials(other)}</span>
              <p className="m-0 max-w-[420px] text-[15px] leading-normal text-white/75 text-pretty">{placeholder}</p>
            </div>
          )}
          <div
            ref={localRef}
            className={cn("absolute right-3 top-3 z-10 aspect-[4/3] w-[120px] overflow-hidden rounded-[14px] bg-[#222] ring-1 ring-white/20 md:w-[180px] [&_video]:!object-cover", (!call.camOn || call.audioOnly || call.state !== "in-call") && "invisible")}
          />

          {notice && <div className="absolute left-3 top-3 z-10 max-w-[calc(100%-150px)] md:left-5 md:top-5 md:max-w-[calc(100%-220px)]">{notice}</div>}

        </div>

        <footer className="flex items-center justify-center gap-2.5 px-4 py-4 md:gap-3">
          <Control label={call.micOn ? "Mute" : "Unmute"} on={call.micOn} disabled={call.state !== "in-call"} onClick={call.toggleMic} icon={<MicIcon off={!call.micOn} />} />
          <Control label={call.camOn ? "Camera off" : "Camera on"} on={call.camOn} disabled={call.state !== "in-call" || call.audioOnly} onClick={call.toggleCam} icon={<Icon name="camera" size={22} />} />
          <Control label={call.audioOnly ? "Video back on" : "Audio only"} on={!call.audioOnly} disabled={call.state !== "in-call"} onClick={call.toggleAudioOnly} icon={<Icon name="speaker" size={22} />} />
          <Control label={captionsOn ? "Captions off" : "Captions on"} on={captionsOn} onClick={onToggleCaptions} icon={<span className="text-[13px] font-bold">CC</span>} />
          <button type="button" onClick={onLeave} className="ml-1 flex h-14 items-center gap-2 rounded-full bg-[#d93a2f] px-5 text-[15px] font-semibold transition-colors hover:bg-[#c2332a]">
            <Icon name="close" size={20} strokeWidth={2.2} />
            {leaveLabel}
          </button>
        </footer>
        {takeover && <div className="fixed inset-0 z-30 overflow-y-auto bg-white text-ink">{takeover}</div>}
      </section>

      {side && <aside className="flex max-h-[55dvh] min-h-0 w-full flex-col bg-white text-ink lg:max-h-none lg:w-[440px]">{side}</aside>}
    </div>
  );
}

function Control({ label, on, onClick, icon, disabled }: { label: string; on: boolean; onClick: () => void; icon: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={!on}
      disabled={disabled}
      onClick={onClick}
      className={cn("grid size-14 place-items-center rounded-full transition-colors disabled:opacity-35", on ? "bg-white/12 hover:bg-white/20" : "bg-white text-ink hover:bg-white/90")}
    >
      {icon}
    </button>
  );
}

function MicIcon({ off }: { off: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}
