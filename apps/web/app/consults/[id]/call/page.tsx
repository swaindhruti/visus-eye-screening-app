"use client";

import { useParams } from "next/navigation";

import { PatientRoom } from "@/components/call/PatientRoom";
import { useMe } from "@/components/ShopShell";

/** C1: the patient's call. The doctor's video, captions in the consult's language, and live tests. */
export default function PatientCall() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  return <PatientRoom id={id} role="patient" ready={!!me.data} back={`/consults/${id}`} />;
}
