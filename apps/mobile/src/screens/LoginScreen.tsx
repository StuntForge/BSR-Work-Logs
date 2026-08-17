import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, ScrollView, TouchableOpacity, Platform } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/UI";
import { IconEye, IconEyeOff } from "../components/Icons";
import { colors } from "../theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>BSR</Text>
        <Text style={styles.subtitle}>Member Progress &amp; Upgrade System</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword((s) => !s)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              {showPassword ? <IconEyeOff size={20} color={colors.textMuted} /> : <IconEye size={20} color={colors.textMuted} />}
            </TouchableOpacity>
          </View>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Button title={loading ? "Signing in..." : "Sign in"} onPress={handleLogin} disabled={loading} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.cream, padding: 24, justifyContent: "center" },
  brand: { fontSize: 34, fontWeight: "800", color: colors.greenDark, textAlign: "center" },
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: "center", marginBottom: 32 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: colors.white,
    color: colors.text,
  },
  passwordRow: { position: "relative", justifyContent: "center" },
  passwordInput: { paddingRight: 44 },
  eyeButton: { position: "absolute", right: 12 },
  error: { color: colors.red, marginBottom: 12, fontSize: 13 },
});
