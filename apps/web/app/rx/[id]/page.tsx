"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";

import { Icon } from "@/components/Icon";
import { PrescriptionCard } from "@/components/PrescriptionCard";
import { ErrorState, LoadingState } from "@/components/States";
import { getPrescription } from "@/services/consults";

/** Print view of a consult's prescription (`/rx/<consultId>`): the browser's print, or Save as PDF. */
export default function PrintPrescription() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const q = useQuery({ queryKey: ["rx", id, "print"], queryFn: () => getPrescription(id) });

  if (q.isError) return <ErrorState title="Couldn't open the prescription" body={q.error.message} onRetry={() => q.refetch()} />;
  if (q.isPending) return <LoadingState />;
  if (!q.data) return <ErrorState title="No prescription yet" body="The doctor hasn't saved a prescription for this consult." />;
  const rx = q.data;

  return (
    <main className="min-h-dvh bg-white text-ink print:min-h-0">
      <div className="mx-auto flex max-w-[760px] flex-col gap-5 px-5 py-6 print:max-w-none print:p-0">
        <div className="flex gap-2 print:hidden">
          <button type="button" onClick={() => router.back()} className="flex h-11 items-center gap-1.5 rounded-full border border-line-strong px-4 text-[15px] font-semibold hover:bg-card-hover">
            <Icon name="chevronLeft" size={18} />
            Back
          </button>
          <span className="flex-1" />
          <button type="button" onClick={() => window.print()} className="flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[15px] font-semibold text-white">
            <Icon name="download" size={18} />
            Print or save as PDF
          </button>
        </div>
        <header className="flex items-end justify-between border-b-2 border-ink pb-3">
          <div className="flex flex-col">
            <span className="text-[26px] font-bold tracking-[-0.01em]">Visus</span>
            <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Remote eye consult · Prescription</span>
          </div>
          <span className="text-right text-[14px] text-ink-soft">
            {rx.clinic.name}
            <br />
            {rx.clinic.city}
          </span>
        </header>
        <PrescriptionCard rx={rx} translatedFirst={!!rx.translated} />
        <p className="m-0 text-[12px] leading-normal text-muted">
          Written by {rx.doctor.name} on a Visus video consult. The registration number is shown as the doctor typed it and is not verified by Visus. Visus checks are a screening, not a
          diagnosis.
        </p>
      </div>
    </main>
  );
}
