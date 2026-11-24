"use client";

import type { CallRole } from "@visus/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/Icon";
import { LoadingState } from "@/components/States";
import { TEST_COPY } from "@/lib/tests";
import { getConsult, joinConsult, type ConsultDetail, type JoinConsultResponse } from "@/services/consults";
import { EYE_LABEL } from "@/tests/types";

import { CallStage } from "./CallStage";
import { LiveTest } from "./LiveTest";
import { useAgoraCall } from "./useAgoraCall";
import { useCaptions } from "./useCaptions";
import { useLiveConsult } from "./useLiveConsult";

/**
 * The call for the patient's side: the patient at home (`/consults/[id]/call`) or the clinic's
 * device with the patient sitting there (`/shop/consults/[id]/call`, role `clinic`). The doctor's
 * video, captions in the consult's language, and a test the doctor sends opens full screen.
 */
export function PatientRoom({ id, role, ready, back }: { id: string; role: Exclude<CallRole, "doctor">; ready: boolean; back: string }) {
  const consult = useQuery({ queryKey: ["consult", id], queryFn: () => getConsult(id), enabled: ready });
  const join = useQuery({ queryKey: ["join", id], queryFn: () => joinConsult(id), enabled: !!consult.data, staleTime: Infinity, gcTime: 0, retry: false });

  if (join.isError || consult.isError)
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-pearl px-6 text-center">
        <span className="grid size-[72px] place-items-center rounded-full border border-line bg-white">
          <Icon name="clock" size={30} />
        </span>
        <h1 className="m-0 text-[24px] font-bold">Can&apos;t join this consult</h1>
        <p className="m-0 max-w-[360px] text-[16px] text-muted text-pretty">{(join.error ?? consult.error)?.message}</p>
        <Link href={back as Route} className="mt-2 flex h-12 items-center rounded-[14px] bg-ink px-6 text-[16px] font-semibold text-white">
          Back
        </Link>
      </main>
    );
  if (!consult.data || !join.data) return <LoadingState label="Joining the consult…" />;
  return <Room c={consult.data} join={join.data} role={role} back={back} />;
}

function Room({ c, join, role, back }: { c: ConsultDetail; join: JoinConsultResponse; role: Exclude<CallRole, "doctor">; back: string }) {
  const router = useRouter();
  const client = useQueryClient();
  const remoteRef = useRef<HTMLDivElement>(null);
  const localRef = useRef<HTMLDivElement>(null);
  const call = useAgoraCall(join, remoteRef, localRef);
  // Polling stops once the consult is over; the last state (completed / cancelled) stays.
  const [over, setOver] = useState(false);
  const { live, captions } = useLiveConsult(c.id, !over);
  const ended = over || live?.status === "completed" || live?.status === "cancelled";
  const myLanguage = c.language;
  const [captionsOn, setCaptionsOn] = useState(true);
  const cap = useCaptions(c.id, myLanguage, captionsOn && !ended);
  // A test the patient closed stays closed until they open it again (or the doctor sends another).
  const [closed, setClosed] = useState<string | null>(null);
  const pending = live?.pendingTest ?? null;
  const testOpen = pending && pending.id !== closed ? pending : null;

  // The doctor saved the prescription or ended the consult: hang up.
  const leave = useRef(call.leave);
  useEffect(() => {
    leave.current = call.leave;
  });
  useEffect(() => {
    if (!ended) return;
    void leave.current().then(() => setOver(true));
    void client.invalidateQueries({ queryKey: ["consult", c.id] });
  }, [ended, client, c.id]);

  if (ended)
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#0f1011] px-6 text-center text-white">
        <span className="grid size-[72px] place-items-center rounded-full bg-white/12">
          <Icon name="check" size={30} strokeWidth={2.2} />
        </span>
        <h1 className="m-0 text-[24px] font-bold">The consult has ended</h1>
        <p className="m-0 max-w-[380px] text-[16px] text-white/75 text-pretty">
          {live?.prescriptionSaved
            ? `${c.doctor.name} saved the prescription. ${role === "clinic" ? "It's on the patient's page" : "It's in your consult and in Profile → Prescriptions"}, in ${c.patient.name.split(" ")[0]}'s language.`
            : `${c.doctor.name} ended the call.`}
        </p>
        <button type="button" onClick={() => router.replace(back as Route)} className="mt-2 flex h-12 items-center rounded-[14px] bg-white px-6 text-[16px] font-semibold text-ink">
          {role === "clinic" ? "Back to consults" : "See the consult"}
        </button>
      </main>
    );

  const notice = pending && !testOpen && (
    <button type="button" onClick={() => setClosed(null)} className="flex min-h-11 items-center gap-2 rounded-full bg-white px-4 py-2 text-left text-[14px] font-semibold text-ink shadow-lg">
      <Icon name="eye" size={18} />
      {c.doctor.name} sent {TEST_COPY[pending.testId].title} ({EYE_LABEL[pending.eye]}). Open the test
    </button>
  );

  return (
    <CallStage
      c={c}
      role={role}
      myLanguage={myLanguage}
      call={call}
      remoteRef={remoteRef}
      localRef={localRef}
      captions={captions}
      partial={cap.partial}
      captionsOn={captionsOn}
      onToggleCaptions={() => setCaptionsOn(!captionsOn)}
      captionNote={cap.error ?? (!cap.supported && captionsOn ? "This browser can't make captions; the doctor's still show." : null)}
      onLeave={() => void call.leave().then(() => router.replace(back as Route))}
      notice={notice}
      takeover={testOpen && <LiveTest key={testOpen.id} consultId={c.id} test={testOpen} doctorName={c.doctor.name} onClose={() => setClosed(testOpen.id)} />}
    />
  );
}
