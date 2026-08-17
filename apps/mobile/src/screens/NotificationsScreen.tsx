import React, { useCallback, useRef, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated, PanResponder, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "../api/client";
import { IconCircle } from "../components/UI";
import { Header } from "../components/Header";
import { IconAward, IconClipboardCheck } from "../components/Icons";
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
  const tone: "green" | "red" = positive ? "green" : "red";
  if (n.type === "UPGRADE_DECISION") return { icon: <IconAward size={18} color={tone === "green" ? colors.green : colors.red} />, tone };
  return { icon: <IconClipboardCheck size={18} color={tone === "green" ? colors.green : colors.red} />, tone };
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "2-digit" });
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time}`;
}

// Built on core RN PanResponder/Animated rather than react-native-gesture-handler, which isn't
// installed and would need a native rebuild to add — this needs none, ships as a JS-only update.
function SwipeableRow({ children, onDismiss }: { children: React.ReactNode; onDismiss: () => void }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dx < 0) translateX.setValue(gesture.dx);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -80) {
          Animated.timing(translateX, { toValue: -500, duration: 180, useNativeDriver: true }).start(onDismiss);
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
      {children}
    </Animated.View>
  );
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

  function dismiss(n: Notification) {
    setNotifications((prev) => prev.filter((x) => x.id !== n.id));
    apiFetch(`/api/notifications/${n.id}`, { method: "DELETE" })
      .then(refreshBadges)
      .catch(() => load());
  }

  function confirmClearAll() {
    if (notifications.length === 0) return;
    Alert.alert("Clear all notifications?", "This removes every notification from this list. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear all",
        style: "destructive",
        onPress: () => {
          setNotifications([]);
          apiFetch("/api/notifications", { method: "DELETE" })
            .then(refreshBadges)
            .catch(() => load());
        },
      },
    ]);
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
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={confirmClearAll} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[styles.clearAll, notifications.length === 0 && { opacity: 0.4 }]}>Clear all</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Notifications</Text>
          </View>
        }
        ListEmptyComponent={!loading ? <Text style={styles.muted}>No notifications yet.</Text> : null}
        renderItem={({ item }) => {
          const { icon, tone } = iconFor(item);
          return (
            <SwipeableRow onDismiss={() => dismiss(item)}>
              <TouchableOpacity style={styles.card} onPress={() => markRead(item)}>
                <IconCircle tone={tone} size={34}>
                  {icon}
                </IconCircle>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={styles.topRow}>
                    <View style={styles.titleRow}>
                      {!item.readAt && <View style={styles.unreadDot} />}
                      <Text style={styles.notifTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                    </View>
                    <Text style={styles.when}>{formatWhen(item.createdAt)}</Text>
                  </View>
                  <Text style={styles.notifBody} numberOfLines={2}>
                    {item.body}
                  </Text>
                </View>
              </TouchableOpacity>
            </SwipeableRow>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 60 },
  headerRow: { flexDirection: "row", alignItems: "baseline", gap: 12, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  clearAll: { fontSize: 13, fontWeight: "700", color: colors.red },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.teal },
  notifTitle: { fontSize: 14, fontWeight: "800", color: colors.text, flexShrink: 1 },
  notifBody: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  when: { fontSize: 10, color: colors.textMuted, marginLeft: 8 },
  muted: { color: colors.textMuted, textAlign: "center", marginTop: 40 },
});
