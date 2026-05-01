import { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, TextInput, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MapPin, ChevronRight, Plus } from "lucide-react-native";
import {
  PRIMARY,
  UI_BORDER,
  UI_RADIUS_LG,
  UI_RADIUS_XL,
  UI_SCREEN,
  UI_SURFACE,
  UI_TEXT,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY,
  uiCardShadow,
} from "@/constants/theme";
import { useProfile } from "@/context/ProfileContext";
import { useScores } from "@/context/ScoreContext";
import { useRules } from "@/context/RulesContext";
import { useTasks, getTodayKey } from "@/context/TasksContext";
import { useRouter } from "expo-router";
import { AibouCompanionFab } from "@/components/AibouCompanionFab";
import { getCompanionFabBottom, getPlusFabBottom } from "@/lib/companionFabLayout";
import { QuickCreateModal } from "@/components/QuickCreateModal";
import { RoutePlusMenuModal, type RoutePlusMenuAction } from "@/components/RoutePlusMenuModal";
import { Koko2RouteHorizonModal } from "@/components/Koko2RouteHorizonModal";
import { Koko2MockTargetModal } from "@/components/Koko2MockTargetModal";
import { buildPlan } from "@/planning/engine";
import { AibouMascot } from "@/components/AibouMascot";
import {
  buildKoko2MockExamRoute,
  formatShortDate,
  mockExamAugust15DateKey,
  type Koko2RouteSubject,
} from "@/lib/mainKoko2RouteSeries";
import {
  VerticalRouteSpanSummary,
  VerticalReadableRouteSplit,
  type VerticalTimelineRow,
} from "@/components/VerticalRouteRoadmap";
import type { RoadmapMarker } from "@/components/Koko2RoadmapStrip";
import { buildMainKoko2TaskBands } from "@/lib/mainKoko2TaskBands";
import { RUNTIME_APP_VERSION } from "@/lib/runtimeAppVersion";
import { PUBLIC_TRIAL_BADGE } from "@/constants/publicBuild";
import {
  loadKoko2RouteEndOverride,
  saveKoko2RouteEndOverride,
  loadKoko2MockTargets,
  saveKoko2MockTargets,
  DEFAULT_KOKO2_MOCK_TARGETS,
  type Koko2MockTargets,
} from "@/lib/koko2RoutePreferences";

const padH = 16;
const ENG_BLUE = "#0EA5E9";
const MATH_ORANGE = "#F97316";

const SUBJECT_CHIPS: { id: Koko2RouteSubject; label: string; accent: string }[] = [
  { id: "english", label: "英語", accent: ENG_BLUE },
  { id: "math", label: "数学", accent: MATH_ORANGE },
];

function dedupeMarkersByDate(markers: RoadmapMarker[]): RoadmapMarker[] {
  const out: RoadmapMarker[] = [];
  let prev = "";
  for (const m of markers) {
    if (m.dateKey === prev) continue;
    prev = m.dateKey;
    out.push(m);
  }
  return out;
}

export default function RouteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(32, insets.bottom + 48);
  const companionFabBottom = getCompanionFabBottom(insets.bottom);
  const plusFabBottom = getPlusFabBottom(insets.bottom);

  const [subjectTab, setSubjectTab] = useState<Koko2RouteSubject>("english");
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [horizonModalOpen, setHorizonModalOpen] = useState(false);
  const [mockTargetModalOpen, setMockTargetModalOpen] = useState(false);
  const [routeEndOverride, setRouteEndOverride] = useState<string | null>(null);
  const [mockTargets, setMockTargets] = useState<Koko2MockTargets>(DEFAULT_KOKO2_MOCK_TARGETS);

  const { profile } = useProfile();
  const { scores, setTotal } = useScores();
  const { rules } = useRules();
  const { tasks, updateTaskSchedule, pendingAiQuestions } = useTasks();
  const today = getTodayKey();

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const [end, mt] = await Promise.all([loadKoko2RouteEndOverride(), loadKoko2MockTargets()]);
      if (!mounted) return;
      setRouteEndOverride(end);
      setMockTargets(mt);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const route = useMemo(
    () => buildKoko2MockExamRoute(tasks, today, subjectTab, { routeEndOverride }),
    [tasks, today, subjectTab, routeEndOverride]
  );

  const taskBandEndKey = route.routeEnd;

  const accent = subjectTab === "english" ? ENG_BLUE : MATH_ORANGE;

  const roadmapMarkers = useMemo(() => {
    return dedupeMarkersByDate([
      { dateKey: route.routeStart, label: "開始" },
      { dateKey: today, label: "今日", emphasis: true },
      { dateKey: route.routeEnd, label: "模試", emphasis: false },
    ]);
  }, [route.routeStart, route.routeEnd, today]);

  const verticalTimelineRows = useMemo((): VerticalTimelineRow[] => {
    const sorted = [...roadmapMarkers].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    return sorted.map((m, i) => ({
      id: `${m.dateKey}-${m.label}-${i}`,
      dateKey: m.dateKey,
      tag: m.label,
      dateLabel: formatShortDate(m.dateKey),
      emphasis: m.emphasis,
      accent: m.emphasis ? accent : "#64748B",
    }));
  }, [roadmapMarkers, accent]);

  const koko2TaskBands = useMemo(
    () => buildMainKoko2TaskBands(route.routeStart, route.routeEnd, subjectTab),
    [route.routeStart, route.routeEnd, subjectTab]
  );

  const ti = route.todayIndex;
  const actualToday = route.actual[ti] ?? route.actual[route.actual.length - 1] ?? 0;
  const plannedToday = route.planned[ti] ?? route.planned[route.planned.length - 1] ?? 0;
  const gap = actualToday - plannedToday;
  const currentScore = subjectTab === "english" ? scores.english.total : scores.math.total;
  const currentMockTarget =
    subjectTab === "english" ? mockTargets.english : mockTargets.math;
  const defaultRouteEndKey = mockExamAugust15DateKey(today);

  const onPlusMenuSelect = (action: RoutePlusMenuAction) => {
    if (action === "task") setQuickCreateOpen(true);
    else if (action === "horizon") setHorizonModalOpen(true);
    else setMockTargetModalOpen(true);
  };

  const handleBuildPlan = () => {
    if (!rules.enabled) {
      Alert.alert("ルールがOFF", "「科目ルール」画面から連動をONにしてください。");
      return;
    }

    const newTasks = buildPlan({
      profile,
      scores,
      rules,
      exams: [],
      curricula: [],
    });

    if (newTasks.length === 0) {
      Alert.alert("作成できませんでした", "目標点が0ばかりになっていないか、ルートタブの登録点を確認してください。");
      return;
    }

    const futureExisting = tasks.filter((t) => t.date >= today);
    const minLen = Math.min(futureExisting.length, newTasks.length);
    for (let i = 0; i < minLen; i++) {
      const src = newTasks[i];
      const dst = futureExisting[i];
      updateTaskSchedule(dst.id, src.date, src.hour);
    }

    Alert.alert("更新しました", "ホーム・カレンダーで時間割を確認できます。");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: UI_SCREEN, position: "relative" }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: padH, paddingTop: 8, paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", columnGap: 8, marginTop: 4 }}>
          <MapPin size={26} color={PRIMARY} strokeWidth={2} />
          <Text style={styles.screenTitle}>ルート</Text>
        </View>
        <Text style={styles.screenSubtitle}>
          模試目安 <Text style={{ fontWeight: "800", color: UI_TEXT }}>{formatShortDate(route.routeEnd)}</Text>
        </Text>
        <Text style={styles.versionLine}>
          AIBOU v{RUNTIME_APP_VERSION}
          {PUBLIC_TRIAL_BADGE.trim() ? ` · ${PUBLIC_TRIAL_BADGE.trim()}` : ""}
        </Text>

        <View
          style={{
            marginTop: 14,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            justifyContent: "center",
          }}
        >
          {SUBJECT_CHIPS.map((c) => {
            const on = c.id === subjectTab;
            return (
              <Pressable
                key={c.id}
                onPress={() => setSubjectTab(c.id)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: on ? c.accent : UI_BORDER,
                  backgroundColor: on ? `${c.accent}18` : "#fff",
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "800", color: on ? c.accent : UI_TEXT_SECONDARY }}>{c.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.card, { marginTop: 12, paddingBottom: 14 }]}>
          <Text style={{ fontSize: 17, fontWeight: "800", color: UI_TEXT }}>{subjectTab === "english" ? "英語" : "数学"}</Text>

          <View style={{ marginTop: 14 }}>
            <Text style={styles.fieldKicker}>登録点</Text>
            <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 4 }}>
              <TextInput
                style={{ fontSize: 28, fontWeight: "800", color: accent, paddingVertical: 0, minWidth: 40 }}
                keyboardType="numeric"
                value={String(currentScore)}
                onChangeText={(t) => {
                  const n = Math.min(120, Math.max(0, parseInt(t.replace(/\D/g, "") || "0", 10)));
                  setTotal(subjectTab === "english" ? "english" : "math", n);
                }}
              />
              <Text style={{ fontSize: 13, color: UI_TEXT_SECONDARY }}>/120</Text>
            </View>
            <Text style={{ marginTop: 4, fontSize: 11, color: UI_TEXT_TERTIARY }}>
              模試目安 {currentMockTarget}点 · あと約 {Math.max(0, currentMockTarget - currentScore)}
            </Text>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16, alignItems: "flex-start" }}>
            <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
              <Text style={styles.heroKicker}>累計完了コマ（実績）</Text>
              <Text style={[styles.heroNumber, { color: accent }]}>{actualToday}</Text>
              <Text style={styles.heroUnit}>コマ · 今日の目安 {plannedToday.toFixed(0)} コマ</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.timestamp}>{formatShortDate(today)}</Text>
              <Text style={styles.timestampMuted}>
                {formatShortDate(route.routeStart)} → {formatShortDate(route.routeEnd)}
              </Text>
            </View>
          </View>

          <Text
            style={{
              marginTop: 8,
              fontSize: 13,
              fontWeight: "600",
              color: gap >= 0 ? "#059669" : "#DC2626",
            }}
          >
            コマ目安比 {gap >= 0 ? "+" : ""}
            {gap.toFixed(0)}
          </Text>

          <Text style={{ marginTop: 14, fontSize: 12, fontWeight: "700", color: UI_TEXT }}>ロードマップ（左右）</Text>
          <View
            style={{
              marginTop: 12,
              borderRadius: UI_RADIUS_LG,
              overflow: "hidden",
              backgroundColor: "#FAFAFA",
              paddingVertical: 12,
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "800", color: UI_TEXT }}>期間の目安（全ルート）</Text>
            <View style={{ marginTop: 8 }}>
              <VerticalRouteSpanSummary
                routeStart={route.routeStart}
                routeEnd={route.routeEnd}
                todayKey={today}
                taskBandEndKey={taskBandEndKey}
                accent={accent}
              />
            </View>
            <VerticalReadableRouteSplit
              routeStart={route.routeStart}
              routeEnd={route.routeEnd}
              accent={accent}
              milestones={verticalTimelineRows}
              bands={koko2TaskBands}
              todayKey={today}
              taskHorizonKey={route.routeEnd}
            />
          </View>
        </View>

        <Pressable
          onPress={handleBuildPlan}
          style={{
            marginTop: 20,
            borderRadius: UI_RADIUS_LG,
            backgroundColor: UI_SURFACE,
            paddingVertical: 16,
            paddingHorizontal: 18,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            columnGap: 10,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: UI_BORDER,
            ...uiCardShadow,
          }}
        >
          <AibouMascot size={24} compact />
          <Text style={{ fontSize: 16, fontWeight: "600", color: PRIMARY }}>時間割をAIBOUに合わせる</Text>
          <ChevronRight size={20} color={PRIMARY} strokeWidth={2} />
        </Pressable>
      </ScrollView>
      <RoutePlusMenuModal
        visible={plusMenuOpen}
        onClose={() => setPlusMenuOpen(false)}
        onSelect={onPlusMenuSelect}
      />
      <Koko2RouteHorizonModal
        visible={horizonModalOpen}
        onClose={() => setHorizonModalOpen(false)}
        todayKey={today}
        effectiveEndKey={route.routeEnd}
        defaultEndKey={defaultRouteEndKey}
        storedOverride={routeEndOverride}
        onSave={async (dateKey) => {
          await saveKoko2RouteEndOverride(dateKey);
          setRouteEndOverride(dateKey);
        }}
      />
      <Koko2MockTargetModal
        visible={mockTargetModalOpen}
        onClose={() => setMockTargetModalOpen(false)}
        subjectLabel={subjectTab === "english" ? "英語" : "数学"}
        currentTarget={currentMockTarget}
        currentScore={currentScore}
        onSave={async (target) => {
          const next: Koko2MockTargets =
            subjectTab === "english"
              ? { ...mockTargets, english: target }
              : { ...mockTargets, math: target };
          setMockTargets(next);
          await saveKoko2MockTargets(next);
        }}
      />
      <Pressable
        onPress={() => setPlusMenuOpen(true)}
        accessibilityLabel="追加メニューを開く"
        style={{
          position: "absolute",
          right: 20,
          bottom: plusFabBottom,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: "#2563eb",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 6,
        }}
      >
        <Plus size={28} color="#ffffff" strokeWidth={2.5} />
      </Pressable>
      <AibouCompanionFab
        bottom={companionFabBottom}
        badgeCount={pendingAiQuestions.length}
        onPress={() => router.push("/replan-companion")}
      />
      <QuickCreateModal
        visible={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
        defaultDateKey={today}
        initialTab="plan"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: UI_TEXT,
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: UI_TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 19,
  },
  versionLine: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "600",
    color: UI_TEXT_TERTIARY,
    textAlign: "center",
  },
  card: {
    borderRadius: UI_RADIUS_XL,
    backgroundColor: UI_SURFACE,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(60,60,67,0.12)",
    ...uiCardShadow,
  },
  fieldKicker: {
    fontSize: 11,
    fontWeight: "700",
    color: UI_TEXT_TERTIARY,
  },
  heroKicker: {
    fontSize: 12,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
  },
  heroNumber: {
    marginTop: 4,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  heroUnit: {
    marginTop: 2,
    fontSize: 11,
    color: UI_TEXT_TERTIARY,
  },
  timestamp: {
    fontSize: 12,
    fontWeight: "700",
    color: UI_TEXT,
  },
  timestampMuted: {
    marginTop: 2,
    fontSize: 11,
    color: UI_TEXT_TERTIARY,
    textAlign: "right",
  },
});
