import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { colors } from "../theme";

export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  icon,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}) {
  const bg = variant === "primary" ? colors.tealDark : variant === "danger" ? colors.red : colors.white;
  const textColor = variant === "secondary" ? colors.text : colors.white;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        { backgroundColor: bg, borderColor: variant === "secondary" ? colors.border : bg, opacity: disabled ? 0.5 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {icon}
          <Text style={{ color: textColor, fontWeight: "700", fontSize: 15 }}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const TONES = {
  green: { bg: colors.greenLight, fg: colors.green },
  teal: { bg: colors.tealLight, fg: colors.tealDark },
  amber: { bg: colors.amberLight, fg: colors.amber },
  red: { bg: colors.redLight, fg: colors.red },
  gray: { bg: "#eef1f1", fg: colors.textMuted },
  blue: { bg: colors.blueLight, fg: colors.blue },
  purple: { bg: colors.purpleLight, fg: colors.purple },
} as const;

export function Badge({ label, tone = "gray" }: { label: string; tone?: keyof typeof TONES }) {
  const { bg, fg } = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

export function IconCircle({
  children,
  tone = "teal",
  size = 44,
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONES;
  size?: number;
}) {
  const { bg } = TONES[tone];
  return (
    <View style={[styles.iconCircle, { backgroundColor: bg, width: size, height: size, borderRadius: size / 2 }]}>{children}</View>
  );
}

export function ProgressBar({ value, max, color = colors.teal, trackColor = colors.border }: { value: number; max: number; color?: string; trackColor?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <View style={[styles.progressTrack, { backgroundColor: trackColor }]}>
      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

export function Screen({ children }: { children: React.ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    shadowColor: "#023c48",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  button: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  iconCircle: { alignItems: "center", justifyContent: "center" },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
});
