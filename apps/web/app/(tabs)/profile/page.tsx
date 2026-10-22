"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { Card } from "@/components/Card";
import { Chip, ChipAvatar, StatusBadge } from "@/components/Chip";
import { Icon } from "@/components/Icon";
import { ListRow } from "@/components/ListRow";
import { Screen } from "@/components/Screen";
import { ErrorState } from "@/components/States";
import { daysAgo, fmtShort, useToday } from "@/lib/dates";
import { me } from "@/services/auth";
import { eyewearLabel, fmtPower, initials, isOwner, listProfiles, relationLabel } from "@/services/profiles";
import { listSessions } from "@/services/sessions";

export default function Profile() {
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: listProfiles });
  const user = useQuery({ queryKey: ["me"], queryFn: me });
  const history = useQuery({ queryKey: ["sessions"], queryFn: listSessions });
  const today = useToday();
  const [sel, setSel] = useState(0);

  if (profiles.isError) return <ErrorState onRetry={() => profiles.refetch()} retrying={profiles.isFetching} />;
  const list = profiles.data ?? [];
  const p = list[sel] ?? list[0];
  const isMe = !!p && isOwner(p);
  const last = p ? history.data?.find((s) => s.profileId === p.id) : undefined;
  const signedIn = user.data ? (/@/.test(user.data.user.identifier) ? "Signed in with email" : "Signed in with phone") : " ";
  const rx = p?.prescription;

  return (
    <Screen tabs gap="gap-5" eyebrow={user.isPending ? " " : signedIn} title="Profile">
      <div className="flex flex-col gap-5 md:grid md:grid-cols-2 md:items-start md:gap-6">
      {p && (
        <>
          <div className="flex flex-col gap-5">
          <Card className="flex flex-none items-center gap-3.5">
            <span className="grid size-[60px] flex-none place-items-center rounded-full bg-acc-soft text-[21px] font-bold text-acc-ink">{initials(p.name)}</span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[20px] font-bold tracking-[-0.01em]">{p.name}</span>
              <span className="text-[14px] text-muted">
                {p.age} years · {isMe ? p.gender || "You" : relationLabel(p)}
              </span>
            </div>
            <Link href={`/profile/edit?id=${p.id}`} className="grid h-9 place-items-center rounded-full border border-line-strong bg-white px-3.5 text-[14px] font-semibold hover:bg-pearl">
              Edit
            </Link>
          </Card>

          <section className="flex flex-none flex-col gap-2.5">
            <h3 className="m-0 text-[18px] font-bold tracking-[-0.01em]">Family</h3>
            <div className="flex flex-wrap gap-2">
              {list.map((m, i) => (
                <Chip
                  key={m.id}
                  label={isOwner(m) ? "You" : m.name.split(" ")[0]}
                  selected={i === sel}
                  onClick={() => setSel(i)}
                  leading={<ChipAvatar initial={m.name[0]} selected={i === sel} />}
                />
              ))}
              <Link href="/profile/family/new" className="flex h-11 items-center gap-1.5 rounded-full border border-dashed border-[#BDBDB8] pl-3 pr-4 text-[15px] font-semibold hover:bg-white">
                <Icon name="plusSm" size={18} />
                Add member
              </Link>
            </div>
          </section>
          </div>

          <section className="flex flex-none flex-col gap-2.5">
            <h3 className="m-0 text-[18px] font-bold tracking-[-0.01em]">{isMe ? "My eyes" : `${p.name.split(" ")[0]}'s eyes`}</h3>
            <Card flush>
              <ListRow first href={`/profile/glasses?id=${p.id}`} icon={<Icon name="glasses" size={22} strokeWidth={1.8} />} title="Glasses" subtitle={p.eyewear && p.eyewear !== "none" ? eyewearLabel(p.eyewear) : p.wearsGlasses ? "Glasses" : "None"} />
              <ListRow
                href={last ? `/results/${last.id}` : "/results"}
                icon={<Icon name="calendar" size={20} strokeWidth={1.8} />}
                title="Last check"
                subtitle={last ? `${fmtShort(last.date)}${today ? ` · ${daysAgo(last.date, today).toLowerCase()}` : ""}` : "No checks yet"}
                right={last ? <StatusBadge status={last.status} label={last.status === "good" ? "All clear" : undefined} /> : undefined}
                chevron={false}
              />
              <ListRow href={`/profile/glasses?id=${p.id}`} icon={<Icon name="eye" size={20} strokeWidth={1.8} />} title="Saved lens" subtitle={p.savedLens ? p.savedLens.product : rx ? `R ${fmtPower(rx.right.sph)} · L ${fmtPower(rx.left.sph)}` : "No saved lens yet"} />
            </Card>
          </section>
        </>
      )}

      </div>
      <Card flush className="md:max-w-[calc(50%-12px)]">
        <ListRow first href="/settings" icon={<Icon name="settings" size={20} strokeWidth={1.8} />} title="Settings" subtitle="Reminders, privacy, data" className="min-h-16" />
      </Card>
    </Screen>
  );
}
