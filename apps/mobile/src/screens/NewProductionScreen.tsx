import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { apiFetch } from "../api/client";
import { Button } from "../components/UI";
import { Header } from "../components/Header";
import { colors } from "../theme";

export default function NewProductionScreen() {
  const navigation = useNavigation<any>();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!name.trim()) {
      setError("Enter a production name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const data = await apiFetch<{ id: string }>("/api/work-records", { method: "POST", body: JSON.stringify({ productionName: name.trim() }) });
      navigation.replace("ProductionDetail", { id: data.id });
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header variant="detail" title="New production" />
      <View style={styles.content}>
        <Text style={styles.label}>Production name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} autoFocus placeholder="e.g. The Long Ride" />
        {error && <Text style={styles.error}>{error}</Text>}
        <View style={{ marginTop: 16 }}>
          <Button title={saving ? "Creating..." : "Create"} onPress={create} disabled={saving} loading={saving} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  label: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, backgroundColor: colors.white },
  error: { color: colors.red, marginTop: 8, fontSize: 13 },
});
