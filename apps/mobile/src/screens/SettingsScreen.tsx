import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Modal, Pressable, Alert } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Card, Button, Badge } from "../components/UI";
import { Header } from "../components/Header";
import { KeyboardAvoider } from "../components/KeyboardAvoider";
import { SwipeableRow } from "../components/SwipeableRow";
import { IconPlus, IconChevronDown, IconTrash } from "../components/Icons";
import { colors } from "../theme";
import { GRADE_LABELS, type GradeKey } from "@bsr/shared";

type TicketCategory = "UPGRADE_QUERIES" | "BUG_REPORTS" | "OTHER";
type TicketStatus = "OPEN" | "CLOSED";

interface SupportTicket {
  id: string;
  category: TicketCategory;
  title: string;
  message: string;
  status: TicketStatus;
  response: string | null;
  createdAt: string;
}

const CATEGORY_OPTIONS: TicketCategory[] = ["UPGRADE_QUERIES", "BUG_REPORTS", "OTHER"];
const CATEGORY_LABELS: Record<TicketCategory, string> = {
  UPGRADE_QUERIES: "Upgrade Queries",
  BUG_REPORTS: "Bug Reports",
  OTHER: "Other",
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await apiFetch<{ tickets: SupportTicket[] }>("/api/support-tickets");
    setTickets(data.tickets);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function dismissTicket(t: SupportTicket) {
    setTickets((prev) => prev.filter((x) => x.id !== t.id));
    apiFetch(`/api/support-tickets/${t.id}`, { method: "PATCH", body: JSON.stringify({ hiddenFromUser: true }) }).catch(() => load());
  }

  const gradeLabel = user?.currentGradeKey ? GRADE_LABELS[user.currentGradeKey as GradeKey] : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        variant="main"
        extraHeight={20}
        name={user?.name}
        gradeKey={user?.currentGradeKey ?? undefined}
        gradeLabel={gradeLabel}
        onGearPress={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.screenTitle}>Settings</Text>

        <Card style={{ marginTop: 14 }}>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>BSR Join Date</Text>
            <Text style={styles.infoValue}>{formatDate(user?.dateJoined)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Upgraded</Text>
            <Text style={styles.infoValue}>{formatDate(user?.lastUpgradedAt)}</Text>
          </View>
          <View style={{ marginTop: 12 }}>
            <Button title="Change Password" variant="secondary" onPress={() => setShowPasswordModal(true)} />
          </View>
        </Card>

        <Card style={{ marginTop: 14 }}>
          <Text style={styles.sectionLabel}>Support Tickets</Text>
          {!loading && tickets.length === 0 && <Text style={styles.muted}>No support tickets yet.</Text>}
          {tickets.map((t) => {
            const row = (
              <TouchableOpacity style={styles.ticketRow} onPress={() => setSelectedTicket(t)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ticketTitle}>{t.title}</Text>
                  <Text style={styles.ticketDate}>{formatDate(t.createdAt)}</Text>
                </View>
                <Badge label={t.status === "OPEN" ? "Open" : "Closed"} tone={t.status === "OPEN" ? "amber" : "green"} />
                {t.status === "CLOSED" && (
                  <View style={styles.swipeHint}>
                    <IconTrash size={12} color={colors.textMuted} />
                    <Text style={styles.swipeHintText}>Swipe to delete</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
            return t.status === "CLOSED" ? (
              <SwipeableRow key={t.id} onDismiss={() => dismissTicket(t)}>
                {row}
              </SwipeableRow>
            ) : (
              <View key={t.id}>{row}</View>
            );
          })}
          <View style={{ marginTop: 12 }}>
            <Button title="Open New Ticket" variant="secondary" icon={<IconPlus size={16} color={colors.text} />} onPress={() => setShowNewTicketModal(true)} />
          </View>
        </Card>

        <View style={{ marginTop: 20 }}>
          <Button title="Sign out" variant="danger" onPress={logout} />
        </View>
      </ScrollView>

      <ChangePasswordModal visible={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
      <NewTicketModal
        visible={showNewTicketModal}
        onClose={() => setShowNewTicketModal(false)}
        onCreated={() => {
          setShowNewTicketModal(false);
          load();
        }}
      />
      <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
    </View>
  );
}

function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
    }
  }, [visible]);

  async function submit() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) });
      onClose();
      Alert.alert("Password changed", "Your password has been updated.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoider>
        <Pressable style={[styles.modalBackdrop, { paddingTop: insets.top + 76 }]} onPress={onClose}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.rowBetween}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={{ color: colors.textMuted, fontSize: 20 }}>×</Text>
              </TouchableOpacity>
            </View>

            <Field label="Current password">
              <TextInput style={styles.input} secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} />
            </Field>
            <Field label="New password">
              <TextInput style={styles.input} secureTextEntry value={newPassword} onChangeText={setNewPassword} />
            </Field>
            <Field label="New password again">
              <TextInput style={styles.input} secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
            </Field>

            {error && <Text style={{ color: colors.red, marginBottom: 8 }}>{error}</Text>}
            <Button title={saving ? "Saving..." : "Save Password"} onPress={submit} disabled={saving} loading={saving} />
          </Pressable>
        </Pressable>
      </KeyboardAvoider>
    </Modal>
  );
}

function NewTicketModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<TicketCategory | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setCategory(null);
      setShowDropdown(false);
      setTitle("");
      setMessage("");
      setError(null);
    }
  }, [visible]);

  async function submit() {
    if (!category) {
      setError("Select a category.");
      return;
    }
    if (!title.trim()) {
      setError("Enter a title.");
      return;
    }
    if (!message.trim()) {
      setError("Enter a message.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/support-tickets", { method: "POST", body: JSON.stringify({ category, title: title.trim(), message: message.trim() }) });
      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoider>
        <Pressable style={[styles.modalBackdrop, { paddingTop: insets.top + 76 }]} onPress={onClose}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.rowBetween}>
              <Text style={styles.modalTitle}>Open New Ticket</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={{ color: colors.textMuted, fontSize: 20 }}>×</Text>
              </TouchableOpacity>
            </View>

            <Field label="Category">
              <TouchableOpacity style={styles.dropdown} onPress={() => setShowDropdown((s) => !s)}>
                <Text style={{ color: category ? colors.text : colors.textMuted }}>{category ? CATEGORY_LABELS[category] : "Select a category..."}</Text>
                <IconChevronDown size={16} color={colors.textMuted} />
              </TouchableOpacity>
              {showDropdown && (
                <View style={styles.dropdownList}>
                  {CATEGORY_OPTIONS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setCategory(c);
                        setShowDropdown(false);
                      }}
                    >
                      <Text>{CATEGORY_LABELS[c]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Field>

            <Field label="Title">
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Brief summary" />
            </Field>

            <Field label="Message">
              <TextInput style={[styles.input, { minHeight: 90 }]} multiline value={message} onChangeText={setMessage} placeholder="Describe your query or issue" />
            </Field>

            {error && <Text style={{ color: colors.red, marginBottom: 8 }}>{error}</Text>}
            <Button title={saving ? "Submitting..." : "Submit Support Ticket"} onPress={submit} disabled={saving} loading={saving} />
          </Pressable>
        </Pressable>
      </KeyboardAvoider>
    </Modal>
  );
}

function TicketDetailModal({ ticket, onClose }: { ticket: SupportTicket | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!ticket} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={[styles.modalBackdrop, { paddingTop: insets.top + 76 }]} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <View style={styles.rowBetween}>
            <Text style={styles.modalTitle}>{ticket?.title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: colors.textMuted, fontSize: 20 }}>×</Text>
            </TouchableOpacity>
          </View>
          {ticket && (
            <>
              <Text style={styles.detailCategory}>{CATEGORY_LABELS[ticket.category]}</Text>
              <Text style={styles.detailMessage}>{ticket.message}</Text>
              <View style={styles.divider} />
              {ticket.status === "OPEN" ? (
                <Text style={styles.waiting}>Waiting for response</Text>
              ) : (
                <>
                  <Text style={styles.respondedLabel}>Office responded:</Text>
                  <Text style={styles.detailMessage}>{ticket.response}</Text>
                </>
              )}
            </>
          )}
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
  content: { padding: 18, paddingTop: 14, paddingBottom: 60 },
  screenTitle: { fontSize: 26, fontWeight: "800", color: colors.text },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 10 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  infoLabel: { fontSize: 13, color: colors.textMuted },
  infoValue: { fontSize: 13, fontWeight: "700", color: colors.text },
  muted: { color: colors.textMuted, fontSize: 13 },
  ticketRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  ticketTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  ticketDate: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  swipeHint: { flexDirection: "row", alignItems: "center", gap: 3, marginLeft: 6 },
  swipeHintText: { fontSize: 10, color: colors.textMuted },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, backgroundColor: colors.white },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(2,30,36,0.5)" },
  modalCard: { backgroundColor: colors.white, borderRadius: 20, padding: 20, marginHorizontal: 16 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.tealDark, marginBottom: 16, flexShrink: 1, marginRight: 8 },
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
  detailCategory: { fontSize: 12, fontWeight: "700", color: colors.tealDark, marginBottom: 8 },
  detailMessage: { fontSize: 14, color: colors.text, lineHeight: 20 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
  waiting: { fontSize: 13, fontWeight: "700", color: colors.amber },
  respondedLabel: { fontSize: 13, fontWeight: "700", color: colors.green, marginBottom: 6 },
});
