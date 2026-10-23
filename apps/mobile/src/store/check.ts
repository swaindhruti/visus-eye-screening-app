import { TEST_CATALOG, type CreateSessionResponse, type NextStep, type Profile, type ScoredResult, type TestId, type Verdict } from '@visus/shared';
import type { Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { create } from 'zustand';

import { cameraDistanceAvailable, TEST_DISTANCE_CM } from '@/components/DistanceCamera';
import { isGuest } from '@/services/auth';
import { getMyProfile, listProfiles } from '@/services/profiles';
import { isOnline } from '@/services/network';
import { createSession, getSession, guestSession } from '@/services/sessions';
import { useCalibration } from '@/store/calibration';
import { OFFLINE_PREFIX } from '@/store/offline';

export type CheckPlan = ReturnType<typeof CreateSessionResponse.parse>;
export type PlanItem = CheckPlan['plan'][number];
export type CheckMode = 'full' | 'quick' | 'single' | 'glasses';

type CheckState = {
  sessionId: string | null;
  mode: CheckMode;
  summary: string;
  plan: PlanItem[];
  /** Index in `plan` of the test being taken. */
  index: number;
  /** Scored results so far, as returned by the server. */
  results: ScoredResult[];
  /** The server's reply to the last test. */
  step: NextStep | null;
  /** Overall results, once the check is done. */
  verdict: Verdict | null;
  /** Whose check it is (needed to send a test taken offline later). */
  profileId: string | null;
  /** Distance setup (12) done for this check (camera, development build). */
  distanceSet: boolean;
  start: (mode: CheckMode, session: CheckPlan) => void;
  /** Saves the server's reply. On "next_test" it moves to that test, adding it to the plan if the agent added it. */
  record: (step: NextStep) => void;
  /** Moves to the next test in the plan (after a red flag). Returns false when there is none. */
  advance: () => boolean;
  setVerdict: (verdict: Verdict) => void;
  reset: () => void;
};

const empty = {
  sessionId: null,
  mode: 'full' as CheckMode,
  summary: '',
  plan: [],
  index: 0,
  results: [],
  step: null,
  verdict: null,
  profileId: null,
  distanceSet: false,
};

/** The check in progress, from the plan to the verdict. */
export const useCheck = create<CheckState>((set, get) => ({
  ...empty,
  start: (mode, session) =>
    set({ ...empty, sessionId: session.sessionId, mode, summary: session.summary, plan: session.plan }),
  record: (step) =>
    set(({ plan, index, results }) => {
      const next = { step, results: [...results, step.result] };
      if (step.type !== 'next_test') return next;
      const newPlan =
        plan[index + 1]?.testId === step.testId
          ? plan
          : [...plan.slice(0, index + 1), { testId: step.testId, reason: step.reason }, ...plan.slice(index + 1)];
      return { ...next, plan: newPlan, index: index + 1 };
    }),
  advance: () => {
    const { plan, index } = get();
    if (index + 1 >= plan.length) return false;
    set({ index: index + 1 });
    return true;
  },
  setVerdict: (verdict) => set({ verdict }),
  reset: () => set(empty),
}));

/** Where to go for the current test: calibration first if a test needs it and the screen isn't calibrated. */
export function firstStep(): Href {
  const { plan, index, distanceSet } = useCheck.getState();
  const needsCalibration = plan.some((p) => TEST_CATALOG.find((t) => t.id === p.testId)?.needsCalibration);
  if (needsCalibration && useCalibration.getState().pxPerMm === null) return '/check/calibrate';
  // Once per check, with the camera: hold the phone at the right distance.
  if (cameraDistanceAvailable && !distanceSet && plan.slice(index).some((p) => TEST_DISTANCE_CM[p.testId])) return '/check/distance';
  return { pathname: '/check/[testId]/instructions', params: { testId: plan[index].testId } };
}

/** Where a check for this person starts: Kids mode intro (43) for a child, otherwise Issue intake (9). */
export const checkStartFor = (p: Profile): Href =>
  p.isChild ? { pathname: '/check/kids-intro', params: { id: p.id } } : { pathname: '/check/intake', params: { profileId: p.id } };

/** "Start eye check": Who is this for (42) when there's family, otherwise straight in. */
export async function newCheckRoute(): Promise<Href> {
  const profiles = await listProfiles();
  return profiles.length > 1 ? '/check/who' : checkStartFor(profiles[0]);
}

/** Starts a check of this mode for a profile (owner by default) and returns where to go first. */
export async function startCheck(mode: CheckMode, profileId?: string): Promise<Href> {
  const id = profileId ?? (await getMyProfile()).id;
  const session = await createSession({ profileId: id, intake: '', mode });
  useCheck.getState().start(mode, session);
  return firstStep();
}

/** Glasses check (60): round 1 is with glasses off, round 2 with them on. Sent as `answers.round`. */
export function glassesRound(): 'glasses_off' | 'glasses_on' | undefined {
  const { mode, index } = useCheck.getState();
  if (mode !== 'glasses') return undefined;
  return index === 0 ? 'glasses_off' : 'glasses_on';
}

/** Starts a one-test check (mode "single") and returns where to go first. */
export async function startSingleTest(testId: TestId): Promise<Href> {
  // Guests have no profile: the session stays on this phone and only the score comes from the server.
  if (isGuest()) {
    useCheck.getState().start('single', guestSession(testId));
    return firstStep();
  }
  const profile = await getMyProfile();
  // Offline (54): the test still runs; its answers wait on the phone (store/offline.ts).
  const session = (await isOnline())
    ? await createSession({ profileId: profile.id, intake: '', mode: 'single', testId })
    : { sessionId: `${OFFLINE_PREFIX}${Date.now()}`, summary: 'The test you picked.', plan: [{ testId, reason: 'Picked by you' }] };
  useCheck.getState().start('single', session);
  useCheck.setState({ profileId: profile.id });
  return firstStep();
}

/**
 * The verdict of a check: from the store right after the check, otherwise from
 * GET /sessions/:id (a past check opened from the Results tab).
 */
export function useVerdict(sessionId: string) {
  const current = useCheck((s) => (s.verdict?.sessionId === sessionId ? s.verdict : null));
  const [loaded, setLoaded] = useState<Verdict | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (current) return;
    let live = true;
    getSession(sessionId)
      .then((v) => live && setLoaded(v))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [current, sessionId, attempt]);

  return {
    verdict: current ?? (loaded?.sessionId === sessionId ? loaded : null),
    failed,
    retry: () => {
      setFailed(false);
      setAttempt((a) => a + 1);
    },
  };
}
