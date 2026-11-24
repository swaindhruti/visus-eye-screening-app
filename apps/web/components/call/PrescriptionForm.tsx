"use client";

import type { ConsultKind, GlassesRx, Medicine } from "@visus/shared";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/components/cn";
import { Icon } from "@/components/Icon";
import { fmtTime } from "@/lib/consults";
import { savePrescription, type ConsultDetail, type ConsultPrescription, type SavePrescriptionRequest } from "@/services/consults";
import { parsePower } from "@/services/profiles";

type EyeText = { sph: string; cyl: string; axis: string; add: string };
const EMPTY_EYE: EyeText = { sph: "", cyl: "", axis: "", add: "" };
const AUTOSAVE_MS = 10_000;

const eyeText = (e?: GlassesRx["right"]): EyeText => (e ? { sph: String(e.sph), cyl: String(e.cyl), axis: String(e.axis), add: e.add != null ? String(e.add) : "" } : EMPTY_EYE);
const eyeRx = (e: EyeText): GlassesRx["right"] => ({
  sph: parsePower(e.sph),
  cyl: parsePower(e.cyl),
  axis: Math.min(180, Math.max(0, Math.round(Number(e.axis) || 0))),
  ...(e.add.trim() ? { add: Math.min(4, Math.max(0, parsePower(e.add))) } : {}),
});

/**
 * The prescription panel in the doctor's call. A draft is saved every 10 seconds while the doctor
 * types; "Save and end" makes it final (the server translates it, books the follow-up and ends
 * the consult). Medicines are free text: Visus never suggests them.
 */
export function PrescriptionForm({ c, initial, onSaved }: { c: ConsultDetail; initial: ConsultPrescription | null; onSaved: (rx: ConsultPrescription) => void }) {
  const [kind, setKind] = useState<ConsultKind>(initial?.kind ?? c.kind);
  const [symptoms, setSymptoms] = useState(initial?.symptoms ?? "");
  const [observations, setObservations] = useState(initial?.observations ?? "");
  const [withGlasses, setWithGlasses] = useState(!!initial?.glasses);
  const [right, setRight] = useState<EyeText>(eyeText(initial?.glasses?.right));
  const [left, setLeft] = useState<EyeText>(eyeText(initial?.glasses?.left));
  const [pd, setPd] = useState(initial?.glasses?.pd != null ? String(initial.glasses.pd) : "");
  const [meds, setMeds] = useState<Medicine[]>(initial?.medicines ?? []);
  const [remedies, setRemedies] = useState<string[]>(initial?.remedies ?? []);
  const [remedy, setRemedy] = useState("");
  const [followUp, setFollowUp] = useState(initial?.followUpDate ?? "");
  const [savedAt, setSavedAt] = useState<string | null>(initial?.status === "draft" ? initial.date : null);

  const request = (final: boolean): SavePrescriptionRequest => {
    const pdNum = Math.round(Number(pd));
    return {
      kind,
      symptoms: symptoms.trim(),
      observations: observations.trim(),
      glasses: withGlasses ? { right: eyeRx(right), left: eyeRx(left), ...(pd.trim() && pdNum >= 40 && pdNum <= 80 ? { pd: pdNum } : {}) } : null,
      medicines: meds.filter((m) => m.name.trim()).map((m) => ({ ...m, name: m.name.trim(), days: Math.max(0, Math.min(365, Math.round(m.days) || 0)) })),
      remedies: remedies.filter((r) => r.trim()),
      followUpDate: followUp || null,
      final,
    };
  };

  // Autosave: every 10 s, when something changed since the last save.
  const body = JSON.stringify(request(false));
  const lastSaved = useRef(body);
  const draft = useMutation({
    mutationFn: (req: SavePrescriptionRequest) => savePrescription(c.id, req),
    onSuccess: (rx, req) => {
      lastSaved.current = JSON.stringify(req);
      setSavedAt(rx.date);
    },
  });
  // The call re-renders every 2 s (polling), so the timer must not restart on render: it reads refs.
  const tick = useRef(() => {});
  useEffect(() => {
    tick.current = () => {
      if (body !== lastSaved.current && !draft.isPending) draft.mutate(JSON.parse(body));
    };
  });
  useEffect(() => {
    const t = setInterval(() => tick.current(), AUTOSAVE_MS);
    return () => clearInterval(t);
  }, []);

  const final = useMutation({ mutationFn: () => savePrescription(c.id, request(true)), onSuccess: onSaved });
  const [tomorrow] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));
  const setMed = (i: number, patch: Partial<Medicine>) => setMeds(meds.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  return (
    <div className="flex flex-col gap-4 p-4 md:p-5">
      <div className="flex gap-2" role="radiogroup" aria-label="Consult">
        {(["first", "follow_up"] as ConsultKind[]).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={cn("h-10 flex-1 rounded-[12px] border text-[14px] font-semibold", kind === k ? "border-ink bg-ink text-white" : "border-line-strong bg-white hover:bg-card-hover")}
          >
            {k === "first" ? "First consult" : "Follow-up"}
          </button>
        ))}
      </div>

      <Area label="Symptoms" value={symptoms} onChange={setSymptoms} placeholder="What the patient reports" />
      <Area label="Observations" value={observations} onChange={setObservations} placeholder="What you found, including the test results" />

      <div className="flex flex-col gap-2.5 rounded-[16px] border border-line p-3.5">
        <label className="flex items-center gap-2.5 text-[15px] font-semibold">
          <input type="checkbox" checked={withGlasses} onChange={(e) => setWithGlasses(e.target.checked)} className="size-4 accent-ink" />
          Glasses power
        </label>
        {withGlasses && (
          <>
            <div className="grid grid-cols-[52px_repeat(4,1fr)] items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">
              <span />
              <span>SPH</span>
              <span>CYL</span>
              <span>AXIS</span>
              <span>ADD</span>
              {(
                [
                  ["Right", right, setRight],
                  ["Left", left, setLeft],
                ] as const
              ).map(([name, v, set]) => (
                <EyeRow key={name} name={name} v={v} set={set} />
              ))}
            </div>
            <label className="flex items-center gap-2 text-[13px] font-semibold text-muted">
              PD (mm)
              <input value={pd} onChange={(e) => setPd(e.target.value)} inputMode="numeric" placeholder="63" className={cn(SMALL, "w-20")} />
            </label>
          </>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[15px] font-semibold">Medicines</span>
        {meds.map((m, i) => (
          <div key={i} className="flex flex-col gap-1.5 rounded-[14px] bg-fill p-2.5">
            <div className="flex gap-1.5">
              <input value={m.name} onChange={(e) => setMed(i, { name: e.target.value })} maxLength={100} placeholder="Medicine name" aria-label="Medicine name" className={cn(SMALL, "flex-1")} />
              <button type="button" aria-label="Remove medicine" onClick={() => setMeds(meds.filter((_, j) => j !== i))} className="grid size-10 place-items-center rounded-[10px] text-muted hover:bg-white hover:text-ink">
                <Icon name="close" size={16} />
              </button>
            </div>
            <div className="grid grid-cols-[1fr_1.3fr_70px] gap-1.5">
              <input value={m.dose} onChange={(e) => setMed(i, { dose: e.target.value })} maxLength={60} placeholder="Dose" aria-label="Dose" className={SMALL} />
              <input value={m.frequency} onChange={(e) => setMed(i, { frequency: e.target.value })} maxLength={60} placeholder="How often" aria-label="How often" className={SMALL} />
              <input value={m.days || ""} onChange={(e) => setMed(i, { days: Number(e.target.value.replace(/\D/g, "")) || 0 })} inputMode="numeric" placeholder="Days" aria-label="Days" className={SMALL} />
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setMeds([...meds, { name: "", dose: "", frequency: "", days: 0 }])} className="flex h-10 items-center gap-1.5 self-start rounded-[12px] border border-line-strong px-3.5 text-[14px] font-semibold hover:bg-card-hover">
          <Icon name="plusSm" size={15} strokeWidth={2.2} />
          Add medicine
        </button>
        <span className="text-[12px] text-muted">Written by you. Visus never suggests medicines.</span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[15px] font-semibold">Daily practices</span>
        {remedies.map((r, i) => (
          <div key={i} className="flex items-start gap-2 rounded-[12px] bg-fill px-3 py-2 text-[14px]">
            <span className="flex-1">{r}</span>
            <button type="button" aria-label="Remove" onClick={() => setRemedies(remedies.filter((_, j) => j !== i))} className="text-muted hover:text-ink">
              <Icon name="close" size={15} />
            </button>
          </div>
        ))}
        <form
          className="flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (remedy.trim()) setRemedies([...remedies, remedy.trim().slice(0, 300)]);
            setRemedy("");
          }}
        >
          <input value={remedy} onChange={(e) => setRemedy(e.target.value)} placeholder="e.g. 20-second break every 20 minutes" aria-label="Daily practice" className={cn(SMALL, "flex-1")} />
          <button type="submit" disabled={!remedy.trim()} className="h-10 rounded-[12px] border border-line-strong px-3.5 text-[14px] font-semibold hover:bg-card-hover disabled:opacity-40">
            Add
          </button>
        </form>
      </div>

      <label className="flex flex-col gap-1 text-[15px] font-semibold">
        Follow-up date
        <input type="date" min={tomorrow} value={followUp} onChange={(e) => setFollowUp(e.target.value)} className={cn(SMALL, "self-start")} />
        <span className="text-[12px] font-normal text-muted">Books your first free slot that day at {c.clinic.name}. Leave empty for none.</span>
      </label>

      <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-col gap-2 border-t border-line bg-white px-4 py-3 md:-mx-5 md:-mb-5 md:px-5">
        <span className="text-[12px] text-muted">
          {draft.isPending ? "Saving draft…" : savedAt ? `Draft saved ${fmtTime(savedAt)}` : "Saved as a draft every 10 seconds while you type."}
          {` · Printed with ${c.doctor.name}, reg. no. ${c.doctor.registrationNo}`}
        </span>
        {final.isError && <span className="text-[13px] text-doc">{final.error.message}</span>}
        <button type="button" disabled={final.isPending} onClick={() => final.mutate()} className="h-12 rounded-[14px] bg-ink text-[15px] font-semibold text-white hover:bg-[#2a2a2a] disabled:opacity-50">
          {final.isPending ? "Saving…" : "Save and end consult"}
        </button>
      </div>
    </div>
  );
}

const SMALL = "h-10 min-w-0 rounded-[10px] border border-line-strong bg-white px-2.5 text-[14px] text-ink outline-none focus:border-ink";

function EyeRow({ name, v, set }: { name: string; v: EyeText; set: (v: EyeText) => void }) {
  return (
    <>
      <span className="text-[13px] normal-case tracking-normal text-ink">{name}</span>
      {(["sph", "cyl", "axis", "add"] as const).map((k) => (
        <input key={k} value={v[k]} onChange={(e) => set({ ...v, [k]: e.target.value })} inputMode="decimal" placeholder={k === "axis" ? "0" : "0.00"} aria-label={`${name} ${k.toUpperCase()}`} className={cn(SMALL, "px-2 normal-case tracking-normal")} />
      ))}
    </>
  );
}

function Area({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="flex flex-col gap-1 text-[15px] font-semibold">
      {label}
      <textarea value={value} onChange={(e) => onChange(e.target.value)} maxLength={2000} rows={3} placeholder={placeholder} className="resize-y rounded-[12px] border border-line-strong bg-white px-3 py-2 text-[15px] font-normal leading-snug text-ink outline-none focus:border-ink" />
    </label>
  );
}
