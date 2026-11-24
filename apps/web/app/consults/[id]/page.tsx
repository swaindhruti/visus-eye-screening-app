"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

import { CalendarLinks, JoinBanner, StatusPill } from "@/components/ConsultRow";
import { Icon } from "@/components/Icon";
import { PrescriptionCard } from "@/components/PrescriptionCard";
import { Disclaimer, Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ErrorState, LoadingState } from "@/components/States";
import { canJoin, fmtTime, JOIN_FROM_LABEL, JOIN_EARLY_MIN, languageName, useNow } from "@/lib/consults";
import { getConsult, getPrescription } from "@/services/consults";

/** C3: one consult. Doctor, clinic, time, where to join, Add to calendar, Join now, and the prescription once saved. */
export default function ConsultPage() {
  const { id } = useParams<{ id: string }>();
  const now = useNow();
  const q = useQuery({ queryKey: ["consult", id], queryFn: () => getConsult(id), refetchInterval: 30_000 });
  const done = q.data?.status === "completed" || q.data?.hasPrescription;
  const rx = useQuery({ queryKey: ["rx", id, "patient"], queryFn: () => getPrescription(id), enabled: !!done });

  if (q.isError) return <ErrorState title="Couldn't open this consult" body={q.error.message} onRetry={() => q.refetch()} retrying={q.isFetching} />;
  const c = q.data;
  if (!c) return <LoadingState />;
  const upcoming = c.status === "scheduled" && !!now && Date.parse(c.startsAt) > now;
  const when = new Date(c.startsAt).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <Screen gap="gap-5">
      <ScreenHeader title="Consult" fallback="/consults" />
      {now && canJoin(c, now) && <JoinBanner c={c} now={now} title={`Consult with ${c.doctor.name}`} href={`/consults/${c.id}/call`} />}

      <header className="flex flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-2">
          <StatusPill status={c.status} />
          {c.kind === "follow_up" && <span className="rounded-full bg-pill px-2 py-0.5 text-[12px] font-semibold text-ink-soft">Follow-up</span>}
        </span>
        <h1 className="m-0 text-[28px] font-bold leading-[1.15] tracking-[-0.025em]">
          {when}, {fmtTime(c.startsAt)}
        </h1>
        <span className="text-[15px] text-muted">
          {c.minutes} minutes · video call · for {c.patient.name}
        </span>
      </header>

      <section className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-[18px]">
        <div className="flex items-start gap-3">
          <span className="grid size-11 flex-none place-items-center rounded-full bg-acc-soft text-acc-ink">
            <Icon name="health" size={20} />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[17px] font-semibold">{c.doctor.name}</span>
            <span className="text-[14px] text-muted">{c.doctor.specialty}</span>
            <span className="text-[13px] text-muted">Reg. no. {c.doctor.registrationNo} (as typed, not verified)</span>
          </span>
        </div>
        <dl className="m-0 grid gap-x-4 gap-y-2.5 border-t border-divider pt-3 text-[15px] sm:grid-cols-2">
          <Item label="Booked by">
            {c.clinic.name}, {c.clinic.city}
          </Item>
          <Item label="Where you join">{c.joinFrom === "clinic" ? `At ${c.clinic.name}` : "From home, on this device"}</Item>
          <Item label="Captions and prescription">{languageName(c.language)}</Item>
          <Item label="Reason">{c.reason || "—"}</Item>
        </dl>
      </section>

      {upcoming && (
        <section className="flex flex-col gap-2.5">
          <h2 className="m-0 text-[17px] font-bold">Add to your calendar</h2>
          <p className="m-0 text-[14px] text-muted">With reminders 1 hour and 10 minutes before. Join opens here {JOIN_EARLY_MIN} minutes before the start.</p>
          <CalendarLinks c={c} />
          <p className="m-0 text-[14px] text-muted">{JOIN_FROM_LABEL[c.joinFrom]}: {c.joinFrom === "clinic" ? "the clinic starts the call on its laptop with you there." : "use a phone or laptop with a camera, in a quiet, well-lit place."}</p>
        </section>
      )}

      {c.status === "missed" && <p className="m-0 rounded-[16px] bg-mild-bg px-4 py-3 text-[15px] text-mild">Nobody joined this consult. Ask {c.clinic.name} to book a new one.</p>}
      {c.status === "cancelled" && <p className="m-0 rounded-[16px] bg-fill px-4 py-3 text-[15px] text-ink-soft">{c.clinic.name} cancelled this consult.</p>}

      {done && (
        <section className="flex flex-col gap-2.5">
          <h2 className="m-0 text-[17px] font-bold">Prescription</h2>
          {rx.isPending ? (
            <p className="m-0 text-[15px] text-muted">Loading…</p>
          ) : rx.data ? (
            <PrescriptionCard
              rx={rx.data}
              translatedFirst
              footer={
                <Link href={`/rx/${c.id}`} className="flex items-center gap-1.5 self-start border-t border-divider pt-3 text-[14px] font-semibold text-ink-soft hover:text-ink">
                  <Icon name="download" size={16} />
                  Print or save as PDF
                </Link>
              }
            />
          ) : (
            <p className="m-0 text-[15px] text-muted">The doctor didn&apos;t write a prescription for this consult.</p>
          )}
        </section>
      )}
      <Disclaimer>Visus checks are a screening, not a diagnosis. Follow your doctor&apos;s advice.</Disclaimer>
    </Screen>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-[13px] font-semibold text-muted">{label}</dt>
      <dd className="m-0 break-words">{children}</dd>
    </div>
  );
}
