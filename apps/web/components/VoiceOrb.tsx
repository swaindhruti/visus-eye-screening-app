import { cn } from "./cn";

export type VoiceState = "idle" | "speaking" | "listening" | "thinking";

const LABEL: Record<VoiceState, string> = { idle: "Talk mode is on", speaking: "Visus is speaking", listening: "Listening", thinking: "Thinking" };
const SHAPE = [0.45, 0.75, 1, 0.75, 0.45];

/**
 * The talk-mode visualizer: five bars in a round pill. Listening, the bars follow the mic level;
 * speaking, they move on their own; thinking, they pulse. Still when reduced motion is on.
 */
export function VoiceOrb({ state, level = 0, size = 56, className }: { state: VoiceState; level?: number; size?: number; className?: string }) {
  const active = state !== "idle";
  return (
    <span
      role="status"
      aria-label={LABEL[state]}
      className={cn(
        "relative grid flex-none place-items-center rounded-full transition-colors duration-300",
        state === "listening" ? "bg-acc-soft" : state === "speaking" ? "bg-ink" : "bg-fill",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {state === "listening" && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-acc-soft opacity-60 motion-reduce:hidden" />}
      <span aria-hidden className="relative flex items-center gap-[3px]" style={{ height: size * 0.42 }}>
        {SHAPE.map((h, i) => {
          const height = state === "listening" ? 0.18 + Math.min(1, level * 1.6) * h * 0.82 : state === "idle" ? 0.18 : h * 0.6;
          return (
            <span
              key={i}
              className={cn(
                "w-[3px] rounded-full transition-[height] duration-100 motion-reduce:animate-none",
                state === "speaking" ? "animate-voice-bar bg-white" : state === "thinking" ? "animate-pulse bg-acc-ink" : state === "listening" ? "bg-acc-ink" : "bg-muted",
              )}
              style={{ height: `${Math.round(height * 100)}%`, animationDelay: active ? `${i * 120}ms` : undefined }}
            />
          );
        })}
      </span>
    </span>
  );
}
