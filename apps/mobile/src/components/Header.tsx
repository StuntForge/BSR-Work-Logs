import React from "react";
import { View, Text, ImageBackground, TouchableOpacity, StyleSheet, Image, useWindowDimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme";
import { useAuth } from "../auth/AuthContext";
import { IconArrowLeft, IconLogout } from "./Icons";

const banner = require("../../assets/app-banner.png");
// app-logo.png has a heavy "distressed" texture baked into its alpha channel — looks fine at
// large sizes but turns into a gray haze when shrunk to header size, so the header uses a
// separately thresholded/cropped variant for a crisp result instead.
const logo = require("../../assets/app-logo-header.png");

const TALL_CONTENT_HEIGHT = 190;
const SHORT_CONTENT_HEIGHT = 64;

interface HeaderProps {
  variant?: "main" | "detail";
  title?: string;
  extraHeight?: number;
  /** detail variant only — an optional icon button on the right. */
  rightAction?: { icon: React.ReactNode; onPress: () => void };
  /** detail variant only — overrides the default navigation.goBack(), e.g. to save before leaving. */
  onBack?: () => void;
  /** detail variant only — overrides the default back arrow, e.g. a tick when back also saves. */
  backIcon?: React.ReactNode;
}

// Shared banner header used at the top of every screen. `variant="main"` shows the full logo
// lockup + sign out (Home/Work/Notifications), anchored near the TOP of the banner; `variant=
// "detail"` shows a back arrow + title (Production detail, Review, New production). Height
// always includes the safe-area top inset so content never sits under a notch/status bar.
export function Header({ variant = "main", title, extraHeight = 0, rightAction, onBack, backIcon }: HeaderProps) {
  const navigation = useNavigation<any>();
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const contentHeight = (variant === "detail" ? SHORT_CONTENT_HEIGHT : TALL_CONTENT_HEIGHT) + extraHeight;

  return (
    <ImageBackground
      source={banner}
      style={[styles.banner, { width: screenWidth, height: contentHeight + insets.top }]}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      {variant === "main" ? (
        <View style={[styles.mainRow, { paddingTop: insets.top + 20 }]}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <TouchableOpacity style={styles.signOut} onPress={logout} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.signOutText}>Sign out</Text>
            <IconLogout size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.detailRow, { paddingTop: insets.top + 12 }]}>
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
  signOut: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  signOutText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  detailTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
});
