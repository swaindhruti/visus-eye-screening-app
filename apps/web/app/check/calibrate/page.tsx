"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { CardMatch } from "@/components/CardMatch";
import { CheckGuard } from "@/components/CheckGuard";
import { Screen, Spacer } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useCalibration } from "@/store/calibration";

export default function Calibrate() {
  return (
    <CheckGuard>
      <CalibrateScreen />
    </CheckGuard>
  );
}

function CalibrateScreen() {
  const router = useRouter();
  return (
    <Screen gap="gap-0">
      <ScreenHeader title="Screen setup" right="1 of 2" fallback="/check/plan" />
      <CardMatch
        footer={(pxPerMm) => (
          <>
            <Spacer />
            <Button
              onClick={() => {
                useCalibration.getState().setPxPerMm(pxPerMm);
                router.push("/check/distance");
              }}
            >
              Done
            </Button>
          </>
        )}
      />
    </Screen>
  );
}
