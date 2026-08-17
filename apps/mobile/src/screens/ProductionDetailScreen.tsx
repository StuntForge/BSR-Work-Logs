import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, Switch, TouchableOpacity, ActivityIndicator, Modal, Pressable, Alert } from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import * as DocumentPicker from "expo-document-picker";
import { apiFetch, API_URL } from "../api/client";
import { getToken } from "../api/storage";
import { useAuth } from "../auth/AuthContext";
import { Card, Button, Badge, IconCircle } from "../components/UI";
import { Header } from "../components/Header";
import { KeyboardAvoider } from "../components/KeyboardAvoider";
import { IconIdCard, IconChevronDown, IconPlus, IconTrash, IconCheck } from "../components/Icons";
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
interface LocalIdentifiable {
  id: string;
  categoryId: string;
  categoryLabel: string;
  performerDescription: string;
  verifiedDescription: string | null;
  status: string;
  selfCoordinated: boolean;
}
interface LocalEvidence {
  id: string;
  fileName: string;
  pendingAsset?: { uri: string; name: string; mimeType: string };
}
interface RecordDetail {
  id: string;
  productionName: string;
  status: string;
  hasSpawnedContinuation: boolean;
  jobDescription: string | null;
  locations: string[];
  riskAssessment: boolean | null;
  comments: string | null;
  workDates: WorkDate[];
  approvedDays: number;
  identifiables: { id: string; category: { id: string; label: string }; performerDescription: string; verifiedDescription: string | null; status: string; selfCoordinated: boolean }[];
  evidenceDocuments: { id: string; fileUrl: string; fileName: string }[];
  fullMember: { id: string; name: string } | null;
  latestDecision: { decision: string; message: string | null } | null;
  eligibleFromDate: string;
  previousDates: string[];
  isCoreJob: boolean;
  coreJobStartDate: string | null;
  coreJobEndDate: string | null;
  isQualifyingCoreJob: boolean;
  isSoloSubmission: boolean;
  isUnitCoordinatorDay: boolean;
  isAssistantCoordinatorDay: boolean;
}

// Custom day cell so previously-used dates (from an earlier record in the same continuation
// chain) can show a grey diagonal strike-through — react-native-calendars' built-in marking
// types don't support that, only dot/period/background styling.
function DayCell({ date, state, marking, onPress }: any) {
  const isPrevious = !!marking?.isPreviouslyUsed;
  const isSelected = !!marking?.selected;
  const disabled = state === "disabled" || isPrevious;
  return (
    <TouchableOpacity disabled={disabled} onPress={() => date && onPress?.(date)} style={dayCellStyles.cell}>
      <View style={[dayCellStyles.circle, isSelected && { backgroundColor: marking.selectedColor }]}>
        <Text
          style={[
            dayCellStyles.text,
            state === "disabled" && { color: colors.border },
            isPrevious && { color: colors.textMuted },
            isSelected && { color: "#fff", fontWeight: "700" },
          ]}
        >
          {date?.day}
        </Text>
        {isPrevious && <View style={dayCellStyles.strike} />}
      </View>
    </TouchableOpacity>
  );
}

const dayCellStyles = StyleSheet.create({
  cell: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  circle: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  text: { fontSize: 14, color: colors.text },
  strike: { position: "absolute", width: 22, height: 1.5, backgroundColor: colors.textMuted, transform: [{ rotate: "45deg" }] },
});

export default function ProductionDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id: string = route.params.id;
  const { user } = useAuth();

  const [record, setRecord] = useState<RecordDetail | null>(null);
  const [categories, setCategories] = useState<AreaCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Editable field state (only meaningful while status === ONGOING)
  const [jobDescription, setJobDescription] = useState("");
  const [locations, setLocations] = useState<string[]>([]);
  const [riskAssessment, setRiskAssessment] = useState(false);
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showIdModal, setShowIdModal] = useState(false);

  const [fmQuery, setFmQuery] = useState("");
  const [fmResults, setFmResults] = useState<{ id: string; name: string }[]>([]);
  const [selectedFm, setSelectedFm] = useState<{ id: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittingSolo, setSubmittingSolo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Core Team job — checkbox + date range are local-only edits like everything else, saved on
  // back-press. "Amend Calendar" fills weekday dates between start/end into localDates.
  const [isCoreJob, setIsCoreJob] = useState(false);
  const [coreJobStartDate, setCoreJobStartDate] = useState<string | null>(null);
  const [coreJobEndDate, setCoreJobEndDate] = useState<string | null>(null);
  const [amendMessage, setAmendMessage] = useState<string | null>(null);
  const [datePickerTarget, setDatePickerTarget] = useState<"start" | "end" | null>(null);

  // Solo/Self-Coordinated is purely a UI toggle for which submit flow to use — not persisted
  // until the dedicated submit-solo endpoint is called.
  const [isSoloSubmission, setIsSoloSubmission] = useState(false);

  // Unit Coordinator / Assistant Coordinator — Key Stunt Performer only, mutually exclusive.
  // Checking either clears Solo (can't be both) and hides Identifiables (not applicable).
  const [isUnitCoordinatorDay, setIsUnitCoordinatorDayState] = useState(false);
  const [isAssistantCoordinatorDay, setIsAssistantCoordinatorDayState] = useState(false);

  function setIsUnitCoordinatorDay(value: boolean) {
    setIsUnitCoordinatorDayState(value);
    if (value) {
      setIsAssistantCoordinatorDayState(false);
      setIsSoloSubmission(false);
    }
  }
  function setIsAssistantCoordinatorDay(value: boolean) {
    setIsAssistantCoordinatorDayState(value);
    if (value) {
      setIsUnitCoordinatorDayState(false);
      setIsSoloSubmission(false);
    }
  }

  // Calendar taps, identifiables, and evidence picks all only touch local state — nothing is
  // sent to the server until the performer navigates back, which saves everything together
  // against the record as last loaded.
  const [localDates, setLocalDates] = useState<WorkDate[]>([]);
  const [localIdentifiables, setLocalIdentifiables] = useState<LocalIdentifiable[]>([]);
  const [localEvidence, setLocalEvidence] = useState<LocalEvidence[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await apiFetch<{ record: RecordDetail }>(`/api/work-records/${id}`);
    setRecord(data.record);
    setJobDescription(data.record.jobDescription ?? "");
    setLocations(data.record.locations ?? []);
    setRiskAssessment(!!data.record.riskAssessment);
    setComments(data.record.comments ?? "");
    setLocalDates(data.record.workDates);
    setLocalIdentifiables(
      data.record.identifiables.map((i) => ({
        id: i.id,
        categoryId: i.category.id,
        categoryLabel: i.category.label,
        performerDescription: i.performerDescription,
        verifiedDescription: i.verifiedDescription,
        status: i.status,
        selfCoordinated: i.selfCoordinated,
      }))
    );
    setLocalEvidence(data.record.evidenceDocuments.map((d) => ({ id: d.id, fileName: d.fileName })));
    setIsCoreJob(!!data.record.isCoreJob);
    setCoreJobStartDate(data.record.coreJobStartDate ? data.record.coreJobStartDate.slice(0, 10) : null);
    setCoreJobEndDate(data.record.coreJobEndDate ? data.record.coreJobEndDate.slice(0, 10) : null);
    setAmendMessage(null);
    setIsSoloSubmission(false);
    setIsUnitCoordinatorDayState(!!data.record.isUnitCoordinatorDay);
    setIsAssistantCoordinatorDayState(!!data.record.isAssistantCoordinatorDay);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // useFocusEffect alone isn't reliable for a same-route replace — navigating from one
  // ProductionDetail (e.g. a continuation source) straight to another ProductionDetail with a
  // new id doesn't always fire a fresh focus event, which left stale record/localDates in
  // place. This guarantees a reload any time the id itself changes.
  useEffect(() => {
    load();
  }, [id]);

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
  // Approved Solo/Self-Coordinated records were self-authored and self-approved, so the
  // performer can retract them even after approval — everything else stays locked once decided.
  const isDeletable = isOwnerOngoing || (record.status === "APPROVED" && record.isSoloSubmission);

  // Earliest date the calendar allows tapping — one day after eligibleFromDate, since that
  // boundary itself is exclusive (matches isDateEligibleForPeriod on the server).
  const minEligibleDate = (() => {
    const d = new Date(record.eligibleFromDate);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  const previousDatesSet = new Set(record.previousDates);

  function toggleDate(dateStr: string) {
    if (dateStr < minEligibleDate || previousDatesSet.has(dateStr)) return;
    const existing = localDates.find((d) => d.date.slice(0, 10) === dateStr);
    if (existing) {
      setLocalDates((prev) => prev.filter((d) => d.id !== existing.id));
    } else {
      setLocalDates((prev) => [...prev, { id: `pending-${dateStr}`, date: dateStr, status: "CLAIMED" }]);
    }
  }

  function toggleLocation(loc: string) {
    setLocations((prev) => (prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]));
  }

  function amendCalendarWithCoreJobDates() {
    if (!coreJobStartDate || !coreJobEndDate) return;
    const existingSet = new Set(localDates.map((d) => d.date.slice(0, 10)));
    const additions: WorkDate[] = [];
    const cursor = new Date(coreJobStartDate + "T00:00:00.000Z");
    const end = new Date(coreJobEndDate + "T00:00:00.000Z");
    while (cursor.getTime() <= end.getTime()) {
      const dow = cursor.getUTCDay();
      const dateStr = cursor.toISOString().slice(0, 10);
      if (dow !== 0 && dow !== 6 && dateStr >= minEligibleDate && !previousDatesSet.has(dateStr) && !existingSet.has(dateStr)) {
        additions.push({ id: `pending-${dateStr}`, date: dateStr, status: "CLAIMED" });
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    setLocalDates((prev) => [...prev, ...additions]);
    setAmendMessage("All week days added — please go through and add or remove any dates not applicable.");
  }

  async function uploadOneFile(asset: { uri: string; name: string; mimeType: string }, token: string | null) {
    const formData = new FormData();
    formData.append("file", { uri: asset.uri, name: asset.name, type: asset.mimeType } as any);
    const res = await fetch(`${API_URL}/api/work-records/${id}/evidence`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || `Failed to upload ${asset.name}.`);
    }
  }

  // Sends whatever is currently in local state to the server. Does NOT refresh local state
  // afterwards — safe to fire-and-forget when navigating away (e.g. on back-press).
  async function persistChanges() {
    if (!record) return;
    const localDateIds = new Set(localDates.map((d) => d.id));
    const removedDateIds = record.workDates.filter((d) => !localDateIds.has(d.id)).map((d) => d.id);
    const addedDates = localDates.filter((d) => d.id.startsWith("pending-")).map((d) => d.date);

    const localIdentifiableIds = new Set(localIdentifiables.map((i) => i.id));
    const removedIdentifiableIds = record.identifiables.filter((i) => !localIdentifiableIds.has(i.id)).map((i) => i.id);
    const addedIdentifiables = localIdentifiables.filter((i) => i.id.startsWith("pending-"));

    const localEvidenceIds = new Set(localEvidence.map((e) => e.id));
    const removedEvidenceIds = record.evidenceDocuments.filter((e) => !localEvidenceIds.has(e.id)).map((e) => e.id);
    const addedEvidence = localEvidence.filter((e) => e.pendingAsset);

    const token = await getToken();

    await Promise.all([
      apiFetch(`/api/work-records/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          jobDescription,
          locations,
          riskAssessment,
          comments,
          isCoreJob,
          coreJobStartDate,
          coreJobEndDate,
          isUnitCoordinatorDay,
          isAssistantCoordinatorDay,
        }),
      }),
      addedDates.length > 0 ? apiFetch(`/api/work-records/${id}/dates`, { method: "POST", body: JSON.stringify({ dates: addedDates }) }) : Promise.resolve(),
      ...removedDateIds.map((rid) => apiFetch(`/api/work-records/${id}/dates/${rid}`, { method: "DELETE" })),
      ...addedIdentifiables.map((idf) =>
        apiFetch(`/api/work-records/${id}/identifiables`, {
          method: "POST",
          body: JSON.stringify({ categoryId: idf.categoryId, performerDescription: idf.performerDescription, selfCoordinated: idf.selfCoordinated }),
        })
      ),
      ...removedIdentifiableIds.map((iid) => apiFetch(`/api/work-records/${id}/identifiables/${iid}`, { method: "DELETE" })),
      ...addedEvidence.map((ev) => uploadOneFile(ev.pendingAsset!, token)),
      ...removedEvidenceIds.map((eid) => apiFetch(`/api/work-records/${id}/evidence/${eid}`, { method: "DELETE" })),
    ]);
  }

  // Used when the performer stays on screen (e.g. "Save Edits" in the submit confirmation) —
  // saves, then reloads so the screen reflects the confirmed server state.
  async function saveAll() {
    setSaving(true);
    setError(null);
    try {
      await persistChanges();
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleBack() {
    if (!isOwnerOngoing) {
      navigation.goBack();
      return;
    }
    setSaving(true);
    try {
      await persistChanges();
      navigation.goBack();
    } catch (err: any) {
      setSaving(false);
      Alert.alert(
        "Couldn't save your changes",
        err.message || "Something went wrong saving this production. Check your connection and try again.",
        [
          { text: "Discard changes", style: "destructive", onPress: () => navigation.goBack() },
          { text: "Try again", style: "cancel" },
        ]
      );
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

  function addIdentifiableLocal(categoryId: string, description: string, selfCoordinated: boolean) {
    const category = categories.find((c) => c.id === categoryId);
    setLocalIdentifiables((prev) => [
      ...prev,
      {
        id: `pending-${Date.now()}`,
        categoryId,
        categoryLabel: category?.label ?? "",
        performerDescription: description,
        verifiedDescription: null,
        status: "SUBMITTED",
        selfCoordinated,
      },
    ]);
    setShowIdModal(false);
  }

  function removeIdentifiableLocal(identifiableId: string) {
    setLocalIdentifiables((prev) => prev.filter((i) => i.id !== identifiableId));
  }

  async function pickEvidence() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/jpeg", "image/png"],
      multiple: true,
    });
    if (result.canceled || !result.assets?.length) return;
    setLocalEvidence((prev) => [
      ...prev,
      ...result.assets.map((asset) => ({
        id: `pending-${Date.now()}-${asset.name}`,
        fileName: asset.name,
        pendingAsset: { uri: asset.uri, name: asset.name, mimeType: asset.mimeType || "application/octet-stream" },
      })),
    ]);
  }

  function removeEvidenceLocal(evidenceId: string) {
    setLocalEvidence((prev) => prev.filter((e) => e.id !== evidenceId));
  }

  function confirmSubmit() {
    if (!record) return;
    if (!selectedFm) {
      setError("Select a Full Member to submit to.");
      return;
    }
    if (localDates.filter((d) => d.status === "CLAIMED").length === 0) {
      setError("Add at least one work date before submitting.");
      return;
    }
    if (!jobDescription.trim()) {
      setError("Add a job description before submitting.");
      return;
    }
    if (locations.length === 0) {
      setError("Select at least one location before submitting.");
      return;
    }
    if (localEvidence.length === 0) {
      setError("Upload at least one file before submitting.");
      return;
    }
    setError(null);
    Alert.alert(
      "Submit for approval?",
      "This is final. Only submit once all work on this production is finished, or if you need the days accumulated so far counted toward an upgrade.",
      [
        { text: "Save Edits (don't submit)", style: "cancel", onPress: () => saveAll() },
        { text: "Finalise & Submit", onPress: submitForApproval },
      ]
    );
  }

  async function submitForApproval() {
    if (!selectedFm) return;
    setSubmitting(true);
    setError(null);
    try {
      await persistChanges();
      await apiFetch(`/api/work-records/${id}/submit`, { method: "POST", body: JSON.stringify({ fullMemberId: selectedFm.id }) });
      // ProductionDetail is a sibling of the tab navigator in the root stack, not nested
      // inside it — navigate("Work") can't resolve a bare tab name from here.
      navigation.navigate("Main", { screen: "Work" });
      Alert.alert("Submitted", "Your work record has been submitted for approval.");
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  function confirmSubmitSolo() {
    if (!record) return;
    if (localDates.filter((d) => d.status === "CLAIMED").length === 0) {
      setError("Add at least one work date before submitting.");
      return;
    }
    if (!jobDescription.trim()) {
      setError("Add a job description before submitting.");
      return;
    }
    if (locations.length === 0) {
      setError("Select at least one location before submitting.");
      return;
    }
    if (localEvidence.length === 0) {
      setError("Upload at least one file before submitting.");
      return;
    }
    setError(null);
    Alert.alert(
      "Submit Solo/Self Coordinated?",
      "ALL of the dates listed must have been self-coordinated, and all must be well evidenced by the supporting documents you've uploaded. This is final and once submitted the only way to change it is to delete it and create a new work log.",
      [
        { text: "Go back", style: "cancel" },
        { text: "Submit", onPress: submitSolo },
      ]
    );
  }

  async function submitSolo() {
    setSubmittingSolo(true);
    setError(null);
    try {
      await persistChanges();
      await apiFetch(`/api/work-records/${id}/submit-solo`, { method: "POST" });
      navigation.navigate("Main", { screen: "Work" });
      Alert.alert("Approved", "Your Solo/Self-Coordinated work record has been instantly approved.");
    } catch (err: any) {
      setError(err.message);
      setSubmittingSolo(false);
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
  for (const dateStr of record.previousDates) {
    if (!markedDates[dateStr]) markedDates[dateStr] = {};
    markedDates[dateStr].isPreviouslyUsed = true;
  }
  const approvedDaysDisplay = localDates.filter((d) => d.status === "CLAIMED").length;
  const isKeyMember = user?.currentGradeKey === "KEY_STUNT_PERFORMER";
  const isCoordinatorDay = isUnitCoordinatorDay || isAssistantCoordinatorDay;
  const canGoSolo = (user?.currentGradeKey === "SENIOR_STUNT_PERFORMER" || isKeyMember) && !isCoordinatorDay;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        variant="detail"
        title="Production"
        onBack={handleBack}
        backIcon={
          isOwnerOngoing ? (
            <View style={styles.backTick}>{saving ? <ActivityIndicator size="small" color="#fff" /> : <IconCheck size={20} color="#fff" />}</View>
          ) : undefined
        }
      />
      <KeyboardAvoider>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <View style={styles.rowBetween}>
          <Text style={styles.title}>{record.productionName}</Text>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            {record.isQualifyingCoreJob && <Badge label="Core Team" tone="teal" />}
            {record.isSoloSubmission && <Badge label="Solo" tone="amber" />}
            <Badge
              label={record.status}
              tone={record.status === "APPROVED" ? "green" : record.status === "SUBMITTED" ? "amber" : record.status === "REJECTED" ? "red" : "gray"}
            />
          </View>
        </View>

        {isOwnerOngoing && isKeyMember && (
          <Card style={{ marginTop: 12 }}>
            <View style={[styles.row, { justifyContent: "space-between" }]}>
              <Text style={styles.label}>Unit Coordinator Day?</Text>
              <Switch value={isUnitCoordinatorDay} onValueChange={setIsUnitCoordinatorDay} />
            </View>
            <View style={[styles.row, { justifyContent: "space-between", marginTop: 10 }]}>
              <Text style={styles.label}>Assistant Coordinator Day?</Text>
              <Switch value={isAssistantCoordinatorDay} onValueChange={setIsAssistantCoordinatorDay} />
            </View>
            {isCoordinatorDay && (
              <Text style={styles.muted}>
                ALL of the days on this record must have been {isUnitCoordinatorDay ? "Unit Coordinator" : "Assistant Coordinator"} days — if they
                weren't, please create a new work log specifically for these days.
              </Text>
            )}
          </Card>
        )}

        {isRejected && (
          <Card style={{ marginTop: 12, backgroundColor: "#f5e0dc" }}>
            <Text style={{ fontWeight: "700", color: colors.red, marginBottom: 4 }}>Rejected</Text>
            <Text>{record.latestDecision?.message || "No message provided."}</Text>
            <View style={{ marginTop: 10 }}>
              <Button title="Edit" onPress={editRejected} />
            </View>
          </Card>
        )}

        {(record.status === "APPROVED" || record.status === "ARCHIVED") && !record.hasSpawnedContinuation && (
          <Card style={{ marginTop: 12, borderWidth: 2, borderColor: SUBMIT_BORDER }}>
            <Text style={styles.muted}>
              Worked additional days on this production after it was already approved? Use this to carry on logging them.
            </Text>
            <View style={{ marginTop: 10 }}>
              <Button title="Duplicate Production" onPress={addContinuation} />
            </View>
          </Card>
        )}

        <Card style={{ marginTop: 12 }}>
          <Text style={styles.sectionLabel}>Work dates — {approvedDaysDisplay} approved</Text>
          <Calendar
            markedDates={markedDates}
            onDayPress={(day) => isOwnerOngoing && toggleDate(day.dateString)}
            minDate={minEligibleDate}
            disableAllTouchEventsForDisabledDays
            dayComponent={DayCell}
            theme={{ selectedDayBackgroundColor: colors.green, todayTextColor: colors.green, arrowColor: colors.green }}
          />
          {!isOwnerOngoing && <Text style={styles.muted}>Tap dates are disabled — this record is locked.</Text>}
          {isOwnerOngoing && <Text style={styles.muted}>Dates before {minEligibleDate} are outside your current grade period and can't be claimed.</Text>}
          {record.previousDates.length > 0 && (
            <Text style={styles.muted}>Greyed-out dates with a line through them were already claimed on an earlier production in this chain.</Text>
          )}

          {isOwnerOngoing && (
            <View style={{ marginTop: 14 }}>
              <View style={[styles.row, { justifyContent: "space-between" }]}>
                <Text style={styles.label}>Was this a Core job?</Text>
                <Switch value={isCoreJob} onValueChange={setIsCoreJob} />
              </View>
              {isCoreJob && (
                <>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                    <TouchableOpacity style={[styles.input, { flex: 1 }]} onPress={() => setDatePickerTarget("start")}>
                      <Text style={{ color: coreJobStartDate ? colors.text : colors.textMuted }}>{coreJobStartDate ?? "Start date"}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.input, { flex: 1 }]} onPress={() => setDatePickerTarget("end")}>
                      <Text style={{ color: coreJobEndDate ? colors.text : colors.textMuted }}>{coreJobEndDate ?? "End date"}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ marginTop: 10 }}>
                    <Button
                      title="Amend Calendar"
                      variant="secondary"
                      onPress={amendCalendarWithCoreJobDates}
                      disabled={!coreJobStartDate || !coreJobEndDate}
                    />
                  </View>
                  {amendMessage && <Text style={styles.muted}>{amendMessage}</Text>}
                </>
              )}
            </View>
          )}
        </Card>

        <Card style={{ marginTop: 12 }}>
          <Text style={styles.sectionLabel}>Work record details</Text>

          <Field label="Job description">
            <TextInput style={[styles.input, { minHeight: 60 }]} multiline value={jobDescription} onChangeText={setJobDescription} editable={isOwnerOngoing} />
          </Field>

          <Field label="Location (select all that apply)">
            <View style={styles.rowWrap}>
              {WORK_LOCATION.map((loc) => (
                <TouchableOpacity
                  key={loc}
                  style={[styles.chip, locations.includes(loc) && styles.chipActive]}
                  onPress={() => isOwnerOngoing && toggleLocation(loc)}
                >
                  <Text style={[styles.chipText, locations.includes(loc) && styles.chipTextActive]}>{WORK_LOCATION_LABELS[loc]}</Text>
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

        {!isCoordinatorDay && (
          <Card style={{ marginTop: 12 }}>
            <Text style={styles.sectionLabel}>Identifiables</Text>
            {localIdentifiables.map((idf) => (
              <View key={idf.id} style={styles.idRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.idCategory}>{idf.categoryLabel}</Text>
                  <Text>{idf.verifiedDescription ?? idf.performerDescription}</Text>
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    {idf.status !== "SUBMITTED" && <Badge label={idf.status} tone={idf.status === "APPROVED" ? "green" : "red"} />}
                    {idf.selfCoordinated && <Badge label="Self-Coordinated" tone="amber" />}
                  </View>
                </View>
                {isOwnerOngoing && (
                  <TouchableOpacity onPress={() => removeIdentifiableLocal(idf.id)}>
                    <Text style={{ color: colors.red }}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {localIdentifiables.length === 0 && <Text style={styles.muted}>None added yet.</Text>}

            {isOwnerOngoing && (
              <View style={{ marginTop: 12 }}>
                <Button title="Add Identifiable" variant="secondary" icon={<IconPlus size={16} color={colors.text} />} onPress={() => setShowIdModal(true)} />
              </View>
            )}
          </Card>
        )}

        <Card style={{ marginTop: 12 }}>
          <Text style={styles.sectionLabel}>Contract / evidence</Text>
          {localEvidence.map((doc) => (
            <View key={doc.id} style={styles.idRow}>
              <Text style={{ flex: 1 }}>
                {doc.fileName}
                {doc.pendingAsset ? " (not saved yet)" : ""}
              </Text>
              {isOwnerOngoing && (
                <TouchableOpacity onPress={() => removeEvidenceLocal(doc.id)}>
                  <Text style={{ color: colors.red }}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          {localEvidence.length === 0 && <Text style={styles.muted}>No files uploaded yet.</Text>}
          {isOwnerOngoing && (
            <View style={{ marginTop: 10 }}>
              <Button title="Add Files" variant="secondary" onPress={pickEvidence} />
            </View>
          )}
        </Card>

        {isOwnerOngoing && (
          <Card style={{ marginTop: 12, borderWidth: 2, borderColor: SUBMIT_BORDER }}>
            <Text style={styles.sectionLabel}>Submit for approval</Text>

            {canGoSolo && (
              <View style={[styles.row, { justifyContent: "space-between", marginBottom: 10 }]}>
                <Text style={styles.label}>Solo/Self Coordinated?</Text>
                <Switch value={isSoloSubmission} onValueChange={setIsSoloSubmission} />
              </View>
            )}

            <Text style={[styles.muted, { marginBottom: 14 }]}>
              {isSoloSubmission
                ? "Upload all evidence of risk assessments, contracts, recce information and any other supporting documentation for every date listed."
                : isUnitCoordinatorDay
                ? "ALL of the days listed must have been Unit Coordinator days — if they weren't, please create a new work log specifically for these days."
                : isAssistantCoordinatorDay
                ? "ALL of the days listed must have been Assistant Coordinator days — if they weren't, please create a new work log specifically for these days."
                : SUBMIT_FOR_APPROVAL_HELP_TEXT}
            </Text>

            {!isSoloSubmission && (
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
            )}

            {error && <Text style={{ color: colors.red, marginBottom: 8 }}>{error}</Text>}
            <Button
              title={submitting || submittingSolo ? "Submitting..." : isSoloSubmission ? "Submit Solo/Self Coordinated" : "Submit for Approval"}
              onPress={isSoloSubmission ? confirmSubmitSolo : confirmSubmit}
              disabled={submitting || submittingSolo}
              loading={submitting || submittingSolo}
            />
          </Card>
        )}

        {isDeletable && (
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

      <AddIdentifiableModal
        visible={showIdModal}
        categories={categories}
        showSelfCoordinated={isKeyMember}
        onClose={() => setShowIdModal(false)}
        onAdd={addIdentifiableLocal}
      />

      <CoreJobDatePickerModal
        visible={datePickerTarget !== null}
        target={datePickerTarget}
        onClose={() => setDatePickerTarget(null)}
        onSelect={(dateStr) => {
          if (datePickerTarget === "start") {
            if (coreJobEndDate && dateStr >= coreJobEndDate) {
              Alert.alert("Invalid date", "Start date must be before the end date.");
              return;
            }
            setCoreJobStartDate(dateStr);
          } else if (datePickerTarget === "end") {
            if (coreJobStartDate && dateStr <= coreJobStartDate) {
              Alert.alert("Invalid date", "End date must be after the start date.");
              return;
            }
            setCoreJobEndDate(dateStr);
          }
          setAmendMessage(null);
          setDatePickerTarget(null);
        }}
      />
    </View>
  );
}

function AddIdentifiableModal({
  visible,
  categories,
  showSelfCoordinated,
  onClose,
  onAdd,
}: {
  visible: boolean;
  categories: AreaCategory[];
  showSelfCoordinated: boolean;
  onClose: () => void;
  onAdd: (categoryId: string, description: string, selfCoordinated: boolean) => void;
}) {
  const insets = useSafeAreaInsets();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [description, setDescription] = useState("");
  const [selfCoordinated, setSelfCoordinated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setCategoryId(null);
      setDescription("");
      setSelfCoordinated(false);
      setError(null);
      setShowDropdown(false);
    }
  }, [visible]);

  const selected = categories.find((c) => c.id === categoryId);

  function submit() {
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
      onAdd(categoryId, description.trim(), selfCoordinated);
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

          {showSelfCoordinated && (
            <View style={[styles.row, { justifyContent: "space-between", marginBottom: 12 }]}>
              <Text style={styles.label}>Self-Coordinated?</Text>
              <Switch value={selfCoordinated} onValueChange={setSelfCoordinated} />
            </View>
          )}

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

function CoreJobDatePickerModal({
  visible,
  target,
  onSelect,
  onClose,
}: {
  visible: boolean;
  target: "start" | "end" | null;
  onSelect: (dateStr: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={[styles.modalBackdrop, { paddingTop: insets.top + 76 }]} onPress={onClose}>
        <Pressable style={[styles.modalCard, { paddingBottom: 4 }]} onPress={() => {}}>
          <Text style={styles.modalTitle}>{target === "start" ? "Select start date" : "Select end date"}</Text>
          <Calendar
            onDayPress={(day) => onSelect(day.dateString)}
            theme={{ selectedDayBackgroundColor: colors.green, todayTextColor: colors.green, arrowColor: colors.green }}
          />
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
  backTick: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" },
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
