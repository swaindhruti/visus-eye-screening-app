import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';

import { PrescriptionView } from '@/components/PrescriptionView';
import { LoadState } from '@/components/results';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { listMyPrescriptions, type ConsultPrescription } from '@/services/consults';

/** C4: one prescription, in your language with "Show original". */
export default function PrescriptionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [rx, setRx] = useState<ConsultPrescription | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    setFailed(false);
    listMyPrescriptions().then(
      (list) => {
        const hit = list.find((p) => p.id === id);
        if (hit) setRx(hit);
        else setFailed(true);
      },
      () => setFailed(true),
    );
  }, [id]);
  useFocusEffect(load);

  return (
    <Screen scroll>
      <ScreenHeader left="back" onLeft={() => router.back()} title="Prescription" />
      {rx ? <PrescriptionView rx={rx} /> : <LoadState failed={failed} onRetry={load} />}
    </Screen>
  );
}
