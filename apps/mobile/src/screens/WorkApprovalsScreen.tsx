import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { apiFetch } from "../api/client";
import { IconCircle } from "../components/UI";
import { Header } from "../components/Header";
import { IconClapperboard, IconCalendar, IconIdCard, IconChevronRight } from "../components/Icons";
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
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header variant="main" />
      <FlatList
        contentContainerStyle={styles.content}
        data={items}
        keyExtractor={(i) => i.id}
        refreshing={loading}
        onRefresh={load}
        ListHeaderComponent={<Text style={styles.title}>Work Approvals</Text>}
        ListEmptyComponent={!loading ? <Text style={styles.muted}>Nothing outstanding.</Text> : null}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("Review", { id: item.id })}>
            <IconCircle tone="amber" size={44}>
              <IconClapperboard size={20} color={colors.amber} />
            </IconCircle>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.performer}>{item.performerName}</Text>
              <Text style={styles.production}>{item.productionName}</Text>
              <View style={styles.metaRow}>
                <IconCalendar size={12} color={colors.textMuted} />
                <Text style={styles.meta}>{item.days} days</Text>
                <Text style={styles.metaDot}>•</Text>
                <IconIdCard size={12} color={colors.textMuted} />
                <Text style={styles.meta}>{item.identifiables} identifiables</Text>
              </View>
            </View>
            <IconChevronRight size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 60 },
  title: { fontSize: 28, fontWeight: "800", color: colors.text, marginBottom: 16 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  performer: { fontSize: 15, fontWeight: "800", color: colors.text },
  production: { fontSize: 13, color: colors.text, marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 },
  meta: { fontSize: 11, color: colors.textMuted },
  metaDot: { color: colors.textMuted, marginHorizontal: 2 },
  muted: { color: colors.textMuted, textAlign: "center", marginTop: 40 },
});
