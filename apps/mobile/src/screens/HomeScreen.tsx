import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Image } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { apiFetch } from "../api/client";
import { Card, Button, ProgressBar } from "../components/UI";
import { Header } from "../components/Header";
import { ProgressRing } from "../components/ProgressRing";
import { IconAward, IconCalendar, IconIdCard, IconCheck } from "../components/Icons";
import { colors } from "../theme";
import { useAuth } from "../auth/AuthContext";

interface PointsBreakdown {
  soloDays: number;
  soloPoints: number;
  unitCoordinatorDays: number;
  unitCoordinatorPoints: number;
  selfCoordinatingCount: number;
  selfCoordinatingPoints: number;
  assistantCoordinatorDays: number;
  assistantCoordinatorPoints: number;
  groupABPoints: number;
  groupCDPoints: number;
  groupCDCounted: number;
}
interface Requirement {
  type: string;
  targetValue: number;
  approvedValue: number;
  pendingValue: number;
  met: boolean;
  detail?: string;
  pointsBreakdown?: PointsBreakdown;
}
interface HomeData {
  name: string;
  currentGrade: { key: string; label: string } | null;
  nextGrade: { key: string; label: string } | null;
  gradePeriodStartedAt: string | null;
  requirements: Requirement[];
  eligibleForUpgrade: boolean;
  lifetimeApprovedDays: number | null;
  lifetimeApprovedIdentifiables: number | null;
}
interface PendingApproval {
  submittedAt: string;
}

const META: Record<string, { label: string; tone: "teal" | "green" | "blue" | "purple" | "amber"; ring: string }> = {
  DAYS_WORKED: { label: "Days worked", tone: "green", ring: colors.green },
  IDENTIFIABLES: { label: "Identifiables", tone: "blue", ring: colors.blue },
  HEALTH_SAFETY: { label: "Health & Safety", tone: "purple", ring: colors.purple },
};

function addDays(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user, refreshUser } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);
  const [pending, setPending] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [d, apps] = await Promise.all([
      apiFetch<HomeData>("/api/home"),
      apiFetch<{ applications: { status: string }[] }>("/api/upgrade-applications"),
      // The session's cached currentGradeKey (from login) goes stale the moment a committee
      // approves an upgrade mid-session — refresh it on every Home visit so grade-gated features
      // (e.g. Key Stunt Performer's Unit/Assistant Coordinator toggles) unlock without a re-login.
      refreshUser(),
    ]);
    setData(d);
    setPending(apps.applications.some((a) => a.status === "PENDING"));
    if (user?.isFullMember) {
      const wa = await apiFetch<{ pending: PendingApproval[] }>("/api/work-approvals");
      setPendingApprovals(wa.pending);
    }
  }, [refreshUser, user?.isFullMember]);

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
      await load();
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
  // A met requirement always contributes 100%, even a composite (OR-logic or capped) one whose
  // raw approvedValue/targetValue ratio wouldn't otherwise reach 100 — e.g. Solo/Core Team met
  // via 2 core-team jobs still has approvedValue (solo days) at 0, which isn't "12% done".
  const overallPercent =
    totalCount > 0
      ? Math.round(data.requirements.reduce((sum, r) => sum + (r.met ? 100 : Math.min(100, (r.approvedValue / Math.max(r.targetValue, 1)) * 100)), 0) / totalCount)
      : 0;

  const timeReq = data.requirements.find((r) => r.type === "MIN_TIME_AT_GRADE");
  // Health & Safety always renders last, regardless of backend order.
  const otherReqs = data.requirements
    .filter((r) => r.type !== "MIN_TIME_AT_GRADE")
    .sort((a, b) => (a.type === "HEALTH_SAFETY" ? 1 : 0) - (b.type === "HEALTH_SAFETY" ? 1 : 0));

  // Full Member is the top grade — there's no next grade to make progress towards, so the usual
  // per-requirement layout would just be empty. Lifetime totals + outstanding approvals instead.
  const isFullMemberHome = data.nextGrade === null;
  const oldestApprovalDays =
    pendingApprovals.length > 0 ? Math.floor((Date.now() - new Date(pendingApprovals[0].submittedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        variant="main"
        extraHeight={95}
        name={data.name}
        gradeKey={data.currentGrade?.key}
        gradeLabel={data.currentGrade?.label}
        targetLine={data.nextGrade ? `Working towards ${data.nextGrade.label}` : "You have reached the top grade in this system."}
      />

      {/* Sibling of the ScrollView (not inside it) — a negative-margin overlap gets clipped by
          ScrollView's own bounds, so this card has to live outside it to cut into the banner. */}
      <View style={styles.overlapWrap}>
        {isFullMemberHome ? (
          <Card style={styles.overallCard}>
            <Image source={require("../../assets/full-member-emblem.png")} style={{ width: 112, height: 112 }} resizeMode="contain" />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={fullMemberStyles.title}>FULL MEMBER</Text>
              <Text style={fullMemberStyles.subtitle}>Top grade achieved</Text>
              <View style={fullMemberStyles.metPill}>
                <IconCheck size={12} color={colors.green} />
                <Text style={fullMemberStyles.metPillText}>ALL REQUIREMENTS MET</Text>
              </View>
            </View>
          </Card>
        ) : (
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
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {isFullMemberHome ? (
          <>
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ width: 172, height: 172, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  <Image
                    source={require("../../assets/full-member-circle-graphic.png")}
                    style={{ position: "absolute", width: 172, height: 172 }}
                    resizeMode="contain"
                  />
                  <View>
                    <View style={fullMemberStyles.ringStatRow}>
                      <Image source={require("../../assets/full-member-days-approved.png")} style={fullMemberStyles.ringIcon} resizeMode="contain" />
                      <View style={{ marginLeft: 8 }}>
                        <Text style={[fullMemberStyles.ringStatValue, { color: colors.green }]}>{(data.lifetimeApprovedDays ?? 0).toLocaleString()}</Text>
                        <Text style={fullMemberStyles.ringStatLabel}>DAYS APPROVED</Text>
                      </View>
                    </View>
                    <View style={[fullMemberStyles.ringStatRow, { marginTop: 16 }]}>
                      <Image source={require("../../assets/full-member-identifiables-signed.png")} style={fullMemberStyles.ringIcon} resizeMode="contain" />
                      <View style={{ marginLeft: 8 }}>
                        <Text style={[fullMemberStyles.ringStatValue, { color: colors.blue }]}>{(data.lifetimeApprovedIdentifiables ?? 0).toLocaleString()}</Text>
                        <Text style={fullMemberStyles.ringStatLabel}>IDENTIFIABLES{"\n"}SIGNED OFF</Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={{ flex: 1, marginLeft: 4 }}>
                  <Text style={fullMemberStyles.impactTitle}>LIFETIME IMPACT</Text>
                  <Text style={fullMemberStyles.impactSub}>Total days of stunt work approved for BSR members</Text>
                </View>
              </View>
            </Card>

            {user?.isFullMember && (
              <Card style={{ marginTop: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Image source={require("../../assets/full-member-work-approval-heading.png")} style={fullMemberStyles.headingIcon} resizeMode="contain" />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={fullMemberStyles.impactTitle}>WORK APPROVALS</Text>
                    <Text style={fullMemberStyles.impactSub}>Review and approve stunt work submitted by members.</Text>
                  </View>
                </View>
                <View style={fullMemberStyles.approvalsStatsRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                    <Image source={require("../../assets/full-member-awaiting-approval.png")} style={fullMemberStyles.statIcon} resizeMode="contain" />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={fullMemberStyles.approvalsStatValue}>{pendingApprovals.length}</Text>
                      <Text style={fullMemberStyles.approvalsStatLabel}>Work records{"\n"}awaiting approval</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                    <Image source={require("../../assets/full-member-oldest-request.png")} style={fullMemberStyles.statIcon} resizeMode="contain" />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={fullMemberStyles.approvalsStatValue}>{oldestApprovalDays} days</Text>
                      <Text style={fullMemberStyles.approvalsStatLabel}>Oldest request{"\n"}awaiting approval</Text>
                    </View>
                  </View>
                </View>
                <View style={{ marginTop: 14 }}>
                  <Button title="View Work Approvals" onPress={() => navigation.navigate("Approvals")} />
                </View>
              </Card>
            )}
          </>
        ) : (
          <>
            {timeReq && (
              <View style={styles.timeBar}>
                <View style={styles.timeBarTop}>
                  <View style={styles.row}>
                    <IconCalendar size={13} color={colors.tealDark} />
                    <Text style={styles.timeBarLabel}>DAYS SINCE LAST UPGRADE</Text>
                  </View>
                  <Text style={styles.timeBarValue}>
                    {timeReq.approvedValue} / {timeReq.targetValue} days
                  </Text>
                </View>
                <ProgressBar value={timeReq.approvedValue} max={timeReq.targetValue} color={colors.tealDark} trackColor={colors.tealLight} />
                <Text style={styles.timeBarSub}>
                  Minimum required: {Math.round(timeReq.targetValue / 365)} years
                  {data.gradePeriodStartedAt ? ` · Earliest upgrade date: ${addDays(data.gradePeriodStartedAt, timeReq.targetValue)}` : ""}
                </Text>
              </View>
            )}

            {otherReqs.map((req) => {
              const meta = META[req.type] ?? { label: req.type, tone: "teal" as const, ring: colors.teal };

              if (req.type === "HEALTH_SAFETY") {
                // A boolean gate, not a number to track — always state the level required, and only
                // ever tick the box once the committee-set level meets or exceeds it.
                return (
                  <Card key={req.type} style={styles.reqCard}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={styles.hsLabel}>Health and Safety Level {req.targetValue} Required</Text>
                      <View style={[styles.hsCheckbox, req.met && styles.hsCheckboxMet]}>{req.met && <IconCheck size={20} color="#fff" />}</View>
                    </View>
                  </Card>
                );
              }

              if (req.type === "SOLO_OR_CORE_TEAM") {
                return <SoloOrCoreTeamCard key={req.type} req={req} />;
              }

              if (req.type === "POINTS" && req.pointsBreakdown) {
                return <PointsCard key={req.type} req={req} pb={req.pointsBreakdown} />;
              }

              const percent = req.targetValue > 0 ? Math.min(100, (req.approvedValue / req.targetValue) * 100) : 0;
              const remaining = Math.max(0, req.targetValue - req.approvedValue);

              return (
                <Card key={req.type} style={styles.reqCard}>
                  <View style={{ flexDirection: "row", gap: 16 }}>
                    <ProgressRing percent={percent} color={meta.ring} centerLabel={`${Math.round(percent)}%`} subLabel={`${req.approvedValue}/${req.targetValue}`} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.reqLabel, { color: meta.ring }]}>{meta.label.toUpperCase()}</Text>
                      <Text style={styles.reqStat}>
                        {req.approvedValue} / {req.targetValue} approved
                      </Text>
                      <View style={{ marginTop: 8 }}>
                        <ProgressBar value={req.approvedValue} max={req.targetValue} color={meta.ring} trackColor={colors.border} />
                      </View>
                      <View style={styles.footerPill}>
                        <IconIdCard size={14} color={colors.textMuted} />
                        <Text style={styles.footerPillText}>
                          {remaining} {req.type === "DAYS_WORKED" ? "days" : "items"} remaining
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

            {pending ? (
              <Card style={{ marginTop: 8, backgroundColor: colors.greenLight }}>
                <Text style={{ color: colors.green, fontWeight: "700" }}>Your upgrade application has been submitted — the committee are reviewing it.</Text>
              </Card>
            ) : (
              data.eligibleForUpgrade && (
                <View style={{ marginTop: 8 }}>
                  <Button title={submitting ? "Submitting..." : "Submit for Upgrade"} onPress={submitForUpgrade} disabled={submitting} loading={submitting} />
                  {submitError && <Text style={{ color: colors.red, marginTop: 8 }}>{submitError}</Text>}
                </View>
              )
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// Senior -> Key composite: met by ANY of 10 solo days, OR 5 solo + 1 core-team job, OR 2
// core-team jobs. approvedValue carries soloDays, pendingValue carries qualifyingCoreJobs (set
// server-side in lib/progress.ts). Whichever option is actually satisfied gets highlighted green;
// once any option is met, the other two are struck through as not required.
function SoloOrCoreTeamCard({ req }: { req: Requirement }) {
  const soloDays = req.approvedValue;
  const coreJobs = req.pendingValue;
  const optionAMet = soloDays >= 10;
  const optionBMet = soloDays >= 5 && coreJobs >= 1;
  const optionCMet = coreJobs >= 2;
  const anyMet = optionAMet || optionBMet || optionCMet;
  const fulfilled = optionAMet ? "A" : optionBMet ? "B" : optionCMet ? "C" : null;

  function Box({ met, children }: { met: boolean; children: React.ReactNode }) {
    const dimmed = anyMet && !met;
    return <View style={[soloStyles.box, met && soloStyles.boxMet, dimmed && soloStyles.boxDimmed]}>{children}</View>;
  }
  function BoxTitle({ text, met }: { text: string; met: boolean }) {
    const dimmed = anyMet && !met;
    return (
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={[soloStyles.boxTitle, dimmed && soloStyles.boxTitleDimmed]}>{text}</Text>
        {met && (
          <View style={[styles.hsCheckbox, styles.hsCheckboxMet, { width: 24, height: 24, borderRadius: 6 }]}>
            <IconCheck size={14} color="#fff" />
          </View>
        )}
      </View>
    );
  }
  function OrDivider() {
    return (
      <View style={soloStyles.orDivider}>
        <View style={soloStyles.orLine} />
        <Text style={soloStyles.orText}>OR</Text>
        <View style={soloStyles.orLine} />
      </View>
    );
  }

  return (
    <Card style={styles.reqCard}>
      <Text style={[styles.reqLabel, { color: colors.tealDark, marginBottom: 10 }]}>SOLO / CORE TEAM — ANY ONE OF</Text>

      <Box met={fulfilled === "A"}>
        <BoxTitle text="10 Solo Days" met={fulfilled === "A"} />
        <View style={{ marginTop: 8 }}>
          <ProgressBar value={Math.min(soloDays, 10)} max={10} color={colors.tealDark} trackColor={colors.border} />
        </View>
        <Text style={[soloStyles.boxStat, anyMet && fulfilled !== "A" && soloStyles.boxStatDimmed]}>{soloDays} / 10 solo days</Text>
      </Box>

      <OrDivider />

      <Box met={fulfilled === "B"}>
        <BoxTitle text="5 Solo Days + 1 Core-Team Job" met={fulfilled === "B"} />
        <Text style={[soloStyles.boxSubLabel, { marginTop: 8 }, anyMet && fulfilled !== "B" && soloStyles.boxStatDimmed]}>
          Solo days: {soloDays} / 5
        </Text>
        <ProgressBar value={Math.min(soloDays, 5)} max={5} color={colors.tealDark} trackColor={colors.border} />
        <Text style={[soloStyles.boxSubLabel, { marginTop: 8 }, anyMet && fulfilled !== "B" && soloStyles.boxStatDimmed]}>
          Core-team jobs (12+ weeks): {coreJobs} / 1
        </Text>
        <ProgressBar value={Math.min(coreJobs, 1)} max={1} color={colors.tealDark} trackColor={colors.border} />
      </Box>

      <OrDivider />

      <Box met={fulfilled === "C"}>
        <BoxTitle text="2 Core-Team Jobs" met={fulfilled === "C"} />
        <View style={{ marginTop: 8 }}>
          <ProgressBar value={Math.min(coreJobs, 2)} max={2} color={colors.tealDark} trackColor={colors.border} />
        </View>
        <Text style={[soloStyles.boxStat, anyMet && fulfilled !== "C" && soloStyles.boxStatDimmed]}>{coreJobs} / 2 core-team jobs (12+ weeks)</Text>
      </Box>
    </Card>
  );
}

// Key -> Full Member 80-point composite. Solo Day + Unit Coordinator Day is uncapped; Assistant
// Coordinator Day + Self-Coordinating is capped at 60 points toward the 80 total — which is what
// mathematically guarantees the "min 20 from Solo/Unit Coordinator" rule without a separate check.
function PointsCard({ req, pb }: { req: Requirement; pb: PointsBreakdown }) {
  return (
    <Card style={styles.reqCard}>
      <Text style={[styles.reqLabel, { color: colors.tealDark }]}>POINTS</Text>
      <Text style={styles.reqStat}>
        {req.approvedValue} / {req.targetValue} points
      </Text>
      <View style={{ marginTop: 8 }}>
        <ProgressBar value={req.approvedValue} max={req.targetValue} color={colors.tealDark} trackColor={colors.border} />
      </View>

      <View style={pointsStyles.group}>
        <Text style={pointsStyles.groupTitle}>SOLO DAY & UNIT COORDINATOR DAY</Text>
        <View style={pointsStyles.itemRow}>
          <View style={pointsStyles.itemLabelRow}>
            <Dot color={colors.green} />
            <Text style={pointsStyles.itemLabel}>Solo Day - Own Job (2 pts each)</Text>
          </View>
          <Text style={pointsStyles.itemValue}>
            {pb.soloDays} × 2 = {pb.soloPoints}pts
          </Text>
        </View>
        <View style={pointsStyles.itemRow}>
          <View style={pointsStyles.itemLabelRow}>
            <Dot color={colors.blue} />
            <Text style={pointsStyles.itemLabel}>Unit Coordinator Day (1 pt each)</Text>
          </View>
          <Text style={pointsStyles.itemValue}>
            {pb.unitCoordinatorDays} × 1 = {pb.unitCoordinatorPoints}pts
          </Text>
        </View>
        <View style={{ marginTop: 8 }}>
          <SegmentedProgressBar
            segments={[
              { value: pb.soloPoints, color: colors.green },
              { value: pb.unitCoordinatorPoints, color: colors.blue },
            ]}
            max={20}
          />
        </View>
        <Text style={pointsStyles.groupNote}>
          Minimum 20 points must come from Solo Day + Unit Coordinator Day combined — {pb.groupABPoints} earned so far
          {pb.groupABPoints > 20 ? " (all of it counts towards your 80)" : ""}.
        </Text>
      </View>

      <View style={pointsStyles.group}>
        <Text style={pointsStyles.groupTitle}>SELF-COORDINATING & ASSISTANT COORDINATOR DAY</Text>
        <View style={pointsStyles.itemRow}>
          <View style={pointsStyles.itemLabelRow}>
            <Dot color={colors.purple} />
            <Text style={pointsStyles.itemLabel}>Self-Coordinating on another Coordinator's job (1 pt each)</Text>
          </View>
          <Text style={pointsStyles.itemValue}>
            {pb.selfCoordinatingCount} × 1 = {pb.selfCoordinatingPoints}pts
          </Text>
        </View>
        <View style={pointsStyles.itemRow}>
          <View style={pointsStyles.itemLabelRow}>
            <Dot color={colors.amber} />
            <Text style={pointsStyles.itemLabel}>Assistant Coordinator Day (1 pt each)</Text>
          </View>
          <Text style={pointsStyles.itemValue}>
            {pb.assistantCoordinatorDays} × 1 = {pb.assistantCoordinatorPoints}pts
          </Text>
        </View>
        <View style={{ marginTop: 8 }}>
          <SegmentedProgressBar
            segments={[
              { value: pb.selfCoordinatingPoints, color: colors.purple },
              { value: pb.assistantCoordinatorPoints, color: colors.amber },
            ]}
            max={60}
          />
        </View>
        <Text style={pointsStyles.groupNote}>
          Capped at 60 points towards your 80-point goal — {pb.groupCDPoints} earned, {pb.groupCDCounted} counted
          {pb.groupCDPoints > 60 ? " (anything beyond 60 here doesn't count further)" : ""}.
        </Text>
      </View>
    </Card>
  );
}

// A progress bar made of adjacent colored segments — e.g. Solo Day (green) + Unit Coordinator
// Day (blue) filling the same "min 20 points" bar, so the breakdown is visible at a glance
// instead of just a single flat color. If the segments' total exceeds max, they're scaled down
// proportionally so the bar never overflows while keeping the same relative split.
function SegmentedProgressBar({ segments, max, trackColor = colors.border }: { segments: { value: number; color: string }[]; max: number; trackColor?: string }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const displayTotal = Math.min(total, max);
  const scale = total > 0 ? displayTotal / total : 0;
  return (
    <View style={[segStyles.track, { backgroundColor: trackColor }]}>
      {segments.map((seg, i) => {
        const widthPercent = max > 0 ? ((seg.value * scale) / max) * 100 : 0;
        return seg.value > 0 ? <View key={i} style={{ width: `${widthPercent}%`, backgroundColor: seg.color }} /> : null;
      })}
    </View>
  );
}

function Dot({ color }: { color: string }) {
  return <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginRight: 6 }} />;
}

const segStyles = StyleSheet.create({
  track: { height: 8, borderRadius: 4, overflow: "hidden", flexDirection: "row" },
});

const soloStyles = StyleSheet.create({
  box: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12 },
  boxMet: { borderColor: colors.green, backgroundColor: colors.greenLight },
  boxDimmed: { opacity: 0.5 },
  boxTitle: { fontSize: 13, fontWeight: "800", color: colors.text },
  boxTitleDimmed: { textDecorationLine: "line-through", color: colors.textMuted },
  boxSubLabel: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
  boxStat: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  boxStatDimmed: { textDecorationLine: "line-through" },
  orDivider: { flexDirection: "row", alignItems: "center", marginVertical: 10, gap: 8 },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { fontSize: 11, fontWeight: "800", color: colors.tealDark, letterSpacing: 1 },
});

const pointsStyles = StyleSheet.create({
  group: { marginTop: 16 },
  groupTitle: { fontSize: 11, fontWeight: "800", color: colors.tealDark, letterSpacing: 0.4, marginBottom: 8 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  itemLabelRow: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 },
  itemLabel: { fontSize: 12, color: colors.text, flex: 1 },
  itemValue: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  groupNote: { fontSize: 11, color: colors.textMuted, marginTop: 8, lineHeight: 16 },
});

const fullMemberStyles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  metPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.greenLight,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 8,
  },
  metPillText: { fontSize: 10, fontWeight: "800", color: colors.green, letterSpacing: 0.4 },
  ringIcon: { width: 30, height: 30 },
  ringStatRow: { flexDirection: "row", alignItems: "center" },
  ringStatValue: { fontSize: 16, fontWeight: "800" },
  ringStatLabel: { fontSize: 9, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.3 },
  impactTitle: { fontSize: 13, fontWeight: "800", color: colors.text },
  impactSub: { fontSize: 12, color: colors.textMuted, marginTop: 4, lineHeight: 17 },
  headingIcon: { width: 88, height: 88 },
  statIcon: { width: 64, height: 64 },
  approvalsStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  approvalsStatValue: { fontSize: 18, fontWeight: "800", color: colors.text },
  approvalsStatLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2, lineHeight: 13 },
});

const styles = StyleSheet.create({
  content: { padding: 18, paddingTop: 14, paddingBottom: 60, gap: 14 },
  overlapWrap: { marginTop: -56, marginHorizontal: 18, zIndex: 2 },
  overallCard: { flexDirection: "row", alignItems: "center", borderRadius: 22 },
  overallLabel: { fontSize: 12, fontWeight: "800", color: colors.tealDark, letterSpacing: 0.5 },
  overallSub: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
  overallPercent: { fontSize: 24, fontWeight: "800", color: colors.tealDark },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  timeBar: { marginTop: 2 },
  timeBarTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  timeBarLabel: { fontSize: 11, fontWeight: "800", color: colors.tealDark, letterSpacing: 0.5 },
  timeBarValue: { fontSize: 12, fontWeight: "700", color: colors.text },
  timeBarSub: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
  reqCard: {},
  reqLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.4 },
  reqStat: { fontSize: 17, fontWeight: "800", color: colors.text, marginTop: 4 },
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
  hsLabel: { fontSize: 15, fontWeight: "800", color: colors.text },
  hsCheckbox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  hsCheckboxMet: { backgroundColor: colors.green, borderColor: colors.green },
  soloDetail: { fontSize: 12, color: colors.textMuted, marginTop: 10, lineHeight: 17 },
});
