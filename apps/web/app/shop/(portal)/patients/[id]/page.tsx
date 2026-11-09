"use client";

import { TEST_CATALOG, type TestId } from "@visus/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { StatusBadge } from "@/components/Chip";
import { cn } from "@/components/cn";
import { Icon, type IconName } from "@/components/Icon";
import { Disclaimer, Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { LinkBadge, useShopReady } from "@/components/ShopShell";
import { ErrorState } from "@/components/States";
import { MONTHS } from "@/lib/dates";
import { sessionSub, sessionTitle } from "@/lib/history";
import { TEST_COPY } from "@/lib/tests";
import { useStartCheck } from "@/lib/useStartCheck";
import type { CheckMode } from "@/services/sessions";
import { getPatient, requestLink, setPatientPhone, type PatientDetail } from "@/services/shops";
import { useCheck } from "@/store/check";

/** Shop portal: one patient. Link status, start a check, and their past checks. */
export default function Patient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const ready = useShopReady();
  const q = useQuery({ queryKey: ["shop-patient", id], queryFn: () => getPatient(id), staleTime: 0, enabled: ready });
  const start = useStartCheck();

  if (q.isError) return <ErrorState title="Couldn't open this patient" body={q.error.message} onRetry={() => q.refetch()} retrying={q.isFetching} />;
  const p = q.data;
  if (!p) return <Screen gap="gap-4"><ScreenHeader title="Patient" fallback="/shop" /><p className="m-0 text-[15px] text-muted">Loading…</p></Screen>;

  const child = p.age < 13;
  const begin = (mode: CheckMode, testId?: TestId) => {
    useCheck.getState().setShopPatient({ id: p.id, name: p.name, profileId: p.checkProfileId });
    // A full check starts with the AI intake chat (children get the kids tests straight away).
    if (mode === "full" && !child) return router.push("/check/intake");
    start.mutate({ mode, testId });
  };

  return (
    <Screen wide gap="gap-5 md:gap-7">
      <ScreenHeader title="" fallback="/shop" />
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-[30px] font-bold leading-[1.15] tracking-[-0.025em] md:text-[40px]">{p.name}</h1>
          <span className="text-[15px] text-muted md:text-[16px]">
            {p.age} years{p.phone ? ` · ${p.phone}` : ""} · {p.wearsGlasses ? "Wears glasses" : "No glasses"}
            {child ? " · Kids mode" : ""}
          </span>
        </div>
        <LinkBadge status={p.linkStatus} className="md:self-end" />
      </header>

      <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-6">
        <div className="flex min-w-0 flex-col gap-5 md:flex-[3_1_0]">
          <section className="flex flex-col gap-2.5 md:gap-3.5">
            <h2 className="m-0 text-[18px] font-bold tracking-[-0.01em] md:text-[24px]">Start a check</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <StartCard icon="sparkle" accent title={child ? "Kids eye check" : "Full AI check"} sub={child ? "Kids Tumbling E · Colour shapes" : "Chat, then the tests the AI picks"} onClick={() => begin("full")} busy={start.isPending} />
              <StartCard icon="bolt" title="1-minute quick check" sub="Tumbling E · Amsler · Clock dial" onClick={() => begin("quick")} busy={start.isPending} />
              {p.wearsGlasses && <StartCard icon="glasses" title="Glasses check" sub="With and without their glasses" onClick={() => begin("glasses")} busy={start.isPending} />}
              <SingleTest age={p.age} onStart={(t) => begin("single", t)} busy={start.isPending} />
            </div>
            {start.isError && <p className="m-0 text-[14px] text-doc">{start.error.message}</p>}
          </section>

          <section className="flex flex-col gap-2.5 md:gap-3.5">
            <h2 className="m-0 text-[18px] font-bold tracking-[-0.01em] md:text-[24px]">Past checks</h2>
            <div className="overflow-hidden rounded-[20px] border border-line bg-white">
              {p.sessions.map((s, i) => {
                const d = new Date(s.date);
                return (
                  <Link
                    key={s.id}
                    href={`/results/${s.id}`}
                    onClick={() => useCheck.getState().setShopPatient({ id: p.id, name: p.name, profileId: p.checkProfileId })}
                    className={cn("flex min-h-16 items-center gap-3.5 px-4 py-2.5 transition-colors hover:bg-card-hover md:px-5", i > 0 && "border-t border-divider")}
                  >
                    <span className="flex size-11 flex-none flex-col items-center justify-center rounded-[12px] bg-fill leading-none">
                      <span className="text-[16px] font-bold">{d.getDate()}</span>
                      <span className="mt-[3px] text-[10px] font-bold tracking-[.04em] text-muted">{MONTHS[d.getMonth()].toUpperCase()}</span>
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[16px] font-semibold">{sessionTitle(s)}</span>
                      <span className="truncate text-[13px] text-muted">
                        {sessionSub(s)}
                        {s.shopName ? "" : " · Taken in the Visus app"}
                      </span>
                    </span>
                    <StatusBadge status={s.status} label={s.status === "good" ? "All clear" : undefined} className="self-center" />
                  </Link>
                );
              })}
              {p.sessions.length === 0 && <p className="m-0 p-4 text-[15px] text-muted">No checks yet. Start one above.</p>}
            </div>
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-4 md:flex-[2_1_0]">
          <LinkCard p={p} />
          <Disclaimer>Results are a screening, not a diagnosis. Refer to an eye doctor when a check says so.</Disclaimer>
        </aside>
      </div>
    </Screen>
  );
}

function StartCard({ icon, title, sub, onClick, accent, busy }: { icon: IconName; title: string; sub: string; onClick: () => void; accent?: boolean; busy?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex min-h-[72px] items-center gap-3.5 rounded-[20px] border border-line bg-white p-4 text-left transition-[transform,border-color] duration-150 hover:border-[#D6D6D1] active:scale-[.98] disabled:opacity-50"
    >
      <span className={cn("grid size-11 flex-none place-items-center rounded-full", accent ? "bg-acc-soft text-acc-ink" : "bg-fill")}>
        <Icon name={icon} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="text-[16px] font-bold">{title}</span>
        <span className="text-[13px] text-muted">{sub}</span>
      </span>
      <Icon name="arrowRight" size={18} className="flex-none" />
    </button>
  );
}

/** One test from the library, picked from a list. */
function SingleTest({ age, onStart, busy }: { age: number; onStart: (id: TestId) => void; busy?: boolean }) {
  const tests = TEST_CATALOG.filter((t) => age >= t.minAge && (t.category === "kids") === age < 13);
  const [pick, setPick] = useState<TestId>(tests[0]?.id ?? "tumbling_e");
  return (
    <div className="flex min-h-[72px] items-center gap-3 rounded-[20px] border border-line bg-white p-4">
      <span className="grid size-11 flex-none place-items-center rounded-full bg-fill">
        <Icon name="eye" size={20} />
      </span>
      <label className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="text-[16px] font-bold">Single test</span>
        <select value={pick} onChange={(e) => setPick(e.target.value as TestId)} className="-ml-1 h-8 w-full truncate rounded-[8px] bg-transparent text-[14px] text-muted outline-none focus-visible:ring-2 focus-visible:ring-ink/20">
          {tests.map((t) => (
            <option key={t.id} value={t.id}>
              {TEST_COPY[t.id].title}
            </option>
          ))}
        </select>
      </label>
      <button type="button" disabled={busy} onClick={() => onStart(pick)} className="h-10 flex-none rounded-full bg-ink px-4 text-[14px] font-semibold text-white disabled:opacity-50">
        Start
      </button>
    </div>
  );
}

/**
 * Whether the patient's own Visus account is linked, and what the shop can do about it. A walk-in
 * added without a mobile number gets one here; if they use Visus with it, their past checks follow
 * once they allow it.
 */
function LinkCard({ p }: { p: PatientDetail }) {
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(p.phone);
  const saved = (next: PatientDetail) => {
    client.setQueryData(["shop-patient", p.id], next);
    void client.invalidateQueries({ queryKey: ["shop-patients"] });
  };
  const ask = useMutation({ mutationFn: () => requestLink(p.id), onSuccess: saved });
  const save = useMutation({
    mutationFn: () => setPatientPhone(p.id, phone),
    onSuccess: (next) => {
      saved(next);
      setEditing(false);
    },
  });
  const first = p.name.split(" ")[0];
  const text = {
    none: p.phone
      ? `No Visus account uses ${p.phone} yet. If ${first} signs up with this number, they'll see your request.`
      : `Add ${first}'s mobile number. If they use Visus with it, they'll be asked to share their eye records, and their past results will show here.`,
    pending: `Waiting for ${first} to allow it in their Visus app. Then their past results show here; until then you see only the checks you run.`,
    approved: `Linked to ${first}'s Visus account. You can see all their checks, and the checks you run are saved in their account too.`,
    declined: `${first} declined or removed your shop. You keep the checks you ran.`,
  }[p.linkStatus];
  const canAsk = !!p.phone && (p.linkStatus === "none" || p.linkStatus === "declined");
  const canEdit = p.linkStatus !== "approved";
  const digits = phone.replace(/\D/g, "");
  const phoneOk = digits.length >= 10;
  const showForm = canEdit && (editing || !p.phone);

  return (
    <section className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-[18px]">
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-full bg-fill">
          <Icon name="store" size={18} />
        </span>
        <h2 className="m-0 flex-1 text-[17px] font-bold">Their Visus account</h2>
        {canEdit && p.phone && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="h-9 rounded-[10px] px-2.5 text-[14px] font-semibold text-muted hover:bg-pressed hover:text-ink">
            Change number
          </button>
        )}
      </div>
      <p className="m-0 text-[15px] leading-normal text-ink-soft text-pretty">{text}</p>
      {showForm && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (phoneOk && !save.isPending) save.mutate();
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-semibold">Mobile number</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              autoComplete="off"
              placeholder="98765 43210"
              className="h-12 rounded-[14px] border border-line-strong bg-white px-4 text-[16px] outline-none focus:border-ink focus:shadow-[0_0_0_4px_rgba(17,17,17,.06)]"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!phoneOk || save.isPending}
              className="flex h-11 flex-1 items-center justify-center rounded-[14px] bg-ink px-4 text-[15px] font-semibold text-white disabled:opacity-40"
            >
              {save.isPending ? "Saving…" : p.phone ? "Save number" : "Add number"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setPhone(p.phone);
                  save.reset();
                }}
                className="flex h-11 items-center justify-center rounded-[14px] border border-line-strong bg-white px-4 text-[15px] font-semibold hover:bg-[#FBFBF9]"
              >
                Cancel
              </button>
            )}
          </div>
          {save.isError && <p className="m-0 text-[14px] text-doc">{save.error.message}</p>}
        </form>
      )}
      {canAsk && !editing && (
        <button
          type="button"
          onClick={() => ask.mutate()}
          disabled={ask.isPending}
          className="flex h-11 items-center justify-center rounded-[14px] border border-line-strong bg-white px-4 text-[15px] font-semibold hover:bg-[#FBFBF9] disabled:opacity-50"
        >
          {ask.isPending ? "Checking…" : p.linkStatus === "declined" ? "Ask again" : "Check for an account"}
        </button>
      )}
      {ask.isError && <p className="m-0 text-[14px] text-doc">{ask.error.message}</p>}
    </section>
  );
}
