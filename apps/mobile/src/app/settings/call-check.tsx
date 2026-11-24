// Developer screen (Day 1 checks for the remote consult): Agora call + speech recognition together,
// and which speech languages this phone recognises. Native code loads lazily (development build only).
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { router } from 'expo-router';
import { lazy, Suspense } from 'react';

import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Text } from '@/components/Text';

const CallCheck = lazy(() => import('@/components/CallCheck'));

export default function CallCheckScreen() {
  const native = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
  return (
    <Screen scroll>
      <ScreenHeader title="Call check" left="back" onLeft={() => router.back()} />
      {native ? (
        <Suspense fallback={<Text>Loading…</Text>}>
          <CallCheck />
        </Suspense>
      ) : (
        <Text>Needs the development build (not Expo Go).</Text>
      )}
    </Screen>
  );
}
