"use client";

import { useState } from "react";

import { AuthBody, AuthShell, AuthTitle, PanelList, PanelTitle } from "@/components/AuthShell";
import { Button } from "@/components/Button";
import { cn } from "@/components/cn";
import { Icon } from "@/components/Icon";
import { Spacer } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";

type CamState = "idle" | "asking" | "allowed" | "blocked";

/** Screen 41. Web asks for the camera only (no push notifications on web). */
export default function Permissions() {
  const [cam, setCam] = useState<CamState>("idle");

  const ask = async () => {
    if (cam === "allowed") return;
    setCam("asking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      stream.getTracks().forEach((t) => t.stop());
      setCam("allowed");
    } catch {
      setCam("blocked");
    }
  };

  return (
    <AuthShell
      panel={
        <>
          <PanelTitle title="Almost ready." sub="Next up: your first eye check, about five minutes." />
          <PanelList
            items={[
              ["bolt", "Turn your screen brightness up"],
              ["ruler", "Keep the distance the test asks for"],
              ["sun", "Find a quiet, well-lit spot"],
            ]}
          />
        </>
      }
    >
      <ScreenHeader title="Permissions" fallback="/home" />
      <AuthBody>
        <div className="mt-6 lg:mt-0">
          <AuthTitle eyebrow="Permissions" title="One quick permission" sub="Visus works without it, but tests work best with it on." />
        </div>

        <div className="mt-8 flex flex-none animate-rise flex-col gap-4 rounded-[28px] border border-line bg-white p-5 [animation-delay:80ms] [animation-duration:.8s] motion-reduce:animate-none">
          <div className="flex items-start gap-3.5">
            <span className="grid size-11 flex-none place-items-center rounded-full bg-acc-soft text-acc-ink">
              <Icon name="camera" size={22} strokeWidth={1.9} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[18px] font-medium">Camera</span>
              <span className="text-[15px] leading-[1.45] text-muted text-pretty">Only measures how far your face is from the screen. It never records or saves anything.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={ask}
            disabled={cam === "asking"}
            className={cn(
              "flex h-12 items-center justify-center gap-2 rounded-full text-[16px] font-medium transition-[background,color,transform] duration-[250ms] active:scale-[.98]",
              cam === "allowed" ? "bg-good-bg text-good" : cam === "blocked" ? "bg-mild-bg text-mild" : "bg-ink text-white",
            )}
          >
            {cam === "allowed" && <Icon name="checkLg" size={18} strokeWidth={2.4} />}
            {cam === "allowed" ? "Allowed" : cam === "asking" ? "Asking…" : cam === "blocked" ? "Blocked · allow it in your browser" : "Allow"}
          </button>
        </div>

        <Spacer />
        <div className="mb-2.5 flex flex-none items-center justify-center gap-2 text-[13px] text-muted">
          <Icon name="shield" size={16} />
          <span>Change this anytime in your browser settings.</span>
        </div>
        {cam === "allowed" ? (
          <Button href="/check/who" arrow className="rounded-full!">
            Continue
          </Button>
        ) : (
          <Button href="/check/who" variant="ghost" className="h-btn rounded-full! text-[16px]!">
            Not now
          </Button>
        )}
      </AuthBody>
    </AuthShell>
  );
}
