"use client";

import type { CallRole, ConsultDetail, Language } from "@visus/shared";
import { useEffect, useRef } from "react";

import { cn } from "@/components/cn";
import { fmtTime } from "@/lib/consults";
import type { Caption } from "@/services/consults";

/**
 * The captions panel (only while captions are on): every line of the call, newest at the bottom,
 * in my language with the original under it. The lines are saved with the consult.
 */
export function Transcript({ c, role, captions, myLanguage, partial, note }: { c: ConsultDetail; role: CallRole; captions: Caption[]; myLanguage: Language; partial?: string; note?: string | null }) {
  const end = useRef<HTMLLIElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [captions.length, partial]);

  const who = (from: CallRole) => (from === role ? "You" : from === "doctor" ? c.doctor.name : from === "clinic" ? c.clinic.name : c.patient.name);

  return (
    <div className="flex flex-col">
      {note && <p className="m-0 mx-4 mt-4 rounded-[12px] bg-doc-bg px-3 py-2 text-[13px] text-doc md:mx-5">{note}</p>}
      {!captions.length && !partial ? (
        <p className="m-0 p-5 text-[15px] text-muted">Captions show here as you talk, in your language. They are saved with the consult.</p>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-2.5 p-4 md:p-5">
          {captions.map((cap) => {
            const mine = cap.from === role;
            const shown = mine ? cap.text : (cap.translations[myLanguage] ?? cap.text);
            return (
              <li key={cap.id} className={cn("flex flex-col gap-0.5 rounded-[14px] px-3.5 py-2.5", mine ? "bg-fill" : "bg-acc-soft")}>
                <span className="text-[12px] font-semibold text-muted">
                  {who(cap.from)} · {fmtTime(cap.at)}
                </span>
                <span className="text-[15px] leading-snug">{shown}</span>
                {shown !== cap.text && <span className="text-[13px] text-muted">{cap.text}</span>}
              </li>
            );
          })}
          {partial && (
            <li className="flex flex-col gap-0.5 rounded-[14px] border border-dashed border-line px-3.5 py-2.5">
              <span className="text-[12px] font-semibold text-muted">You · speaking</span>
              <span className="text-[15px] italic leading-snug text-ink-soft">{partial}</span>
            </li>
          )}
          <li ref={end} aria-hidden className="h-px" />
        </ol>
      )}
    </div>
  );
}
