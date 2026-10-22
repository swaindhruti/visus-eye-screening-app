"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { cn } from "@/components/cn";
import { Icon } from "@/components/Icon";
import { ScreenHeader } from "@/components/ScreenHeader";
import { OfflinePill } from "@/components/States";
import { useStartCheck } from "@/lib/useStartCheck";
import { useVoiceInput } from "@/lib/useVoiceInput";
import { listProfiles } from "@/services/profiles";
import { intakeChat, intakeText, type IntakeMessage } from "@/services/sessions";
import { useCheck } from "@/store/check";

type Msg = IntakeMessage;

const subscribe = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

export default function Intake() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  const profileId = useCheck((s) => s.profileId);
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: listProfiles });
  const name = (profiles.data?.find((p) => p.id === profileId) ?? profiles.data?.[0])?.name.split(" ")[0];
  const start = useStartCheck();

  const owner = profiles.data?.find((p) => p.id === profileId) ?? profiles.data?.[0];
  const greeting: Msg = { from: "ai", text: `Hi${name ? ` ${name}` : ""}. What's bothering your eyes today?` };
  // The whole chat so far, greeting first; sent to POST /intake/chat every turn.
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [chips, setChips] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const voice = useVoiceInput(setText);
  const chat = msgs.length ? msgs : [greeting];

  const turn = useMutation({
    mutationFn: (next: Msg[]) => intakeChat(owner?.id ?? profileId ?? "", next),
    onSuccess: (res, next) => {
      if (res.done) {
        setDone(true);
        setChips([]);
        return;
      }
      setMsgs([...next, { from: "ai", text: res.reply }]);
      setChips(res.chips);
    },
  });

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.length, turn.isPending, done, start.isPending]);

  const answer = (raw: string) => {
    const v = raw.trim();
    if (!v || turn.isPending || done) return;
    voice.cancel();
    const next = [...chat, { from: "me" as const, text: v }];
    setMsgs(next);
    setChips([]);
    setText("");
    turn.mutate(next);
  };

  const typing = turn.isPending;
  const chatDone = done;
  const intake = intakeText(chat);
  const canSend = text.trim().length > 0 && !typing && !done && !!owner;

  return (
    <div className="min-h-dvh bg-pearl">
    <div className="mx-auto flex h-dvh max-w-[1200px] gap-6 px-5 pb-8 pt-6 md:px-8 md:py-8">
    <section aria-label="Chat" className="flex min-w-0 flex-[3_1_0] flex-col md:rounded-[28px] md:border md:border-line md:bg-white md:px-6 md:pb-6 md:pt-5">
      <ScreenHeader title="New check" fallback="/home" />
      {!online && <div className="mt-3 flex justify-center"><OfflinePill /></div>}

      <div className="no-scrollbar -mx-5 min-h-0 flex-1 overflow-y-auto px-5 md:-mx-2 md:px-2">
        <div className="flex min-h-full flex-col justify-end gap-3 pb-3.5 pt-4" aria-live="polite">
          {chat.map((m, i) => (
            <Bubble key={i} {...m} />
          ))}
          {chips.length > 0 && online && (
            <div className="flex flex-wrap gap-2">
              {chips.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => answer(c)}
                  className="h-11 rounded-full border border-line-strong bg-white px-4 text-[15px] font-semibold transition-[border-color,transform] duration-150 hover:border-ink active:scale-[.97]"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          {(typing || start.isPending) && <Typing />}
          {turn.isError && (
            <div className="flex flex-col items-start gap-2">
              <Bubble from="ai" text={turn.error.message || "Sorry, I couldn't answer that. Try again."} />
              <button type="button" onClick={() => turn.mutate(chat)} className="h-10 rounded-full border border-line-strong bg-white px-4 text-[15px] font-semibold hover:border-ink">
                Try again
              </button>
            </div>
          )}
          {chatDone && !start.isPending && !start.isSuccess && online && (
            <div className="flex flex-col items-start gap-2">
              <Bubble from="ai" text="Thanks, that helps. I'll pick the right tests for you now." />
              {start.isError && <span className="text-[14px] text-doc">Couldn&apos;t make your plan. Try again.</span>}
              <button
                type="button"
                onClick={() => start.mutate({ mode: "full", intake })}
                className="flex h-11 items-center gap-2 rounded-full bg-ink px-[18px] text-[15px] font-semibold text-white transition-transform duration-150 active:scale-[.97]"
              >
                See my test plan
                <Icon name="arrowRight" size={18} strokeWidth={2.2} />
              </button>
            </div>
          )}
          {!online && (
            <div className="flex flex-col gap-3.5 rounded-[20px] border border-line bg-white p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-10 flex-none place-items-center rounded-full bg-fill">
                  <Icon name="wifiOff" size={20} strokeWidth={1.9} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <span className="text-[16px] font-bold">AI chat needs internet</span>
                  <span className="text-[14px] leading-[1.45] text-muted text-pretty">Tests still work. Pick them yourself and run them one at a time.</span>
                </div>
              </div>
              <Link href="/tests" className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-ink text-[16px] font-semibold text-white active:scale-[.98]">
                Choose tests myself
                <Icon name="arrowRight" size={18} strokeWidth={2.2} />
              </Link>
            </div>
          )}
          <div ref={end} />
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          answer(text);
        }}
        className={cn("flex h-14 flex-none items-center gap-1 rounded-full border pl-[18px] pr-1.5", online ? "border-line-strong bg-white" : "border-line-option bg-fill")}
      >
        <input
          autoFocus
          value={text}
          disabled={!online}
          onChange={(e) => setText(e.target.value)}
          placeholder={!online ? "Chat is offline" : voice.listening ? "Listening…" : chatDone ? "Add anything else…" : "Type or speak your answer…"}
          aria-label="Your message"
          className="min-w-0 flex-1 border-none bg-transparent text-[16px] outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:text-[#8A8A85]"
        />
        {voice.supported && (
          <button
            type="button"
            disabled={!online || chatDone || typing}
            onClick={() => (voice.listening ? voice.stop() : voice.start(text))}
            aria-label={voice.listening ? "Stop listening" : "Speak your answer"}
            aria-pressed={voice.listening}
            title={voice.listening ? "Stop listening" : "Speak your answer"}
            className={cn(
              "grid size-11 flex-none place-items-center rounded-full transition-colors duration-200 disabled:opacity-30",
              voice.listening ? "animate-pulse bg-acc-soft" : "hover:bg-fill",
            )}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={voice.listening ? "#194F81" : "#111"} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
            </svg>
          </button>
        )}
        <button type="submit" aria-label="Send" disabled={!canSend} className={cn("grid size-11 flex-none place-items-center rounded-full transition-colors duration-200", canSend ? "bg-ink" : "bg-[#D6D6D1]")}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 16V4M5 9l5-5 5 5" />
          </svg>
        </button>
      </form>
      {voice.error && <p className="m-0 mt-2.5 text-center text-[13px] leading-[1.4] text-doc">{voice.error}</p>}
      <p className="m-0 mt-2.5 text-center text-[12px] leading-[1.4] text-[#8A8A85]">Visus isn&apos;t a diagnosis. Sudden vision loss? See a doctor now.</p>
    </section>
    <aside className="hidden min-w-0 flex-[2_1_0] flex-col gap-4 lg:flex">
      <div className="flex flex-col gap-3 rounded-[28px] border border-line bg-white p-6">
        <span className="text-[14px] font-semibold text-muted">What happens next</span>
        <h2 className="m-0 text-[24px] font-bold tracking-[-0.02em]">Your test plan</h2>
        <p className="m-0 text-[15px] leading-normal text-muted text-pretty">Answer a few questions and our AI picks the tests that fit. Most checks take about 10 minutes.</p>
        <ol className="m-0 mt-2 flex list-none flex-col gap-3 p-0">
          {["Describe what you notice", "See the tests picked for you", "Set up your screen", "Take the tests, one at a time", "Get your result and lens suggestions"].map((t, i) => (
            <li key={t} className="flex items-center gap-3 text-[15px]">
              <span className={cn("grid size-7 flex-none place-items-center rounded-full text-[13px] font-bold", i === 0 ? "bg-ink text-white" : "bg-acc-soft text-acc-ink")}>{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
      </div>
      <div className="flex flex-col gap-2.5 rounded-[22px] border border-line bg-white px-5 py-[18px]">
        <span className="text-[14px] font-bold text-muted">Before you start</span>
        <div className="flex flex-wrap gap-2">
          {["Good light", "Arm's length", "Your glasses", "Full brightness"].map((t) => (
            <span key={t} className="flex h-[34px] items-center rounded-full bg-pill px-3 text-[13px] font-semibold text-ink-soft">
              {t}
            </span>
          ))}
        </div>
      </div>
    </aside>
    </div>
    </div>
  );
}

function Bubble({ from, text }: Msg) {
  return (
    <div
      className={cn(
        "max-w-[82%] px-[15px] py-[11px] text-[16px] leading-[1.4] text-pretty",
        from === "ai" ? "self-start rounded-[18px_18px_18px_6px] border border-line bg-white" : "self-end rounded-[18px_18px_6px_18px] bg-ink text-white",
      )}
    >
      {text}
    </div>
  );
}

function Typing() {
  return (
    <div className="flex h-[42px] items-center gap-[5px] self-start rounded-[18px_18px_18px_6px] border border-line bg-white px-4" aria-label="Typing">
      {["#BDBDB8", "#A5A5A0", "#8A8A85"].map((c, i) => (
        <span key={c} className="size-[7px] animate-pulse rounded-full" style={{ background: c, animationDelay: `${i * 150}ms` }} />
      ))}
    </div>
  );
}
