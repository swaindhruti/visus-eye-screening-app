import { Screen } from "@/components/Screen";
import { Skeleton, SkeletonCards } from "@/components/Skeleton";

/** Shown while a portal page opens (the sidebar stays): a spinner with the page's shape below it. */
export default function Loading() {
  return (
    <Screen wide gap="gap-5 md:gap-7">
      <div className="flex items-center gap-3">
        <span className="size-5 flex-none animate-spin rounded-full border-[3px] border-line-option border-t-ink motion-reduce:animate-none" aria-hidden />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-8 w-56" />
        </div>
      </div>
      <SkeletonCards count={3} label="Opening the page…" />
    </Screen>
  );
}
