"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/Icon";
import { Disclaimer, Screen } from "@/components/Screen";
import { ShopPatientPicker } from "@/components/ShopPatientPicker";
import type { ShopPatient } from "@/services/shops";
import { useCheck } from "@/store/check";

const STEPS = [
  "The customer describes what they notice, typing or talking (English, Hindi or Odia)",
  "Visus AI asks a few short questions",
  "It plans the tests that fit, and you run them on this screen",
  "Result and ZEISS lens suggestions, saved to the patient if you picked one",
];

/**
 * Shop portal: Ask Visus AI. A walk-in (with or without a patient record) tells the AI their eye
 * problem; it plans the tests. The chat itself is the normal intake chat (/check/intake).
 */
export default function ShopAsk() {
  const router = useRouter();
  const [patient, setPatient] = useState<ShopPatient | null>(null);

  const begin = () => {
    useCheck.getState().setShopPatient(patient && { id: patient.id, name: patient.name, profileId: patient.checkProfileId });
    router.push("/check/intake");
  };

  return (
    <Screen wide gap="gap-5 md:gap-7" eyebrow="AI eye check" title="Ask Visus AI">
      <p className="-mt-2 m-0 max-w-[620px] text-[16px] leading-relaxed text-muted text-pretty">
        The customer tells Visus AI what&apos;s wrong with their eyes, and it plans the tests. No Visus account needed, and adding a patient is optional.
      </p>

      <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-6">
        <section className="flex min-w-0 flex-col gap-4 rounded-[20px] border border-line bg-white p-[18px] md:flex-[3_1_0] md:p-6">
          <div className="flex flex-col gap-0.5">
            <h2 className="m-0 text-[18px] font-bold">Who is this for?</h2>
            <p className="m-0 text-[14px] text-muted">
              {patient ? `The plan and results are saved to ${patient.name.split(" ")[0]}'s record.` : "No record: you can still add the patient during the chat."}
            </p>
          </div>
          <ShopPatientPicker value={patient} onChange={setPatient} />
          <button
            type="button"
            onClick={begin}
            className="mt-1 flex h-14 items-center justify-center gap-2 rounded-[16px] bg-ink px-6 text-[16px] font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-[#2a2a2a] active:scale-[.98]"
          >
            <Icon name="chat" size={20} />
            Start the chat
          </button>
        </section>

        <aside className="flex min-w-0 flex-col gap-4 md:flex-[2_1_0]">
          <section className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-[18px]">
            <h2 className="m-0 text-[17px] font-bold">How it works</h2>
            <ol className="m-0 flex list-none flex-col gap-3 p-0">
              {STEPS.map((s, i) => (
                <li key={s} className="flex items-start gap-3 text-[15px] leading-snug">
                  <span className="grid size-7 flex-none place-items-center rounded-full bg-acc-soft text-[13px] font-bold text-acc-ink">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </section>
          <Disclaimer>Visus is a screening, not a diagnosis. Sudden vision loss or eye pain: send them to an eye doctor now.</Disclaimer>
        </aside>
      </div>
    </Screen>
  );
}
