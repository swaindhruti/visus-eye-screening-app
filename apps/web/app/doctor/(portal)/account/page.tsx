"use client";

import { LANGUAGE_OPTIONS, type Language } from "@visus/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { useDoctorReady } from "@/components/DoctorShell";
import { TextField } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { ErrorState } from "@/components/States";
import { SkeletonPage } from "@/components/Skeleton";
import { getDoctor, updateDoctor, type DoctorAccount } from "@/services/doctor";

/** R8: the doctor's Visus ID (with Copy), their details (editable) and their login. */
export default function DoctorAccountPage() {
  const ready = useDoctorReady();
  const q = useQuery({ queryKey: ["doctor-account"], queryFn: getDoctor, enabled: ready });

  if (q.isError) return <ErrorState title="Couldn't open your account" body={q.error.message} onRetry={() => q.refetch()} retrying={q.isFetching} />;
  const a = q.data;

  return (
    <Screen wide gap="gap-5 md:gap-7" eyebrow="Doctor portal" title="Account">
      {!a ? (
        <SkeletonPage label="Loading your account…" />
      ) : (
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-6">
          <DoctorForm a={a} />
          <aside className="flex min-w-0 flex-col gap-4 md:flex-[2_1_0]">
            <VisusId id={a.visusId} />
            <section className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-[18px]">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-full bg-fill">
                  <Icon name="lock" size={16} />
                </span>
                <h2 className="m-0 text-[17px] font-bold">Login</h2>
              </div>
              <dl className="m-0 flex flex-col gap-0.5 text-[15px]">
                <dt className="text-[13px] font-semibold text-muted">Phone or email</dt>
                <dd className="m-0 break-words font-semibold">{a.identifier}</dd>
              </dl>
            </section>
          </aside>
        </div>
      )}
    </Screen>
  );
}

function VisusId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <section className="flex flex-col gap-3 rounded-[20px] bg-ink p-[18px] text-white">
      <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/70">Your Visus ID</span>
      <span className="font-mono text-[32px] font-bold tracking-[0.06em]" aria-label={`Visus ID ${id.split("").join(" ")}`}>
        {id}
      </span>
      <span className="text-[14px] text-white/75 text-pretty">Clinics add you with this ID. You approve each request in Clinics.</span>
      <button
        type="button"
        onClick={() =>
          navigator.clipboard
            ?.writeText(id)
            .then(() => setCopied(true))
            .catch(() => {})
        }
        className="flex h-10 items-center gap-2 self-start rounded-full bg-white px-4 text-[14px] font-semibold text-ink hover:bg-[#F4F4F1]"
      >
        <Icon name={copied ? "check" : "doc"} size={16} strokeWidth={2} />
        {copied ? "Copied" : "Copy ID"}
      </button>
    </section>
  );
}

/** Name, specialty, registration number and languages, saved with PATCH /doctor. */
function DoctorForm({ a }: { a: DoctorAccount }) {
  const client = useQueryClient();
  const [name, setName] = useState(a.name);
  const [specialty, setSpecialty] = useState(a.specialty);
  const [registrationNo, setRegistrationNo] = useState(a.registrationNo);
  const [languages, setLanguages] = useState<Language[]>(a.languages);
  const ordered = LANGUAGE_OPTIONS.map((o) => o.code).filter((c) => languages.includes(c));
  const changed = name.trim() !== a.name || specialty.trim() !== a.specialty || registrationNo.trim() !== a.registrationNo || ordered.join() !== a.languages.join();
  const ok = name.trim() && specialty.trim() && registrationNo.trim() && languages.length > 0 && changed;
  const m = useMutation({
    mutationFn: () => updateDoctor({ name: name.trim(), specialty: specialty.trim(), registrationNo: registrationNo.trim(), languages: ordered }),
    onSuccess: (next) => {
      client.setQueryData(["doctor-account"], next);
      // The sidebar shows the doctor's name from the login.
      void client.invalidateQueries({ queryKey: ["me"] });
    },
  });
  const toggle = (l: Language) => setLanguages((ls) => (ls.includes(l) ? ls.filter((x) => x !== l) : [...ls, l]));

  return (
    <form
      className="flex min-w-0 flex-col gap-4 rounded-[20px] border border-line bg-white p-[18px] md:flex-[3_1_0] md:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (ok && !m.isPending) m.mutate();
      }}
    >
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-full bg-fill">
          <Icon name="profile" size={18} />
        </span>
        <h2 className="m-0 text-[17px] font-bold">Your details</h2>
      </div>
      <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
        <TextField label="Registration number" value={registrationNo} onChange={(e) => setRegistrationNo(e.target.value)} />
      </div>
      <p className="m-0 text-[14px] text-muted">Your name and registration number are printed on calls and prescriptions exactly as typed. They are not verified in this demo.</p>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 text-[15px] font-semibold">Languages you speak</legend>
        <div className="flex flex-wrap gap-2">
          {LANGUAGE_OPTIONS.map((o) => (
            <Chip key={o.code} label={o.name} selected={languages.includes(o.code)} onClick={() => toggle(o.code)} />
          ))}
        </div>
        <span className="text-[13px] text-muted">Captions are translated into the first one, {ordered[0] ? LANGUAGE_OPTIONS.find((o) => o.code === ordered[0])?.name : "—"}.</span>
      </fieldset>
      {m.isError && <p className="m-0 text-[14px] text-doc">{m.error.message}</p>}
      <Button type="submit" disabled={!ok || m.isPending} className="h-12 self-start px-6 text-[15px]">
        {m.isPending ? "Saving…" : m.isSuccess && !changed ? "Saved" : "Save changes"}
      </Button>
    </form>
  );
}
