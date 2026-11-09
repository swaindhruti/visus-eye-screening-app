// Line icons from the design. Each keeps the design's own viewBox so stroke widths match.
import type { ReactNode } from "react";

const ICONS = {
  home: { box: 24, el: <><path d="M3.5 11L12 4l8.5 7" /><path d="M6 9.5V20h12V9.5" /></> },
  eye: { box: 24, el: <><path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" /><circle cx={12} cy={12} r={3} /></> },
  results: { box: 24, el: <path d="M3.5 20.5h17M6.5 17v-5M12 17V6M17.5 17V9" /> },
  profile: { box: 24, el: <><circle cx={12} cy={8.5} r={4} /><path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6" /></> },
  share: { box: 24, el: <path d="M12 15V3.5M7.5 8L12 3.5 16.5 8M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5" /> },
  bolt: { box: 24, el: <path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" /> },
  plus: { box: 24, el: <path d="M12 5v14M5 12h14" /> },
  minus: { box: 20, el: <path d="M4 10h12" /> },
  plusSm: { box: 20, el: <path d="M4 10h12M10 4v12" /> },
  arrowRight: { box: 22, el: <path d="M4 11h13M12 5.5L17.5 11 12 16.5" /> },
  chevronRight: { box: 20, el: <path d="M7.5 4l6 6-6 6" /> },
  chevronLeft: { box: 20, el: <path d="M12.5 4l-6 6 6 6" /> },
  chevronDown: { box: 20, el: <path d="M4 7.5l6 6 6-6" /> },
  close: { box: 20, el: <path d="M5 5l10 10M15 5L5 15" /> },
  check: { box: 14, el: <path d="M2.5 7.5l3 3 6-7" /> },
  checkLg: { box: 24, el: <path d="M5 12.5l4.5 4.5L19 7.5" /> },
  lock: { box: 16, el: <><rect x={3} y={7} width={10} height={7} rx={2} /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></> },
  focus: { box: 26, el: <><circle cx={13} cy={13} r={8} /><circle cx={13} cy={13} r={1.8} fill="currentColor" /><path d="M13 2v4M13 20v4M2 13h4M20 13h4" /></> },
  health: { box: 26, el: <><path d="M2.5 13s4-7 10.5-7 10.5 7 10.5 7-4 7-10.5 7S2.5 13 2.5 13z" /><path d="M13 10v6M10 13h6" /></> },
  colour: { box: 26, el: <><circle cx={13} cy={9} r={5.5} /><circle cx={9} cy={16} r={5.5} /><circle cx={17} cy={16} r={5.5} /></> },
  comfort: { box: 26, el: <><rect x={3} y={4.5} width={20} height={13} rx={2.5} /><path d="M9.5 22h7M13 17.5V22" /></> },
  kids: { box: 26, el: <><circle cx={13} cy={13} r={10} /><path d="M8.5 15.5c1.2 1.8 2.7 2.7 4.5 2.7s3.3-.9 4.5-2.7" /><circle cx={9.5} cy={10.5} r={1} fill="currentColor" /><circle cx={16.5} cy={10.5} r={1} fill="currentColor" /></> },
  search: { box: 20, el: <><circle cx={9} cy={9} r={6} /><path d="M13.5 13.5L17 17" /></> },
  filter: { box: 20, el: <path d="M3 5h14M6 10h8M8.5 15h3" /> },
  settings: { box: 24, el: <><circle cx={12} cy={12} r={3} /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></> },
  sun: { box: 24, el: <><circle cx={12} cy={12} r={4} /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></> },
  ruler: { box: 24, el: <><path d="M3 12h18" /><path d="M6 9l-3 3 3 3M18 9l3 3-3 3" /></> },
  glasses: { box: 24, el: <><circle cx={6.5} cy={14} r={3.5} /><circle cx={17.5} cy={14} r={3.5} /><path d="M10 14c.7-.8 1.3-1 2-1s1.3.2 2 1M3 14l1.5-6M21 14l-1.5-6" /></> },
  camera: { box: 24, el: <><path d="M3.5 8.5A2 2 0 0 1 5.5 6.5h2l1.5-2h6l1.5 2h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" /><circle cx={12} cy={13} r={3.5} /></> },
  bell: { box: 24, el: <><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></> },
  speaker: { box: 24, el: <><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></> },
  stop: { box: 24, el: <rect x={7} y={7} width={10} height={10} rx={2} fill="currentColor" /> },
  download: { box: 24, el: <path d="M12 3.5V15M7.5 10.5L12 15l4.5-4.5M5 19.5h14" /> },
  pin: { box: 24, el: <><path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z" /><circle cx={12} cy={10} r={2.5} /></> },
  bookmark: { box: 24, el: <path d="M6.5 3.5h11v17L12 16l-5.5 4.5z" /> },
  alert: { box: 24, el: <><path d="M12 3.5L2.5 20h19z" /><path d="M12 10v4.5M12 17.3v.2" /></> },
  info: { box: 24, el: <><circle cx={12} cy={12} r={9} /><path d="M12 11v5.5M12 7.8v.2" /></> },
  wifiOff: { box: 24, el: <path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5-2.6M14.5 10.6A10 10 0 0 1 19 13M2 9.5a15 15 0 0 1 4.5-2.8M10.5 5.6A15 15 0 0 1 22 9.5M12 20h.01" /> },
  refresh: { box: 24, el: <path d="M20 11.5a8 8 0 1 1-2.3-5.6M20 4.5v5h-5" /> },
  send: { box: 24, el: <path d="M12 19V5M6 11l6-6 6 6" /> },
  pause: { box: 24, el: <path d="M9 6v12M15 6v12" /> },
  clock: { box: 24, el: <><circle cx={12} cy={12} r={8.5} /><path d="M12 7.5V12l3 2" /></> },
  calendar: { box: 24, el: <><rect x={3.5} y={5} width={17} height={15} rx={2.5} /><path d="M3.5 10h17M8 3v4M16 3v4" /></> },
  sparkle: { box: 24, el: <path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8z" /> },
  edit: { box: 24, el: <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" /> },
  logout: { box: 24, el: <path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15M10 16.5L14.5 12 10 7.5M14.5 12H4" /> },
  globe: { box: 24, el: <><circle cx={12} cy={12} r={9} /><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" /></> },
  database: { box: 24, el: <><ellipse cx={12} cy={6} rx={7.5} ry={2.8} /><path d="M4.5 6v12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V6M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8" /></> },
  shield: { box: 24, el: <path d="M12 3l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6z" /> },
  doc: { box: 24, el: <><path d="M6.5 3h8l4 4v14h-12z" /><path d="M14.5 3v4h4M9.5 12h5M9.5 16h5" /></> },
  store: { box: 24, el: <><path d="M4 9.5L5.5 4h13L20 9.5" /><path d="M4 9.5h16v1a3 3 0 0 1-5.3 1.9 3 3 0 0 1-5.4 0A3 3 0 0 1 4 10.5zM5.5 13v7.5h13V13" /></> },
  qr: { box: 24, el: <><rect x={3.5} y={3.5} width={6.5} height={6.5} rx={1} /><rect x={14} y={3.5} width={6.5} height={6.5} rx={1} /><rect x={3.5} y={14} width={6.5} height={6.5} rx={1} /><path d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18zM14 18.5v2M18.5 14h2" /></> },
  chat: { box: 24, el: <path d="M4 5.5h16v11H9.5L5 20v-3.5H4z" /> },
  star: { box: 24, el: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" /> },
  menu: { box: 24, el: <path d="M4 7h16M4 12h16M4 17h16" /> },
  bag: { box: 24, el: <><path d="M5 8h14l-1 12.5H6z" /><path d="M9 10V7a3 3 0 0 1 6 0v3" /></> },
  panel: { box: 24, el: <><rect x={3.5} y={4.5} width={17} height={15} rx={2.5} /><path d="M9.5 4.5v15" /></> },
} satisfies Record<string, { box: number; el: ReactNode }>;

export type IconName = keyof typeof ICONS;

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  /** In the icon's own viewBox units, as written in the design. */
  strokeWidth?: number;
  className?: string;
};

export function Icon({ name, size = 22, color = "currentColor", strokeWidth = 2, className }: Props) {
  const icon = ICONS[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${icon.box} ${icon.box}`}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {icon.el}
    </svg>
  );
}
