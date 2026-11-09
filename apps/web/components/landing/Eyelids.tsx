"use client";

import { useEffect, useState } from "react";

/**
 * Hero intro: dark "eyelids" open on load. Removed once the animation ends, so the full-size
 * SVG mask is never redrawn while scrolling. With reduced motion it never shows.
 */
export function Eyelids() {
  const [done, setDone] = useState(false);
  // Fallback in case animationend doesn't fire for mask content: the intro lasts 2.15 s.
  useEffect(() => {
    const t = setTimeout(() => setDone(true), 2600);
    return () => clearTimeout(t);
  }, []);
  if (done) return null;
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 z-20 size-full motion-reduce:hidden" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <mask id="eyelid-mask">
          <rect width="100" height="100" fill="white" />
          <path
            d="M-2 50Q50 8 102 50Q50 92 -2 50Z"
            fill="black"
            className="animate-eye-open"
            style={{ transformBox: "view-box", transformOrigin: "50px 50px", transform: "scale(3.2)" }}
            onAnimationEnd={() => setDone(true)}
          />
        </mask>
      </defs>
      <rect width="100" height="100" fill="#03050a" mask="url(#eyelid-mask)" />
    </svg>
  );
}
