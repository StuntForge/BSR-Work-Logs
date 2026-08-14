import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Card, Button, Badge, ProgressBar, Screen } from "../components/UI";
import { colors } from "../theme";
import { computeElapsed, formatElapsed } from "../utils/time";

interface Requirement {
  type: string;
  targetValue: number;
  approvedValue: number;
  pendingValue: number;
  met: boolean;
}
interface HomeData {
  name: string;
  currentGrade: { key: string; label: string } | null;
  nextGrade: { key: string; label: string } | null;
  gradePeriodStartedAt: string | null;
  requirements: Requirement[];
  eligibleForUpgrade: boolean;
}

const REQUIREMENT_LABELS: Record<string, string> = {
  DAYS_WORKED: "Days worked",
  IDENTIFIABLES: "Identifiables",
  COORDINATOR_SPREAD: "Coordinator spread",
  HEALTH_SAFETY: "Health & Safety",
};

export default function HomeScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    const d = await apiFetch<HomeData>("/api/home");
    setData(d);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function submitForUpgrade() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await apiFetch("/api/upgrade-applications", { method: "POST" });
      setSubmitted(true);
      load();
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!data) {
    return (
      <Screen>
        <Text style={{ padding: 24 }}>Loading...</Text>
      </Screen>
    );
  }

  const timeRequirement = data.requirements.find((r) => r.type === "MIN_TIME_AT_GRADE");
  const otherRequirements = data.requirements.filter((r) => r.type !== "MIN_TIME_AT_GRADE");

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Text style={styles.greeting}>{data.name}</Text>
        <Text style={styles.gradeLine}>{data.currentGrade?.label ?? "—"}</Text>

        {data.nextGrade ? (
          <Text style={styles.targetLine}>Working towards {data.nextGrade.label}</Text>
        ) : (
          <Text style={styles.targetLine}>You have reached the top grade in this system.</Text>
        )}

        {data.gradePeriodStartedAt && (
          <Card style={{ marginTop: 16 }}>
            <Text style={styles.cardLabel}>Time served</Text>
            <Text style={styles.clock}>{formatElapsed(computeElapsed(new Date(data.gradePeriodStartedAt), now))}</Text>
            {timeRequirement && (
              <Text style={styles.muted}>
                Minimum required: {timeRequirement.targetValue} days {timeRequirement.met ? "— met" : ""}
              </Text>
            )}
          </Card>
        )}

        {otherRequirements.map((req) => (
          <Card key={req.type} style={{ marginTop: 12 }}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardLabel}>{REQUIREMENT_LABELS[req.type] ?? req.type}</Text>
              {req.met && <Badge label="Met" tone="green" />}
            </View>
            <Text style={styles.progressValue}>
              {req.approvedValue} / {req.targetValue} approved
              {req.pendingValue > 0 ? `  ·  +${req.pendingValue} awaiting approval` : ""}
            </Text>
            <ProgressBar value={req.approvedValue} max={req.targetValue} />
          </Card>
        ))}

        {data.requirements.length === 0 && data.nextGrade && (
          <Card style={{ marginTop: 12 }}>
            <Text style={styles.muted}>No requirements configured for this grade yet.</Text>
          </Card>
        )}

        {data.eligibleForUpgrade && !submitted && (
          <View style={{ marginTop: 24 }}>
            <Button title={submitting ? "Submitting..." : "Submit for Upgrade"} onPress={submitForUpgrade} disabled={submitting} loading={submitting} />
            {submitError && <Text style={{ color: colors.red, marginTop: 8 }}>{submitError}</Text>}
          </View>
        )}
        {submitted && (
          <Card style={{ marginTop: 16, backgroundColor: colors.greenLight }}>
            <Text>Your upgrade application has been submitted to the committee.</Text>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 60 },
  greeting: { fontSize: 22, fontWeight: "800", color: colors.greenDark },
  gradeLine: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 2 },
  targetLine: { fontSize: 14, color: colors.textMuted, marginTop: 2, marginBottom: 8 },
  cardLabel: { fontSize: 13, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.4 },
  clock: { fontSize: 20, fontWeight: "700", color: colors.greenDark, marginTop: 6, fontVariant: ["tabular-nums"] },
  progressValue: { fontSize: 14, color: colors.text, marginTop: 6, marginBottom: 8 },
  muted: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
