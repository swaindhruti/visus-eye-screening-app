"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

import { PatientRoom } from "@/components/call/PatientRoom";
import { useMe } from "@/components/ShopShell";
import { isShop } from "@/services/shops";

/** S17: join at the clinic. The patient's call screen on the clinic's laptop (role `clinic`). */
export default function ClinicCall() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const me = useMe();
  const ready = isShop(me.data?.user);

  useEffect(() => {
    if (me.isSuccess && !isShop(me.data?.user)) router.replace("/shop/login");
  }, [me.isSuccess, me.data, router]);

  return <PatientRoom id={id} role="clinic" ready={ready} back="/shop/consults" />;
}
