"use client";

import { LANGUAGE_OPTIONS, type Language } from "@visus/shared";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthBody, AuthShell, AuthTitle, PanelList, PanelTitle, PillButton } from "@/components/AuthShell";
import { Chip } from "@/components/Chip";
import { PasswordField, TextField } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { Spacer } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { AccountSwitch } from "@/components/ShopShell";
import { registerDoctor } from "@/services/doctor";

const SPECIALTIES = ["Ophthalmologist", "Optometrist"];

/** R1: a doctor creates their account, then gets the Visus ID clinics add them by. */
export default function DoctorRegister() {
  const router = useRouter();
  const [f, setF] = useState({ name: "", identifier: "", password: "", specialty: "", registrationNo: "" });
  const [languages, setLanguages] = useState<Language[]>(["en"]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const ok = f.name.trim() && f.identifier.trim().length >= 3 && f.password.length >= 8 && f.specialty.trim() && f.registrationNo.trim() && languages.length > 0;
  const toggle = (l: Language) => setLanguages((ls) => (ls.includes(l) ? ls.filter((x) => x !== l) : [...ls, l]));

  const m = useMutation({
    mutationFn: () =>
      registerDoctor({
        name: f.name.trim(),
        identifier: f.identifier.trim(),
        password: f.password,
        specialty: f.specialty.trim(),
        registrationNo: f.registrationNo.trim(),
        languages: LANGUAGE_OPTIONS.map((o) => o.code).filter((c) => languages.includes(c)),
      }),
  });
  const submit = () => ok && !m.isPending && m.mutate();

  if (m.isSuccess && m.data.visusId) return <VisusIdScreen id={m.data.visusId} onDone={() => router.replace("/doctor")} />;

  return (
    <AuthShell
      panel={
        <>
          <PanelTitle title="Consult from anywhere." sub="Rural clinics book you for video consults, with live captions in the patient's language." />
          <PanelList
            items={[
              ["eye", "Send Visus tests to the patient's screen during the call"],
              ["doc", "The patient's records, with an AI summary first"],
              ["edit", "Write the prescription; it reaches the patient and the clinic"],
            ]}
          />
        </>
      }
    >
      <ScreenHeader fallback="/welcome" />
      <AuthBody>
        <div className="mt-6 lg:mt-0">
          <AuthTitle eyebrow="Doctor portal" title="Join as a doctor" sub="You'll get a Visus ID. Clinics add you with it." />
        </div>
        <form
          className="mt-8 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <TextField label="Full name" value={f.name} onChange={set("name")} placeholder="Dr Meera Nayak" autoComplete="name" />
          <TextField label="Phone or email (to log in)" value={f.identifier} onChange={set("identifier")} placeholder="+91 98765 43210 or you@example.com" autoComplete="username" />
          <PasswordField id="pw" label="Password" value={f.password} onChange={set("password")} placeholder="At least 8 characters" autoComplete="new-password" />
          <div className="flex flex-col gap-2">
            <TextField label="Specialty" value={f.specialty} onChange={set("specialty")} placeholder="Ophthalmologist or optometrist" />
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map((s) => (
                <Chip key={s} small label={s} selected={f.specialty === s} onClick={() => setF({ ...f, specialty: s })} />
              ))}
            </div>
          </div>
          <TextField
            label="Registration number"
            value={f.registrationNo}
            onChange={set("registrationNo")}
            placeholder="e.g. OMC-2014-1123"
            hint="Shown on your calls and prescriptions exactly as you type it. Not verified in this demo."
          />
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-2 text-[15px] font-semibold">Languages you speak</legend>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((o) => (
                <Chip key={o.code} label={o.name} selected={languages.includes(o.code)} onClick={() => toggle(o.code)} />
              ))}
            </div>
            <span className="text-[13px] text-muted">Captions are translated into your first language.</span>
          </fieldset>
          <button type="submit" hidden />
        </form>
        <Spacer min={28} />
        {m.isError && <p className="m-0 mb-3 text-center text-[14px] text-doc">{m.error.message}</p>}
        <PillButton disabled={!ok || m.isPending} onClick={submit}>
          {m.isPending ? "Creating your account…" : "Create doctor account"}
        </PillButton>
        <p className="m-0 mt-5 text-center text-[15px] text-muted">
          Already joined?{" "}
          <Link href="/doctor/login" className="font-semibold text-ink underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
        <AccountSwitch href="/signup" icon="profile" title="Not a doctor? Sign up for yourself" sub="Check your eyes and your family's" />
      </AuthBody>
    </AuthShell>
  );
}

/** After sign up: the Visus ID, big, with Copy. */
function VisusIdScreen({ id, onDone }: { id: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard
      ?.writeText(id)
      .then(() => setCopied(true))
      .catch(() => {});

  return (
    <AuthShell panel={<PanelTitle title="You're in." sub="Share your Visus ID with the clinics you work with." />}>
      <AuthBody>
        <div className="mt-6 lg:mt-0">
          <AuthTitle eyebrow="Doctor portal" title="Your Visus ID" sub="A clinic types this ID to add you. You approve their request, then set your hours." />
        </div>
        <div className="mt-8 flex flex-col items-center gap-4 rounded-[24px] border border-line bg-white px-5 py-8">
          <span className="font-mono text-[40px] font-bold tracking-[0.06em] md:text-[48px]" aria-label={`Visus ID ${id.split("").join(" ")}`}>
            {id}
          </span>
          <button
            type="button"
            onClick={copy}
            className="flex h-11 items-center gap-2 rounded-full border border-line-strong bg-white px-5 text-[15px] font-semibold transition-colors hover:bg-card-hover"
          >
            <Icon name={copied ? "check" : "doc"} size={18} strokeWidth={2} />
            {copied ? "Copied" : "Copy ID"}
          </button>
        </div>
        <p className="m-0 mt-4 text-center text-[14px] text-muted">You can find it again in Account.</p>
        <Spacer min={28} />
        <PillButton onClick={onDone}>Go to your consults</PillButton>
      </AuthBody>
    </AuthShell>
  );
}
