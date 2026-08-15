import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, Switch, TouchableOpacity, ActivityIndicator } from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { Calendar } from "react-native-calendars";
import * as DocumentPicker from "expo-document-picker";
import { apiFetch, API_URL } from "../api/client";
import { getToken } from "../api/storage";
import { Card, Button, Badge } from "../components/UI";
import { Header } from "../components/Header";
import { colors } from "../theme";
import { SUBMIT_FOR_APPROVAL_HELP_TEXT, WORK_LOCATION } from "@bsr/shared";

interface AreaItem {
  id: string;
  label: string;
}
interface AreaCategory {
  id: string;
  key: string;
  label: string;
  items: AreaItem[];
}
interface RecordDetail {
  id: string;
  productionName: string;
  status: string;
  hasSpawnedContinuation: boolean;
  natureOfEmployment: string | null;
  areaItem: { id: string; label: string; category: string } | null;
  jobDescription: string | null;
  otherPerformersText: string | null;
  location: string | null;
  riskAssessment: boolean | null;
  comments: string | null;
  workDates: { id: string; date: string; status: string }[];
  approvedDays: number;
  identifiables: { id: string; category: { id: string; label: string }; performerDescription: string; verifiedDescription: string | null; status: string }[];
  evidenceDocuments: { id: string; fileUrl: string; fileName: string }[];
  fullMember: { id: string; name: string } | null;
  latestDecision: { decision: string; message: string | null } | null;
}

export default function ProductionDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id: string = route.params.id;

  const [record, setRecord] = useState<RecordDetail | null>(null);
  const [categories, setCategories] = useState<AreaCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Editable field state (only meaningful while status === ONGOING)
  const [natureOfEmployment, setNatureOfEmployment] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [otherPerformersText, setOtherPerformersText] = useState("");
  const [location, setLocation] = useState<string | null>(null);
  const [riskAssessment, setRiskAssessment] = useState(false);
  const [comments, setComments] = useState("");
  const [areaItemId, setAreaItemId] = useState<string | null>(null);
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);

  const [newIdCategoryId, setNewIdCategoryId] = useState<string | null>(null);
  const [newIdDescription, setNewIdDescription] = useState("");

  const [fmQuery, setFmQuery] = useState("");
  const [fmResults, setFmResults] = useState<{ id: string; name: string }[]>([]);
  const [selectedFm, setSelectedFm] = useState<{ id: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await apiFetch<{ record: RecordDetail }>(`/api/work-records/${id}`);
    setRecord(data.record);
    setNatureOfEmployment(data.record.natureOfEmployment ?? "");
    setJobDescription(data.record.jobDescription ?? "");
    setOtherPerformersText(data.record.otherPerformersText ?? "");
    setLocation(data.record.location);
    setRiskAssessment(!!data.record.riskAssessment);
    setComments(data.record.comments ?? "");
    setAreaItemId(data.record.areaItem?.id ?? null);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    apiFetch<{ categories: AreaCategory[] }>("/api/area-categories").then((d) => setCategories(d.categories));
  }, []);

  useEffect(() => {
    if (!fmQuery) {
      setFmResults([]);
      return;
    }
    const t = setTimeout(() => {
      apiFetch<{ fullMembers: { id: string; name: string }[] }>(`/api/full-members?query=${encodeURIComponent(fmQuery)}`).then((d) =>
        setFmResults(d.fullMembers)
      );
    }, 250);
    return () => clearTimeout(t);
  }, [fmQuery]);

  if (loading || !record) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header variant="detail" title="Production" />
        <ActivityIndicator style={{ marginTop: 40 }} />
      </View>
    );
  }

  const isOwnerOngoing = record.status === "ONGOING";
  const isRejected = record.status === "REJECTED";

  async function saveDetails() {
    setSavingDetails(true);
    try {
      await apiFetch(`/api/work-records/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ natureOfEmployment, jobDescription, otherPerformersText, location, riskAssessment, comments, areaItemId: areaItemId ?? undefined }),
      });
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingDetails(false);
    }
  }

  async function toggleDate(dateStr: string) {
    const existing = record!.workDates.find((d) => d.date.slice(0, 10) === dateStr);
    if (existing) {
      await apiFetch(`/api/work-records/${id}/dates/${existing.id}`, { method: "DELETE" });
    } else {
      await apiFetch(`/api/work-records/${id}/dates`, { method: "POST", body: JSON.stringify({ dates: [dateStr] }) });
    }
    load();
  }

  async function addIdentifiable() {
    if (!newIdCategoryId || !newIdDescription.trim()) return;
    await apiFetch(`/api/work-records/${id}/identifiables`, {
      method: "POST",
      body: JSON.stringify({ categoryId: newIdCategoryId, performerDescription: newIdDescription.trim() }),
    });
    setNewIdDescription("");
    load();
  }

  async function removeIdentifiable(identifiableId: string) {
    await apiFetch(`/api/work-records/${id}/identifiables/${identifiableId}`, { method: "DELETE" });
    load();
  }

  async function uploadEvidence() {
    const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/jpeg", "image/png"] });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const blob = await (await fetch(asset.uri)).blob();
    const formData = new FormData();
    formData.append("file", blob, asset.name);
    const token = await getToken();
    const res = await fetch(`${API_URL}/api/work-records/${id}/evidence`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Upload failed.");
      return;
    }
    load();
  }

  async function removeEvidence(evidenceId: string) {
    await apiFetch(`/api/work-records/${id}/evidence/${evidenceId}`, { method: "DELETE" });
    load();
  }

  async function submitForApproval() {
    if (!selectedFm) {
      setError("Select a Full Member to submit to.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/api/work-records/${id}/submit`, { method: "POST", body: JSON.stringify({ fullMemberId: selectedFm.id }) });
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function editRejected() {
    await apiFetch(`/api/work-records/${id}/edit`, { method: "POST" });
    load();
  }

  async function addContinuation() {
    const data = await apiFetch<{ id: string }>(`/api/work-records/${id}/continue`, { method: "POST" });
    navigation.replace("ProductionDetail", { id: data.id });
  }

  const markedDates: Record<string, any> = {};
  for (const d of record.workDates) {
    const key = d.date.slice(0, 10);
    markedDates[key] = { selected: true, selectedColor: d.status === "REJECTED" ? colors.red : colors.green };
  }

  const selectedCategory = categories.find((c) => c.items.some((i) => i.id === areaItemId));
  const selectedItem = selectedCategory?.items.find((i) => i.id === areaItemId);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header variant="detail" title="Production" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <View style={styles.rowBetween}>
          <Text style={styles.title}>{record.productionName}</Text>
          <Badge
            label={record.status}
            tone={record.status === "APPROVED" ? "green" : record.status === "SUBMITTED" ? "amber" : record.status === "REJECTED" ? "red" : "gray"}
          />
        </View>

        {isRejected && (
          <Card style={{ marginTop: 12, backgroundColor: "#f5e0dc" }}>
            <Text style={{ fontWeight: "700", color: colors.red, marginBottom: 4 }}>Rejected</Text>
            <Text>{record.latestDecision?.message || "No message provided."}</Text>
            <View style={{ marginTop: 10 }}>
              <Button title="Edit" onPress={editRejected} />
            </View>
          </Card>
        )}

        {record.status === "APPROVED" && !record.hasSpawnedContinuation && (
          <View style={{ marginTop: 12 }}>
            <Button title="Add Additional Work" variant="secondary" onPress={addContinuation} />
          </View>
        )}

        <Card style={{ marginTop: 12 }}>
          <Text style={styles.sectionLabel}>Work dates — {record.approvedDays} approved</Text>
          <Calendar
            markedDates={markedDates}
            onDayPress={(day) => isOwnerOngoing && toggleDate(day.dateString)}
            theme={{ selectedDayBackgroundColor: colors.green, todayTextColor: colors.green, arrowColor: colors.green }}
          />
          {!isOwnerOngoing && <Text style={styles.muted}>Tap dates are disabled — this record is locked.</Text>}
        </Card>

        <Card style={{ marginTop: 12 }}>
          <Text style={styles.sectionLabel}>Work record details</Text>

          <Field label="Area of Work">
            <TouchableOpacity style={styles.selectBox} onPress={() => isOwnerOngoing && setShowAreaPicker((s) => !s)}>
              <Text>{selectedCategory && selectedItem ? `${selectedCategory.label} — ${selectedItem.label}` : "Select..."}</Text>
            </TouchableOpacity>
            {showAreaPicker && (
              <View style={styles.pickerList}>
                {categories.map((cat) => (
                  <View key={cat.id}>
                    <Text style={styles.pickerCategory}>{cat.key}. {cat.label}</Text>
                    {cat.items.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.pickerItem}
                        onPress={() => {
                          setAreaItemId(item.id);
                          setShowAreaPicker(false);
                        }}
                      >
                        <Text>{item.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </Field>

          <Field label="Nature of employment">
            <TextInput style={styles.input} value={natureOfEmployment} onChangeText={setNatureOfEmployment} editable={isOwnerOngoing} />
          </Field>

          <Field label="Job description">
            <TextInput style={[styles.input, { minHeight: 60 }]} multiline value={jobDescription} onChangeText={setJobDescription} editable={isOwnerOngoing} />
          </Field>

          <Field label="Other stunt performers">
            <TextInput style={styles.input} value={otherPerformersText} onChangeText={setOtherPerformersText} editable={isOwnerOngoing} />
          </Field>

          <Field label="Location">
            <View style={styles.row}>
              {WORK_LOCATION.map((loc) => (
                <TouchableOpacity
                  key={loc}
                  style={[styles.chip, location === loc && styles.chipActive]}
                  onPress={() => isOwnerOngoing && setLocation(loc)}
                >
                  <Text style={[styles.chipText, location === loc && styles.chipTextActive]}>{loc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>

          <View style={[styles.row, { justifyContent: "space-between", marginTop: 8 }]}>
            <Text style={styles.label}>Risk assessment carried out</Text>
            <Switch value={riskAssessment} onValueChange={setRiskAssessment} disabled={!isOwnerOngoing} />
          </View>

          <Field label="Comments">
            <TextInput style={[styles.input, { minHeight: 60 }]} multiline value={comments} onChangeText={setComments} editable={isOwnerOngoing} />
          </Field>

          {isOwnerOngoing && <Button title={savingDetails ? "Saving..." : "Save details"} onPress={saveDetails} disabled={savingDetails} loading={savingDetails} />}
        </Card>

        <Card style={{ marginTop: 12 }}>
          <Text style={styles.sectionLabel}>Identifiables</Text>
          {record.identifiables.map((idf) => (
            <View key={idf.id} style={styles.idRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.idCategory}>{idf.category.label}</Text>
                <Text>{idf.verifiedDescription ?? idf.performerDescription}</Text>
                {idf.status !== "SUBMITTED" && <Badge label={idf.status} tone={idf.status === "APPROVED" ? "green" : "red"} />}
              </View>
              {isOwnerOngoing && (
                <TouchableOpacity onPress={() => removeIdentifiable(idf.id)}>
                  <Text style={{ color: colors.red }}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          {record.identifiables.length === 0 && <Text style={styles.muted}>None added yet.</Text>}

          {isOwnerOngoing && (
            <View style={{ marginTop: 12 }}>
              <Field label="Category">
                <View style={styles.rowWrap}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.chip, newIdCategoryId === cat.id && styles.chipActive]}
                      onPress={() => setNewIdCategoryId(cat.id)}
                    >
                      <Text style={[styles.chipText, newIdCategoryId === cat.id && styles.chipTextActive]}>{cat.key}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Field>
              <Field label="Brief description">
                <TextInput style={styles.input} value={newIdDescription} onChangeText={setNewIdDescription} />
              </Field>
              <Button title="Add identifiable" variant="secondary" onPress={addIdentifiable} />
            </View>
          )}
        </Card>

        <Card style={{ marginTop: 12 }}>
          <Text style={styles.sectionLabel}>Contract / evidence</Text>
          {record.evidenceDocuments.map((doc) => (
            <View key={doc.id} style={styles.idRow}>
              <Text style={{ flex: 1 }}>{doc.fileName}</Text>
              {isOwnerOngoing && (
                <TouchableOpacity onPress={() => removeEvidence(doc.id)}>
                  <Text style={{ color: colors.red }}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          {record.evidenceDocuments.length === 0 && <Text style={styles.muted}>No files uploaded yet.</Text>}
          {isOwnerOngoing && (
            <View style={{ marginTop: 10 }}>
              <Button title="Upload Contract" variant="secondary" onPress={uploadEvidence} />
            </View>
          )}
        </Card>

        {isOwnerOngoing && (
          <Card style={{ marginTop: 12 }}>
            <Text style={styles.sectionLabel}>Submit for approval</Text>
            <Text style={styles.muted}>{SUBMIT_FOR_APPROVAL_HELP_TEXT}</Text>

            <Field label="Full Member">
              {selectedFm ? (
                <View style={styles.rowBetween}>
                  <Text>{selectedFm.name}</Text>
                  <TouchableOpacity onPress={() => setSelectedFm(null)}>
                    <Text style={{ color: colors.red }}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <TextInput style={styles.input} placeholder="Search Full Members..." value={fmQuery} onChangeText={setFmQuery} />
                  {fmResults.map((fm) => (
                    <TouchableOpacity
                      key={fm.id}
                      style={styles.pickerItem}
                      onPress={() => {
                        setSelectedFm(fm);
                        setFmQuery("");
                        setFmResults([]);
                      }}
                    >
                      <Text>{fm.name}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </Field>

            {error && <Text style={{ color: colors.red, marginBottom: 8 }}>{error}</Text>}
            <Button title={submitting ? "Submitting..." : "Submit for Approval"} onPress={submitForApproval} disabled={submitting} loading={submitting} />
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "800", color: colors.greenDark, flexShrink: 1, marginRight: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  row: { flexDirection: "row", gap: 8 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 10 },
  label: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, backgroundColor: colors.white },
  selectBox: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.white },
  pickerList: { marginTop: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8, maxHeight: 260 },
  pickerCategory: { fontWeight: "700", marginTop: 8, color: colors.greenDark },
  pickerItem: { paddingVertical: 8, paddingHorizontal: 6 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.greenLight },
  chipActive: { backgroundColor: colors.green },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.greenDark },
  chipTextActive: { color: colors.white },
  idRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  idCategory: { fontSize: 12, fontWeight: "700", color: colors.greenDark },
  muted: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
});
