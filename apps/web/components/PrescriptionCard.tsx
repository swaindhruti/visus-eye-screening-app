"use client";

import type { ConsultPrescription } from "@visus/shared";
import { useState } from "react";

import { fmtFull } from "@/lib/dates";
import { languageName } from "@/lib/consults";
import { fmtPower } from "@/services/profiles";

import { cn } from "./cn";
import { Icon } from "./Icon";

/**
 * A saved prescription: the doctor's name and registration number (as typed, not verified),
 * the clinic, symptoms, observations, glasses power, medicines, daily practices and the follow-up.
 * `compact` shows a short summary with "Show full prescription". `translatedFirst` (patient view)
 * shows the patient's language first, with "Show original".
 */
export function PrescriptionCard({ rx, compact, translatedFirst, footer, id }: { rx: ConsultPrescription; compact?: boolean; translatedFirst?: boolean; footer?: React.ReactNode; id?: string }) {
  const [open, setOpen] = useState(!compact);
  const [original, setOriginal] = useState(!translatedFirst);
  const t = !original && rx.translated ? rx.translated : null;
  const symptoms = t?.symptoms ?? rx.symptoms;
  const observations = t?.observations ?? rx.observations;
  const remedies = t?.remedies ?? rx.remedies;

  return (
    <article id={id} className="flex scroll-mt-6 flex-col gap-4 rounded-[20px] border border-line bg-white p-4 md:p-5 print:break-inside-avoid print:rounded-none print:border-0 print:p-0">
      <header className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-faint">
            {rx.kind === "follow_up" ? "Follow-up" : "First consult"} · {fmtFull(rx.date)}
            {rx.status === "draft" ? " · Draft" : ""}
          </span>
          <span className="text-[17px] font-bold">
            {rx.doctor.name} <span className="font-normal text-muted">· {rx.doctor.specialty}</span>
          </span>
          <span className="text-[13px] text-muted">
            Reg. no. {rx.doctor.registrationNo} (as typed, not verified) · {rx.clinic.name}, {rx.clinic.city}
          </span>
        </div>
        <span className="whitespace-nowrap text-[14px] text-ink-soft md:text-right">
          {rx.patient.name}, {rx.patient.age}
        </span>
      </header>

      {rx.translated && translatedFirst && (
        <button type="button" onClick={() => setOriginal(!original)} className="flex h-9 items-center print:hidden gap-1.5 self-start rounded-full border border-line-strong px-3 text-[13px] font-semibold text-ink-soft hover:bg-card-hover">
          <Icon name="globe" size={15} strokeWidth={2} />
          {original ? `Show in ${languageName(rx.translated.language)}` : "Show original"}
        </button>
      )}

      {open ? (
        <>
          <Field label="Symptoms">{symptoms || "—"}</Field>
          <Field label="Observations">{observations || "—"}</Field>
          {rx.glasses && <GlassesTable g={rx.glasses} />}
          {rx.medicines.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-muted">Medicines</span>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {rx.medicines.map((m, i) => (
                  <li key={i} className="rounded-[12px] bg-fill px-3.5 py-2.5 text-[15px]">
                    <span className="font-semibold">{m.name}</span>
                    <span className="text-ink-soft">
                      {" "}
                      · {[m.dose, m.frequency, m.days ? `${m.days} days` : ""].filter(Boolean).join(" · ")}
                    </span>
                    {m.notes && <span className="block text-[13px] text-muted">{m.notes}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {remedies.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-muted">Daily practices</span>
              <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-[15px] leading-snug">
                {remedies.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {rx.followUpDate && (
            <p className="m-0 flex items-center gap-2 text-[15px]">
              <Icon name="calendar" size={17} strokeWidth={2} />
              Follow-up on {fmtFull(rx.followUpDate)}
              {rx.followUpConsultId ? " (booked)" : " (the clinic books it)"}
            </p>
          )}
          {compact && (
            <button type="button" onClick={() => setOpen(false)} className="self-start print:hidden text-[14px] font-semibold text-muted underline-offset-4 hover:text-ink hover:underline">
              Show less
            </button>
          )}
        </>
      ) : (
        <>
          <p className="m-0 line-clamp-2 text-[15px] leading-snug text-ink-soft">{symptoms}</p>
          <p className="m-0 text-[13px] text-muted">
            {[rx.glasses ? "Glasses power" : "", rx.medicines.length ? `${rx.medicines.length} medicine${rx.medicines.length > 1 ? "s" : ""}` : "", rx.followUpDate ? `Follow-up ${fmtFull(rx.followUpDate)}` : ""].filter(Boolean).join(" · ")}
          </p>
          <button type="button" onClick={() => setOpen(true)} className="self-start text-[14px] font-semibold text-ink underline-offset-4 hover:underline">
            Show full prescription
          </button>
        </>
      )}
      {footer}
    </article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[13px] font-semibold text-muted">{label}</span>
      <p className="m-0 text-[15px] leading-normal text-pretty">{children}</p>
    </div>
  );
}

/** SPH / CYL / AXIS (/ ADD) per eye, and PD. */
type EyePower = { sph: number; cyl: number; axis: number; add?: number };

export function GlassesTable({ g, className }: { g: { right: EyePower; left: EyePower; pd?: number }; className?: string }) {
  const add = "add" in g.right || "add" in g.left;
  const cell = "px-3 py-2 text-right tabular-nums";
  const eyes: [string, EyePower][] = [
    ["Right", g.right],
    ["Left", g.left],
  ];
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[13px] font-semibold text-muted">Glasses power{g.pd ? ` · PD ${g.pd} mm` : ""}</span>
      <table className="w-full max-w-[420px] overflow-hidden rounded-[12px] bg-fill text-[15px]">
        <thead className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Eye</th>
            <th className={cell}>SPH</th>
            <th className={cell}>CYL</th>
            <th className={cell}>AXIS</th>
            {add && <th className={cell}>ADD</th>}
          </tr>
        </thead>
        <tbody>
          {eyes.map(([name, e]) => (
            <tr key={name} className="border-t border-divider">
              <td className="px-3 py-2 font-semibold">{name}</td>
              <td className={cell}>{fmtPower(e.sph)}</td>
              <td className={cell}>{fmtPower(e.cyl)}</td>
              <td className={cell}>{e.axis}°</td>
              {add && <td className={cell}>{e.add != null ? fmtPower(e.add) : "—"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
