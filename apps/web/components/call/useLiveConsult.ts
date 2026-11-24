"use client";

import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { getLive, type Caption } from "@/services/consults";

/**
 * GET /consults/:id/live every 2 s while on the call: status, the pending test, the tests and the
 * captions. Each poll asks only for captions after the last one seen, and they're kept here in order.
 */
export function useLiveConsult(id: string, enabled: boolean) {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const last = useRef<string | undefined>(undefined);
  const q = useQuery({
    queryKey: ["live", id],
    queryFn: async () => {
      const s = await getLive(id, last.current);
      if (s.captions.length) {
        last.current = s.captions[s.captions.length - 1].id;
        setCaptions((old) => [...old, ...s.captions.filter((n) => !old.some((o) => o.id === n.id))]);
      }
      return s;
    },
    enabled,
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
  });
  return { live: q.data, captions, error: q.error };
}
