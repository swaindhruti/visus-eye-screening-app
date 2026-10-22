"use client";

import Link from "next/link";

import { Button } from "@/components/Button";
import { CheckGuard } from "@/components/CheckGuard";
import { DistancePanel } from "@/components/DistancePanel";
import { Icon } from "@/components/Icon";
import { Screen, Spacer } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { distanceState, useDistanceCamera } from "@/lib/useDistance";
import { nextPlannedTest, useCheck } from "@/store/check";

const TARGET_CM = 40;

export default function Distance() {
  return (
    <CheckGuard>
      <DistanceScreen />
    </CheckGuard>
  );
}

/** Screen 12. The front camera measures how far the face is (MediaPipe, in the browser); Continue at 35–45 cm. */
function DistanceScreen() {
  const { cm, status, stream } = useDistanceCamera();
  const next = useCheck((s) => nextPlannedTest(s));
  const href = next ? `/check/${next}/instructions` : "/check/analysing";
  const ok = distanceState(cm, TARGET_CM) === "ok";
  const off = status === "off";

  return (
    <Screen gap="gap-0">
      <ScreenHeader title="Distance" right="2 of 2" fallback="/check/calibrate" />
      <DistancePanel cm={cm} target={TARGET_CM} stream={stream} off={off} />
      <p className="m-0 mt-3 text-[14px] leading-normal text-muted text-pretty">
        {off
          ? "Hold the screen about a forearm's length away (40 cm). Allow the camera in your browser to measure it."
          : "Hold the screen about a forearm's length away and look straight at it."}
      </p>

      <Spacer min={12} />
      <div className="mb-3 flex flex-none items-center justify-center gap-2 text-[13px] text-muted">
        <Icon name="shield" size={16} />
        <span>Only used to measure distance. Nothing is saved.</span>
      </div>
      {off ? (
        <Button href={href}>Continue</Button>
      ) : (
        <>
          <Button href={href} disabled={!ok}>
            Continue
          </Button>
          {/* No face found, or a camera that measures oddly: the tests still work. */}
          <Link href={href} className="mt-1 flex h-10 items-center justify-center text-[14px] font-semibold text-muted hover:text-ink">
            Continue without the camera
          </Link>
        </>
      )}
    </Screen>
  );
}
