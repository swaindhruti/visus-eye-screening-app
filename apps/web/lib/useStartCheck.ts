"use client";

import type { TestId } from "@visus/shared";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { isGuest } from "@/services/auth";
import { listProfiles } from "@/services/profiles";
import { createSession, type CheckMode } from "@/services/sessions";
import { useCalibration } from "@/store/calibration";
import { useCheck } from "@/store/check";

import { testInfo } from "./tests";

/** Creates a session on the server, stores the plan and opens the first screen of the check. */
export function useStartCheck() {
  const router = useRouter();
  return useMutation({
    mutationFn: async (input: { mode: CheckMode; intake?: string; testId?: TestId }) => {
      // Guests have no profiles: the session stays on this device (services/sessions.ts).
      if (isGuest()) return { session: await createSession({ profileId: "", intake: "", mode: input.mode, testId: input.testId }), ...input };
      // Who the check is for (chosen on "Who is this check for"), else the account owner.
      const profiles = await listProfiles();
      const chosen = useCheck.getState().profileId;
      const profileId = profiles.find((p) => p.id === chosen)?.id ?? profiles.find((p) => p.relation === "self")?.id ?? profiles[0]?.id;
      if (!profileId) throw new Error("Finish setting up your profile first.");
      useCheck.getState().setProfile(profileId);
      const session = await createSession({ profileId, intake: input.intake ?? "", mode: input.mode, testId: input.testId });
      return { session, ...input };
    },
    onSuccess: ({ session, mode, intake }) => {
      useCheck.getState().start(session, mode, intake ?? "");
      if (mode === "full") return router.push("/check/plan");
      const first = session.plan[0].testId;
      const needsCal = session.plan.some((p) => testInfo(p.testId).needsCalibration);
      if (needsCal && (mode !== "single" || !useCalibration.getState().calibrated)) return router.push("/check/calibrate");
      router.push(`/check/${first}/instructions`);
    },
  });
}
