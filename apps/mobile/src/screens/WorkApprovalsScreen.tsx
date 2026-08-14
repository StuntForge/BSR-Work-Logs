import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { apiFetch } from "../api/client";
import { Screen } from "../components/UI";
import { colors } from "../theme";

interface PendingItem {
  id: string;
  performerName: string;
  productionName: string;
  days: number;
  identifiables: number;
  submittedAt: string;
}

export default function WorkApprovalsScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await apiFetch<{ pending: PendingItem[] }>("/api/work-approvals");
    setItems(data.pending);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen>
      <Text style={styles.title}>Work Approvals</Text>
      <FlatList
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        data={items}
        keyExtractor={(i) => i.id}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={!loading ? <Text style={styles.muted}>Nothing outstanding.</Text> : null}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("Review", { id: item.id })}>
            <Text style={styles.performer}>{item.performerName}</Text>
            <Text style={styles.production}>{item.productionName}</Text>
            <Text style={styles.meta}>
              {item.days} day{item.days === 1 ? "" : "s"} · {item.identifiables} identifiable{item.identifiables === 1 ? "" : "s"}
            </Text>
          </TouchableOpacity>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "800", color: colors.greenDark, paddingHorizontal: 16, paddingTop: 16 },
  card: { backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10 },
  performer: { fontSize: 16, fontWeight: "700", color: colors.text },
  production: { fontSize: 14, color: colors.text, marginTop: 2 },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
  muted: { color: colors.textMuted, textAlign: "center", marginTop: 40 },
});
