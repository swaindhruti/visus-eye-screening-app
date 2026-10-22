"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/Button";
import { Radio } from "@/components/Chip";
import { cn } from "@/components/cn";
import { Icon } from "@/components/Icon";
import { Screen, Spacer } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ErrorState } from "@/components/States";
import { initials, listProfiles, relationLabel } from "@/services/profiles";
import { useCheck } from "@/store/check";
import { useHydrated } from "@/store/hydrated";

export default function Who() {
  const router = useRouter();
  const q = useQuery({ queryKey: ["profiles"], queryFn: listProfiles });
  const stored = useCheck((s) => s.profileId);
  const current = useHydrated() ? stored : null;
  const [picked, setPicked] = useState<string | null>(null);

  if (q.isError) return <ErrorState onRetry={() => q.refetch()} retrying={q.isFetching} />;
  const list = q.data ?? [];
  const sel = picked ?? current ?? list[0]?.id ?? null;
  const person = list.find((p) => p.id === sel);

  return (
    <Screen gap="gap-0">
      <ScreenHeader title="New check" fallback="/home" />
      <h1 className="m-0 mt-5 text-[28px] font-bold leading-[1.15] tracking-[-0.025em]">Who is this check for?</h1>
      <p className="m-0 mt-1.5 text-[16px] leading-normal text-muted text-pretty">We&apos;ll tune the tests and save results to their profile.</p>

      <div className="mt-[22px] flex flex-none flex-col gap-2.5" role="radiogroup" aria-label="Who is this check for">
        {list.map((p, i) => {
          const on = p.id === sel;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setPicked(p.id)}
              className={cn(
                "flex min-h-[76px] items-center gap-3.5 rounded-[20px] border bg-white px-4 py-3 text-left transition-[border-color,box-shadow] duration-150",
                on ? "border-ink shadow-[inset_0_0_0_1px_#111111]" : "border-line-option hover:border-[#CFCFCA]",
              )}
            >
              <span className={cn("grid size-12 flex-none place-items-center rounded-full text-[16px] font-bold", i === 0 ? "bg-acc-soft text-acc-ink" : "bg-fill")}>{initials(p.name)}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="flex items-center gap-2 text-[17px] font-semibold">
                  {p.name}
                  {p.isChild && <span className="flex h-[22px] items-center rounded-full bg-mild-bg px-2 text-[12px] font-semibold text-mild">Kids mode</span>}
                </span>
                <span className="text-[14px] text-muted">
                  {relationLabel(p)} · {p.age} years
                </span>
              </span>
              <Radio on={on} />
            </button>
          );
        })}
        <Link href="/profile/family/new" className="flex min-h-[60px] items-center justify-center gap-2 rounded-[20px] border border-dashed border-[#BDBDB8] text-[16px] font-semibold hover:bg-white">
          <Icon name="plusSm" size={18} />
          Add someone
        </Link>
      </div>

      <Spacer />
      <Button
        disabled={!person}
        onClick={() => {
          if (!person) return;
          useCheck.getState().setProfile(person.id);
          router.push(person.isChild ? "/check/kids-intro" : "/check/intake");
        }}
      >
        Continue
      </Button>
    </Screen>
  );
}
