"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

import { StatusBadge } from "@/components/Chip";
import { cn } from "@/components/cn";
import { CalendarLinks, JoinBanner, StatusPill } from "@/components/ConsultRow";
import { useDoctorReady } from "@/components/DoctorShell";
import { Icon } from "@/components/Icon";
import { GlassesTable, PrescriptionCard } from "@/components/PrescriptionCard";
import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ErrorState, LoadingState } from "@/components/States";
import { SkeletonCards } from "@/components/Skeleton";
import { canJoin, fmtDay, fmtTime, JOIN_EARLY_MIN, JOIN_FROM_LABEL, languageName, setDoctorReturn, useNow } from "@/lib/consults";
import { fmtFull, fmtShort } from "@/lib/dates";
import { sessionTitle } from "@/lib/history";
import { getConsult, getPatientFile, type PatientFile } from "@/services/consults";

/** R5: the patient file before (and after) a consult. The AI summary first, then the full records. */
export default function PatientFilePage() {
  const { id } = useParams<{ id: string }>();
  const ready = useDoctorReady();
  const now = useNow();
  const consult = useQuery({ queryKey: ["consult", id], queryFn: () => getConsult(id), enabled: ready, refetchInterval: 30_000 });
  const file = useQuery({ queryKey: ["patient-file", id], queryFn: () => getPatientFile(id), enabled: ready });

  if (consult.isError) return <ErrorState title="Consult not found" body="It may have been cancelled or moved by the clinic." onRetry={() => consult.refetch()} retrying={consult.isFetching} />;
  if (!consult.data || !now) return <LoadingState />;
  const c = consult.data;
  const upcoming = c.status === "scheduled" && Date.parse(c.startsAt) > now;

  return (
    <Screen wide gap="gap-5 md:gap-6">
      <ScreenHeader fallback="/doctor" title="Patient file" />

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="m-0 text-[30px] font-bold tracking-[-0.025em] md:text-[38px]">
            {c.patient.name}, {c.patient.age}
          </h1>
          <StatusPill status={c.status} />
          {c.kind === "follow_up" && <span className="rounded-full bg-pill px-2 py-0.5 text-[12px] font-semibold text-ink-soft">Follow-up</span>}
        </div>
        <p className="m-0 text-[15px] text-muted">
          {fmtDay(c.startsAt, now)} {fmtTime(c.startsAt)} · {c.minutes} min · {c.clinic.name}, {c.clinic.city} · {JOIN_FROM_LABEL[c.joinFrom]} · {languageName(c.language)}
        </p>
        <div className="rounded-[16px] border border-line bg-white px-4 py-3">
          <span className="text-[13px] font-semibold text-muted">Reason from the clinic</span>
          <p className="m-0 mt-1 text-[16px] leading-normal text-pretty">{c.reason}</p>
        </div>
      </section>

      {canJoin(c, now) ? (
        <JoinBanner c={c} now={now} title={`${c.patient.name} · ${c.clinic.name}`} href={`/doctor/consults/${c.id}/call`} />
      ) : upcoming ? (
        <div className="flex flex-col gap-3 rounded-[18px] border border-line bg-white px-4 py-3.5 md:flex-row md:items-center">
          <span className="flex flex-1 items-center gap-2.5 text-[15px] text-ink-soft">
            <Icon name="clock" size={18} />
            Join opens {JOIN_EARLY_MIN} minutes before the start.
          </span>
          <CalendarLinks c={c} />
        </div>
      ) : c.hasPrescription ? (
        <Link href={`/doctor/prescriptions?consult=${c.id}`} className="flex items-center gap-2 self-start rounded-full border border-line-strong bg-white px-4 py-2.5 text-[15px] font-semibold hover:bg-card-hover">
          <Icon name="doc" size={17} />
          View the prescription
        </Link>
      ) : null}

      {file.isError ? (
        <ErrorState title="Couldn't load the records" body="Try again in a moment." onRetry={() => file.refetch()} retrying={file.isFetching} />
      ) : !file.data ? (
        <SkeletonCards count={3} label="Loading the patient’s records…" />
      ) : (
        <Records f={file.data} consultId={c.id} now={now} />
      )}
    </Screen>
  );
}

function Records({ f, consultId, now }: { f: PatientFile; consultId: string; now: number }) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-7">
      <div className="flex min-w-0 flex-col gap-5 lg:flex-[2_1_0]">
        <Summary f={f} />

        <Section title="Checks" count={f.sessions.length} empty="No Visus checks yet.">
          <div className="overflow-hidden rounded-[18px] border border-line bg-white">
            {f.sessions.map((s, i) => (
              <Link
                key={s.id}
                href={`/results/${s.id}`}
                onClick={() => setDoctorReturn(`/doctor/consults/${consultId}`)}
                className={cn("flex min-h-16 items-center gap-3.5 px-4 py-3 transition-colors hover:bg-card-hover", i > 0 && "border-t border-divider")}
              >
                <span className="flex w-[60px] flex-none flex-col text-[13px] text-muted">
                  <span className="text-[15px] font-semibold text-ink">{fmtShort(s.date)}</span>
                  {new Date(s.date).getFullYear()}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[15px] font-semibold">{s.headline}</span>
                  <span className="truncate text-[13px] text-muted">
                    {sessionTitle(s)} · {s.tests.length} {s.tests.length === 1 ? "test" : "tests"}
                    {s.shopName ? ` · At ${s.shopName}` : ""}
                  </span>
                </span>
                <StatusBadge status={s.status} className="hidden sm:flex" />
                <Icon name="chevronRight" size={16} className="flex-none text-faint" />
              </Link>
            ))}
          </div>
        </Section>

        <Section title="Prescriptions" count={f.prescriptions.length} empty="No prescriptions yet.">
          <div className="flex flex-col gap-3">
            {f.prescriptions.map((rx) => (
              <PrescriptionCard key={rx.id} rx={rx} compact />
            ))}
          </div>
        </Section>

        <Section title="Earlier consults" count={f.consults.length} empty="No other consults.">
          <div className="overflow-hidden rounded-[18px] border border-line bg-white">
            {f.consults.map((c, i) => (
              <Link key={c.id} href={`/doctor/consults/${c.id}`} className={cn("flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-card-hover", i > 0 && "border-t border-divider")}>
                <span className="w-[86px] flex-none text-[14px] font-semibold">{fmtDay(c.startsAt, now)}</span>
                <span className="min-w-0 flex-1 truncate text-[14px] text-ink-soft">{c.reason}</span>
                <StatusPill status={c.status} />
              </Link>
            ))}
          </div>
        </Section>
      </div>

      <aside className="flex flex-col gap-4 rounded-[20px] border border-line bg-white p-4 md:p-5 lg:sticky lg:top-6 lg:flex-[1_1_0]">
        <h2 className="m-0 text-[18px] font-bold">Patient</h2>
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[15px]">
          <dt className="text-muted">Age</dt>
          <dd className="m-0">{f.patient.age}</dd>
          {f.patient.gender && (
            <>
              <dt className="text-muted">Gender</dt>
              <dd className="m-0">{f.patient.gender}</dd>
            </>
          )}
          <dt className="text-muted">Glasses</dt>
          <dd className="m-0">{f.patient.wearsGlasses ? "Wears glasses" : "No glasses"}</dd>
          <dt className="text-muted">Health</dt>
          <dd className="m-0">{f.patient.healthConditions.length ? f.patient.healthConditions.join(", ") : "None noted"}</dd>
        </dl>
        {f.patient.glasses ? (
          <>
            <GlassesTable g={f.patient.glasses} />
            <span className="text-[13px] text-muted">Saved by the patient, {fmtFull(f.patient.glasses.updatedAt)}</span>
          </>
        ) : (
          <p className="m-0 text-[14px] text-muted">No glasses power saved.</p>
        )}
      </aside>
    </div>
  );
}

/** The AI summary always comes first and is always labelled; the rules write it when the AI is down. */
function Summary({ f }: { f: PatientFile }) {
  const s = f.summary;
  return (
    <section className="flex flex-col gap-3 rounded-[20px] bg-acc-soft p-4 md:p-5" aria-label="Summary">
      <span className="flex items-center gap-2 text-[14px] font-bold text-acc-ink">
        <Icon name="sparkle" size={18} strokeWidth={1.9} />
        {s.ai ? "AI summary, check the full records" : "Summary from the rules (AI unavailable), check the full records"}
      </span>
      <p className="m-0 text-[16px] leading-normal text-pretty">{s.text}</p>
      {s.points.length > 0 && (
        <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-[15px] leading-snug text-ink-soft">
          {s.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <span className="text-[12px] text-acc-ink/80">Screening, not diagnosis. Written {fmtShort(s.generatedAt)}.</span>
    </section>
  );
}

function Section({ title, count, empty, children }: { title: string; count: number; empty: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="m-0 text-[19px] font-bold tracking-[-0.01em]">
        {title} {count > 0 && <span className="font-semibold text-muted">· {count}</span>}
      </h2>
      {count === 0 ? <p className="m-0 text-[15px] text-muted">{empty}</p> : children}
    </section>
  );
}
