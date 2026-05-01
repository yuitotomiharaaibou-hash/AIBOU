import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  Dimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, ChevronLeft, ChevronRight, Home, MessagesSquare, Pin, Plus } from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  BACKGROUND,
  PRIMARY,
  UI_BORDER,
  UI_RADIUS_LG,
  UI_SCREEN,
  UI_TEXT,
  UI_TEXT_SECONDARY,
  uiCardShadow,
} from "@/constants/theme";
import { useTasks, getTodayKey } from "@/context/TasksContext";
import { useHomeSchedule, type DayPlanItem } from "@/context/HomeScheduleContext";
import { useProfile } from "@/context/ProfileContext";
import { nextAugustMockExamSaturday } from "@/lib/tetsuryokuOpeningPlan";
import { inferHomeScheduleLevels } from "@/lib/homeScheduleInference";
import { simpleStorageGet, simpleStorageSet } from "@/lib/simpleStorage";
import { getWeekKeyFromDate, summarizeWeek } from "@/lib/weeklyReport";
import { getTomorrowKey } from "@/lib/tomorrowPlan";
import { addDaysKey } from "@/lib/mainKoko2RouteSeries";
import { PlanProposalPreview } from "@/components/PlanProposalPreview";
import { QuickCreateModal } from "@/components/QuickCreateModal";
import { PlanEditorModal } from "@/components/PlanEditorModal";
import { HomeDayScheduleBody } from "@/components/HomeDayScheduleBody";
import { HomeDatePickerModal } from "@/components/HomeDatePickerModal";
import { AibouCompanionFab } from "@/components/AibouCompanionFab";
import { getCompanionFabBottom, getPlusFabBottom } from "@/lib/companionFabLayout";
import { taskTitleWithSegment } from "@/lib/taskSegmentLabel";

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function labelFromDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map((v) => parseInt(v, 10));
  const dt = new Date(y, m - 1, d);
  const day = DAY_LABELS[dt.getDay()];
  return `${m}/${d} (${day})`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { companionViewDate } = useLocalSearchParams<{ companionViewDate?: string }>();
  const insets = useSafeAreaInsets();
  const {
    tasks,
    toggleTask,
    togglePin,
    setPlannerUser,
    applySuccessTemplateFromProfile,
    tryAutoTomorrowPlan,
    commitTomorrowPlanNow,
    approvePendingPlan,
    rejectPendingPlan,
    autoReplanIfNeeded,
    replanLogs,
    pendingProposal,
    proposalNotice,
    setProposalNotice,
    pendingAiQuestions,
    applyKoko2TaskDistribution,
  } = useTasks();
  const { profile } = useProfile();
  const { getPlans, ensureDayPlans, updatePlan, deletePlan, addPlan } = useHomeSchedule();
  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const [autoTomorrow, setAutoTomorrow] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createHour, setCreateHour] = useState<number | null>(null);
  const [createTab, setCreateTab] = useState<"plan" | "task">("plan");
  const [createDateKey, setCreateDateKey] = useState(() => getTodayKey());
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planEditorOpen, setPlanEditorOpen] = useState(false);
  const [planEditorDateKey, setPlanEditorDateKey] = useState(() => getTodayKey());
  const [planEditorPlan, setPlanEditorPlan] = useState<DayPlanItem | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [aiKeyOpen, setAiKeyOpen] = useState(false);
  const [aiKeyDraft, setAiKeyDraft] = useState("");
  const [hasAiKey, setHasAiKey] = useState(false);
  const [pagerW, setPagerW] = useState(() => Math.round(Dimensions.get("window").width));
  /** 日付ヘッダー下のスケジュール領域の実高（Web のネスト Scroll 対策） */
  const [schedulePaneH, setSchedulePaneH] = useState(0);
  const hScrollRef = useRef<ScrollView>(null);
  const [viewDateKey, setViewDateKey] = useState(() => getTodayKey());
  /** 端末の暦「今日」が最後に確認された日付（24時跨ぎ検知用） */
  const lastRealCalendarDayRef = useRef(getTodayKey());

  const currentHour = new Date().getHours();
  const todayKey = getTodayKey();
  const tomorrowKey = useMemo(() => getTomorrowKey(), [todayKey]);
  const prevKey = useMemo(() => addDaysKey(viewDateKey, -1), [viewDateKey]);
  const nextKey = useMemo(() => addDaysKey(viewDateKey, 1), [viewDateKey]);

  const todayBusySlotCount = useMemo(() => {
    const [y, m, d] = todayKey.split("-").map((v) => parseInt(v, 10));
    const levels = inferHomeScheduleLevels(new Date(y, m - 1, d), profile);
    let n = 0;
    for (let h = 0; h < 24; h++) {
      if ((levels[h] ?? 0) >= 1) n += 1;
    }
    return n;
  }, [todayKey, profile]);

  const thisWeek = useMemo(
    () => summarizeWeek(tasks, replanLogs, getWeekKeyFromDate(new Date())),
    [tasks, replanLogs]
  );

  const planContextLine = useMemo(() => {
    if (profile.juku === "鉄緑会") {
      const ex = nextAugustMockExamSaturday(new Date());
      return `校内模試の目安 ${ex.getMonth() + 1}/${ex.getDate()}（土）`;
    }
    return null;
  }, [profile.juku]);

  useEffect(() => {
    setPlannerUser(profile.username ?? "default");
  }, [profile.username, setPlannerUser]);

  useEffect(() => {
    const v =
      typeof companionViewDate === "string"
        ? companionViewDate
        : Array.isArray(companionViewDate)
          ? companionViewDate[0]
          : undefined;
    if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      setViewDateKey(v);
    }
  }, [companionViewDate]);

  useEffect(() => {
    applyKoko2TaskDistribution(profile);
  }, [profile, applyKoko2TaskDistribution]);

  useEffect(() => {
    ensureDayPlans(prevKey);
    ensureDayPlans(viewDateKey);
    ensureDayPlans(nextKey);
  }, [prevKey, viewDateKey, nextKey, ensureDayPlans]);

  useEffect(() => {
    if (pagerW <= 0) return;
    const id = requestAnimationFrame(() => {
      hScrollRef.current?.scrollTo({ x: pagerW, animated: false });
    });
    return () => cancelAnimationFrame(id);
  }, [viewDateKey, pagerW]);

  const onHorizontalScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const w = pagerW;
    if (w <= 0) return;
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / w);
    if (idx <= 0) setViewDateKey((k) => addDaysKey(k, -1));
    else if (idx >= 2) setViewDateKey((k) => addDaysKey(k, 1));
  };

  useEffect(() => {
    applySuccessTemplateFromProfile({
      school: profile.school,
      grade: profile.grade,
      juku: profile.juku,
    });
  }, [applySuccessTemplateFromProfile, profile.grade, profile.juku, profile.school]);

  useEffect(() => {
    autoReplanIfNeeded(todayKey);
  }, [autoReplanIfNeeded, todayKey]);

  /** 夜24時を跨いだら「今日が終わった」として、手動の緑ボタンと同じ更新（明日へ回す＋表示を翌日へ） */
  useEffect(() => {
    const tick = () => {
      const realToday = getTodayKey();
      if (realToday === lastRealCalendarDayRef.current) return;

      const endedDay = lastRealCalendarDayRef.current;
      lastRealCalendarDayRef.current = realToday;

      const [ey, em, ed] = endedDay.split("-").map((v) => parseInt(v, 10));
      const endedLevels = inferHomeScheduleLevels(new Date(ey, em - 1, ed), profile);
      let busyEnded = 0;
      for (let h = 0; h < 24; h++) {
        if ((endedLevels[h] ?? 0) >= 1) busyEnded += 1;
      }

      void (async () => {
        const guardKey = `aibou.midnightRoll.done.${endedDay}`;
        const already = await simpleStorageGet(guardKey);
        if (already === "1") {
          setViewDateKey((v) => (v === endedDay ? realToday : v));
          return;
        }
        await commitTomorrowPlanNow({
          todayKey: endedDay,
          tomorrowKey: realToday,
          todayBusySlotCount: busyEnded,
          skipLocalTomorrowRoll: false,
        });
        autoReplanIfNeeded(realToday);
        await simpleStorageSet(guardKey, "1");
        setViewDateKey((v) => (v === endedDay ? realToday : v));
      })();
    };

    const id = setInterval(tick, 15000);
    tick();
    return () => clearInterval(id);
  }, [autoReplanIfNeeded, commitTomorrowPlanNow, profile]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const raw = await simpleStorageGet("aibou.tomorrow.autoEnabled");
      if (!mounted) return;
      setAutoTomorrow(raw !== "0");
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const v =
        (await simpleStorageGet("aibou.openaiApiKey")) ??
        (await simpleStorageGet("openai_api_key")) ??
        process.env.EXPO_PUBLIC_OPENAI_API_KEY ??
        "";
      if (!mounted) return;
      const key = (v ?? "").trim();
      setAiKeyDraft(key);
      setHasAiKey(key.length > 0);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    tryAutoTomorrowPlan({
      todayKey,
      tomorrowKey,
      todayBusySlotCount,
      hourNow: currentHour,
      enabled: autoTomorrow,
    });
  }, [todayKey, tomorrowKey, todayBusySlotCount, currentHour, autoTomorrow, tryAutoTomorrowPlan]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const weekKey = getWeekKeyFromDate(new Date());
      const shown = await simpleStorageGet("aibou.weeklyReport.lastShown");
      if (!mounted) return;
      if (shown !== weekKey) {
        setWeeklyOpen(true);
        await simpleStorageSet("aibou.weeklyReport.lastShown", weekKey);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const taskTitleShort = (title: string) =>
    title.length > 26 ? `${title.slice(0, 26)}…` : title;

  const fallbackSchedulePaneH = useMemo(
    () => Math.max(380, Math.round(Dimensions.get("window").height) - 300),
    []
  );
  const effectiveSchedulePaneH =
    schedulePaneH > 0 ? schedulePaneH : fallbackSchedulePaneH;

  const plusFabBottom = getPlusFabBottom(insets.bottom);
  const companionFabBottom = getCompanionFabBottom(insets.bottom);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: BACKGROUND, position: "relative" }}
      edges={["top"]}
    >
      <View
        style={{
          marginHorizontal: 14,
          marginTop: 8,
          marginBottom: 6,
          borderRadius: UI_RADIUS_LG,
          backgroundColor: UI_SCREEN,
          borderWidth: 1,
          borderColor: UI_BORDER,
          paddingHorizontal: 16,
          paddingVertical: 14,
          ...uiCardShadow,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
        <View style={{ flex: 1, paddingRight: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", columnGap: 8 }}>
            <Pressable onPress={() => setDatePickerOpen(true)} hitSlop={8} accessibilityLabel="日付を選ぶ">
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: UI_TEXT,
                  letterSpacing: -0.3,
                }}
              >
                {labelFromDateKey(viewDateKey)}
              </Text>
            </Pressable>
            <View style={{ flexDirection: "row", alignItems: "center", columnGap: 4 }}>
              <Pressable
                onPress={() => setViewDateKey((k) => addDaysKey(k, -1))}
                accessibilityLabel="前の日"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#f1f5f9",
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                }}
              >
                <ChevronLeft size={22} color="#334155" />
              </Pressable>
              <Pressable
                onPress={() => setViewDateKey((k) => addDaysKey(k, 1))}
                accessibilityLabel="次の日"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#f1f5f9",
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                }}
              >
                <ChevronRight size={22} color="#334155" />
              </Pressable>
            </View>
          </View>
          <View
            style={{
              marginTop: 6,
              flexDirection: "row",
              alignItems: "center",
              columnGap: 6,
            }}
          >
            <Home size={17} color={UI_TEXT_SECONDARY} />
            <Text
              style={{ fontSize: 12, fontWeight: "600", color: UI_TEXT_SECONDARY }}
            >
              {viewDateKey === todayKey ? "今日の予定" : "この日の予定"}
            </Text>
          </View>
          {planContextLine ? (
            <Text
              style={{
                marginTop: 8,
                fontSize: 11,
                lineHeight: 16,
                color: UI_TEXT_SECONDARY,
              }}
            >
              {planContextLine}
            </Text>
          ) : null}
          <Text
            style={{
              marginTop: 8,
              fontSize: 10,
              lineHeight: 15,
              color: UI_TEXT_SECONDARY,
            }}
          >
            夜24時を過ぎると、今日の未完了が明日へまとまり、表示も翌日に切り替わります。
          </Text>
          <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", columnGap: 8 }}>
            <Text style={{ fontSize: 11, color: hasAiKey ? "#065f46" : "#b45309", fontWeight: "700" }}>
              {hasAiKey ? "AI接続: 設定済み" : "AI接続: キー未設定"}
            </Text>
            <Pressable onPress={() => setAiKeyOpen(true)}>
              <Text style={{ fontSize: 11, color: "#2563eb", fontWeight: "700" }}>APIキー設定</Text>
            </Pressable>
          </View>
          {viewDateKey !== todayKey ? (
            <Pressable
              onPress={() => setViewDateKey(todayKey)}
              style={{ marginTop: 8, alignSelf: "flex-start" }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#2563eb" }}>今日の表示に戻る</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", columnGap: 6 }}>
          <Pressable
            onPress={() => router.push("/board")}
            accessibilityLabel="掲示板"
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#f8fafc",
              borderWidth: 1,
              borderColor: "#e2e8f0",
            }}
          >
            <MessagesSquare size={20} color="#64748b" />
          </Pressable>
        </View>
        </View>
      </View>

      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: UI_SCREEN,
          borderBottomWidth: 1,
          borderColor: UI_BORDER,
        }}
      >
        {proposalNotice ? (
          <Text style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>{proposalNotice}</Text>
        ) : null}
        {pendingProposal ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#334155" }}>明日の案</Text>
              <Pressable
                onPress={rejectPendingPlan}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: "#f1f5f9",
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#64748b" }}>見送り</Text>
              </Pressable>
              <Pressable
                onPress={approvePendingPlan}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: "#16a34a",
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#ffffff" }}>確定</Text>
              </Pressable>
            </View>
            <View
              style={{
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                backgroundColor: "#fafafa",
                padding: 8,
              }}
            >
              <PlanProposalPreview logs={pendingProposal.logs} tasks={tasks} />
            </View>
          </>
        ) : null}
      </View>

      <View
        style={{ flex: 1, minHeight: 0 }}
        onLayout={(e) => {
          const w = Math.round(e.nativeEvent.layout.width);
          const h = Math.round(e.nativeEvent.layout.height);
          if (w > 0) setPagerW(w);
          if (h > 0) setSchedulePaneH(h);
        }}
      >
        <ScrollView
          ref={hScrollRef}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onMomentumScrollEnd={onHorizontalScrollEnd}
        >
          {[prevKey, viewDateKey, nextKey].map((dateKey) => {
            const plans = getPlans(dateKey);
            const dayTasksPage = tasks.filter((t) => t.date === dateKey);
            const now = new Date();
            const timelineNowMin =
              dateKey === todayKey ? now.getHours() * 60 + now.getMinutes() : null;
            const pageW = Math.max(1, pagerW);
            return (
              <View
                key={dateKey}
                style={{
                  width: pageW,
                  height: effectiveSchedulePaneH,
                  minHeight: 0,
                }}
              >
                <HomeDayScheduleBody
                  pageWidth={pageW}
                  paneHeight={effectiveSchedulePaneH}
                  timelineNowMin={timelineNowMin}
                  plans={plans}
                  dayTasks={dayTasksPage}
                  onPlanPress={(p) => {
                    ensureDayPlans(dateKey);
                    setPlanEditorDateKey(dateKey);
                    setPlanEditorPlan(p);
                    setPlanEditorOpen(true);
                  }}
                  onEmptyHourPress={(hour) => {
                    setCreateDateKey(dateKey);
                    setEditingPlanId(null);
                    setCreateHour(hour);
                    setCreateTab("plan");
                    setCreateOpen(true);
                  }}
                  renderTaskRow={(task) => {
                    const titleSnippet = taskTitleShort(taskTitleWithSegment(task.title, task));
                    return (
                      <View
                        style={{
                          minHeight: 28,
                          borderRadius: 999,
                          borderWidth: 1.2,
                          borderColor: task.completed ? PRIMARY : "#cbd5e1",
                          backgroundColor: task.completed ? PRIMARY : "#ffffff",
                          alignItems: "center",
                          justifyContent: "center",
                          flexDirection: "row",
                          paddingLeft: 8,
                          paddingRight: 4,
                          columnGap: 6,
                        }}
                      >
                        <Pressable onPress={() => toggleTask(task.id)} hitSlop={4}>
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "600",
                              color: task.completed ? "#ffffff" : "#334155",
                              maxWidth: 148,
                            }}
                            numberOfLines={2}
                          >
                            {titleSnippet}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => toggleTask(task.id)}
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 999,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: task.completed ? "#16a34a" : "#f1f5f9",
                          }}
                        >
                          <Check size={11} color={task.completed ? "#ffffff" : "#475569"} />
                        </Pressable>
                        <Pressable
                          onPress={() => togglePin(task.id)}
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 999,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: task.pinned ? "#bfdbfe" : "#e2e8f0",
                          }}
                        >
                          <Pin size={11} color={task.pinned ? "#1d4ed8" : "#64748b"} />
                        </Pressable>
                      </View>
                    );
                  }}
                />
              </View>
            );
          })}
        </ScrollView>
      </View>

      <Modal visible={weeklyOpen} transparent animationType="fade" onRequestClose={() => setWeeklyOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.35)", alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: "88%", maxWidth: 420, borderRadius: 14, backgroundColor: "#ffffff", padding: 14 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#0f172a" }}>今週のふり返り</Text>
            <Text style={{ marginTop: 3, fontSize: 12, color: "#64748b" }}>{thisWeek.label}</Text>
            <Text style={{ marginTop: 10, fontSize: 13, color: "#0f172a" }}>
              完了率 {thisWeek.completionRate}% ({thisWeek.completed}/{thisWeek.total})
            </Text>
            <Text style={{ marginTop: 4, fontSize: 12, color: "#475569" }}>
              自動リカバリ {thisWeek.autoReplans}回 / 固定タスク {thisWeek.pinnedCount}件
            </Text>
            <View style={{ marginTop: 14, alignItems: "flex-end" }}>
              <Pressable onPress={() => setWeeklyOpen(false)} style={{ borderRadius: 999, backgroundColor: "#2563eb", paddingHorizontal: 14, paddingVertical: 7 }}>
                <Text style={{ color: "#ffffff", fontWeight: "700" }}>OK</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Pressable
        onPress={() => {
          setCreateDateKey(viewDateKey);
          setEditingPlanId(null);
          setCreateHour(null);
          setCreateTab("plan");
          setCreateOpen(true);
        }}
        accessibilityLabel="予定またはタスクを追加"
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
        visible={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreateHour(null);
          setEditingPlanId(null);
        }}
        defaultDateKey={createDateKey}
        initialHour={createHour}
        initialTab={createTab}
        editingPlanId={editingPlanId}
      />
      <PlanEditorModal
        visible={planEditorOpen}
        onClose={() => {
          setPlanEditorOpen(false);
          setPlanEditorPlan(null);
        }}
        dateKey={planEditorDateKey}
        initialPlan={planEditorPlan}
        onSave={(c) => {
          if (!planEditorPlan) return;
          ensureDayPlans(planEditorDateKey);
          ensureDayPlans(c.dateKey);
          const payload = {
            title: c.title,
            startMin: c.startMin,
            endMinExclusive: c.endMinExclusive,
            allDay: c.allDay,
          };
          if (c.dateKey !== planEditorDateKey) {
            deletePlan(planEditorDateKey, planEditorPlan.id);
            addPlan(c.dateKey, payload);
          } else {
            updatePlan(planEditorDateKey, planEditorPlan.id, payload);
          }
          setPlanEditorOpen(false);
          setPlanEditorPlan(null);
        }}
        onDelete={
          planEditorPlan
            ? () => {
                deletePlan(planEditorDateKey, planEditorPlan.id);
                setPlanEditorOpen(false);
                setPlanEditorPlan(null);
              }
            : undefined
        }
      />
      <HomeDatePickerModal
        visible={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        selectedKey={viewDateKey}
        onConfirm={(key) => setViewDateKey(key)}
      />
      <Modal visible={aiKeyOpen} transparent animationType="fade" onRequestClose={() => setAiKeyOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.35)", alignItems: "center", justifyContent: "center", padding: 18 }}>
          <View style={{ width: "100%", maxWidth: 430, borderRadius: 14, backgroundColor: "#ffffff", padding: 14 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#0f172a" }}>OpenAI APIキー設定</Text>
            <Text style={{ marginTop: 6, fontSize: 12, color: "#64748b", lineHeight: 17 }}>
              次の日ボタンのAI再配置に使います。保存先はこの端末内です。
            </Text>
            <TextInput
              value={aiKeyDraft}
              onChangeText={setAiKeyDraft}
              placeholder="sk-..."
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                marginTop: 10,
                borderWidth: 1,
                borderColor: "#cbd5e1",
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 10,
                fontSize: 13,
                color: "#0f172a",
              }}
            />
            <View style={{ marginTop: 12, flexDirection: "row", justifyContent: "flex-end", columnGap: 10 }}>
              <Pressable onPress={() => setAiKeyOpen(false)}>
                <Text style={{ color: "#64748b", fontWeight: "600" }}>閉じる</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  const key = aiKeyDraft.trim();
                  await simpleStorageSet("aibou.openaiApiKey", key);
                  await simpleStorageSet("openai_api_key", key);
                  setHasAiKey(key.length > 0);
                  setProposalNotice(key.length > 0 ? "AIキーを保存しました" : "AIキーをクリアしました");
                  setTimeout(() => setProposalNotice(null), 1800);
                  setAiKeyOpen(false);
                }}
              >
                <Text style={{ color: "#2563eb", fontWeight: "700" }}>保存</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
