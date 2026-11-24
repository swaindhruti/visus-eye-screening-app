"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/Button";
import { cn } from "@/components/cn";
import { useDoctorReady } from "@/components/DoctorShell";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { ErrorState } from "@/components/States";
import { SkeletonCards } from "@/components/Skeleton";
import { fmtShort } from "@/lib/dates";
import { answerClinic, leaveClinic, listDoctorClinics, setClinicHours, type DoctorClinic, type HoursBlock } from "@/services/doctor";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** Consults are booked in 15-minute slots, so hours go in 15-minute steps. */
const STEP_SECONDS = 15 * 60;

/** R4: clinic requests (approve / decline) and the clinics the doctor works with (weekly hours, leave). */
export default function DoctorClinics() {
  const ready = useDoctorReady();
  const q = useQuery({ queryKey: ["doctor-clinics"], queryFn: listDoctorClinics, enabled: ready });

  if (q.isError) return <ErrorState onRetry={() => q.refetch()} retrying={q.isFetching} />;
  const requests = (q.data ?? []).filter((l) => l.status === "pending");
  const clinics = (q.data ?? []).filter((l) => l.status === "active");

  return (
    <Screen wide gap="gap-5 md:gap-7" eyebrow="Doctor portal" title="Clinics">
      {requests.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="m-0 text-[20px] font-bold tracking-[-0.01em]">Requests</h2>
          {requests.map((l) => (
            <RequestCard key={l.linkId} link={l} />
          ))}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="m-0 text-[20px] font-bold tracking-[-0.01em]">Your clinics</h2>
        <p className="m-0 text-[15px] leading-normal text-muted text-pretty">
          Clinics book 15-minute consults inside your weekly hours. Times are India time. A clinic adds you with your Visus ID, shown in Account.
        </p>
        {q.isPending && <SkeletonCards label="Loading clinics…" />}
        {q.isSuccess && clinics.length === 0 && (
          <div className="flex flex-col items-center rounded-[20px] border border-line bg-white px-5 py-10 text-center">
            <Icon name="store" size={30} strokeWidth={1.8} />
            <h3 className="m-0 mt-4 text-[19px] font-bold">No clinics yet</h3>
            <p className="m-0 mt-1.5 max-w-[340px] text-[15px] text-muted text-pretty">Share your Visus ID with a clinic. Their request shows up here.</p>
          </div>
        )}
        {clinics.map((l) => (
          <ClinicCard key={l.linkId} link={l} />
        ))}
      </section>
    </Screen>
  );
}

function ClinicName({ link }: { link: DoctorClinic }) {
  return (
    <span className="flex min-w-0 flex-1 items-start gap-3.5">
      <span className="grid size-11 flex-none place-items-center rounded-full bg-acc-soft text-acc-ink">
        <Icon name="store" size={20} strokeWidth={1.8} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[17px] font-semibold">{link.clinic.name}</span>
        <span className="text-[14px] text-muted">
          {[link.clinic.address, link.clinic.city].filter(Boolean).join(", ")}
        </span>
      </span>
    </span>
  );
}

function RequestCard({ link }: { link: DoctorClinic }) {
  const client = useQueryClient();
  const m = useMutation({
    mutationFn: (approve: boolean) => answerClinic(link.linkId, approve),
    onSuccess: () => client.invalidateQueries({ queryKey: ["doctor-clinics"] }),
  });
  return (
    <div className="flex flex-col gap-4 rounded-[20px] border border-acc/40 bg-white p-4 md:flex-row md:items-center md:p-5">
      <ClinicName link={link} />
      <span className="text-[13px] text-muted md:text-right">Asked {fmtShort(link.createdAt)}</span>
      <div className="flex gap-2">
        <Button variant="secondary" className="h-11 flex-1 px-5 text-[15px]! md:flex-none" disabled={m.isPending} onClick={() => m.mutate(false)}>
          Decline
        </Button>
        <Button className="h-11 flex-1 px-5 text-[15px]! md:flex-none" disabled={m.isPending} onClick={() => m.mutate(true)}>
          {m.isPending && m.variables ? "Approving…" : "Approve"}
        </Button>
      </div>
      {m.isError && <p className="m-0 text-[14px] text-doc">{m.error.message}</p>}
    </div>
  );
}

const byTime = (a: HoursBlock, b: HoursBlock) => a.day - b.day || a.start.localeCompare(b.start);
const overlaps = (a: HoursBlock, b: HoursBlock) => a.day === b.day && a.start < b.end && b.start < a.end;

function ClinicCard({ link }: { link: DoctorClinic }) {
  const client = useQueryClient();
  const [hours, setHours] = useState<HoursBlock[]>(() => [...link.hours].sort(byTime));
  const [draft, setDraft] = useState<HoursBlock>({ day: 1, start: "16:00", end: "18:00" });
  const [leaving, setLeaving] = useState(false);
  const dirty = JSON.stringify(hours) !== JSON.stringify([...link.hours].sort(byTime));
  const problem = draft.end <= draft.start ? "The end must be after the start." : hours.some((h) => overlaps(h, draft)) ? "That overlaps hours you already have that day." : hours.length >= 21 ? "That's the most blocks you can add." : null;

  const refresh = () => client.invalidateQueries({ queryKey: ["doctor-clinics"] });
  const save = useMutation({ mutationFn: () => setClinicHours(link.linkId, hours), onSuccess: refresh });
  const leave = useMutation({
    mutationFn: () => leaveClinic(link.linkId),
    onSuccess: () => {
      refresh();
      client.invalidateQueries({ queryKey: ["doctor-consults"] });
    },
  });

  return (
    <div className="flex flex-col gap-4 rounded-[20px] border border-line bg-white p-4 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <ClinicName link={link} />
        <span className="flex h-[26px] items-center gap-1.5 self-start rounded-full bg-good-bg px-2.5 text-[13px] font-semibold text-good md:self-center">
          <Icon name="check" size={14} strokeWidth={2.4} />
          Active
        </span>
      </div>

      <div className="flex flex-col gap-2.5 border-t border-divider pt-4">
        <span className="text-[15px] font-semibold">Weekly hours</span>
        {hours.length === 0 ? (
          <p className="m-0 text-[14px] text-muted">No hours yet: the clinic can&apos;t book you until you add some.</p>
        ) : (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {hours.map((h) => (
              <li key={`${h.day}-${h.start}`} className="flex h-10 items-center gap-1 rounded-full bg-pill pl-3.5 pr-1 text-[14px] font-semibold tabular-nums">
                {DAYS[h.day]} {h.start}–{h.end}
                <button
                  type="button"
                  aria-label={`Remove ${DAYS[h.day]} ${h.start} to ${h.end}`}
                  onClick={() => setHours(hours.filter((x) => x !== h))}
                  className="grid size-8 place-items-center rounded-full text-muted hover:bg-white hover:text-ink"
                >
                  <Icon name="close" size={14} strokeWidth={2.2} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-1 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
            Day
            <select value={draft.day} onChange={(e) => setDraft({ ...draft, day: +e.target.value })} className={FIELD}>
              {DAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
            From
            <input type="time" step={STEP_SECONDS} value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} className={FIELD} />
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
            To
            <input type="time" step={STEP_SECONDS} value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} className={FIELD} />
          </label>
          <button
            type="button"
            disabled={!!problem}
            onClick={() => {
              setHours([...hours, draft].sort(byTime));
              // Ready for the next block: same times, the next day.
              setDraft({ ...draft, day: (draft.day + 1) % 7 });
            }}
            className="flex h-11 items-center gap-1.5 rounded-[12px] border border-line-strong bg-white px-4 text-[15px] font-semibold transition-colors hover:bg-card-hover disabled:opacity-40"
          >
            <Icon name="plusSm" size={16} strokeWidth={2.2} />
            Add
          </button>
        </div>
        {problem && hours.length > 0 && <p className="m-0 text-[13px] text-muted">{problem}</p>}
      </div>

      <div className="flex flex-col gap-3 border-t border-divider pt-4 md:flex-row md:items-center">
        {leaving ? (
          <div className="flex flex-1 flex-col gap-3 rounded-[14px] bg-doc-bg p-3.5 md:flex-row md:items-center">
            <span className="flex-1 text-[14px] text-doc">Leave {link.clinic.name}? Your future consults there are cancelled.</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setLeaving(false)} className="h-10 rounded-[12px] border border-line-strong bg-white px-4 text-[14px] font-semibold hover:bg-card-hover">
                Stay
              </button>
              <button type="button" disabled={leave.isPending} onClick={() => leave.mutate()} className="h-10 rounded-[12px] bg-doc px-4 text-[14px] font-semibold text-white disabled:opacity-50">
                {leave.isPending ? "Leaving…" : "Leave clinic"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <button type="button" onClick={() => setLeaving(true)} className="h-10 self-start text-[14px] font-semibold text-doc underline-offset-4 hover:underline md:self-center">
              Leave this clinic
            </button>
            <span className="flex-1" />
            {save.isError && <span className="text-[14px] text-doc">{save.error.message}</span>}
            {save.isSuccess && !dirty && <span className="text-[14px] text-good">Hours saved</span>}
            <Button className={cn("h-11 px-6 text-[15px]!", !dirty && "invisible")} disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Saving…" : "Save hours"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

const FIELD = "h-11 rounded-[12px] border border-line-strong bg-white px-3 text-[15px] font-medium text-ink outline-none focus:border-ink";
