import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, Home, MessagesSquare, Pencil, Pin } from "lucide-react-native";
import { useRouter } from "expo-router";
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
import { useHomeSchedule } from "@/context/HomeScheduleContext";
import { useProfile } from "@/context/ProfileContext";
import { nextAugustMockExamSaturday } from "@/lib/tetsuryokuOpeningPlan";
import type { ScheduleLevel } from "@/lib/homeScheduleInference";
import { simpleStorageGet, simpleStorageSet } from "@/lib/simpleStorage";
import { getWeekKeyFromDate, summarizeWeek } from "@/lib/weeklyReport";
import { getTomorrowKey } from "@/lib/tomorrowPlan";
import { PlanProposalPreview } from "@/components/PlanProposalPreview";

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const ROW_HEIGHT = 44;

function leftFillColor(level: ScheduleLevel): string {
  if (level === 0) return "#f8fafc";
  if (level === 1) return "#dbeafe";
  return "#93c5fd";
}

function getTodayLabel() {
  const d = new Date();
  const month = d.getMonth() + 1;
  const date = d.getDate();
  const day = DAY_LABELS[d.getDay()];
  return `${month}/${date} (${day})`;
}

function monthDayFromKey(dateKey: string): string {
  const [, m, d] = dateKey.split("-");
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const {
    tasks,
    toggleTask,
    togglePin,
    updateTaskSchedule,
    setPlannerUser,
    applySuccessTemplateFromProfile,
    tryAutoTomorrowPlan,
    approvePendingPlan,
    rejectPendingPlan,
    autoReplanIfNeeded,
    replanLogs,
    pendingProposal,
    proposalNotice,
    applyKoko2TaskDistribution,
  } = useTasks();
  const { profile } = useProfile();
  const { getLevel, cycleLevel } = useHomeSchedule();
  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const [homeMode, setHomeMode] = useState<"execute" | "edit">("execute");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [autoTomorrow, setAutoTomorrow] = useState(true);

  const currentHour = new Date().getHours();
  const todayKey = getTodayKey();
  const tomorrowKey = useMemo(() => getTomorrowKey(), [todayKey]);

  const dayTasks = tasks.filter((t) => t.date === todayKey);

  const todayBusySlotCount = useMemo(() => {
    let n = 0;
    for (let h = 0; h < 24; h++) {
      if (getLevel(todayKey, h) >= 1) n += 1;
    }
    return n;
  }, [getLevel, todayKey]);

  const thisWeek = useMemo(
    () => summarizeWeek(tasks, replanLogs, getWeekKeyFromDate(new Date())),
    [tasks, replanLogs]
  );

  const planContextLine = useMemo(() => {
    const base = "KOKO2 全タスクを、学校・塾コマの空き枠に合わせて時刻配分しています";
    if (profile.juku === "鉄緑会") {
      const ex = nextAugustMockExamSaturday(new Date());
      return `${base} · 校内模試の目安 ${ex.getMonth() + 1}/${ex.getDate()}（土）`;
    }
    return base;
  }, [profile.juku]);

  useEffect(() => {
    setPlannerUser(profile.username ?? "default");
  }, [profile.username, setPlannerUser]);

  useEffect(() => {
    applyKoko2TaskDistribution(profile);
  }, [profile, applyKoko2TaskDistribution]);

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

  const handleTitleSelectForEdit = (taskId: string, completed: boolean) => {
    if (completed) return;
    setSelectedTaskId((prev) => (prev === taskId ? null : taskId));
  };

  const handleRowPress = (hour: number) => {
    if (homeMode !== "edit" || !selectedTaskId) return;
    updateTaskSchedule(selectedTaskId, todayKey, hour);
    setSelectedTaskId(null);
  };

  const taskTitleShort = (title: string) =>
    title.length > 26 ? `${title.slice(0, 26)}…` : title;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: BACKGROUND }}
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
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: UI_TEXT,
              letterSpacing: -0.3,
            }}
          >
            {getTodayLabel()}
          </Text>
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
              今日の予定
            </Text>
          </View>
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
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", columnGap: 6 }}>
          <Pressable
            onPress={() => {
              setHomeMode((m) => {
                const next = m === "edit" ? "execute" : "edit";
                if (next === "execute") setSelectedTaskId(null);
                return next;
              });
            }}
            accessibilityLabel={homeMode === "edit" ? "編集モードをオフ" : "編集モード"}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: homeMode === "edit" ? "#dbeafe" : "#f1f5f9",
              borderWidth: homeMode === "edit" ? 2 : 1,
              borderColor: homeMode === "edit" ? "#2563eb" : "#e2e8f0",
            }}
          >
            <Pencil size={20} color={homeMode === "edit" ? "#1d4ed8" : "#64748b"} />
          </Pressable>
          <Pressable
            onPress={() => router.push("/tomorrow-plan")}
            accessibilityLabel="明日の予定を立てる"
            style={{
              minWidth: 44,
              height: 40,
              paddingHorizontal: 12,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#0f766e",
            }}
          >
            <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "800" }}>{monthDayFromKey(tomorrowKey)}</Text>
          </Pressable>
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

      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              columnGap: 8,
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: "#ffffff",
              borderBottomWidth: 1,
              borderColor: "#e5e7eb",
            }}
          >
            <Text style={{ fontSize: 11, color: "#64748b", fontWeight: "600" }}>混み具合</Text>
            <Text
              style={{
                fontSize: 10,
                color: "#334155",
                backgroundColor: "#f8fafc",
                borderRadius: 999,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              空き
            </Text>
            <Text
              style={{
                fontSize: 10,
                color: "#1e40af",
                backgroundColor: "#dbeafe",
                borderRadius: 999,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              半分
            </Text>
            <Text
              style={{
                fontSize: 10,
                color: "#1e3a8a",
                backgroundColor: "#93c5fd",
                borderRadius: 999,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              埋まり
            </Text>
            {homeMode === "edit" ? (
              <View style={{ marginLeft: 4 }}>
                <Pencil size={12} color="#b45309" />
              </View>
            ) : null}
          </View>
          {HOURS.map((hour) => {
            const tasksAtHour = dayTasks.filter((t) => t.hour === hour);
            const isCurrentHour = hour === currentHour;
            const scheduleLevel = getLevel(todayKey, hour);

            return (
              <View
                key={hour}
                style={{
                  flexDirection: "row",
                  alignItems: "stretch",
                  height: ROW_HEIGHT,
                  borderBottomWidth: 1,
                  borderColor: "#e5e7eb",
                  position: "relative",
                  backgroundColor: "#ffffff",
                }}
              >
                {isCurrentHour && (
                  <View
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      height: 1,
                      backgroundColor: "#fbbf24",
                      top: "50%",
                      zIndex: 2,
                    }}
                  />
                )}

                <View
                  style={{
                    width: 32,
                    alignItems: "flex-end",
                    justifyContent: "center",
                    paddingRight: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "500",
                      color: "#6b7280",
                    }}
                  >
                    {hour}
                  </Text>
                </View>

                <Pressable
                  onPress={() => homeMode === "edit" && cycleLevel(todayKey, hour)}
                  disabled={homeMode !== "edit"}
                  style={{
                    flex: 1,
                    borderRightWidth: 1,
                    borderColor: "#e5e7eb",
                    justifyContent: "center",
                    backgroundColor: leftFillColor(scheduleLevel),
                    borderTopRightRadius: 8,
                    borderBottomRightRadius: 8,
                    opacity: homeMode === "edit" ? 1 : 0.92,
                  }}
                />

                {homeMode === "edit" ? (
                  <Pressable
                    onPress={() => handleRowPress(hour)}
                    style={{
                      flex: 1,
                      paddingHorizontal: 6,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      columnGap: 8,
                    }}
                  >
                    {tasksAtHour.map((task) => {
                      const titleSnippet = taskTitleShort(task.title);
                      const isSelected = selectedTaskId === task.id;
                      return (
                        <View
                          key={task.id}
                          style={{
                            minHeight: 28,
                            borderRadius: 999,
                            borderWidth: isSelected ? 2 : 1.2,
                            borderColor: task.completed
                              ? PRIMARY
                              : isSelected
                                ? "#22c55e"
                                : "#94a3b8",
                            backgroundColor: task.completed ? PRIMARY : "#fffffff0",
                            alignItems: "center",
                            justifyContent: "center",
                            flexDirection: "row",
                            paddingLeft: 8,
                            paddingRight: 4,
                            columnGap: 6,
                          }}
                        >
                          <Pressable
                            onPress={() => handleTitleSelectForEdit(task.id, task.completed)}
                            hitSlop={4}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "600",
                                color: task.completed ? "#ffffff" : "#1f2933",
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
                              backgroundColor: task.completed ? "#16a34a" : "#e2e8f0",
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
                    })}
                  </Pressable>
                ) : (
                  <View
                    style={{
                      flex: 1,
                      paddingHorizontal: 6,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      columnGap: 8,
                    }}
                  >
                    {tasksAtHour.map((task) => {
                      const titleSnippet = taskTitleShort(task.title);
                      return (
                        <View
                          key={task.id}
                          style={{
                            minHeight: 28,
                            borderRadius: 999,
                            borderWidth: 1.2,
                            borderColor: task.completed ? PRIMARY : "#94a3b8",
                            backgroundColor: task.completed ? PRIMARY : "#fffffff0",
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
                                color: task.completed ? "#ffffff" : "#1f2933",
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
                              backgroundColor: task.completed ? "#16a34a" : "#e2e8f0",
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
                    })}
                  </View>
                )}
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
    </SafeAreaView>
  );
}
