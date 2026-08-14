import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "../api/client";
import { Screen } from "../components/UI";
import { colors } from "../theme";
import { useBadges } from "../navigation/BadgeContext";

interface Notification {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
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
    <Screen>
      <Text style={styles.title}>Notifications</Text>
      <FlatList
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        data={notifications}
        keyExtractor={(n) => n.id}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={!loading ? <Text style={styles.muted}>No notifications yet.</Text> : null}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.card, !item.readAt && styles.cardUnread]} onPress={() => markRead(item)}>
            <Text style={styles.notifTitle}>{item.title}</Text>
            <Text style={styles.notifBody}>{item.body}</Text>
            <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
          </TouchableOpacity>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "800", color: colors.greenDark, paddingHorizontal: 16, paddingTop: 16 },
  card: { backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10 },
  cardUnread: { borderColor: colors.green, backgroundColor: colors.greenLight },
  notifTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  notifBody: { fontSize: 14, color: colors.text, marginTop: 4 },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  muted: { color: colors.textMuted, textAlign: "center", marginTop: 40 },
});
