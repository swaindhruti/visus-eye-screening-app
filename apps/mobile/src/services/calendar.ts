// Add to calendar (remote consult). Three tries, best first:
// 1. straight into the phone's calendar with alarms 1 hour and 10 minutes before (expo-calendar);
// 2. the phone's own "new event" screen, filled in (the user taps Save);
// 3. the Google Calendar link (also Expo Go).
// Each failure is logged (Metro) so the reason shows up.
import * as Calendar from 'expo-calendar';
import { Linking } from 'react-native';

import type { ConsultSummary } from '@/services/consults';

export type CalendarResult = 'added' | 'form' | 'opened_link' | 'denied';

const drName = (name: string) => (/^dr\.?\s/i.test(name) ? name : `Dr ${name}`);

type Cal = Calendar.ExpoCalendar;

/** The calendar people actually look at: a visible, writable, primary (Google) account calendar first. */
function pickCalendar(calendars: Cal[]) {
  const score = (c: Cal) =>
    (c.isPrimary ? 4 : 0) + (c.source?.type === 'com.google' ? 2 : 0) + (c.isVisible === false ? -8 : 0) + (c.source?.isLocalAccount ? -1 : 0);
  return calendars.filter((c) => c.allowsModifications).sort((a, b) => score(b) - score(a))[0];
}

export async function addConsultToCalendar(c: ConsultSummary): Promise<CalendarResult> {
  const start = new Date(c.startsAt);
  const details = {
    title: `Eye consult with ${drName(c.doctor.name)}`,
    startDate: start,
    endDate: new Date(start.getTime() + c.minutes * 60_000),
    location: c.joinFrom === 'clinic' ? `${c.clinic.name}, ${c.clinic.city} (video call)` : 'Video call in the Visus app',
    notes: [c.reason && `Reason: ${c.reason}`, 'Open the Visus app and tap Join now. Visus is a screening, not a diagnosis.'].filter(Boolean).join('\n'),
  };

  let target: Cal | undefined;
  try {
    const permission = await Calendar.requestCalendarPermissions();
    if (!permission.granted) return 'denied';
    target = pickCalendar(await Calendar.getCalendars());
    if (!target) throw new Error('no writable calendar on this phone');
    await target.createEvent({ ...details, alarms: [{ relativeOffset: -60 }, { relativeOffset: -10 }] });
    return 'added';
  } catch (e) {
    console.warn('[calendar] direct add failed:', e instanceof Error ? e.message : e);
  }

  if (target) {
    try {
      await target.addEventWithForm(details);
      return 'form';
    } catch (e) {
      console.warn('[calendar] event form failed:', e instanceof Error ? e.message : e);
    }
  }

  try {
    await Linking.openURL(c.calendar.googleUrl);
    return 'opened_link';
  } catch (e) {
    console.warn('[calendar] Google link failed:', e instanceof Error ? e.message : e);
    throw new Error('Could not open a calendar on this phone. Add the consult time yourself.');
  }
}
