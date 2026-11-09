import { cn } from "../cn";

// Seeded random, so the server and the browser draw the same iris.
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const f1 = (n: number) => +n.toFixed(1);
const pt = (r: number, a: number) => `${f1(r * Math.cos(a))} ${f1(r * Math.sin(a))}`;

const WARM = ["#d99a4e", "#b8742f", "#e8b46c"];
const COOL = ["#8cc6ff", "#5aa2e0", "#3c7ebe", "#b5dbff", "#2a6aa6"];

const FIBERS = (() => {
  const rand = seeded(11);
  return Array.from({ length: 260 }, (_, i) => {
    const a = (i / 260) * Math.PI * 2 + (rand() - 0.5) * 0.04;
    const warm = rand() < 0.38;
    const r1 = 54 + rand() * 8;
    const r2 = warm ? 72 + rand() * 22 : 110 + rand() * 42;
    const bend = (rand() - 0.5) * 0.16;
    return {
      d: `M${pt(r1, a)}Q${pt((r1 + r2) / 2, a + bend)} ${pt(r2, a + bend * 0.4)}`,
      color: (warm ? WARM : COOL)[Math.floor(rand() * (warm ? WARM.length : COOL.length))],
      opacity: f1(0.2 + rand() * 0.55),
      width: f1(0.5 + rand() * 1.1),
    };
  });
})();

const CRYPTS = (() => {
  const rand = seeded(5);
  return Array.from({ length: 22 }, () => {
    const a = rand() * Math.PI * 2;
    const r = 78 + rand() * 50;
    return { x: f1(r * Math.cos(a)), y: f1(r * Math.sin(a)), rx: f1(2.5 + rand() * 5), ry: f1(1.2 + rand() * 2), rot: f1((a * 180) / Math.PI) };
  });
})();

const VB = "-200 -200 400 400";

/**
 * A macro iris drawn in SVG: fibres turn slowly, the pupil breathes, light sits on top for depth.
 * Stacked SVG layers, so the moving parts animate as cheap composited transforms.
 */
export function Iris({ id, className, still }: { id: string; className?: string; still?: boolean }) {
  const g = (n: string) => `${id}-${n}`;
  const layer = "absolute inset-0 size-full";
  return (
    <div className={cn("relative", className)} aria-hidden>
      <svg viewBox={VB} className={layer}>
        <defs>
          <radialGradient id={g("glow")} r="0.5">
            <stop offset="0.55" stopColor="#7abdff" stopOpacity="0.35" />
            <stop offset="1" stopColor="#7abdff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={g("base")} gradientUnits="userSpaceOnUse" r="154">
            <stop offset="0" stopColor="#000" />
            <stop offset="0.33" stopColor="#24160a" />
            <stop offset="0.42" stopColor="#8a5a26" />
            <stop offset="0.53" stopColor="#2f6ea8" />
            <stop offset="0.76" stopColor="#1d5287" />
            <stop offset="0.92" stopColor="#0c2744" />
            <stop offset="1" stopColor="#02060c" />
          </radialGradient>
        </defs>
        <circle r="198" fill={`url(#${g("glow")})`} />
        <circle r="154" fill={`url(#${g("base")})`} />
      </svg>

      <svg viewBox={VB} className={cn(layer, !still && "animate-spin-slow")}>
        {FIBERS.map((f, i) => (
          <path key={i} d={f.d} stroke={f.color} strokeOpacity={f.opacity} strokeWidth={f.width} fill="none" strokeLinecap="round" />
        ))}
        {CRYPTS.map((c, i) => (
          <ellipse key={i} cx={c.x} cy={c.y} rx={c.rx} ry={c.ry} transform={`rotate(${c.rot} ${c.x} ${c.y})`} fill="#04101d" fillOpacity="0.55" />
        ))}
      </svg>

      <svg viewBox={VB} className={cn(layer, !still && "animate-pupil")}>
        <defs>
          <filter id={g("pupil")} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        </defs>
        <circle r="56" fill="#000" fillOpacity="0.5" filter={`url(#${g("pupil")})`} />
        <circle r="50" fill="#010204" />
      </svg>

      <svg viewBox={VB} className={layer}>
        <defs>
          <radialGradient id={g("shade")} gradientUnits="userSpaceOnUse" cx="-40" cy="-55" r="230">
            <stop offset="0" stopColor="#fff" stopOpacity="0.14" />
            <stop offset="0.45" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.7" />
          </radialGradient>
          <filter id={g("soft")} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <filter id={g("haze")} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        </defs>
        {/* Collarette and limbal ring. */}
        <circle r="86" fill="none" stroke="#f0b870" strokeOpacity="0.28" strokeWidth="5" filter={`url(#${g("haze")})`} />
        <circle r="148" fill="none" stroke="#02070e" strokeOpacity="0.85" strokeWidth="14" filter={`url(#${g("haze")})`} />
        <circle r="154" fill={`url(#${g("shade")})`} />
        {/* Reflections: a soft window and a sharp catchlight. */}
        <ellipse cx="-58" cy="-70" rx="36" ry="20" transform="rotate(-32 -58 -70)" fill="#fff" fillOpacity="0.55" filter={`url(#${g("soft")})`} />
        <circle cx="34" cy="-44" r="6" fill="#fff" fillOpacity="0.9" />
        <path d="M-120 60 A136 136 0 0 0 40 132" fill="none" stroke="#fff" strokeOpacity="0.12" strokeWidth="6" strokeLinecap="round" filter={`url(#${g("haze")})`} />
      </svg>
    </div>
  );
}
