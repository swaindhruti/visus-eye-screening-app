"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { useShopReady } from "@/components/ShopShell";
import { ErrorState } from "@/components/States";
import { SkeletonCards } from "@/components/Skeleton";
import { languageName } from "@/lib/consults";
import { fmtShort } from "@/lib/dates";
import { addClinicDoctor, listClinicDoctors, removeClinicDoctor, type ClinicDoctor } from "@/services/clinic";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** S14: the clinic's doctors. Add one by Visus ID (they approve it), see their hours, remove them. */
export default function ShopDoctors() {
  const ready = useShopReady();
  const q = useQuery({ queryKey: ["shop-doctors"], queryFn: listClinicDoctors, enabled: ready });

  if (q.isError) return <ErrorState onRetry={() => q.refetch()} retrying={q.isFetching} />;
  const all = q.data ?? [];
  const active = all.filter((d) => d.status === "active");
  const pending = all.filter((d) => d.status === "pending");

  return (
    <Screen
      wide
      gap="gap-5 md:gap-7"
      eyebrow="Clinic"
      title="Doctors"
      actions={
        active.length > 0 ? (
          <Link href="/shop/consults/new" className="flex h-11 items-center gap-1.5 rounded-full bg-ink px-5 text-[15px] font-semibold text-white hover:bg-[#2a2a2a]">
            <Icon name="plusSm" size={18} strokeWidth={2.2} />
            Book consult
          </Link>
        ) : undefined
      }
    >
      <AddDoctor />

      {pending.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="m-0 text-[20px] font-bold tracking-[-0.01em]">Waiting for the doctor</h2>
          {pending.map((d) => (
            <DoctorCard key={d.linkId} d={d} />
          ))}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="m-0 text-[20px] font-bold tracking-[-0.01em]">Your doctors</h2>
        {q.isPending && <SkeletonCards label="Loading doctors…" />}
        {q.isSuccess && active.length === 0 && (
          <div className="flex flex-col items-center rounded-[20px] border border-line bg-white px-5 py-10 text-center">
            <Icon name="health" size={30} strokeWidth={1.8} />
            <h3 className="m-0 mt-4 text-[19px] font-bold">No doctors yet</h3>
            <p className="m-0 mt-1.5 max-w-[360px] text-[15px] text-muted text-pretty">Ask an eye doctor for their Visus ID and add it above. Once they approve, you can book consults in their hours.</p>
          </div>
        )}
        {active.map((d) => (
          <DoctorCard key={d.linkId} d={d} />
        ))}
      </section>
    </Screen>
  );
}

function AddDoctor() {
  const client = useQueryClient();
  const [id, setId] = useState("");
  const code = id.trim().toUpperCase();
  const m = useMutation({
    mutationFn: () => addClinicDoctor(code),
    onSuccess: () => {
      setId("");
      void client.invalidateQueries({ queryKey: ["shop-doctors"] });
    },
  });
  return (
    <form
      className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-4 md:p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.length >= 4 && !m.isPending) m.mutate();
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-[17px] font-bold">Add a doctor</span>
        <span className="text-[14px] text-muted text-pretty">Type the doctor&apos;s Visus ID, for example VIS-D-7K3Q. They see your request in their doctor portal and approve it.</span>
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          aria-label="Visus ID"
          value={id}
          onChange={(e) => {
            setId(e.target.value);
            m.reset();
          }}
          placeholder="VIS-D-…"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="h-12 flex-1 rounded-[14px] border border-line-strong bg-white px-4 font-mono text-[17px] uppercase tracking-[0.06em] outline-none placeholder:normal-case placeholder:tracking-normal focus:border-ink focus:shadow-[0_0_0_4px_rgba(17,17,17,.06)]"
        />
        <Button type="submit" disabled={code.length < 4 || m.isPending} className="h-12 px-6 text-[15px]!">
          {m.isPending ? "Adding…" : "Send request"}
        </Button>
      </div>
      {m.isError && <p className="m-0 text-[14px] text-doc">{m.error.message}</p>}
      {m.isSuccess && <p className="m-0 text-[14px] text-good">Request sent to {m.data.doctor.name}.</p>}
    </form>
  );
}

function DoctorCard({ d }: { d: ClinicDoctor }) {
  const client = useQueryClient();
  const [removing, setRemoving] = useState(false);
  const remove = useMutation({
    mutationFn: () => removeClinicDoctor(d.linkId),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["shop-doctors"] });
      void client.invalidateQueries({ queryKey: ["shop-consults"] });
    },
  });
  const hours = [...d.hours].sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
  const pending = d.status === "pending";

  return (
    <div className="flex flex-col gap-4 rounded-[20px] border border-line bg-white p-4 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <span className="flex min-w-0 flex-1 items-start gap-3.5">
          <span className="grid size-11 flex-none place-items-center rounded-full bg-acc-soft text-acc-ink">
            <Icon name="health" size={20} strokeWidth={1.8} />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[17px] font-semibold">{d.doctor.name}</span>
            <span className="text-[14px] text-muted">
              {d.doctor.specialty} · Reg. no. {d.doctor.registrationNo} (as typed, not verified)
            </span>
            <span className="text-[13px] text-muted">
              Speaks {d.doctor.languages.map(languageName).join(", ")} · <span className="font-mono">{d.doctor.visusId}</span>
            </span>
          </span>
        </span>
        {pending ? (
          <span className="flex h-[26px] items-center self-start rounded-full bg-mild-bg px-2.5 text-[13px] font-semibold text-mild md:self-center">Asked {fmtShort(d.createdAt)}</span>
        ) : (
          <span className="flex h-[26px] items-center gap-1.5 self-start rounded-full bg-good-bg px-2.5 text-[13px] font-semibold text-good md:self-center">
            <Icon name="check" size={14} strokeWidth={2.4} />
            Active
          </span>
        )}
      </div>

      {!pending && (
        <div className="flex flex-col gap-2 border-t border-divider pt-4">
          <span className="text-[15px] font-semibold">Weekly hours here</span>
          {hours.length === 0 ? (
            <p className="m-0 text-[14px] text-muted">No hours yet. The doctor sets them in their portal; until then you can&apos;t book them.</p>
          ) : (
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {hours.map((h) => (
                <li key={`${h.day}-${h.start}`} className="flex h-9 items-center rounded-full bg-pill px-3.5 text-[14px] font-semibold tabular-nums">
                  {DAYS[h.day]} {h.start}–{h.end}
                </li>
              ))}
            </ul>
          )}
          <span className="text-[13px] text-muted">India time. Set by the doctor.</span>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-divider pt-4 md:flex-row md:items-center">
        {removing ? (
          <div className="flex flex-1 flex-col gap-3 rounded-[14px] bg-doc-bg p-3.5 md:flex-row md:items-center">
            <span className="flex-1 text-[14px] text-doc">
              {pending ? `Take back the request to ${d.doctor.name}?` : `Remove ${d.doctor.name}? Their future consults here are cancelled.`}
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setRemoving(false)} className="h-10 rounded-[12px] border border-line-strong bg-white px-4 text-[14px] font-semibold hover:bg-card-hover">
                Keep
              </button>
              <button type="button" disabled={remove.isPending} onClick={() => remove.mutate()} className="h-10 rounded-[12px] bg-doc px-4 text-[14px] font-semibold text-white disabled:opacity-50">
                {remove.isPending ? "Removing…" : pending ? "Take back" : "Remove doctor"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <button type="button" onClick={() => setRemoving(true)} className="h-10 self-start text-[14px] font-semibold text-doc underline-offset-4 hover:underline md:self-center">
              {pending ? "Take back the request" : "Remove this doctor"}
            </button>
            <span className="flex-1" />
            {!pending && hours.length > 0 && (
              <Link href={`/shop/consults/new?doctor=${d.doctor.id}`} className="flex h-11 items-center gap-1.5 self-start rounded-[12px] border border-line-strong bg-white px-4 text-[15px] font-semibold transition-colors hover:bg-card-hover">
                <Icon name="calendar" size={16} strokeWidth={2} />
                Book with {d.doctor.name.replace(/^Dr\.? /, "Dr ")}
              </Link>
            )}
          </>
        )}
        {remove.isError && <p className="m-0 text-[14px] text-doc">{remove.error.message}</p>}
      </div>
    </div>
  );
}
