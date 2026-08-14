import React, { useCallback, useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { Calendar } from "react-native-calendars";
import { apiFetch } from "../api/client";
import { Card, Button, Badge, Screen } from "../components/UI";
import { colors } from "../theme";
import { useBadges } from "../navigation/BadgeContext";

interface RecordDetail {
  id: string;
  productionName: string;
  status: string;
  performer: { id: string; name: string };
  approvedDays: number;
  workDates: { id: string; date: string; status: string }[];
  identifiables: { id: string; category: { id: string; label: string }; performerDescription: string; verifiedDescription: string | null; status: string }[];
  evidenceDocuments: { id: string; fileUrl: string; fileName: string }[];
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

  const load = useCallback(async () => {
    const data = await apiFetch<{ record: RecordDetail }>(`/api/work-records/${id}`);
    setRecord(data.record);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!record) {
    return (
      <Screen>
        <ActivityIndicator style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  const claimedCount = record.workDates.filter((d) => d.status === "CLAIMED").length;

  async function rejectDate(dateId: string) {
    await apiFetch(`/api/work-records/${id}/dates/${dateId}/reject`, { method: "POST" });
    load();
  }

  async function decideIdentifiable(identifiableId: string, action: "approve" | "reject" | "edit", verifiedDescription?: string) {
    await apiFetch(`/api/work-records/${id}/identifiables/${identifiableId}/decision`, {
      method: "PATCH",
      body: JSON.stringify({ action, verifiedDescription }),
    });
    setEditingId(null);
    load();
  }

  async function completeDecision(decision: "APPROVED" | "REJECTED") {
    if (decision === "REJECTED" && !message.trim()) {
      setError("A reason is required when rejecting.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
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
  for (const d of record.workDates) {
    markedDates[d.date.slice(0, 10)] = { selected: true, selectedColor: d.status === "REJECTED" ? colors.red : colors.green };
  }

  const isReviewable = record.status === "SUBMITTED";

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <Text style={styles.title}>{record.performer.name}</Text>
        <Text style={styles.subtitle}>{record.productionName}</Text>

        <Card style={{ marginTop: 12 }}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.sectionLabel}>Days</Text>
              <Text style={styles.bigNumber}>{claimedCount}</Text>
            </View>
            <Button title={showDates ? "Hide dates" : "View Dates"} variant="secondary" onPress={() => setShowDates((s) => !s)} />
          </View>
          {showDates && (
            <View style={{ marginTop: 12 }}>
              <Calendar
                markedDates={markedDates}
                onDayPress={(day) => {
                  if (!isReviewable) return;
                  const match = record.workDates.find((d) => d.date.slice(0, 10) === day.dateString && d.status === "CLAIMED");
                  if (match) rejectDate(match.id);
                }}
                theme={{ selectedDayBackgroundColor: colors.green, todayTextColor: colors.green, arrowColor: colors.green }}
              />
              <Text style={styles.muted}>Tap a claimed (green) date to reject it. Rejected dates turn red.</Text>
            </View>
          )}
        </Card>

        <Card style={{ marginTop: 12 }}>
          <Text style={styles.sectionLabel}>Contract / evidence</Text>
          {record.evidenceDocuments.length === 0 && <Text style={styles.muted}>None uploaded.</Text>}
          {record.evidenceDocuments.map((doc) => (
            <Text key={doc.id} style={{ marginTop: 4 }}>
              {doc.fileName}
            </Text>
          ))}
        </Card>

        <Card style={{ marginTop: 12 }}>
          <Text style={styles.sectionLabel}>Identifiables ({record.identifiables.length})</Text>
          {record.identifiables.map((idf) => (
            <View key={idf.id} style={styles.idRow}>
              <Text style={styles.idCategory}>{idf.category.label}</Text>
              {editingId === idf.id ? (
                <View>
                  <TextInput style={styles.input} value={editText} onChangeText={setEditText} multiline />
                  <View style={styles.row}>
                    <Button title="Save & Approve" onPress={() => decideIdentifiable(idf.id, "edit", editText)} />
                    <Button title="Cancel" variant="secondary" onPress={() => setEditingId(null)} />
                  </View>
                </View>
              ) : (
                <>
                  <Text>{idf.verifiedDescription ?? idf.performerDescription}</Text>
                  {idf.status !== "SUBMITTED" ? (
                    <Badge label={idf.status} tone={idf.status === "APPROVED" ? "green" : "red"} />
                  ) : (
                    isReviewable && (
                      <View style={styles.row}>
                        <Button title="Approve" onPress={() => decideIdentifiable(idf.id, "approve")} />
                        <Button
                          title="Edit"
                          variant="secondary"
                          onPress={() => {
                            setEditingId(idf.id);
                            setEditText(idf.performerDescription);
                          }}
                        />
                        <Button title="Reject" variant="danger" onPress={() => decideIdentifiable(idf.id, "reject")} />
                      </View>
                    )
                  )}
                </>
              )}
            </View>
          ))}
          {record.identifiables.length === 0 && <Text style={styles.muted}>None submitted.</Text>}
        </Card>

        {isReviewable ? (
          <Card style={{ marginTop: 12 }}>
            <Text style={styles.sectionLabel}>Decision</Text>
            <TextInput
              style={[styles.input, { minHeight: 60 }]}
              multiline
              placeholder="Message (optional on approve, required on reject)"
              value={message}
              onChangeText={setMessage}
            />
            {error && <Text style={{ color: colors.red, marginBottom: 8 }}>{error}</Text>}
            <View style={styles.row}>
              <Button title={busy ? "Saving..." : "Approve"} onPress={() => completeDecision("APPROVED")} disabled={busy} />
              <Button title="Reject" variant="danger" onPress={() => completeDecision("REJECTED")} disabled={busy} />
            </View>
          </Card>
        ) : (
          <Card style={{ marginTop: 12 }}>
            <Badge label={record.status} tone={record.status === "APPROVED" ? "green" : "gray"} />
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "800", color: colors.greenDark },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  row: { flexDirection: "row", gap: 8, marginTop: 8 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.4 },
  bigNumber: { fontSize: 28, fontWeight: "800", color: colors.greenDark, marginTop: 4 },
  idRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  idCategory: { fontSize: 12, fontWeight: "700", color: colors.greenDark, marginBottom: 2 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, backgroundColor: colors.white, marginTop: 6 },
  muted: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
});
