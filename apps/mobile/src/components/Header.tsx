import React from "react";
import { View, Text, ImageBackground, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../theme";
import { useAuth } from "../auth/AuthContext";
import { IconArrowLeft, IconLogout } from "./Icons";

const banner = require("../../assets/app-banner.png");
const logo = require("../../assets/app-logo.png");

// Shared banner header used at the top of every screen. `variant="main"` shows the full logo
// lockup + sign out (Home/Work/Notifications); `variant="detail"` shows a back arrow + title
// (Production detail, Review, New production).
export function Header({ variant = "main", title }: { variant?: "main" | "detail"; title?: string }) {
  const navigation = useNavigation<any>();
  const { logout } = useAuth();

  return (
    <ImageBackground source={banner} style={[styles.banner, variant === "detail" ? styles.bannerShort : styles.bannerTall]} resizeMode="cover">
      <View style={styles.overlay} />
      {variant === "main" ? (
        <View style={styles.mainRow}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <TouchableOpacity style={styles.signOut} onPress={logout}>
            <Text style={styles.signOutText}>Sign out</Text>
            <IconLogout size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.detailRow}>
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
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  bannerTall: { height: 190 },
  bannerShort: { height: 96, justifyContent: "center", paddingBottom: 0 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 30, 36, 0.42)",
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  logo: { width: 150, height: 66 },
  signOut: { flexDirection: "row", alignItems: "center", gap: 6 },
  signOutText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  detailTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
});
