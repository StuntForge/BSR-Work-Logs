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
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
}) {
  const bg = variant === "primary" ? colors.greenDark : variant === "danger" ? colors.red : colors.white;
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
      {loading ? <ActivityIndicator color={textColor} /> : <Text style={{ color: textColor, fontWeight: "600", fontSize: 15 }}>{title}</Text>}
    </TouchableOpacity>
  );
}

export function Badge({ label, tone = "gray" }: { label: string; tone?: "green" | "amber" | "red" | "gray" }) {
  const bg = { green: colors.greenLight, amber: "#f7ecd8", red: "#f5e0dc", gray: "#eee" }[tone];
  const fg = { green: colors.greenDark, amber: colors.amber, red: colors.red, gray: colors.textMuted }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${pct}%` }]} />
    </View>
  );
}

export function Screen({ children }: { children: React.ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  button: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
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
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.greenLight,
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.green,
  },
});
