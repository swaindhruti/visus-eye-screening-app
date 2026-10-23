// Camera distance (Distance setup 12, Distance warning 47, Near point). Needs the development build:
// in Expo Go `cameraDistanceAvailable` is false and nothing native is loaded.
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { lazy, Suspense } from 'react';
import { View } from 'react-native';

import type { FaceCameraProps } from '@/components/FaceCamera';

export const cameraDistanceAvailable = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

const FaceCamera = lazy(() => import('@/components/FaceCamera'));

/** Reports the distance to the user's eyes (cm) while mounted. Renders nothing visible unless `preview`. */
export function DistanceCamera(props: FaceCameraProps) {
  if (!cameraDistanceAvailable) return null;
  return (
    <Suspense fallback={<View style={props.preview ? props.style : undefined} />}>
      <FaceCamera {...props} />
    </Suspense>
  );
}

/** Target distance per test (cm), for the Distance warning. Tests not listed have no distance rule. */
export const TEST_DISTANCE_CM: Partial<Record<string, number>> = {
  tumbling_e: 40,
  kids_tumbling_e: 40,
  clock_dial: 40,
  duochrome: 40,
  amsler: 40,
  contrast: 40,
  near_reading: 40,
  peripheral_field: 30,
};

/** Within ±5 cm of the target. */
export const distanceOk = (cm: number, target = 40) => Math.abs(cm - target) <= 5;
