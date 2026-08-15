import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "../api/client";
import { IconCircle } from "../components/UI";
import { Header } from "../components/Header";
import { IconAward, IconClipboardCheck, IconCalendar } from "../components/Icons";
import { colors } from "../theme";
import { useBadges } from "../navigation/BadgeContext";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

function iconFor(n: Notification) {
  const positive = !/reject/i.test(n.title);
  const tone = positive ? "green" : "red";
  if (n.type === "UPGRADE_DECISION") return { icon: <IconAward size={20} color={positive ? colors.green : colors.red} />, tone: tone as const };
  return { icon: <IconClipboardCheck size={20} color={positive ? colors.green : colors.red} />, tone: tone as const };
}

export default function NotificationsScreen() {
  const { refresh: refreshBadges } = useBadges();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await apiFetch<{ notifications: Notification[] }>("/api/notifications");
    setNotifications(data.notifications);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function markRead(n: Notification) {
    if (n.readAt) return;
    await apiFetch(`/api/notifications/${n.id}/read`, { method: "POST" });
    load();
    refreshBadges();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header variant="main" />
      <FlatList
        contentContainerStyle={styles.content}
        data={notifications}
        keyExtractor={(n) => n.id}
        refreshing={loading}
        onRefresh={load}
        ListHeaderComponent={<Text style={styles.title}>Notifications</Text>}
        ListEmptyComponent={!loading ? <Text style={styles.muted}>No notifications yet.</Text> : null}
        renderItem={({ item }) => {
          const { icon, tone } = iconFor(item);
          return (
            <TouchableOpacity style={styles.card} onPress={() => markRead(item)}>
              {!item.readAt && <View style={styles.unreadDot} />}
              <IconCircle tone={tone} size={44}>
                {icon}
              </IconCircle>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.notifTitle}>{item.title}</Text>
                <Text style={styles.notifBody}>{item.body}</Text>
                <View style={styles.metaRow}>
                  <IconCalendar size={12} color={colors.textMuted} />
                  <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
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
    position: "relative",
  },
  unreadDot: { position: "absolute", top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.teal },
  notifTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  notifBody: { fontSize: 13, color: colors.textMuted, marginTop: 3 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 },
  meta: { fontSize: 11, color: colors.textMuted },
  muted: { color: colors.textMuted, textAlign: "center", marginTop: 40 },
});
