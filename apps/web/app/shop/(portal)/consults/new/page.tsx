"use client";

import { LANGUAGE_OPTIONS, type JoinFrom, type Language } from "@visus/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";

import { Chip, Segmented } from "@/components/Chip";
import { cn } from "@/components/cn";
import { CalendarLinks } from "@/components/ConsultRow";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useShopReady } from "@/components/ShopShell";
import { ErrorState, LoadingState } from "@/components/States";
import { fmtTime, JOIN_FROM_LABEL, languageName, useNow } from "@/lib/consults";
import { bookConsult, listClinicDoctors, listSlots, updateConsult, type ClinicDoctor, type ConsultSummary } from "@/services/clinic";
import { getConsult } from "@/services/consults";
import { listPatients, type ShopPatient } from "@/services/shops";

const WHERE: JoinFrom[] = ["home", "clinic"];
const DAYS_AHEAD = 21;
const FIELD = "w-full rounded-[14px] border border-line-strong bg-white px-3.5 text-[16px] outline-none focus:border-ink focus:shadow-[0_0_0_4px_rgba(17,17,17,.06)]";

/** "2026-11-24" in local time. */
const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** The next days this doctor works at this clinic (from their weekly hours). */
function workDays(d: ClinicDoctor | undefined, today: Date) {
  if (!d) return [];
  const days = new Set(d.hours.map((h) => h.day));
  return Array.from({ length: DAYS_AHEAD }, (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)).filter((x) => days.has(x.getDay()));
}

/**
 * S16: book a consult: a linked patient → an active doctor → a date → a free 15-minute slot → from
 * home or at the clinic → reason and the patient's language. `?patient=` and `?doctor=` pick those;
 * `?move=<consultId>` moves or cancels a booked one instead.
 */
export default function BookConsultPage() {
  return (
    <Suspense fallback={null}>
      <BookOrMove />
    </Suspense>
  );
}

function BookOrMove() {
  const move = useSearchParams().get("move");
  return move ? <Move id={move} /> : <Book />;
}

function Book() {
  const client = useQueryClient();
  const ready = useShopReady();
  const params = useSearchParams();
  const patients = useQuery({ queryKey: ["shop-patients", ""], queryFn: () => listPatients(""), enabled: ready });
  const doctors = useQuery({ queryKey: ["shop-doctors"], queryFn: listClinicDoctors, enabled: ready });
  const [today] = useState(() => new Date());

  const [patientId, setPatientId] = useState(params.get("patient") ?? "");
  const [doctorId, setDoctorId] = useState(params.get("doctor") ?? "");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [where, setWhere] = useState<JoinFrom>("clinic");
  const [reason, setReason] = useState("");
  const [language, setLanguage] = useState<Language>("hi");

  const linked = (patients.data ?? []).filter((p) => p.linkStatus === "approved");
  const unlinked = (patients.data ?? []).filter((p) => p.linkStatus !== "approved");
  const bookable = (doctors.data ?? []).filter((d) => d.status === "active" && d.hours.length > 0);
  const patient = linked.find((p) => p.id === patientId);
  const doctor = bookable.find((d) => d.doctor.id === doctorId);
  const days = workDays(doctor, today);
  const day = date || (days[0] ? isoDate(days[0]) : "");

  const book = useMutation({
    mutationFn: () => bookConsult({ patientId, doctorId, startsAt: slot, joinFrom: where, reason: reason.trim(), language }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["shop-consults"] });
      void client.invalidateQueries({ queryKey: ["shop-patient-consults"] });
    },
  });
  const ok = patient && doctor && slot && reason.trim().length > 0;

  if (patients.isError || doctors.isError) return <ErrorState onRetry={() => (patients.refetch(), doctors.refetch())} />;
  if (book.isSuccess) return <Booked c={book.data} />;

  return (
    <Screen gap="gap-0">
      <ScreenHeader title="Book consult" fallback="/shop/consults" />
      <form
        className="mt-5 flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (ok && !book.isPending) book.mutate();
        }}
      >
        <Step n={1} label="Patient">
          {patients.isPending ? (
            <p className="m-0 text-[15px] text-muted">Loading patients…</p>
          ) : (
            <select aria-label="Patient" value={patient ? patientId : ""} onChange={(e) => setPatientId(e.target.value)} className={cn(FIELD, "h-12")}>
              <option value="" disabled>
                Pick a linked patient
              </option>
              {linked.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}, {p.age}
                  {p.phone ? ` · ${p.phone}` : ""}
                </option>
              ))}
            </select>
          )}
          {unlinked.length > 0 && (
            <p className="m-0 text-[14px] text-muted text-pretty">
              Only patients linked to their Visus account can have a consult (they join and see the prescription there). Not linked yet: {unlinked.map((p: ShopPatient) => p.name).join(", ")}.
            </p>
          )}
        </Step>

        <Step n={2} label="Doctor">
          {doctors.isPending ? (
            <p className="m-0 text-[15px] text-muted">Loading doctors…</p>
          ) : bookable.length === 0 ? (
            <p className="m-0 text-[15px] text-muted">
              No doctor with weekly hours yet.{" "}
              <Link href="/shop/doctors" className="font-semibold text-ink underline underline-offset-4">
                Add a doctor
              </Link>
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {bookable.map((d) => (
                <button
                  key={d.linkId}
                  type="button"
                  aria-pressed={d.doctor.id === doctorId}
                  onClick={() => {
                    setDoctorId(d.doctor.id);
                    setDate("");
                    setSlot("");
                  }}
                  className={cn(
                    "flex min-h-[64px] flex-col items-start justify-center gap-0.5 rounded-[16px] border px-4 py-2.5 text-left transition-colors",
                    d.doctor.id === doctorId ? "border-ink bg-ink text-white" : "border-line bg-white hover:bg-card-hover",
                  )}
                >
                  <span className="text-[16px] font-semibold">{d.doctor.name}</span>
                  <span className={cn("text-[13px]", d.doctor.id === doctorId ? "text-white/75" : "text-muted")}>
                    {d.doctor.specialty} · speaks {d.doctor.languages.map(languageName).join(", ")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Step>

        {doctor && (
          <Step n={3} label="Date and time">
            <SlotPicker doctor={doctor} days={days} day={day} onDay={(d) => (setDate(d), setSlot(""))} slot={slot} onSlot={setSlot} />
          </Step>
        )}

        <Step n={4} label="Where the patient joins">
          <Segmented options={WHERE.map((w) => JOIN_FROM_LABEL[w])} value={WHERE.indexOf(where)} onChange={(i) => setWhere(WHERE[i])} className="sm:max-w-[360px]" />
          <p className="m-0 text-[14px] text-muted">{where === "clinic" ? "The patient sits at your clinic and you join the call from this laptop." : "The patient joins from the Visus app or website at home."} Both still work on the day.</p>
        </Step>

        <Step n={5} label="Reason and language">
          <textarea
            aria-label="Reason for the consult"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 500))}
            placeholder="e.g. Blurry reading for three months; the Amsler grid showed a change in the left eye."
            rows={3}
            className={cn(FIELD, "resize-y py-3")}
          />
          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-semibold text-ink-soft">The patient&apos;s language (captions and the prescription)</span>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((o) => (
                <Chip key={o.code} compact label={o.name} selected={language === o.code} onClick={() => setLanguage(o.code)} />
              ))}
            </div>
            {doctor && !doctor.doctor.languages.includes(language) && (
              <p className="m-0 text-[14px] text-mild">{doctor.doctor.name} doesn&apos;t speak {languageName(language)}. Live captions translate for both sides.</p>
            )}
          </div>
        </Step>

        {patient && doctor && (
          <p className="m-0 flex gap-2.5 rounded-[16px] bg-fill px-4 py-3 text-[14px] leading-normal text-ink-soft text-pretty">
            <Icon name="shield" size={18} className="mt-0.5 flex-none" />
            Booking shares {patient.name}&apos;s eye records (checks, results, glasses and earlier prescriptions) with {doctor.doctor.name} for this consult.
          </p>
        )}
        {book.isError && <p className="m-0 text-[14px] text-doc">{book.error.message}</p>}
        <button type="submit" disabled={!ok || book.isPending} className="flex h-14 items-center justify-center rounded-[16px] bg-ink px-6 text-[16px] font-semibold text-white disabled:opacity-35">
          {book.isPending ? "Booking…" : slot ? `Book for ${new Date(slot).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}, ${fmtTime(slot)}` : "Book consult"}
        </button>
      </form>
    </Screen>
  );
}

/** The doctor's working days here (next three weeks), then that day's free 15-minute slots. */
function SlotPicker({ doctor, days, day, onDay, slot, onSlot }: { doctor: ClinicDoctor; days: Date[]; day: string; onDay: (d: string) => void; slot: string; onSlot: (s: string) => void }) {
  const ready = useShopReady();
  const slots = useQuery({ queryKey: ["slots", doctor.doctor.id, day], queryFn: () => listSlots(doctor.doctor.id, day), enabled: ready && !!day, staleTime: 0 });
  return (
    <>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Day">
        {days.map((d) => {
          const v = isoDate(d);
          const on = v === day;
          return (
            <button
              key={v}
              type="button"
              aria-pressed={on}
              onClick={() => onDay(v)}
              className={cn("flex h-[64px] w-[64px] flex-none flex-col items-center justify-center rounded-[14px] border leading-tight transition-colors", on ? "border-ink bg-ink text-white" : "border-line bg-white hover:bg-card-hover")}
            >
              <span className={cn("text-[12px] font-semibold", on ? "text-white/75" : "text-muted")}>{d.toLocaleDateString("en-GB", { weekday: "short" })}</span>
              <span className="text-[19px] font-bold">{d.getDate()}</span>
              <span className={cn("text-[11px] font-semibold", on ? "text-white/75" : "text-muted")}>{d.toLocaleDateString("en-GB", { month: "short" })}</span>
            </button>
          );
        })}
      </div>
      {slots.isPending ? (
        <p className="m-0 text-[15px] text-muted">Finding free times…</p>
      ) : slots.isError ? (
        <p className="m-0 text-[14px] text-doc">{slots.error.message}</p>
      ) : slots.data.length === 0 ? (
        <p className="m-0 text-[15px] text-muted">No free slots that day. Pick another day.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="group" aria-label="Time">
          {slots.data.map((s) => (
            <Chip key={s.startsAt} compact label={fmtTime(s.startsAt)} selected={s.startsAt === slot} onClick={() => onSlot(s.startsAt)} />
          ))}
        </div>
      )}
      <span className="text-[13px] text-muted">15-minute consults in {doctor.doctor.name}&apos;s hours here, India time.</span>
    </>
  );
}

function Booked({ c }: { c: ConsultSummary }) {
  return (
    <Screen gap="gap-5">
      <ScreenHeader title="" fallback="/shop/consults" />
      <div className="flex flex-col items-center gap-3 pt-4 text-center">
        <span className="grid size-[72px] place-items-center rounded-full bg-good-bg text-good">
          <Icon name="checkLg" size={34} strokeWidth={2.2} />
        </span>
        <h1 className="m-0 text-[28px] font-bold tracking-[-0.02em]">Consult booked</h1>
        <p className="m-0 max-w-[420px] text-[16px] text-muted text-pretty">
          {c.patient.name} with {c.doctor.name}, {new Date(c.startsAt).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} at {fmtTime(c.startsAt)}. {JOIN_FROM_LABEL[c.joinFrom]}. The patient and the doctor see it in their apps.
        </p>
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-[14px] font-semibold text-ink-soft">Add to your calendar (reminders 1 hour and 10 minutes before)</span>
        <CalendarLinks c={c} className="justify-center" />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link href="/shop/consults" className="flex h-12 items-center justify-center rounded-[14px] bg-ink px-6 text-[16px] font-semibold text-white">
          All consults
        </Link>
        <Link href="/shop/consults/new" className="flex h-12 items-center justify-center rounded-[14px] border border-line-strong bg-white px-6 text-[16px] font-semibold hover:bg-card-hover">
          Book another
        </Link>
      </div>
    </Screen>
  );
}

/** Move a booked consult to another free slot, change where the patient joins, or cancel it. */
function Move({ id }: { id: string }) {
  const router = useRouter();
  const client = useQueryClient();
  const ready = useShopReady();
  const q = useQuery({ queryKey: ["consult", id], queryFn: () => getConsult(id), enabled: ready });
  const doctors = useQuery({ queryKey: ["shop-doctors"], queryFn: listClinicDoctors, enabled: ready });
  const [today] = useState(() => new Date());
  const now = useNow();
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [where, setWhere] = useState<JoinFrom | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const done = () => {
    void client.invalidateQueries({ queryKey: ["shop-consults"] });
    void client.invalidateQueries({ queryKey: ["shop-patient-consults"] });
    void client.invalidateQueries({ queryKey: ["consult", id] });
    router.replace("/shop/consults");
  };
  const save = useMutation({ mutationFn: (change: Parameters<typeof updateConsult>[1]) => updateConsult(id, change), onSuccess: done });

  if (q.isError) return <ErrorState title="Couldn't open this consult" body={q.error.message} onRetry={() => q.refetch()} />;
  const c = q.data;
  if (!c || doctors.isPending) return <LoadingState label="Opening the consult…" />;
  const doctor = doctors.data?.find((d) => d.doctor.id === c.doctor.id && d.status === "active");
  const days = workDays(doctor, today);
  const day = date || (days.find((d) => isoDate(d) === isoDate(new Date(c.startsAt))) ? isoDate(new Date(c.startsAt)) : days[0] ? isoDate(days[0]) : "");
  const joinFrom = where ?? c.joinFrom;
  const changed = !!slot || joinFrom !== c.joinFrom;
  const open = c.status === "scheduled" && !!now && Date.parse(c.startsAt) > now;

  return (
    <Screen gap="gap-0">
      <ScreenHeader title="Move or cancel" fallback="/shop/consults" />
      <div className="mt-5 flex flex-col gap-6">
        <div className="flex flex-col gap-1 rounded-[20px] border border-line bg-white p-4">
          <span className="text-[17px] font-semibold">
            {c.patient.name} with {c.doctor.name}
          </span>
          <span className="text-[15px] text-ink-soft">
            Now: {new Date(c.startsAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}, {fmtTime(c.startsAt)} · {JOIN_FROM_LABEL[c.joinFrom]}
          </span>
          <span className="line-clamp-2 text-[14px] text-muted">{c.reason}</span>
        </div>

        {!open ? (
          <p className="m-0 text-[15px] text-muted">This consult has started or ended, so it can&apos;t be changed.</p>
        ) : (
          <>
            <Step n={1} label="New date and time (optional)">
              {doctor ? <SlotPicker doctor={doctor} days={days} day={day} onDay={(d) => (setDate(d), setSlot(""))} slot={slot} onSlot={setSlot} /> : <p className="m-0 text-[15px] text-muted">{c.doctor.name} is no longer active at your clinic.</p>}
            </Step>
            <Step n={2} label="Where the patient joins">
              <Segmented options={WHERE.map((w) => JOIN_FROM_LABEL[w])} value={WHERE.indexOf(joinFrom)} onChange={(i) => setWhere(WHERE[i])} className="sm:max-w-[360px]" />
            </Step>
            {save.isError && <p className="m-0 text-[14px] text-doc">{save.error.message}</p>}
            <button
              type="button"
              disabled={!changed || save.isPending}
              onClick={() => save.mutate({ ...(slot ? { startsAt: slot } : {}), ...(joinFrom !== c.joinFrom ? { joinFrom } : {}) })}
              className="flex h-14 items-center justify-center rounded-[16px] bg-ink px-6 text-[16px] font-semibold text-white disabled:opacity-35"
            >
              {save.isPending && !cancelling ? "Saving…" : slot ? `Move to ${new Date(slot).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}, ${fmtTime(slot)}` : "Save changes"}
            </button>
            {cancelling ? (
              <div className="flex flex-col gap-3 rounded-[14px] bg-doc-bg p-3.5 md:flex-row md:items-center">
                <span className="flex-1 text-[14px] text-doc">Cancel this consult? The patient and {c.doctor.name} see it as cancelled.</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setCancelling(false)} className="h-10 rounded-[12px] border border-line-strong bg-white px-4 text-[14px] font-semibold hover:bg-card-hover">
                    Keep it
                  </button>
                  <button type="button" disabled={save.isPending} onClick={() => save.mutate({ status: "cancelled" })} className="h-10 rounded-[12px] bg-doc px-4 text-[14px] font-semibold text-white disabled:opacity-50">
                    {save.isPending ? "Cancelling…" : "Cancel consult"}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setCancelling(true)} className="h-11 self-center text-[15px] font-semibold text-doc underline-offset-4 hover:underline">
                Cancel this consult
              </button>
            )}
          </>
        )}
      </div>
    </Screen>
  );
}

function Step({ n, label, children }: { n: number; label: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
      <legend className="mb-2.5 flex items-center gap-2 p-0 text-[15px] font-semibold">
        <span className="grid size-6 place-items-center rounded-full bg-ink text-[12px] font-bold text-white">{n}</span>
        {label}
      </legend>
      {children}
    </fieldset>
  );
}
