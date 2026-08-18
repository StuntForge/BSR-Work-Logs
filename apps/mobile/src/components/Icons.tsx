import React from "react";
import Svg, { Path, Circle, Polyline, Line, Rect, Polygon } from "react-native-svg";

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const base = (size = 20, color = "currentColor") => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color });

export function IconClipboard({ size, color = "#000", strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1Z" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Rect x="5" y="5" width="14" height="16" rx="2" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconClock({ size, color = "#000", strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Circle cx="12" cy="12" r="9" strokeWidth={strokeWidth} />
      <Polyline points="12 7 12 12 15.5 14" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconSend({ size, color = "#000", strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Line x1="21" y1="3" x2="10" y2="14" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Polygon points="21 3 14 21 10 14 3 10 21 3" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconCheckCircle({ size, color = "#000", strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Circle cx="12" cy="12" r="9" strokeWidth={strokeWidth} />
      <Polyline points="8 12.5 10.8 15.3 16 9.5" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconXCircle({ size, color = "#000", strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Circle cx="12" cy="12" r="9" strokeWidth={strokeWidth} />
      <Line x1="9" y1="9" x2="15" y2="15" strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="15" y1="9" x2="9" y2="15" strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconClapperboard({ size, color = "#000", strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M4 9.5 5 5h14l1 4.5" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Rect x="4" y="9.5" width="16" height="9.5" rx="1.5" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="7" y1="5.3" x2="9" y2="9.3" strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="12" y1="5.3" x2="13.5" y2="9.3" strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="17" y1="5.3" x2="18" y2="9.3" strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconBell({ size, color = "#000", strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.7 21a2 2 0 0 1-3.4 0" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconAward({ size, color = "#000", strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Circle cx="12" cy="8" r="5.5" strokeWidth={strokeWidth} />
      <Path d="m8.2 12.9-1.6 7.6 5.4-2.8 5.4 2.8-1.6-7.6" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="9.5 8 11.2 9.7 14.8 6.3" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconClipboardCheck({ size, color = "#000", strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1Z" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Rect x="5" y="5" width="14" height="16" rx="2" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="9 13 11 15 15.5 10.5" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconFileCheck({ size, color = "#000", strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="13 3 13 8 18 8" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="9.5 15.5 11.2 17.2 14.8 13.4" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconCalendar({ size, color = "#000", strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Rect x="3" y="5" width="18" height="16" rx="2" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="16" y1="3" x2="16" y2="7" strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="8" y1="3" x2="8" y2="7" strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="3" y1="10" x2="21" y2="10" strokeWidth={strokeWidth} strokeLinecap="round" />
      <Polyline points="8.5 14 10 15.5 13 12.5" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconDocument({ size, color = "#000", strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="13 3 13 8 18 8" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="8" y1="13" x2="16" y2="13" strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="8" y1="17" x2="13" y2="17" strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconIdCard({ size, color = "#000", strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Rect x="2.5" y="5.5" width="19" height="13" rx="2" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="8" cy="10.6" r="1.6" strokeWidth={strokeWidth} />
      <Path d="M5.5 15.5c.5-1.6 1.7-2.4 2.5-2.4s2 .8 2.5 2.4" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="14" y1="9.5" x2="18.5" y2="9.5" strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="14" y1="12.5" x2="18.5" y2="12.5" strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconScale({ size, color = "#000", strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Line x1="12" y1="3" x2="12" y2="21" strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="6" y1="6" x2="18" y2="6" strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M4 6l-2.5 5.5a3 3 0 0 0 5 0Z" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20 6l-2.5 5.5a3 3 0 0 0 5 0Z" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="9" y1="21" x2="15" y2="21" strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconChevronRight({ size, color = "#000", strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Polyline points="9 6 15 12 9 18" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconChevronDown({ size, color = "#000", strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Polyline points="6 9 12 15 18 9" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconArrowLeft({ size, color = "#000", strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Line x1="19" y1="12" x2="5" y2="12" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="12 19 5 12 12 5" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconLogout({ size, color = "#000", strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="16 17 21 12 16 7" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="21" y1="12" x2="9" y2="12" strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconSettings({ size, color = "#000", strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Circle cx="12" cy="12" r="3" strokeWidth={strokeWidth} />
      <Path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconHome({ size, color = "#000", strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="m3 11 9-8 9 8" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconBriefcase({ size, color = "#000", strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Rect x="2.5" y="7.5" width="19" height="12.5" rx="2" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 7.5V5.5a1.5 1.5 0 0 1 1.5-1.5h5A1.5 1.5 0 0 1 16 5.5v2" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="2.5" y1="13" x2="21.5" y2="13" strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function IconShieldCheck({ size, color = "#000", strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="9 12 11 14 15.5 9.5" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconPlus({ size, color = "#000", strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Line x1="12" y1="5" x2="12" y2="19" strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="5" y1="12" x2="19" y2="12" strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconCheck({ size, color = "#000", strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Polyline points="5 12.5 9.5 17 19 6.5" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconEye({ size, color = "#000", strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M2 12c2.4-4.8 6.4-7.5 10-7.5s7.6 2.7 10 7.5c-2.4 4.8-6.4 7.5-10 7.5S4.4 16.8 2 12Z" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="12" r="3" strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function IconEyeOff({ size, color = "#000", strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path
        d="M3.5 3.5l17 17M6.6 6.9C4.4 8.4 2.9 10.2 2 12c2.4 4.8 6.4 7.5 10 7.5 1.6 0 3.2-.5 4.6-1.4M9.9 5.1C10.6 5 11.3 4.9 12 4.9c3.6 0 7.6 2.7 10 7.5-.7 1.4-1.6 2.7-2.6 3.7"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M9.9 10.1a3 3 0 0 0 4.1 4.1" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconPencil({ size, color = "#000", strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path
        d="M14.5 4.5l5 5L8 21H3v-5L14.5 4.5Z"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1="12.5" y1="6.5" x2="17.5" y2="11.5" strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconLaurelBadge({ size, color = "#000", strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Polygon points="12 2.5 20.5 7.5 20.5 16.5 12 21.5 3.5 16.5 3.5 7.5" strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Polygon points="12 8 14.2 10.9 13.5 14.3 12 15.7 10.5 14.3 9.8 10.9" strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Path d="M6 10c1 2 1 4.5 1.5 6.5M6 10c.8.4 1.6.5 2 1.6M6 10c.5 1 .3 2 .8 3" strokeWidth={strokeWidth - 0.3} strokeLinecap="round" />
      <Path d="M18 10c-1 2-1 4.5-1.5 6.5M18 10c-.8.4-1.6.5-2 1.6M18 10c-.5 1-.3 2-.8 3" strokeWidth={strokeWidth - 0.3} strokeLinecap="round" />
    </Svg>
  );
}

export function IconClipboardUser({ size, color = "#000", strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1Z" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Rect x="5" y="5" width="14" height="16" rx="2" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="12.3" r="2.1" strokeWidth={strokeWidth} />
      <Path d="M8.7 17.5c.5-1.9 1.9-2.9 3.3-2.9s2.8 1 3.3 2.9" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconTrash({ size, color = "#000", strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color)}>
      <Polyline points="4 7 20 7" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="10" y1="11" x2="10" y2="17" strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="14" y1="11" x2="14" y2="17" strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}
