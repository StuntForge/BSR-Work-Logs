import React from "react";
import { View, Text, ImageBackground, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme";
import { useAuth } from "../auth/AuthContext";
import { IconArrowLeft, IconLogout } from "./Icons";

const banner = require("../../assets/app-banner.png");
const logo = require("../../assets/app-logo.png");

const TALL_CONTENT_HEIGHT = 190;
const SHORT_CONTENT_HEIGHT = 64;

// Shared banner header used at the top of every screen. `variant="main"` shows the full logo
// lockup + sign out (Home/Work/Notifications); `variant="detail"` shows a back arrow + title
// (Production detail, Review, New production). Height always includes the safe-area top inset
// so content never sits under a notch/status bar.
export function Header({ variant = "main", title, extraHeight = 0 }: { variant?: "main" | "detail"; title?: string; extraHeight?: number }) {
  const navigation = useNavigation<any>();
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();

  const contentHeight = (variant === "detail" ? SHORT_CONTENT_HEIGHT : TALL_CONTENT_HEIGHT) + extraHeight;

  return (
    <ImageBackground source={banner} style={[styles.banner, { height: contentHeight + insets.top }]} resizeMode="cover">
      <View style={styles.overlay} />
      {variant === "main" ? (
        <View style={[styles.mainRow, { paddingBottom: 18 }]}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <TouchableOpacity style={styles.signOut} onPress={logout} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.signOutText}>Sign out</Text>
            <IconLogout size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.detailRow, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <IconArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.detailTitle}>{title}</Text>
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
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  logo: { width: 200, height: 88 },
  signOut: { flexDirection: "row", alignItems: "center", gap: 6 },
  signOutText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  detailTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
});
