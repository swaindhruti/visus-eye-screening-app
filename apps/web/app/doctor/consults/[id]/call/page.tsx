"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { CallStage } from "@/components/call/CallStage";
import { DoctorTests } from "@/components/call/DoctorTests";
import { PrescriptionForm } from "@/components/call/PrescriptionForm";
import { Transcript } from "@/components/call/Transcript";
import { useAgoraCall } from "@/components/call/useAgoraCall";
import { useCaptions } from "@/components/call/useCaptions";
import { useLiveConsult } from "@/components/call/useLiveConsult";
import { cn } from "@/components/cn";
import { Icon } from "@/components/Icon";
import { useMe } from "@/components/ShopShell";
import { LoadingState } from "@/components/States";
import { endConsult, getConsult, getPrescription, joinConsult, type ConsultDetail } from "@/services/consults";
import { isDoctor } from "@/services/doctor";

type Tab = "tests" | "rx" | "captions";

/** R6: the doctor's consult room. Video (Agora), captions, live tests and the prescription. */
export default function DoctorCall() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const me = useMe();
  const ready = isDoctor(me.data?.user);
  const consult = useQuery({ queryKey: ["consult", id], queryFn: () => getConsult(id), enabled: ready });
  const join = useQuery({ queryKey: ["join", id], queryFn: () => joinConsult(id), enabled: !!consult.data, staleTime: Infinity, gcTime: 0, retry: false });

  useEffect(() => {
    if (me.isSuccess && !isDoctor(me.data?.user)) router.replace("/doctor/login");
  }, [me.isSuccess, me.data, router]);

  if (join.isError || consult.isError)
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-pearl px-6 text-center">
        <span className="grid size-[72px] place-items-center rounded-full border border-line bg-white">
          <Icon name="clock" size={30} />
        </span>
        <h1 className="m-0 text-[24px] font-bold">Can&apos;t join this consult</h1>
        <p className="m-0 max-w-[360px] text-[16px] text-muted text-pretty">{(join.error ?? consult.error)?.message}</p>
        <Link href={`/doctor/consults/${id}`} className="mt-2 flex h-12 items-center rounded-[14px] bg-ink px-6 text-[16px] font-semibold text-white">
          Back to the patient file
        </Link>
      </main>
    );
  if (!consult.data || !join.data) return <LoadingState label="Joining the consult…" />;
  return <Room c={consult.data} join={join.data} />;
}

function Room({ c, join }: { c: ConsultDetail; join: NonNullable<Parameters<typeof useAgoraCall>[0]> }) {
  const router = useRouter();
  const client = useQueryClient();
  const remoteRef = useRef<HTMLDivElement>(null);
  const localRef = useRef<HTMLDivElement>(null);
  const call = useAgoraCall(join, remoteRef, localRef);
  const { live, captions } = useLiveConsult(c.id, true);
  const myLanguage = c.doctor.languages[0] ?? "en";
  // Captions are off until the doctor turns them on; then the Captions tab shows them as they come.
  const [captionsOn, setCaptionsOn] = useState(false);
  const cap = useCaptions(c.id, myLanguage, captionsOn);
  const [tab, setTab] = useState<Tab>("tests");
  const [ending, setEnding] = useState(false);
  const draft = useQuery({ queryKey: ["rx", c.id], queryFn: () => getPrescription(c.id), staleTime: Infinity });

  const finish = async () => {
    await call.leave();
    client.invalidateQueries({ queryKey: ["consult", c.id] });
    client.invalidateQueries({ queryKey: ["doctor-consults"] });
    router.replace(`/doctor/consults/${c.id}`);
  };
  const end = useMutation({ mutationFn: () => endConsult(c.id), onSuccess: finish });

  const done = live?.tests.filter((t) => t.status === "done").length ?? 0;
  const tabs: [Tab, string][] = [
    ["tests", live?.pendingTest ? "Tests · 1 live" : done ? `Tests · ${done}` : "Tests"],
    ["rx", "Prescription"],
    ["captions", captions.length ? `Captions · ${captions.length}` : "Captions"],
  ];

  const side = (
    <>
      <div className="flex flex-none gap-1 border-b border-line px-3 pt-3" role="tablist">
        {tabs.map(([t, label]) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn("h-11 flex-1 rounded-t-[12px] px-2 text-[14px] font-semibold transition-colors", tab === t ? "bg-ink text-white" : "text-muted hover:bg-pressed hover:text-ink")}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className={cn(tab !== "tests" && "hidden")}>
          <DoctorTests consultId={c.id} live={live} />
        </div>
        <div className={cn(tab !== "rx" && "hidden")}>
          {draft.isPending ? <p className="m-0 p-5 text-[15px] text-muted">Loading the draft…</p> : <PrescriptionForm c={c} initial={draft.data ?? null} onSaved={finish} />}
        </div>
        <div className={cn(tab !== "captions" && "hidden")}>
          {captionsOn || captions.length ? (
            <Transcript
              c={c}
              role="doctor"
              captions={captions}
              myLanguage={myLanguage}
              partial={cap.partial}
              note={cap.error ?? (!cap.supported && captionsOn ? "This browser can't make captions (use Chrome); the patient's still show." : null)}
            />
          ) : (
            <p className="m-0 p-5 text-[15px] text-muted">Captions are off. Turn them on with CC below the video: what you both say shows here, translated, and is saved with the consult.</p>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      <CallStage
        c={c}
        role="doctor"
        call={call}
        remoteRef={remoteRef}
        localRef={localRef}
        captionsOn={captionsOn}
        onToggleCaptions={() => {
          if (!captionsOn) setTab("captions");
          setCaptionsOn(!captionsOn);
        }}
        onLeave={() => setEnding(true)}
        leaveLabel="End"
        side={side}
      />
      {ending && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-5" role="alertdialog" aria-modal aria-labelledby="end-title">
          <div className="flex w-full max-w-[420px] flex-col gap-3 rounded-[24px] bg-white p-6 text-ink">
            <h2 id="end-title" className="m-0 text-[21px] font-bold">
              End the consult?
            </h2>
            <p className="m-0 text-[15px] text-muted text-pretty">Saving the prescription ends the consult. You can also end it without one, or leave and join again later.</p>
            <button type="button" onClick={() => (setTab("rx"), setEnding(false))} className="h-12 rounded-[14px] bg-ink text-[15px] font-semibold text-white">
              Write the prescription
            </button>
            <button type="button" disabled={end.isPending} onClick={() => end.mutate()} className="h-12 rounded-[14px] border border-line-strong text-[15px] font-semibold text-doc hover:bg-card-hover">
              {end.isPending ? "Ending…" : "End without a prescription"}
            </button>
            <button type="button" onClick={() => call.leave().then(() => router.replace(`/doctor/consults/${c.id}`))} className="h-11 text-[15px] font-semibold text-muted hover:text-ink">
              Leave for now (the consult stays open)
            </button>
            <button type="button" onClick={() => setEnding(false)} className="h-11 text-[15px] font-semibold text-muted hover:text-ink">
              Stay in the call
            </button>
          </div>
        </div>
      )}
    </>
  );
}
