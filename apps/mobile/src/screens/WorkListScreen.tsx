import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { apiFetch } from "../api/client";
import { Badge, Card, IconCircle } from "../components/UI";
import { Header } from "../components/Header";
import { IconPlus, IconClipboard, IconClock, IconSend, IconCheckCircle, IconXCircle, IconClapperboard, IconCalendar, IconIdCard, IconChevronRight } from "../components/Icons";
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

const FILTERS: { key: string; label: string; icon: (c: string) => React.ReactNode; tone: "teal" | "amber" | "green" | "red" }[] = [
  { key: "All", label: "All Jobs", icon: (c) => <IconClipboard color={c} size={20} />, tone: "teal" },
  { key: "Ongoing", label: "Ongoing", icon: (c) => <IconClock color={c} size={20} />, tone: "teal" },
  { key: "Submitted", label: "Submitted", icon: (c) => <IconSend color={c} size={20} />, tone: "amber" },
  { key: "Approved", label: "Approved", icon: (c) => <IconCheckCircle color={c} size={20} />, tone: "green" },
  { key: "Rejected", label: "Rejected", icon: (c) => <IconXCircle color={c} size={20} />, tone: "red" },
];

const STATUS_TONE: Record<string, "green" | "amber" | "red" | "gray" | "teal"> = {
  ONGOING: "teal",
  SUBMITTED: "amber",
  APPROVED: "green",
  REJECTED: "red",
  ARCHIVED: "gray",
};

export default function WorkListScreen() {
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<"ongoing" | "archive">("ongoing");
  const [filter, setFilter] = useState("All");
  // Always the FULL, unfiltered set for the current tab — filtering happens client-side so the
  // stat-strip counts stay global instead of collapsing to whatever the last filter returned.
  const [allRecords, setAllRecords] = useState<WorkRecordSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await apiFetch<{ records: WorkRecordSummary[] }>(`/api/work-records?tab=${tab}`);
    setAllRecords(data.records);
    setLoading(false);
  }, [tab]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const displayed = useMemo(() => {
    if (tab !== "ongoing" || filter === "All") return allRecords;
    return allRecords.filter((r) => r.status === filter.toUpperCase());
  }, [allRecords, tab, filter]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header variant="main" />
      <FlatList
        contentContainerStyle={styles.content}
        data={displayed}
        keyExtractor={(r) => r.id}
        refreshing={loading}
        onRefresh={load}
        ListHeaderComponent={
          <>
            <View style={styles.headerRow}>
              <Text style={styles.title}>Work</Text>
              {tab === "ongoing" && (
                <TouchableOpacity style={styles.newButton} onPress={() => navigation.navigate("NewProduction")}>
                  <IconPlus size={16} color="#fff" />
                  <Text style={styles.newButtonText}>New Job</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.tabs}>
              {(["ongoing", "archive"] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={styles.tab}
                  onPress={() => {
                    setTab(t);
                    setFilter("All");
                  }}
                >
                  <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === "ongoing" ? "Qualifying Work" : "Archive"}</Text>
                  {tab === t && <View style={styles.tabUnderline} />}
                </TouchableOpacity>
              ))}
            </View>

            {tab === "ongoing" && (
              <Card style={styles.statStrip}>
                {FILTERS.map((f, i) => {
                  const active = filter === f.key;
                  const count = f.key === "All" ? allRecords.length : allRecords.filter((r) => r.status === f.key.toUpperCase()).length;
                  const toneColor = ({ teal: colors.tealDark, amber: colors.amber, green: colors.green, red: colors.red } as any)[f.tone];
                  return (
                    <React.Fragment key={f.key}>
                      <TouchableOpacity style={[styles.statCell, active && styles.statCellActive]} onPress={() => setFilter(f.key)}>
                        <IconCircle tone={f.tone} size={40}>
                          {f.icon(active ? "#fff" : toneColor)}
                        </IconCircle>
                        <Text style={[styles.statCount, { color: toneColor }]}>{count}</Text>
                        <Text style={styles.statLabel}>{f.label}</Text>
                      </TouchableOpacity>
                      {i < FILTERS.length - 1 && <View style={styles.statDivider} />}
                    </React.Fragment>
                  );
                })}
              </Card>
            )}

            <Text style={styles.sectionLabel}>{tab === "ongoing" ? "QUALIFYING WORK" : "ARCHIVED JOBS"}</Text>
          </>
        }
        ListEmptyComponent={!loading ? <Text style={styles.muted}>Nothing here yet.</Text> : null}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("ProductionDetail", { id: item.id })}>
            <IconCircle tone="teal" size={48}>
              <IconClapperboard size={22} color={colors.tealDark} />
            </IconCircle>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.productionName}>{item.productionName}</Text>
              <View style={{ marginTop: 4, alignSelf: "flex-start" }}>
                <Badge label={item.status} tone={STATUS_TONE[item.status] as any} />
              </View>
              <View style={styles.metaRow}>
                <IconCalendar size={13} color={colors.textMuted} />
                <Text style={styles.meta}>{item.days} days</Text>
                <Text style={styles.metaDot}>•</Text>
                <IconIdCard size={13} color={colors.textMuted} />
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
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  newButton: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.tealDark, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  newButtonText: { color: colors.white, fontWeight: "700", fontSize: 14 },
  tabs: { flexDirection: "row", marginTop: 18, gap: 24 },
  tab: { paddingBottom: 8 },
  tabText: { color: colors.textMuted, fontWeight: "700", fontSize: 15 },
  tabTextActive: { color: colors.tealDark },
  tabUnderline: { height: 2, backgroundColor: colors.tealDark, marginTop: 6, borderRadius: 1 },
  statStrip: { flexDirection: "row", marginTop: 16, paddingVertical: 14, paddingHorizontal: 4 },
  statCell: { flex: 1, alignItems: "center", gap: 6, borderRadius: 12, paddingVertical: 4 },
  statCellActive: { borderWidth: 1.5, borderColor: colors.tealDark },
  statCount: { fontSize: 18, fontWeight: "800" },
  statLabel: { fontSize: 10, color: colors.textMuted, fontWeight: "600", textAlign: "center" },
  statDivider: { width: 1, backgroundColor: colors.border, marginVertical: 8 },
  sectionLabel: { fontSize: 12, fontWeight: "800", color: colors.tealDark, letterSpacing: 0.5, marginTop: 22, marginBottom: 10 },
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
  productionName: { fontSize: 16, fontWeight: "800", color: colors.text },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  meta: { fontSize: 12, color: colors.textMuted },
  metaDot: { color: colors.textMuted, marginHorizontal: 2 },
  muted: { color: colors.textMuted, textAlign: "center", marginTop: 40 },
});
