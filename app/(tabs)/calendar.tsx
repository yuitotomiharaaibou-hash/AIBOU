import { useMemo, useState, useCallback } from "react";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { View, Text, ScrollView, Pressable, Modal } from "react-native";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react-native";
import { BACKGROUND } from "@/constants/theme";
import { useTasks, makeDateKey, getTodayKey } from "@/context/TasksContext";
import { useRouter } from "expo-router";
import { QuickCreateModal } from "@/components/QuickCreateModal";
import { AibouCompanionFab } from "@/components/AibouCompanionFab";
import { getCompanionFabBottom, getPlusFabBottom } from "@/lib/companionFabLayout";
import { taskTitleWithSegment } from "@/lib/taskSegmentLabel";
import { useHomeSchedule, type DayPlanItem } from "@/context/HomeScheduleContext";
import {
  planDisplayAllDay,
  shouldOmitPlanFromCalendarCell,
  sortPlansForCalendarCell,
} from "@/lib/planDisplay";
import { planTitleShortDisplay } from "@/lib/planTitleDisplay";
import { PlanEditorModal } from "@/components/PlanEditorModal";

type DayCell = {
  date: number;
  isCurrentMonth: boolean;
};

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function buildMonth(year: number, month0: number): DayCell[] {
  const first = new Date(year, month0, 1);
  const firstWeekday = first.getDay(); // 0 (Sun) - 6 (Sat)
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();

  const cells: DayCell[] = [];

  // 前月の埋め草
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ date: 0, isCurrentMonth: false });
  }

  // 当月
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: d, isCurrentMonth: true });
  }

  // 6行×7列に満たない分を後ろに埋める
  while (cells.length < 42) {
    cells.push({ date: 0, isCurrentMonth: false });
  }

  return cells;
}

export default function CalendarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const plusFabBottom = getPlusFabBottom(insets.bottom);
  const companionFabBottom = getCompanionFabBottom(insets.bottom);
  const baseToday = new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  const viewDate = new Date(
    baseToday.getFullYear(),
    baseToday.getMonth() + monthOffset,
    1
  );
  const year = viewDate.getFullYear();
  const month0 = viewDate.getMonth();
  const cells = buildMonth(year, month0);
  const { tasks, pendingAiQuestions } = useTasks();
  const { getPlans, ensureDayPlans, updatePlan, deletePlan, addPlan } = useHomeSchedule();
  const [planEditorOpen, setPlanEditorOpen] = useState(false);
  const [planEditorDateKey, setPlanEditorDateKey] = useState("");
  const [planEditorPlan, setPlanEditorPlan] = useState<DayPlanItem | null>(null);

  const openPlanEditor = useCallback(
    (dk: string, p: DayPlanItem) => {
      ensureDayPlans(dk);
      setPlanEditorDateKey(dk);
      setPlanEditorPlan(p);
      setPlanEditorOpen(true);
    },
    [ensureDayPlans]
  );
  const [fabOpen, setFabOpen] = useState(false);
  const [yearMonthPickerVisible, setYearMonthPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(year);
  const [pickerMonth0, setPickerMonth0] = useState(month0);

  // 7日ごとに 1 週間の配列に分割（スマホでもきちんと 7 列に並べる）
  const weeks: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const openYearMonthPicker = () => {
    setPickerYear(year);
    setPickerMonth0(month0);
    setYearMonthPickerVisible(true);
  };

  const applyYearMonthPicker = () => {
    const yearDiff = pickerYear - baseToday.getFullYear();
    const monthDiff = pickerMonth0 - baseToday.getMonth();
    setMonthOffset(yearDiff * 12 + monthDiff);
    setYearMonthPickerVisible(false);
  };

  const handleDayPress = (cell: DayCell) => {
    if (!cell.isCurrentMonth || cell.date <= 0) return;
    const key = makeDateKey(year, month0, cell.date);
    router.push(`/day/${key}`);
  };

  const tasksByDate = useMemo(() => {
    const map: Record<string, typeof tasks> = {};
    for (const t of tasks) {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    }
    return map;
  }, [tasks]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: BACKGROUND, position: "relative" }}
      edges={["top"]}
    >
      <View style={{ flex: 1, paddingHorizontal: 14, paddingTop: 16 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            columnGap: 8,
            marginBottom: 8,
          }}
        >
          <Pressable onPress={openYearMonthPicker} hitSlop={8} accessibilityLabel="年月を選ぶ">
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: "#0f172a",
                letterSpacing: -0.3,
              }}
            >
              {year}年 {month0 + 1}月
            </Text>
          </Pressable>
          <View style={{ flexDirection: "row", alignItems: "center", columnGap: 4 }}>
            <Pressable
              onPress={() => setMonthOffset((o) => o - 1)}
              accessibilityLabel="前の月"
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
              onPress={() => setMonthOffset((o) => o + 1)}
              accessibilityLabel="次の月"
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

        {/* 曜日ヘッダー */}
        <View style={{ flexDirection: "row", marginBottom: 4 }}>
          {DAY_LABELS.map((label) => (
            <View
              key={label}
              style={{ flex: 1, alignItems: "center", paddingVertical: 4 }}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#64748b" }}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        {/* カレンダーグリッド */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{ borderWidth: 1, borderColor: "#e2e8f0" }}
          >
            {weeks.map((week, rowIndex) => (
              <View
                key={rowIndex}
                style={{ flexDirection: "row" }}
              >
                {week.map((cell, colIndex) => {
                  const isSunday = colIndex === 0;
                  const isSaturday = colIndex === 6;
                  const dateKey =
                    cell.isCurrentMonth && cell.date > 0
                      ? makeDateKey(year, month0, cell.date)
                      : "";
                  const cellTasks = dateKey ? tasksByDate[dateKey] ?? [] : [];
                  const cellPlans = dateKey
                    ? sortPlansForCalendarCell(
                        getPlans(dateKey).filter((p) => !shouldOmitPlanFromCalendarCell(p))
                      )
                    : [];
                  const maxBarsPerDay = 3;
                  const shownPlans = cellPlans.slice(
                    0,
                    Math.min(cellPlans.length, maxBarsPerDay)
                  );
                  const taskSlots = Math.max(0, maxBarsPerDay - shownPlans.length);
                  const shownTasks = cellTasks.slice(0, taskSlots);
                  const restHidden =
                    cellPlans.length + cellTasks.length - shownPlans.length - shownTasks.length;

                  return (
                    <Pressable
                      key={colIndex}
                      onPress={() => handleDayPress(cell)}
                      style={{
                        minHeight: 100,
                        flex: 1,
                        borderBottomWidth: 1,
                        borderRightWidth: colIndex === 6 ? 0 : 1,
                        borderColor: "#e2e8f0",
                        padding: 4,
                        backgroundColor: "#ffffff",
                      }}
                    >
                      {cell.isCurrentMonth && (
                        <View style={{ flex: 1 }} pointerEvents="box-none">
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "600",
                              color: isSunday
                                ? "#fb7185"
                                : isSaturday
                                ? "#0ea5e9"
                                : "#334155",
                            }}
                          >
                            {cell.date}
                          </Text>
                          <View
                            style={{
                              marginTop: 4,
                              flex: 1,
                              flexDirection: "column",
                              rowGap: 3,
                            }}
                          >
                            {shownPlans.map((p) => {
                              const ad = planDisplayAllDay(p);
                              return (
                                <Pressable
                                  key={p.id}
                                  onPress={() => openPlanEditor(dateKey, p)}
                                  style={{
                                    borderRadius: 6,
                                    backgroundColor: ad ? "#1e40af" : "#dbeafe",
                                    paddingHorizontal: 5,
                                    paddingVertical: 2,
                                    minHeight: 16,
                                    justifyContent: "center",
                                    borderWidth: ad ? 0 : 1,
                                    borderColor: "#bfdbfe",
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 9,
                                      color: ad ? "#f8fafc" : "#1e3a8a",
                                      fontWeight: "700",
                                    }}
                                    numberOfLines={1}
                                  >
                                    {planTitleShortDisplay(p.title)}
                                  </Text>
                                  {null}
                                </Pressable>
                              );
                            })}
                            {shownTasks.map((t) => (
                              <View
                                key={t.id}
                                style={{
                                  borderRadius: 6,
                                  backgroundColor: t.completed ? "#1d4ed8" : "#ffffff",
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                  minHeight: 16,
                                  justifyContent: "center",
                                  borderWidth: 1,
                                  borderColor: t.completed ? "#1e3a8a" : "#cbd5e1",
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 9,
                                    color: t.completed ? "#ffffff" : "#334155",
                                    fontWeight: t.completed ? "800" : "600",
                                  }}
                                  numberOfLines={1}
                                >
                                  {taskTitleWithSegment(t.title, t)}
                                </Text>
                              </View>
                            ))}
                            {restHidden > 0 && (
                              <Text style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                                +{restHidden}
                              </Text>
                            )}
                          </View>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>

        <Text style={{ marginTop: 10, fontSize: 11, color: "#64748b" }}>
          各マスは上から「予定」「タスク」の順で、合わせて最大3件まで表示します（予定を優先）。それ以上は「+N」で件数のみ示します。予定をタップすると編集が開きます（終日は濃色、時間指定は薄色）。日付の空きをタップするとその日の詳細へ移動します。
        </Text>
      </View>

      <PlanEditorModal
        visible={planEditorOpen}
        onClose={() => {
          setPlanEditorOpen(false);
          setPlanEditorPlan(null);
        }}
        dateKey={planEditorDateKey || getTodayKey()}
        initialPlan={planEditorPlan}
        onSave={(c) => {
          if (!planEditorPlan || !planEditorDateKey) return;
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
          planEditorPlan && planEditorDateKey
            ? () => {
                deletePlan(planEditorDateKey, planEditorPlan.id);
                setPlanEditorOpen(false);
                setPlanEditorPlan(null);
              }
            : undefined
        }
      />

      {/* 年月ピッカー */}
      <Modal
        visible={yearMonthPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setYearMonthPickerVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(15,23,42,0.35)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: "80%",
              maxWidth: 360,
              borderRadius: 16,
              backgroundColor: "#ffffff",
              padding: 16,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: "#0f172a",
                marginBottom: 12,
              }}
            >
              年月を選択
            </Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    marginBottom: 4,
                  }}
                >
                  年
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Pressable
                    onPress={() => setPickerYear((y) => y - 1)}
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>-</Text>
                  </Pressable>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#111827",
                      minWidth: 64,
                      textAlign: "center",
                    }}
                  >
                    {pickerYear}
                  </Text>
                  <Pressable
                    onPress={() => setPickerYear((y) => y + 1)}
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>+</Text>
                  </Pressable>
                </View>
              </View>

              <View style={{ alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    marginBottom: 4,
                  }}
                >
                  月
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Pressable
                    onPress={() =>
                      setPickerMonth0((m0) => (m0 + 11) % 12)
                    }
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>-</Text>
                  </Pressable>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#111827",
                      minWidth: 40,
                      textAlign: "center",
                    }}
                  >
                    {pickerMonth0 + 1}
                  </Text>
                  <Pressable
                    onPress={() =>
                      setPickerMonth0((m0) => (m0 + 1) % 12)
                    }
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>+</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                columnGap: 12,
              }}
            >
              <Pressable
                onPress={() => setYearMonthPickerVisible(false)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: "#6b7280",
                  }}
                >
                  キャンセル
                </Text>
              </Pressable>
              <Pressable
                onPress={applyYearMonthPicker}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: "#2563eb",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: "#ffffff",
                  }}
                >
                  決定
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Pressable
        onPress={() => setFabOpen(true)}
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
      <QuickCreateModal visible={fabOpen} onClose={() => setFabOpen(false)} defaultDateKey={getTodayKey()} />
    </SafeAreaView>
  );
}
