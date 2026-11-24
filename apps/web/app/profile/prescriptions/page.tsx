"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Icon } from "@/components/Icon";
import { PrescriptionCard } from "@/components/PrescriptionCard";
import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ErrorState } from "@/components/States";
import { listMyPrescriptions } from "@/services/consults";

/** C4: every prescription from this account's consults, newest first, in the patient's language with "Show original". */
export default function MyPrescriptions() {
  const q = useQuery({ queryKey: ["my-prescriptions"], queryFn: listMyPrescriptions });
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} retrying={q.isFetching} />;
  const list = q.data ?? [];

  return (
    <Screen gap="gap-4">
      <ScreenHeader title="Prescriptions" fallback="/profile" />
      {q.isPending && <p className="m-0 text-[15px] text-muted">Loading prescriptions…</p>}
      {q.isSuccess && list.length === 0 && (
        <div className="flex flex-col items-center px-3 py-12 text-center">
          <span className="grid size-[72px] place-items-center rounded-full border border-line bg-white">
            <Icon name="doc" size={30} strokeWidth={1.8} />
          </span>
          <h1 className="m-0 mt-5 text-[22px] font-bold tracking-[-0.02em]">No prescriptions yet</h1>
          <p className="m-0 mt-2 max-w-[340px] text-[16px] leading-normal text-muted text-pretty">After a video consult, the doctor&apos;s prescription shows up here.</p>
        </div>
      )}
      {list.map((rx, i) => (
        <PrescriptionCard
          key={rx.id}
          rx={rx}
          compact={i > 0}
          translatedFirst
          footer={
            <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-divider pt-3">
              <Link href={`/consults/${rx.consultId}`} className="flex items-center gap-1.5 text-[14px] font-semibold text-ink-soft hover:text-ink">
                <Icon name="calendar" size={16} />
                The consult
              </Link>
              <Link href={`/rx/${rx.consultId}`} className="flex items-center gap-1.5 text-[14px] font-semibold text-ink-soft hover:text-ink">
                <Icon name="download" size={16} />
                Print or save as PDF
              </Link>
            </div>
          }
        />
      ))}
    </Screen>
  );
}
