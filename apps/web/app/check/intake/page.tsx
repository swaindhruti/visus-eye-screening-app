"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { LANGUAGE_OPTIONS, SPEECH_LOCALE, VOICE_TEXT } from "@visus/shared";

import { cn } from "@/components/cn";
import { Icon } from "@/components/Icon";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ShopChatFor } from "@/components/ShopPatientPicker";
import { useMe } from "@/components/ShopShell";
import { OfflinePill } from "@/components/States";
import { VoiceOrb, type VoiceState } from "@/components/VoiceOrb";
import { useStartCheck } from "@/lib/useStartCheck";
import { listen, speak, stopSpeaking } from "@/lib/voice";
import { useVoiceInput } from "@/lib/useVoiceInput";
import { listProfiles } from "@/services/profiles";
import { isShop } from "@/services/shops";
import { intakeChat, intakeText, type IntakeMessage } from "@/services/sessions";
import { useCheck } from "@/store/check";
import { useSettings } from "@/store/settings";

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
  const shopPatient = useCheck((s) => s.shopPatient);
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: listProfiles });
  // A shop (Ask Visus AI) chats for its patient, or with no patient record ("" on the server).
  const shop = isShop(useMe().data?.user);
  // A shop's patient may be a linked account (not in the shop's own profile list).
  const owner = shop || shopPatient ? undefined : (profiles.data?.find((p) => p.id === profileId) ?? profiles.data?.[0]);
  const name = (shopPatient?.name ?? owner?.name)?.split(" ")[0];
  const start = useStartCheck();

  const lang = useSettings((s) => s.lang);
  const talk = useSettings((s) => s.talk);
  const setSettings = useSettings((s) => s.set);
  const greeting: Msg = { from: "ai", text: VOICE_TEXT[lang].greeting(name ?? "") };
  // The whole chat so far, greeting first; sent to POST /intake/chat every turn.
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [chips, setChips] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const voice = useVoiceInput(setText, SPEECH_LOCALE[lang]);
  const chat = msgs.length ? msgs : [greeting];

  const turn = useMutation({
    mutationFn: (next: Msg[]) => intakeChat(shop ? (useCheck.getState().shopPatient ? (useCheck.getState().profileId ?? "") : "") : (owner?.id ?? profileId ?? ""), next),
    onSuccess: (res, next) => {
      // The AI answers in the language the person is using: keep talking in it.
      if (res.language && res.language !== useSettings.getState().lang) setSettings({ lang: res.language });
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

  // ---------- Talk mode: Visus reads each question aloud, then listens for the answer ----------
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [level, setLevel] = useState(0);
  const live = useRef<{ stop: () => void; finish?: () => void } | null>(null);
  const handled = useRef(-1); // the last AI message already spoken
  const talkOn = () => useSettings.getState().talk;

  async function hear() {
    live.current?.stop();
    setVoiceState("listening");
    const l = listen(useSettings.getState().lang, setLevel);
    live.current = l;
    const heard = await l.done;
    setVoiceState("idle");
    if (!heard?.text || !talkOn()) return;
    if (heard.language && heard.language !== useSettings.getState().lang) setSettings({ lang: heard.language });
    answer(heard.text);
  }

  async function converse(say: string) {
    live.current?.stop();
    setVoiceState("speaking");
    const s = speak(say, useSettings.getState().lang);
    live.current = s;
    await s.done;
    if (talkOn() && live.current === s) await hear();
    else setVoiceState("idle");
  }

  useEffect(() => {
    const idx = chat.length - 1;
    if (!talk || !online || turn.isPending || done || chat[idx].from !== "ai" || handled.current === idx) return;
    handled.current = idx;
    void converse(chat[idx].text);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- speak each new AI message once
  }, [talk, online, turn.isPending, done, chat]);

  // The chat ended in talk mode: go straight on to the plan (it reads its summary aloud).
  useEffect(() => {
    if (talk && done && online && !start.isPending && !start.isSuccess && !start.isError) start.mutate({ mode: "full", intake: intakeText(chat) });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the chat is done
  }, [talk, done]);

  useEffect(
    () => () => {
      live.current?.stop();
      stopSpeaking();
    },
    [],
  );

  const toggleTalk = () => {
    if (talk) {
      live.current?.stop();
      stopSpeaking();
      setVoiceState("idle");
    } else handled.current = -1; // read the current question aloud
    setSettings({ talk: !talk });
  };

  const typing = turn.isPending;
  const chatDone = done;
  const intake = intakeText(chat);
  const canSend = text.trim().length > 0 && !typing && !done && (shop || !!shopPatient || !!owner);

  return (
    <div className="min-h-dvh bg-pearl">
    <div className="mx-auto flex h-dvh max-w-[1200px] gap-6 px-5 pb-8 pt-6 md:px-8 md:py-8">
    <section aria-label="Chat" className="flex min-w-0 flex-[3_1_0] flex-col md:rounded-[28px] md:border md:border-line md:bg-white md:px-6 md:pb-6 md:pt-5">
      <ScreenHeader title={shop ? "Ask Visus AI" : "New check"} fallback={shop ? "/shop/ask" : "/home"} />
      {shop && <ShopChatFor />}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div role="radiogroup" aria-label="Language" className="flex rounded-full bg-fill p-1">
          {LANGUAGE_OPTIONS.map((o) => (
            <button
              key={o.code}
              type="button"
              role="radio"
              aria-checked={lang === o.code}
              aria-label={o.name}
              onClick={() => setSettings({ lang: o.code })}
              className={cn("h-9 min-w-11 rounded-full px-3 text-[14px] font-semibold transition-colors", lang === o.code ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink")}
            >
              {o.short}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={toggleTalk}
          aria-pressed={talk}
          disabled={!online}
          className={cn(
            "flex h-11 items-center gap-2 rounded-full border px-4 text-[15px] font-semibold transition-colors disabled:opacity-40",
            talk ? "border-ink bg-ink text-white" : "border-line-strong bg-white hover:bg-card-hover",
          )}
        >
          <Icon name="speaker" size={18} />
          {talk ? "Talk mode on" : "Talk instead"}
        </button>
      </div>
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

      {talk && online && (
        <div className="mb-3 flex flex-none items-center gap-3 rounded-[22px] border border-line bg-white p-2.5 pr-3 md:border-line-option">
          <VoiceOrb state={typing || start.isPending ? "thinking" : voiceState} level={level} size={48} />
          <span className="min-w-0 flex-1 text-[15px] leading-snug text-ink-soft" aria-live="polite">
            {voiceState === "listening" ? VOICE_TEXT[lang].listening : voiceState === "speaking" ? "…" : typing ? "" : VOICE_TEXT[lang].talkOn}
          </span>
          {voiceState === "listening" ? (
            <button type="button" onClick={() => live.current?.finish?.()} className="h-10 flex-none rounded-full border border-line-strong px-4 text-[14px] font-semibold hover:bg-card-hover">
              Done
            </button>
          ) : (
            voiceState === "idle" &&
            !typing &&
            !done && (
              <button type="button" onClick={() => void hear()} className="h-10 flex-none rounded-full bg-ink px-4 text-[14px] font-semibold text-white">
                Speak
              </button>
            )
          )}
        </div>
      )}
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
