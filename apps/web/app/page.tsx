"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { getToken } from "@/services/api";
import { isGuest } from "@/services/auth";

export default function Index() {
  const router = useRouter();
  useEffect(() => {
    router.replace(getToken() ? "/home" : isGuest() ? "/tests" : "/welcome");
  }, [router]);
  return null;
}
