import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Card, Button, ProgressBar } from "../components/UI";
import { Header } from "../components/Header";
import { ProgressRing } from "../components/ProgressRing";
import { IconAward, IconCalendar, IconIdCard, IconShieldCheck } from "../components/Icons";
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

const META: Record<string, { label: string; tone: "teal" | "green" | "blue" | "purple" | "amber"; ring: string }> = {
  MIN_TIME_AT_GRADE: { label: "Time at grade", tone: "teal", ring: colors.teal },
  DAYS_WORKED: { label: "Days worked", tone: "green", ring: colors.green },
  IDENTIFIABLES: { label: "Identifiables", tone: "blue", ring: colors.blue },
  COORDINATOR_SPREAD: { label: "Coordinator spread", tone: "amber", ring: colors.amber },
  HEALTH_SAFETY: { label: "Health & Safety", tone: "purple", ring: colors.purple },
};

function addDays(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export default function HomeScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
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
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header variant="main" />
      </View>
    );
  }

  const metCount = data.requirements.filter((r) => r.met).length;
  const totalCount = data.requirements.length;
  const overallPercent = totalCount > 0 ? Math.round(data.requirements.reduce((sum, r) => sum + Math.min(100, (r.approvedValue / Math.max(r.targetValue, 1)) * 100), 0) / totalCount) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header variant="main" />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Card style={styles.overallCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.overallLabel}>OVERALL PROGRESS</Text>
            <View style={{ marginTop: 10 }}>
              <ProgressBar value={overallPercent} max={100} color={colors.tealDark} trackColor={colors.tealLight} />
            </View>
            <Text style={styles.overallSub}>
              {metCount} of {totalCount} requirement{totalCount === 1 ? "" : "s"} completed
            </Text>
          </View>
          <View style={{ alignItems: "center", marginLeft: 14 }}>
            <Text style={styles.overallPercent}>{overallPercent}%</Text>
            <View style={{ marginTop: 6 }}>
              <IconAward size={30} color={colors.tealDark} />
            </View>
          </View>
        </Card>

        <Text style={styles.welcome}>Welcome back,</Text>
        <Text style={styles.name}>{data.name}</Text>
        {data.currentGrade && <Text style={styles.grade}>{data.currentGrade.label}</Text>}
        {data.nextGrade ? (
          <Text style={styles.targetLine}>Working towards {data.nextGrade.label}</Text>
        ) : (
          <Text style={styles.targetLine}>You have reached the top grade in this system.</Text>
        )}

        {data.requirements.map((req) => {
          const meta = META[req.type] ?? { label: req.type, tone: "teal" as const, ring: colors.teal };

          if (req.type === "HEALTH_SAFETY") {
            return (
              <Card key={req.type} style={styles.reqCard}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <View style={[styles.hsIcon, { backgroundColor: colors.purpleLight }]}>
                    <IconShieldCheck size={22} color={colors.purple} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.reqLabel, { color: colors.purple }]}>{meta.label.toUpperCase()}</Text>
                    <Text style={styles.hsStatus}>{req.met ? "Completed" : "Not completed"}</Text>
                    <Text style={styles.hsDesc}>Required for this upgrade</Text>
                  </View>
                </View>
                <View style={{ marginTop: 12 }}>
                  <Button
                    title="View details"
                    variant="secondary"
                    onPress={() => Alert.alert("Health & Safety", "Contact the BSR office to arrange or confirm your Health & Safety qualification.")}
                  />
                </View>
              </Card>
            );
          }

          const percent = req.targetValue > 0 ? Math.min(100, (req.approvedValue / req.targetValue) * 100) : 0;
          const isTime = req.type === "MIN_TIME_AT_GRADE";
          const remaining = Math.max(0, req.targetValue - req.approvedValue);

          return (
            <Card key={req.type} style={styles.reqCard}>
              <View style={{ flexDirection: "row", gap: 16 }}>
                <ProgressRing
                  percent={percent}
                  color={meta.ring}
                  centerLabel={`${Math.round(percent)}%`}
                  subLabel={isTime ? `${(req.approvedValue / 365).toFixed(2)}/${Math.round(req.targetValue / 365)}\nYEARS` : `${req.approvedValue}/${req.targetValue}`}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.reqLabel, { color: meta.ring }]}>{(isTime ? "Days since last upgrade" : meta.label).toUpperCase()}</Text>
                  <Text style={styles.reqStat}>
                    {isTime ? `${req.approvedValue} days` : `${req.approvedValue} / ${req.targetValue} approved`}
                  </Text>
                  {isTime && <Text style={styles.reqMinimum}>Minimum required: {Math.round(req.targetValue / 365)} years</Text>}
                  <View style={{ marginTop: 8 }}>
                    <ProgressBar value={req.approvedValue} max={req.targetValue} color={meta.ring} trackColor={colors.border} />
                  </View>
                  <View style={styles.footerPill}>
                    {isTime ? <IconCalendar size={14} color={colors.textMuted} /> : <IconIdCard size={14} color={colors.textMuted} />}
                    <Text style={styles.footerPillText}>
                      {isTime && data.gradePeriodStartedAt
                        ? `Earliest upgrade date: ${addDays(data.gradePeriodStartedAt, req.targetValue)}`
                        : `${remaining} ${req.type === "DAYS_WORKED" ? "days" : "items"} remaining`}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          );
        })}

        {data.requirements.length === 0 && data.nextGrade && (
          <Card style={styles.reqCard}>
            <Text style={{ color: colors.textMuted }}>No requirements configured for this grade yet.</Text>
          </Card>
        )}

        {data.eligibleForUpgrade && !submitted && (
          <View style={{ marginTop: 8 }}>
            <Button title={submitting ? "Submitting..." : "Submit for Upgrade"} onPress={submitForUpgrade} disabled={submitting} loading={submitting} />
            {submitError && <Text style={{ color: colors.red, marginTop: 8 }}>{submitError}</Text>}
          </View>
        )}
        {submitted && (
          <Card style={{ marginTop: 8, backgroundColor: colors.tealLight }}>
            <Text>Your upgrade application has been submitted to the committee.</Text>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 60, gap: 14 },
  overallCard: { flexDirection: "row", alignItems: "center", marginTop: -34 },
  overallLabel: { fontSize: 12, fontWeight: "800", color: colors.tealDark, letterSpacing: 0.5 },
  overallSub: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
  overallPercent: { fontSize: 24, fontWeight: "800", color: colors.tealDark },
  welcome: { fontSize: 15, color: colors.textMuted, marginTop: 4 },
  name: { fontSize: 26, fontWeight: "800", color: colors.text },
  grade: { fontSize: 16, fontWeight: "700", color: colors.tealDark, marginTop: 2 },
  targetLine: { fontSize: 13, color: colors.textMuted, marginBottom: 4 },
  reqCard: {},
  reqLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.4 },
  reqStat: { fontSize: 17, fontWeight: "800", color: colors.text, marginTop: 4 },
  reqMinimum: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  footerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.tealLight,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 8,
  },
  footerPillText: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  hsIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  hsStatus: { fontSize: 16, fontWeight: "800", color: colors.text, marginTop: 2 },
  hsDesc: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
});
