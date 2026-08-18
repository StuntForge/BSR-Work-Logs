import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors } from "../theme";

export function ProgressRing({
  percent,
  size = 76,
  strokeWidth = 7,
  color = colors.teal,
  trackColor = colors.border,
  centerLabel,
  subLabel,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  centerLabel: string;
  subLabel?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference * (1 - clamped / 100);

  return (
    <View style={{ width: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFillObject, styles.center]}>
        <Text style={[styles.centerLabel, { color }]}>{centerLabel}</Text>
        {subLabel && <Text style={styles.subLabel}>{subLabel}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  centerLabel: { fontSize: 17, fontWeight: "800" },
  subLabel: { fontSize: 10, fontWeight: "600", color: colors.textMuted, marginTop: 1 },
});

// Two-tone ring — purely decorative (not literally proportional to the two values, since they
// measure unrelated things), used behind the Full Member "Lifetime Impact" stat rows.
export function DualRing({
  size = 130,
  strokeWidth = 12,
  segments,
}: {
  size?: number;
  strokeWidth?: number;
  segments: { value: number; color: string }[];
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const gapLen = (6 / 360) * circumference;
  const usable = circumference - gapLen * segments.length;

  let offsetAccum = 0;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {segments.map((seg, i) => {
          const segLen = Math.max((seg.value / total) * usable, usable * 0.15);
          const dashoffset = -offsetAccum;
          offsetAccum += segLen + gapLen;
          return (
            <Circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={seg.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${segLen} ${circumference - segLen}`}
              strokeDashoffset={dashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${size / 2}, ${size / 2}`}
            />
          );
        })}
      </Svg>
    </View>
  );
}
