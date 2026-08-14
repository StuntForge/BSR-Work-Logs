import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { apiFetch } from "../api/client";
import { Badge, Screen } from "../components/UI";
import { colors } from "../theme";

interface WorkRecordSummary {
  id: string;
  productionName: string;
  status: string;
  days: number;
  identifiables: number;
  fullMember: { id: string; name: string } | null;
  createdAt: string;
}

const FILTERS = ["All", "Ongoing", "Submitted", "Approved", "Rejected"];

const STATUS_TONE: Record<string, "green" | "amber" | "red" | "gray"> = {
  ONGOING: "gray",
  SUBMITTED: "amber",
  APPROVED: "green",
  REJECTED: "red",
  ARCHIVED: "gray",
};

export default function WorkListScreen() {
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<"ongoing" | "archive">("ongoing");
  const [filter, setFilter] = useState("All");
  const [records, setRecords] = useState<WorkRecordSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ tab });
    if (tab === "ongoing" && filter !== "All") params.set("status", filter);
    const data = await apiFetch<{ records: WorkRecordSummary[] }>(`/api/work-records?${params.toString()}`);
    setRecords(data.records);
    setLoading(false);
  }, [tab, filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Work</Text>
        {tab === "ongoing" && (
          <TouchableOpacity style={styles.newButton} onPress={() => navigation.navigate("NewProduction")}>
            <Text style={styles.newButtonText}>+ New</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabs}>
        {(["ongoing", "archive"] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === "ongoing" ? "Ongoing" : "Archive"}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "ongoing" && (
        <View style={styles.filters}>
          {FILTERS.map((f) => (
            <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        data={records}
        keyExtractor={(r) => r.id}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={!loading ? <Text style={styles.muted}>Nothing here yet.</Text> : null}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("ProductionDetail", { id: item.id })}>
            <View style={styles.rowBetween}>
              <Text style={styles.productionName}>{item.productionName}</Text>
              <Badge label={item.status} tone={STATUS_TONE[item.status] ?? "gray"} />
            </View>
            <Text style={styles.meta}>
              {item.days} day{item.days === 1 ? "" : "s"} · {item.identifiables} identifiable{item.identifiables === 1 ? "" : "s"}
              {item.fullMember ? ` · ${item.fullMember.name}` : ""}
            </Text>
          </TouchableOpacity>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 16 },
  title: { fontSize: 22, fontWeight: "800", color: colors.greenDark },
  newButton: { backgroundColor: colors.greenDark, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  newButtonText: { color: colors.white, fontWeight: "700" },
  tabs: { flexDirection: "row", marginTop: 12, paddingHorizontal: 16, gap: 8 },
  tab: { paddingVertical: 8, paddingHorizontal: 4, marginRight: 16, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: colors.green },
  tabText: { color: colors.textMuted, fontWeight: "600" },
  tabTextActive: { color: colors.greenDark },
  filters: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, marginTop: 8, gap: 8 },
  filterChip: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.greenLight },
  filterChipActive: { backgroundColor: colors.green },
  filterText: { fontSize: 12, color: colors.greenDark, fontWeight: "600" },
  filterTextActive: { color: colors.white },
  card: { backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  productionName: { fontSize: 16, fontWeight: "700", color: colors.text, flexShrink: 1, marginRight: 8 },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
  muted: { color: colors.textMuted, textAlign: "center", marginTop: 40 },
});
