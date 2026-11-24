// Mock data for the remote consult (EXPO_PUBLIC_USE_MOCK=1): one consult soon, one past with a prescription.
import type { ConsultDetail, ConsultPrescription, ConsultSummary, LiveState } from '@visus/shared';

const doctor = { id: 'doc-1', visusId: 'VIS-D-7K3Q', name: 'Dr Ananya Rao', specialty: 'Ophthalmologist', registrationNo: 'OMC-48213', languages: ['en', 'hi'] as const };
const clinic = { id: 'shop-1', name: 'Sai Optics', city: 'Puri' };
const patient = { profileId: 'p-self', name: 'You', age: 52 };
const calendar = { googleUrl: 'https://calendar.google.com/calendar/render?action=TEMPLATE', icsUrl: 'https://visus.app/consult.ics' };

const soon = new Date(Date.now() + 8 * 60_000).toISOString();
const lastWeek = new Date(Date.now() - 6 * 86_400_000).toISOString();

export const MOCK_CONSULTS: ConsultSummary[] = [
  { id: 'c-soon', startsAt: soon, minutes: 15, status: 'scheduled', kind: 'follow_up', joinFrom: 'home', reason: 'Blurry left eye, follow-up', language: 'hi', patient, doctor: { ...doctor, languages: [...doctor.languages] }, clinic, hasPrescription: false, calendar },
  { id: 'c-past', startsAt: lastWeek, minutes: 15, status: 'completed', kind: 'first', joinFrom: 'clinic', reason: 'Blurry left eye', language: 'hi', patient, doctor: { ...doctor, languages: [...doctor.languages] }, clinic, hasPrescription: true, calendar },
];

export const mockConsult = (id: string): ConsultDetail => ({ ...(MOCK_CONSULTS.find((c) => c.id === id) ?? MOCK_CONSULTS[0]), role: 'patient' });

export const MOCK_PRESCRIPTIONS: ConsultPrescription[] = [
  {
    id: 'rx-1',
    consultId: 'c-past',
    date: lastWeek,
    status: 'final',
    kind: 'first',
    symptoms: 'Blurry left eye for 2 weeks, worse while reading.',
    observations: 'Amsler grid: a few wavy lines near the centre, left eye. Distance vision 6/9 both eyes.',
    glasses: { right: { sph: -1.25, cyl: 0, axis: 0 }, left: { sph: -1.5, cyl: -0.5, axis: 90 } },
    medicines: [{ name: 'Carboxymethylcellulose 0.5%', dose: '1 drop', frequency: '3 times a day', days: 14 }],
    remedies: ['20-20-20 breaks from screens', 'Warm compress at night'],
    followUpDate: soon.slice(0, 10),
    followUpConsultId: 'c-soon',
    doctor: { ...doctor, languages: [...doctor.languages] },
    clinic,
    patient,
    translated: {
      language: 'hi',
      symptoms: 'बाईं आँख में 2 हफ़्ते से धुंधलापन, पढ़ते समय ज़्यादा।',
      observations: 'एम्सलर ग्रिड: बाईं आँख में बीच के पास कुछ लहरदार रेखाएँ। दूर की नज़र दोनों आँखों में 6/9।',
      remedies: ['स्क्रीन से 20-20-20 ब्रेक', 'रात में गर्म सिकाई'],
    },
  },
];

export const MOCK_LIVE: LiveState = { status: 'live', pendingTest: null, tests: [], captions: [], prescriptionSaved: false };
