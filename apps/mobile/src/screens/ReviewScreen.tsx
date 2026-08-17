import React, { useCallback, useRef, useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, ActivityIndicator, Switch } from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { Calendar } from "react-native-calendars";
import { apiFetch } from "../api/client";
import { Card, Button, Badge, IconCircle } from "../components/UI";
import { Header } from "../components/Header";
import { KeyboardAvoider } from "../components/KeyboardAvoider";
import { IconCalendar, IconDocument, IconIdCard, IconScale, IconCheckCircle, IconXCircle, IconPencil } from "../components/Icons";
import { colors } from "../theme";
import { useBadges } from "../navigation/BadgeContext";

interface RecordDetail {
  id: string;
  productionName: string;
  status: string;
  performer: { id: string; name: string };
  approvedDays: number;
  workDates: { id: string; date: string; status: string }[];
  identifiables: { id: string; category: { id: string; label: string }; performerDescription: string; verifiedDescription: string | null; status: string; selfCoordinated: boolean }[];
  evidenceDocuments: { id: string; fileUrl: string; fileName: string }[];
  isUnitCoordinatorDay: boolean;
  isAssistantCoordinatorDay: boolean;
}
interface LocalIdentifiableDecision {
  id: string;
  categoryLabel: string;
  performerDescription: string;
  verifiedDescription: string;
  decision: "PENDING" | "APPROVED" | "REJECTED";
  selfCoordinated: boolean;
}

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <IconCircle tone="teal" size={36}>
        {icon}
      </IconCircle>
      <Text style={styles.sectionLabel}>{label}</Text>
    </View>
  );
}

export default function ReviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id: string = route.params.id;
  const { refresh: refreshBadges } = useBadges();

  const [record, setRecord] = useState<RecordDetail | null>(null);
  const [showDates, setShowDates] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editSelfCoordinated, setEditSelfCoordinated] = useState(false);
  // Local, optimistic copy of workDates so rejecting a date updates the calendar instantly
  // instead of waiting on the server round trip.
  const [localDates, setLocalDates] = useState<RecordDetail["workDates"]>([]);
  // Identifiable decisions are local-only until the final Approve/Reject — this is a short
  // single-sitting review, no need to persist partial progress if the FM leaves the screen.
  const [localIdentifiables, setLocalIdentifiables] = useState<LocalIdentifiableDecision[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    const data = await apiFetch<{ record: RecordDetail }>(`/api/work-records/${id}`);
    setRecord(data.record);
    setLocalDates(data.record.workDates);
    setLocalIdentifiables(
      data.record.identifiables.map((i) => ({
        id: i.id,
        categoryLabel: i.category.label,
        performerDescription: i.performerDescription,
        verifiedDescription: i.verifiedDescription ?? i.performerDescription,
        decision: i.status === "SUBMITTED" ? "PENDING" : i.status === "APPROVED" ? "APPROVED" : "REJECTED",
        selfCoordinated: i.selfCoordinated,
      }))
    );
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!record) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header variant="detail" title="Review" />
        <ActivityIndicator style={{ marginTop: 40 }} />
      </View>
    );
  }

  const claimedCount = localDates.filter((d) => d.status === "CLAIMED").length;

  function rejectDate(dateId: string) {
    setLocalDates((prev) => prev.map((d) => (d.id === dateId ? { ...d, status: "REJECTED" } : d)));
    apiFetch(`/api/work-records/${id}/dates/${dateId}/reject`, { method: "POST" }).catch(() => load());
  }

  function decideIdentifiableLocal(identifiableId: string, decision: "APPROVED" | "REJECTED", verifiedDescription?: string, selfCoordinated?: boolean) {
    setLocalIdentifiables((prev) =>
      prev.map((i) =>
        i.id === identifiableId
          ? { ...i, decision, verifiedDescription: verifiedDescription ?? i.verifiedDescription, selfCoordinated: selfCoordinated ?? i.selfCoordinated }
          : i
      )
    );
    setEditingId(null);
  }

  async function completeDecision(decision: "APPROVED" | "REJECTED") {
    if (decision === "REJECTED" && !message.trim()) {
      setError("A reason is required when rejecting.");
      return;
    }
    if (decision === "APPROVED" && localIdentifiables.some((i) => i.decision === "PENDING")) {
      setError("Respond to every identifiable (Approve, Edit, or Reject) before approving this work record.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const decided = localIdentifiables.filter((i) => i.decision !== "PENDING");
      await Promise.all(
        decided.map((i) =>
          apiFetch(`/api/work-records/${id}/identifiables/${i.id}/decision`, {
            method: "PATCH",
            body: JSON.stringify({
              action: i.decision === "APPROVED" ? "edit" : "reject",
              verifiedDescription: i.decision === "APPROVED" ? i.verifiedDescription : undefined,
              selfCoordinated: i.decision === "APPROVED" ? i.selfCoordinated : undefined,
            }),
          })
        )
      );
      await apiFetch(`/api/work-records/${id}/decision`, { method: "POST", body: JSON.stringify({ decision, message: message || undefined }) });
      refreshBadges();
      navigation.goBack();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const markedDates: Record<string, any> = {};
  for (const d of localDates) {
    markedDates[d.date.slice(0, 10)] = { selected: true, selectedColor: d.status === "REJECTED" ? colors.red : colors.green };
  }

  const isReviewable = record.status === "SUBMITTED";

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header variant="detail" title="Review" />
      <KeyboardAvoider>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{record.performer.name}</Text>
        <Text style={styles.subtitle}>{record.productionName}</Text>

        <Card style={styles.card}>
          <View style={styles.rowBetween}>
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={styles.plainLabel}>DAYS</Text>
                {record.isUnitCoordinatorDay && <Badge label="UNIT COORDINATOR" tone="teal" />}
                {record.isAssistantCoordinatorDay && <Badge label="ASSISTANT COORDINATOR" tone="teal" />}
              </View>
              <Text style={styles.bigNumber}>{claimedCount}</Text>
            </View>
            <Button title={showDates ? "Hide dates" : "View Dates"} variant="secondary" icon={<IconCalendar size={16} color={colors.text} />} onPress={() => setShowDates((s) => !s)} />
          </View>
          {(record.isUnitCoordinatorDay || record.isAssistantCoordinatorDay) && (
            <Text style={styles.muted}>
              {record.isUnitCoordinatorDay
                ? "Confirm this person worked as a Unit Coordinator for ALL of the days listed."
                : "Please confirm this person was the assistant coordinator on these days."}
            </Text>
          )}
          {showDates && (
            <View style={{ marginTop: 12 }}>
              <Calendar
                markedDates={markedDates}
                onDayPress={(day) => {
                  if (!isReviewable) return;
                  const match = localDates.find((d) => d.date.slice(0, 10) === day.dateString && d.status === "CLAIMED");
                  if (match) rejectDate(match.id);
                }}
                theme={{ selectedDayBackgroundColor: colors.green, todayTextColor: colors.green, arrowColor: colors.green }}
              />
              <Text style={styles.muted}>Tap a claimed (green) date to reject it. Rejected dates turn red.</Text>
            </View>
          )}
        </Card>

        <Card style={styles.card}>
          <SectionHeader icon={<IconDocument size={17} color={colors.tealDark} />} label="CONTRACT / EVIDENCE" />
          {record.evidenceDocuments.length === 0 && <Text style={styles.muted}>None uploaded.</Text>}
          {record.evidenceDocuments.map((doc) => (
            <Text key={doc.id} style={{ marginTop: 4 }}>
              {doc.fileName}
            </Text>
          ))}
        </Card>

        {!record.isUnitCoordinatorDay && !record.isAssistantCoordinatorDay && (
        <Card style={styles.card}>
          <SectionHeader icon={<IconIdCard size={17} color={colors.tealDark} />} label={`IDENTIFIABLES (${localIdentifiables.length})`} />
          {localIdentifiables.map((idf, i) => (
            <View key={idf.id} style={[styles.idBlock, i > 0 && styles.idBlockDivider]}>
              <View style={styles.idHeaderRow}>
                <IconCircle tone="teal" size={44}>
                  <IconIdCard size={20} color={colors.tealDark} />
                </IconCircle>
                <View style={{ flex: 1 }}>
                  <Text style={styles.idCategory}>{idf.categoryLabel}</Text>
                  {editingId !== idf.id && <Text style={styles.idDesc}>{idf.verifiedDescription}</Text>}
                  {editingId !== idf.id && idf.selfCoordinated && (
                    <View style={{ marginTop: 4 }}>
                      <Badge label="Performer claims: Self-Coordinated" tone="amber" />
                    </View>
                  )}
                </View>
              </View>

              {editingId === idf.id ? (
                <View style={{ marginTop: 10 }}>
                  <TextInput style={styles.input} value={editText} onChangeText={setEditText} multiline />
                  <View style={[styles.row, { justifyContent: "space-between", marginTop: 10 }]}>
                    <Text style={styles.plainLabel}>Self-Coordinated?</Text>
                    <Switch value={editSelfCoordinated} onValueChange={setEditSelfCoordinated} />
                  </View>
                  <View style={{ marginTop: 10, gap: 8 }}>
                    <Button title="Save & Approve" onPress={() => decideIdentifiableLocal(idf.id, "APPROVED", editText, editSelfCoordinated)} />
                    <Button title="Cancel" variant="secondary" onPress={() => setEditingId(null)} />
                  </View>
                </View>
              ) : idf.decision !== "PENDING" ? (
                <View style={{ marginTop: 10 }}>
                  <Badge label={idf.decision} tone={idf.decision === "APPROVED" ? "green" : "red"} />
                </View>
              ) : (
                isReviewable && (
                  <View style={{ marginTop: 12, gap: 8 }}>
                    <Button title="Approve" icon={<IconCheckCircle size={16} color="#fff" />} onPress={() => decideIdentifiableLocal(idf.id, "APPROVED")} />
                    <Button
                      title="Edit"
                      variant="secondary"
                      icon={<IconPencil size={16} color={colors.text} />}
                      onPress={() => {
                        setEditingId(idf.id);
                        setEditText(idf.verifiedDescription);
                        setEditSelfCoordinated(idf.selfCoordinated);
                      }}
                    />
                    <Button title="Reject" variant="danger" icon={<IconXCircle size={16} color="#fff" />} onPress={() => decideIdentifiableLocal(idf.id, "REJECTED")} />
                  </View>
                )
              )}
            </View>
          ))}
          {localIdentifiables.length === 0 && <Text style={styles.muted}>None submitted.</Text>}
        </Card>
        )}

        {isReviewable ? (
          <Card style={styles.card}>
            <SectionHeader icon={<IconScale size={17} color={colors.tealDark} />} label="DECISION" />
            <TextInput
              style={[styles.input, { minHeight: 60 }]}
              multiline
              placeholder="Message (optional on approve, required on reject)"
              value={message}
              onChangeText={setMessage}
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)}
            />
            {error && <Text style={{ color: colors.red, marginBottom: 8 }}>{error}</Text>}
            <View style={styles.row}>
              <Button title="Approve" icon={<IconCheckCircle size={16} color="#fff" />} onPress={() => completeDecision("APPROVED")} disabled={busy} loading={busy} />
              <Button title="Reject" variant="danger" icon={<IconXCircle size={16} color="#fff" />} onPress={() => completeDecision("REJECTED")} disabled={busy} />
            </View>
          </Card>
        ) : (
          <Card style={styles.card}>
            <Badge label={record.status} tone={record.status === "APPROVED" ? "green" : "gray"} />
          </Card>
        )}
      </ScrollView>
      </KeyboardAvoider>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 60, gap: 12 },
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 2, marginBottom: 4 },
  card: {},
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  row: { flexDirection: "row", gap: 8, marginTop: 8 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  sectionLabel: { fontSize: 13, fontWeight: "800", color: colors.tealDark, letterSpacing: 0.4 },
  plainLabel: { fontSize: 12, fontWeight: "800", color: colors.textMuted, letterSpacing: 0.4 },
  bigNumber: { fontSize: 30, fontWeight: "800", color: colors.tealDark, marginTop: 4 },
  idBlock: { paddingVertical: 14 },
  idBlockDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  idHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  idCategory: { fontSize: 16, fontWeight: "800", color: colors.tealDark, marginBottom: 2 },
  idDesc: { fontSize: 14, color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, backgroundColor: colors.white, marginTop: 6 },
  muted: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
});
