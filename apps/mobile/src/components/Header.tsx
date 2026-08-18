import React from "react";
import { View, Text, ImageBackground, TouchableOpacity, StyleSheet, Image, useWindowDimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme";
import { GRADE_COLORS, type GradeKey } from "@bsr/shared";
import { IconArrowLeft, IconSettings } from "./Icons";

const banner = require("../../assets/app-banner.png");
// app-logo.png has a heavy "distressed" texture baked into its alpha channel — looks fine at
// large sizes but turns into a gray haze when shrunk to header size, so the header uses a
// separately thresholded/cropped variant for a crisp result instead.
const logo = require("../../assets/app-logo-header.png");

const TALL_CONTENT_HEIGHT = 190;
const SHORT_CONTENT_HEIGHT = 64;
const BARE_CONTENT_HEIGHT = 64;

interface HeaderProps {
  variant?: "main" | "detail" | "bare";
  title?: string;
  extraHeight?: number;
  /** detail variant only — an optional icon button on the right. */
  rightAction?: { icon: React.ReactNode; onPress: () => void };
  /** detail variant only — overrides the default navigation.goBack(), e.g. to save before leaving. */
  onBack?: () => void;
  /** detail variant only — overrides the default back arrow, e.g. a tick when back also saves. */
  backIcon?: React.ReactNode;
  /** main variant only — member's name/grade/target line, shown below the logo row (Home screen). */
  name?: string;
  gradeKey?: string;
  gradeLabel?: string;
  targetLine?: string;
  /** main variant only — overrides the default gear action (navigate to Settings), e.g. to go back from the Settings screen itself. */
  onGearPress?: () => void;
}

// Shared banner header used at the top of every screen. `variant="main"` shows the logo + gear
// (Home, Settings); `variant="bare"` shows just the banner backdrop with no content (Work
// Records, Approvals, Notifications — branding lives on Home only); `variant="detail"` shows a
// back arrow + title (Production detail, Review, New production). Height always includes the
// safe-area top inset so content never sits under a notch/status bar.
export function Header({
  variant = "main",
  title,
  extraHeight = 0,
  rightAction,
  onBack,
  backIcon,
  name,
  gradeKey,
  gradeLabel,
  targetLine,
  onGearPress,
}: HeaderProps) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const baseHeight = variant === "detail" ? SHORT_CONTENT_HEIGHT : variant === "bare" ? BARE_CONTENT_HEIGHT : TALL_CONTENT_HEIGHT;
  const contentHeight = baseHeight + extraHeight;
  const gradeColor = gradeKey && gradeKey in GRADE_COLORS ? GRADE_COLORS[gradeKey as GradeKey] : colors.teal;

  return (
    <ImageBackground
      source={banner}
      style={[styles.banner, { width: screenWidth, height: contentHeight + insets.top }]}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      {variant === "main" ? (
        <>
          <View style={[styles.mainRow, { paddingTop: insets.top + 20 }]}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
            <TouchableOpacity
              style={styles.gearButton}
              onPress={onGearPress ?? (() => navigation.navigate("Settings"))}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <IconSettings size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          {name && (
            <View style={styles.identityBlock}>
              <View style={styles.identityNameRow}>
                <View style={styles.identityAccent} />
                <Text style={styles.identityName}>{name}</Text>
              </View>
              {gradeLabel && <Text style={[styles.identityGrade, { color: gradeColor }]}>{gradeLabel.toUpperCase()}</Text>}
              {targetLine && <Text style={styles.identityTarget}>{targetLine}</Text>}
            </View>
          )}
        </>
      ) : variant === "bare" ? null : (
        <View style={[styles.detailRow, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={onBack ?? (() => navigation.goBack())} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            {backIcon ?? <IconArrowLeft size={24} color="#fff" />}
          </TouchableOpacity>
          <Text style={[styles.detailTitle, { flex: 1 }]}>{title}</Text>
          {rightAction && (
            <TouchableOpacity onPress={rightAction.onPress} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              {rightAction.icon}
            </TouchableOpacity>
          )}
        </View>
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: "100%",
    paddingHorizontal: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 30, 36, 0.42)",
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  logo: { width: 200, height: 88 },
  gearButton: { marginTop: 4, padding: 2 },
  identityBlock: { marginTop: 8 },
  identityNameRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  identityAccent: { width: 4, height: 26, borderRadius: 2, backgroundColor: colors.teal },
  identityName: { color: "#fff", fontSize: 24, fontWeight: "800" },
  identityGrade: { fontSize: 13, fontWeight: "800", letterSpacing: 1, marginTop: 6, marginLeft: 14 },
  identityTarget: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 4, marginLeft: 14 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  detailTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
});
