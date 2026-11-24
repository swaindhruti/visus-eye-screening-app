"use client";

import { useQuery } from "@tanstack/react-query";

import { ConsultRow } from "@/components/ConsultRow";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ErrorState } from "@/components/States";
import { useNow } from "@/lib/consults";
import { listMyConsults, type ConsultSummary } from "@/services/consults";

const ahead = (c: ConsultSummary) => c.status === "scheduled" || c.status === "live";

/** C2: My consults. Upcoming first, then past. Only the clinic books, so there's no "Book" here. */
export default function MyConsults() {
  const now = useNow();
  const q = useQuery({ queryKey: ["my-consults"], queryFn: listMyConsults, refetchInterval: 60_000 });

  if (q.isError) return <ErrorState onRetry={() => q.refetch()} retrying={q.isFetching} />;
  const all = q.data ?? [];
  const upcoming = all.filter(ahead);
  const past = all.filter((c) => !ahead(c));

  return (
    <Screen gap="gap-5">
      <ScreenHeader title="My consults" fallback="/profile" />
      {q.isSuccess && all.length === 0 ? (
        <div className="flex flex-col items-center px-3 py-12 text-center">
          <span className="grid size-[72px] place-items-center rounded-full border border-line bg-white">
            <Icon name="camera" size={30} strokeWidth={1.8} />
          </span>
          <h1 className="m-0 mt-5 text-[22px] font-bold tracking-[-0.02em]">No consults yet</h1>
          <p className="m-0 mt-2 max-w-[340px] text-[16px] leading-normal text-muted text-pretty">
            Your optician or clinic can book a video consult with an eye doctor for you. It shows up here, and you join from this page.
          </p>
        </div>
      ) : (
        <>
          <List title="Upcoming" list={upcoming} now={now} empty="Nothing booked right now." loading={q.isPending} />
          {past.length > 0 && <List title="Past" list={past} now={now} />}
        </>
      )}
    </Screen>
  );
}

function List({ title, list, now, empty, loading }: { title: string; list: ConsultSummary[]; now: number | null; empty?: string; loading?: boolean }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="m-0 text-[18px] font-bold tracking-[-0.01em]">{title}</h2>
      <div className="overflow-hidden rounded-[20px] border border-line bg-white">
        {now &&
          list.map((c, i) => (
            <ConsultRow key={c.id} c={c} now={now} first={i === 0} title={c.doctor.name} sub={`${c.doctor.specialty} · ${c.clinic.name}`} href={`/consults/${c.id}`} calendar={false} />
          ))}
        {(loading || !now) && <p className="m-0 p-4 text-[15px] text-muted">Loading…</p>}
        {!loading && now && list.length === 0 && empty && <p className="m-0 p-4 text-[15px] text-muted">{empty}</p>}
      </div>
    </section>
  );
}
