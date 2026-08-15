import React from "react";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";

// Wraps screen content so the keyboard never covers the field being typed into. iOS needs
// "padding" behavior; Android's default resize handles it, but a small "height" behavior nudge
// keeps it consistent when the OS-level resize is suppressed (e.g. edge-to-edge windows).
export function KeyboardAvoider({ children }: { children: React.ReactNode }) {
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}>
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
