// Line icons from the design. Each keeps the design's own viewBox, so the
// stroke widths used in the design render at the same thickness here.
import type { ReactNode } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Colors } from '@/constants/theme';

const ICONS = {
  home: {
    box: 24,
    el: (
      <>
        <Path d="M3.5 11L12 4l8.5 7" />
        <Path d="M6 9.5V20h12V9.5" />
      </>
    ),
  },
  eye: {
    box: 24,
    el: (
      <>
        <Path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" />
        <Circle cx={12} cy={12} r={3} />
      </>
    ),
  },
  results: { box: 24, el: <Path d="M3.5 20.5h17M6.5 17v-5M12 17V6M17.5 17V9" /> },
  profile: {
    box: 24,
    el: (
      <>
        <Circle cx={12} cy={8.5} r={4} />
        <Path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6" />
      </>
    ),
  },
  eyeOff: {
    box: 24,
    el: (
      <>
        <Path d="M3.5 3.5l17 17" />
        <Path d="M10.6 5.6c.5-.1.9-.1 1.4-.1 6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.6 6.6C3.9 8.4 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.6 0 3-.4 4.3-1" />
        <Path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      </>
    ),
  },
  checkLarge: { box: 24, el: <Path d="M5 12.5l4.5 4.5L19 7.5" /> },
  check: { box: 14, el: <Path d="M2.5 7.5l3 3 6-7" /> },
  minus: { box: 20, el: <Path d="M4 10h12" /> },
  plusBold: { box: 20, el: <Path d="M4 10h12M10 4v12" /> },
  // Test categories (Tests tiles).
  focus: {
    box: 26,
    el: (
      <>
        <Circle cx={13} cy={13} r={8} />
        <Circle cx={13} cy={13} r={1.8} fill="currentColor" />
        <Path d="M13 2v4M13 20v4M2 13h4M20 13h4" />
      </>
    ),
  },
  eyeHealth: {
    box: 26,
    el: (
      <>
        <Path d="M2.5 13s4-7 10.5-7 10.5 7 10.5 7-4 7-10.5 7S2.5 13 2.5 13z" />
        <Path d="M13 10v6M10 13h6" />
      </>
    ),
  },
  colour: {
    box: 26,
    el: (
      <>
        <Circle cx={13} cy={9} r={5.5} />
        <Circle cx={9} cy={16} r={5.5} />
        <Circle cx={17} cy={16} r={5.5} />
      </>
    ),
  },
  comfort: {
    box: 26,
    el: (
      <>
        <Rect x={3} y={4.5} width={20} height={13} rx={2.5} />
        <Path d="M9.5 22h7M13 17.5V22" />
      </>
    ),
  },
  kids: {
    box: 26,
    el: (
      <>
        <Circle cx={13} cy={13} r={10} />
        <Path d="M8.5 15.5c1.2 1.8 2.7 2.7 4.5 2.7s3.3-.9 4.5-2.7" />
        <Circle cx={9.5} cy={10.5} r={1} fill="currentColor" />
        <Circle cx={16.5} cy={10.5} r={1} fill="currentColor" />
      </>
    ),
  },
  sun: {
    box: 24,
    el: (
      <>
        <Circle cx={12} cy={12} r={4} />
        <Path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
      </>
    ),
  },
  armsLength: { box: 24, el: <Path d="M3 12h18M6 9l-3 3 3 3M18 9l3 3-3 3" /> },
  glasses: {
    box: 24,
    el: (
      <>
        <Circle cx={6.5} cy={14} r={3.5} />
        <Circle cx={17.5} cy={14} r={3.5} />
        <Path d="M10 14h4M3 14l1.5-6M21 14l-1.5-6" />
      </>
    ),
  },
  mic: {
    box: 24,
    el: (
      <>
        <Rect x={9} y={3} width={6} height={11} rx={3} />
        <Path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
      </>
    ),
  },
  send: { box: 20, el: <Path d="M10 16V4M5 9l5-5 5 5" /> },
  speaker: {
    box: 24,
    el: (
      <>
        <Path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" />
        <Path d="M15.5 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />
      </>
    ),
  },
  stop: { box: 24, el: <Rect x={6.5} y={6.5} width={11} height={11} rx={2} fill="currentColor" stroke="none" /> },
  share: { box: 24, el: <Path d="M12 15V3.5M7.5 8L12 3.5 16.5 8M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5" /> },
  bolt: { box: 24, el: <Path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" /> },
  plus: { box: 24, el: <Path d="M12 5v14M5 12h14" /> },
  arrowRight: { box: 22, el: <Path d="M4 11h13M12 5.5L17.5 11 12 16.5" /> },
  // Tumbling E answer buttons (rotated per direction).
  arrow: { box: 24, el: <Path d="M4 12h15M13 6l6 6-6 6" /> },
  // Switch eye: palm covering an eye.
  hand: {
    box: 24,
    el: (
      <Path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4a1.5 1.5 0 0 1 3 0v6M14 10V5.5a1.5 1.5 0 0 1 3 0V13c0 4-2.5 7.5-6.5 7.5-2.4 0-4-1.3-5.2-3.2L3.8 14a1.5 1.5 0 0 1 2.4-1.8L8 14" />
    ),
  },
  exit: {
    box: 24,
    el: (
      <>
        <Path d="M14 4.5h4.5v15H14" />
        <Path d="M10 8l-4 4 4 4M6 12h9.5" />
      </>
    ),
  },
  // Kids tests.
  star: { box: 24, el: <Path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z" /> },
  circle: { box: 24, el: <Circle cx={12} cy={12} r={8.5} /> },
  square: { box: 24, el: <Rect x={4} y={4} width={16} height={16} rx={2} /> },
  nothing: {
    box: 24,
    el: (
      <>
        <Circle cx={12} cy={12} r={8.5} />
        <Path d="M6 18L18 6" />
      </>
    ),
  },
  parent: {
    box: 24,
    el: (
      <>
        <Circle cx={8} cy={7} r={3} />
        <Circle cx={17} cy={9.5} r={2.3} />
        <Path d="M2.5 20c.6-3.6 2.8-5.5 5.5-5.5s4.9 1.9 5.5 5.5M14 15.2c.9-.5 1.9-.7 3-.7 2.3 0 4 1.6 4.5 4.5" />
      </>
    ),
  },
  // End of check.
  warning: {
    box: 24,
    el: (
      <>
        <Path d="M12 3.5L21.5 20h-19z" />
        <Path d="M12 10v4.5M12 17.3v.2" />
      </>
    ),
  },
  pin: {
    box: 24,
    el: (
      <>
        <Path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
        <Circle cx={12} cy={10} r={2.3} />
      </>
    ),
  },
  download: { box: 24, el: <Path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" /> },
  info: {
    box: 24,
    el: (
      <>
        <Circle cx={12} cy={12} r={9} />
        <Path d="M12 11v5M12 8v.2" />
      </>
    ),
  },
  amsler: { box: 24, el: <Path d="M3 12h18M3 7h18M3 17h18M7 3v18M12 3c-1.5 3 1.5 6 0 9s1.5 6 0 9M17 3v18" /> },
  screen: {
    box: 24,
    el: (
      <>
        <Rect x={3} y={4.5} width={18} height={12} rx={2.5} />
        <Path d="M9 20.5h6M12 16.5v4" />
      </>
    ),
  },
  shield: { box: 24, el: <Path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /> },
  bookmark: { box: 24, el: <Path d="M6.5 3.5h11v17L12 16.5l-5.5 4z" /> },
  bookmarkOn: { box: 24, el: <Path d="M6.5 3.5h11v17L12 16.5l-5.5 4z" fill="currentColor" /> },
  infoMark: { box: 24, el: <Path d="M12 10.5v6M12 7.3v.2" /> },
  bulb: { box: 24, el: <Path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" /> },
  whatsapp: { box: 24, el: <Path d="M4.5 19.5l1.2-3.8A8 8 0 1 1 8.6 18.5z" /> },
  calendar: {
    box: 24,
    el: (
      <>
        <Rect x={3.5} y={5} width={17} height={15} rx={3} />
        <Path d="M3.5 10h17M8 3v4M16 3v4" />
      </>
    ),
  },
  lens: {
    box: 24,
    el: (
      <>
        <Circle cx={12} cy={12} r={8.5} />
        <Path d="M8 9.5a5 5 0 0 1 4-2" />
      </>
    ),
  },
  sliders: {
    box: 24,
    el: (
      <>
        <Path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
        <Circle cx={16} cy={7} r={2} />
        <Circle cx={10} cy={17} r={2} />
      </>
    ),
  },
  globe: {
    box: 24,
    el: (
      <>
        <Circle cx={12} cy={12} r={9} />
        <Path d="M3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z" />
      </>
    ),
  },
  textSize: { box: 24, el: <Path d="M3 19l5-14 5 14M4.8 14h6.4M15 19l3-8 3 8M15.9 16.5h4.2" /> },
  phone: {
    box: 24,
    el: (
      <>
        <Rect x={6.5} y={2.5} width={11} height={19} rx={2.8} />
        <Path d="M10.5 18.2h3" />
      </>
    ),
  },
  padlock: {
    box: 24,
    el: (
      <>
        <Rect x={5} y={10.5} width={14} height={9.5} rx={2.5} />
        <Path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
      </>
    ),
  },
  bell: {
    box: 24,
    el: (
      <>
        <Path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" />
        <Path d="M10 20.5a2 2 0 0 0 4 0" />
      </>
    ),
  },
  shieldCheck: {
    box: 24,
    el: (
      <>
        <Path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
        <Path d="M9 12l2 2 4-4" />
      </>
    ),
  },
  pause: {
    box: 24,
    el: (
      <>
        <Rect x={7} y={5.5} width={3.5} height={13} rx={1} fill="currentColor" stroke="none" />
        <Rect x={13.5} y={5.5} width={3.5} height={13} rx={1} fill="currentColor" stroke="none" />
      </>
    ),
  },
  play: { box: 24, el: <Path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none" /> },
  restart: {
    box: 24,
    el: (
      <>
        <Path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
        <Path d="M4.5 4.5v4h4" />
      </>
    ),
  },
  clock: {
    box: 24,
    el: (
      <>
        <Circle cx={12} cy={12} r={8.5} />
        <Path d="M12 7.5V12l3 2" />
      </>
    ),
  },
  /** Quick check row icons (59). */
  dial: { box: 26, el: <Path d="M13 3v6M13 17v6M3 13h6M17 13h6M5.9 5.9l4.2 4.2M15.9 15.9l4.2 4.2M20.1 5.9l-4.2 4.2M10.1 15.9l-4.2 4.2" /> },
  grid: {
    box: 28,
    el: (
      <>
        <Rect x={1} y={1} width={26} height={26} />
        <Path d="M7.5 1v26M14 1v26M20.5 1v26M1 7.5h26M1 14h26M1 20.5h26" />
        <Circle cx={14} cy={14} r={2.2} fill="currentColor" stroke="none" />
      </>
    ),
  },
  glassesOff: {
    box: 24,
    el: (
      <>
        <Circle cx={6.5} cy={14} r={3.5} />
        <Circle cx={17.5} cy={14} r={3.5} />
        <Path d="M10 14h4M3 14l1.5-6M21 14l-1.5-6" />
        <Path d="M3 3.5l18 17" />
      </>
    ),
  },
  alertMark: { box: 24, el: <Path d="M12 6.5v7M12 17.3v.2" /> },
  search: {
    box: 24,
    el: (
      <>
        <Circle cx={11} cy={11} r={6.5} />
        <Path d="M16 16l4.5 4.5" />
      </>
    ),
  },
  searchMinus: {
    box: 24,
    el: (
      <>
        <Circle cx={11} cy={11} r={6.5} />
        <Path d="M16 16l4.5 4.5M8.5 11h5" />
      </>
    ),
  },
  wifiOff: {
    box: 24,
    el: (
      <>
        <Path d="M3 3l18 18" />
        <Path d="M8.5 16.5a5 5 0 0 1 7 0M5 12.8a10 10 0 0 1 5-2.6M19 12.8a10 10 0 0 0-2.4-1.7M2 9.2a15 15 0 0 1 4.2-2.6M22 9.2A15 15 0 0 0 11 5.1" />
      </>
    ),
  },
  alertCircle: {
    box: 24,
    el: (
      <>
        <Circle cx={12} cy={12} r={9} />
        <Path d="M12 7.5v5.5M12 16.3v.2" />
      </>
    ),
  },
  chevronRight: { box: 20, el: <Path d="M7.5 4l6 6-6 6" /> },
  chevronLeft: { box: 20, el: <Path d="M12.5 4l-6 6 6 6" /> },
  close: { box: 20, el: <Path d="M5 5l10 10M15 5L5 15" /> },
  lock: {
    box: 16,
    el: (
      <>
        <Rect x={3} y={7} width={10} height={7} rx={2} />
        <Path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
      </>
    ),
  },
  // Remote consult call controls.
  video: {
    box: 24,
    el: (
      <>
        <Rect x={3} y={6.5} width={12.5} height={11} rx={2.5} />
        <Path d="M15.5 10.5l5.5-3v9l-5.5-3" />
      </>
    ),
  },
  videoOff: {
    box: 24,
    el: (
      <>
        <Path d="M15.5 13.5v1.5a2.5 2.5 0 0 1-2.5 2.5H5.5A2.5 2.5 0 0 1 3 15V9a2.5 2.5 0 0 1 2.5-2.5h1M10 6.5h3a2.5 2.5 0 0 1 2.5 2.5v1.5l5.5-3v9" />
        <Path d="M3 3l18 18" />
      </>
    ),
  },
  micOff: {
    box: 24,
    el: (
      <>
        <Path d="M9 9V6a3 3 0 0 1 6 0v5M15 13.5A3 3 0 0 1 9 11M5.5 11a6.5 6.5 0 0 0 10.6 5M18.5 11a6.4 6.4 0 0 1-.6 2.7M12 17.5V21" />
        <Path d="M3 3l18 18" />
      </>
    ),
  },
  hangUp: { box: 24, el: <Path d="M3 14.5c0-2.5 4-4.5 9-4.5s9 2 9 4.5v1.5a1 1 0 0 1-1.2 1l-3.3-.7a1 1 0 0 1-.8-1V13.5a12 12 0 0 0-7.4 0v1.8a1 1 0 0 1-.8 1l-3.3.7A1 1 0 0 1 3 16z" /> },
  document: {
    box: 24,
    el: (
      <>
        <Path d="M6.5 3h7.5l4.5 4.5V20a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
        <Path d="M13.5 3v5h5M8.5 12.5h7M8.5 16h5" />
      </>
    ),
  },
} satisfies Record<string, { box: number; el: ReactNode }>;

export type IconName = keyof typeof ICONS;

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  /** In the icon's own viewBox units, as written in the design. */
  strokeWidth?: number;
};

export function Icon({ name, size = 22, color = Colors.ink, strokeWidth = 2 }: Props) {
  const icon = ICONS[name];
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${icon.box} ${icon.box}`}
      color={color}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round">
      {icon.el}
    </Svg>
  );
}
