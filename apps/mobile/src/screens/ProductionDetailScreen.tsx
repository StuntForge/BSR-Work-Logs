import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, Switch, TouchableOpacity, ActivityIndicator, Modal, Pressable, Alert } from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import * as DocumentPicker from "expo-document-picker";
import { apiFetch, API_URL } from "../api/client";
import { getToken } from "../api/storage";
import { Card, Button, Badge, IconCircle } from "../components/UI";
import { Header } from "../components/Header";
import { KeyboardAvoider } from "../components/KeyboardAvoider";
import { IconIdCard, IconChevronDown, IconPlus, IconCheck, IconTrash } from "../components/Icons";
import { colors } from "../theme";
import { SUBMIT_FOR_APPROVAL_HELP_TEXT, WORK_LOCATION, WORK_LOCATION_LABELS } from "@bsr/shared";

const SUBMIT_BORDER = "#023C48";

interface AreaCategory {
  id: string;
  key: string;
  label: string;
}
interface WorkDate {
  id: string;
  date: string;
  status: string;
}
interface RecordDetail {
  id: string;
  productionName: string;
  status: string;
  hasSpawnedContinuation: boolean;
  jobDescription: string | null;
  location: string | null;
  riskAssessment: boolean | null;
  comments: string | null;
  workDates: WorkDate[];
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
  const [jobDescription, setJobDescription] = useState("");
  const [location, setLocation] = useState<string | null>(null);
  const [riskAssessment, setRiskAssessment] = useState(false);
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showIdModal, setShowIdModal] = useState(false);

  const [fmQuery, setFmQuery] = useState("");
  const [fmResults, setFmResults] = useState<{ id: string; name: string }[]>([]);
  const [selectedFm, setSelectedFm] = useState<{ id: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calendar taps only ever touch this local state — nothing is sent to the server until the
  // performer explicitly saves via the header tick, which diffs this against record.workDates.
  const [localDates, setLocalDates] = useState<WorkDate[]>([]);

  const load = useCallback(async () => {
    const data = await apiFetch<{ record: RecordDetail }>(`/api/work-records/${id}`);
    setRecord(data.record);
    setJobDescription(data.record.jobDescription ?? "");
    setLocation(data.record.location);
    setRiskAssessment(!!data.record.riskAssessment);
    setComments(data.record.comments ?? "");
    setLocalDates(data.record.workDates);
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

  function toggleDate(dateStr: string) {
    const existing = localDates.find((d) => d.date.slice(0, 10) === dateStr);
    if (existing) {
      setLocalDates((prev) => prev.filter((d) => d.id !== existing.id));
    } else {
      setLocalDates((prev) => [...prev, { id: `pending-${dateStr}`, date: dateStr, status: "CLAIMED" }]);
    }
  }

  async function saveAll() {
    if (!record) return;
    setSaving(true);
    setError(null);
    try {
      const localIds = new Set(localDates.map((d) => d.id));
      const removedIds = record.workDates.filter((d) => !localIds.has(d.id)).map((d) => d.id);
      const addedDates = localDates.filter((d) => d.id.startsWith("pending-")).map((d) => d.date);

      await Promise.all([
        apiFetch(`/api/work-records/${id}`, { method: "PATCH", body: JSON.stringify({ jobDescription, location, riskAssessment, comments }) }),
        addedDates.length > 0 ? apiFetch(`/api/work-records/${id}/dates`, { method: "POST", body: JSON.stringify({ dates: addedDates }) }) : Promise.resolve(),
        ...removedIds.map((rid) => apiFetch(`/api/work-records/${id}/dates/${rid}`, { method: "DELETE" })),
      ]);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      "Delete this work record?",
      "This permanently deletes this production entry, including every date, identifiable and detail saved against it. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]
    );
  }

  async function doDelete() {
    setDeleting(true);
    setError(null);
    try {
      await apiFetch(`/api/work-records/${id}`, { method: "DELETE" });
      navigation.goBack();
    } catch (err: any) {
      setError(err.message);
      setDeleting(false);
    }
  }

  async function addIdentifiable(categoryId: string, description: string) {
    await apiFetch(`/api/work-records/${id}/identifiables`, {
      method: "POST",
      body: JSON.stringify({ categoryId, performerDescription: description }),
    });
    setShowIdModal(false);
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
  for (const d of localDates) {
    const key = d.date.slice(0, 10);
    markedDates[key] = { selected: true, selectedColor: d.status === "REJECTED" ? colors.red : colors.green };
  }
  const approvedDaysDisplay = localDates.filter((d) => d.status === "CLAIMED").length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        variant="detail"
        title="Production"
        rightAction={
          isOwnerOngoing
            ? {
                icon: saving ? <ActivityIndicator size="small" color="#fff" /> : <IconCheck size={22} color="#fff" />,
                onPress: () => {
                  if (!saving) saveAll();
                },
              }
            : undefined
        }
      />
      <KeyboardAvoider>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
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
          <Text style={styles.sectionLabel}>Work dates — {approvedDaysDisplay} approved</Text>
          <Calendar
            markedDates={markedDates}
            onDayPress={(day) => isOwnerOngoing && toggleDate(day.dateString)}
            theme={{ selectedDayBackgroundColor: colors.green, todayTextColor: colors.green, arrowColor: colors.green }}
          />
          {!isOwnerOngoing && <Text style={styles.muted}>Tap dates are disabled — this record is locked.</Text>}
        </Card>

        <Card style={{ marginTop: 12 }}>
          <Text style={styles.sectionLabel}>Work record details</Text>

          <Field label="Job description">
            <TextInput style={[styles.input, { minHeight: 60 }]} multiline value={jobDescription} onChangeText={setJobDescription} editable={isOwnerOngoing} />
          </Field>

          <Field label="Location">
            <View style={styles.rowWrap}>
              {WORK_LOCATION.map((loc) => (
                <TouchableOpacity
                  key={loc}
                  style={[styles.chip, location === loc && styles.chipActive]}
                  onPress={() => isOwnerOngoing && setLocation(loc)}
                >
                  <Text style={[styles.chipText, location === loc && styles.chipTextActive]}>{WORK_LOCATION_LABELS[loc]}</Text>
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
        </Card>

        <Card style={{ marginTop: 12 }}>
          <Text style={styles.sectionLabel}>Identifiables</Text>
          {record.identifiables.map((idf) => (
            <View key={idf.id} style={styles.idRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.idCategory}>{idf.category.label}</Text>
                <Text>{idf.verifiedDescription ?? idf.performerDescription}</Text>
                {idf.status !== "SUBMITTED" && (
                  <View style={{ marginTop: 4 }}>
                    <Badge label={idf.status} tone={idf.status === "APPROVED" ? "green" : "red"} />
                  </View>
                )}
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
              <Button title="Add Identifiable" variant="secondary" icon={<IconPlus size={16} color={colors.text} />} onPress={() => setShowIdModal(true)} />
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
          <Card style={{ marginTop: 12, borderWidth: 2, borderColor: SUBMIT_BORDER }}>
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

        {isOwnerOngoing && (
          <View style={{ marginTop: 20 }}>
            <Button
              title={deleting ? "Deleting..." : "Delete work record"}
              variant="danger"
              icon={<IconTrash size={16} color={colors.white} />}
              onPress={confirmDelete}
              disabled={deleting}
              loading={deleting}
            />
          </View>
        )}
      </ScrollView>
      </KeyboardAvoider>

      <AddIdentifiableModal visible={showIdModal} categories={categories} onClose={() => setShowIdModal(false)} onAdd={addIdentifiable} />
    </View>
  );
}

function AddIdentifiableModal({
  visible,
  categories,
  onClose,
  onAdd,
}: {
  visible: boolean;
  categories: AreaCategory[];
  onClose: () => void;
  onAdd: (categoryId: string, description: string) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setCategoryId(null);
      setDescription("");
      setError(null);
      setShowDropdown(false);
    }
  }, [visible]);

  const selected = categories.find((c) => c.id === categoryId);

  async function submit() {
    if (!categoryId) {
      setError("Select a category.");
      return;
    }
    if (!description.trim()) {
      setError("Enter a brief description.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onAdd(categoryId, description.trim());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={[styles.modalBackdrop, { paddingTop: insets.top + 76 }]} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <View style={styles.rowBetween}>
            <Text style={styles.modalTitle}>Add Identifiable</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: colors.textMuted, fontSize: 20 }}>×</Text>
            </TouchableOpacity>
          </View>

          <Field label="Category">
            <TouchableOpacity style={styles.dropdown} onPress={() => setShowDropdown((s) => !s)}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <IconIdCard size={16} color={colors.textMuted} />
                <Text style={{ color: selected ? colors.text : colors.textMuted }}>{selected ? selected.label : "Select a category..."}</Text>
              </View>
              <IconChevronDown size={16} color={colors.textMuted} />
            </TouchableOpacity>
            {showDropdown && (
              <View style={styles.dropdownList}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setCategoryId(cat.id);
                      setShowDropdown(false);
                    }}
                  >
                    <Text>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Field>

          <Field label="Brief description">
            <TextInput style={[styles.input, { minHeight: 70 }]} multiline value={description} onChangeText={setDescription} placeholder="Describe the identifiable stunt" />
          </Field>

          {error && <Text style={{ color: colors.red, marginBottom: 8 }}>{error}</Text>}
          <Button title={saving ? "Adding..." : "Add Identifiable"} onPress={submit} disabled={saving} loading={saving} />
        </Pressable>
      </Pressable>
    </Modal>
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
  title: { fontSize: 20, fontWeight: "800", color: colors.tealDark, flexShrink: 1, marginRight: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  row: { flexDirection: "row", gap: 8 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 10 },
  label: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, backgroundColor: colors.white },
  pickerItem: { paddingVertical: 8, paddingHorizontal: 6 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.tealLight },
  chipActive: { backgroundColor: colors.teal },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.tealDark },
  chipTextActive: { color: colors.white },
  idRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  idCategory: { fontSize: 12, fontWeight: "700", color: colors.tealDark },
  muted: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(2,30,36,0.5)" },
  modalCard: { backgroundColor: colors.white, borderRadius: 20, padding: 20, marginHorizontal: 16 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.tealDark, marginBottom: 16 },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.white,
  },
  dropdownList: { marginTop: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.white, overflow: "hidden" },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
});
