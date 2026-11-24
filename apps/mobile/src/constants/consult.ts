// Remote consult: shared labels and time formatting for the consult screens.
import type { ConsultStatus } from '@visus/shared';

/** "Dr Ananya Rao" (adds "Dr" when the name doesn't start with it). */
export const drName = (name: string) => (/^dr\.?\s/i.test(name) ? name : `Dr ${name}`);

const time = (d: Date) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/** "Today 4:15 pm", "Tomorrow 10:00 am", "Mon 24 Nov, 4:15 pm". */
export function consultWhen(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86_400_000);
  if (sameDay(d, today)) return `Today ${time(d)}`;
  if (sameDay(d, tomorrow)) return `Tomorrow ${time(d)}`;
  return `${d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}, ${time(d)}`;
}

export const STATUS_LABEL: Record<ConsultStatus, string> = {
  scheduled: 'Booked',
  live: 'On now',
  completed: 'Done',
  missed: 'Missed',
  cancelled: 'Cancelled',
};
