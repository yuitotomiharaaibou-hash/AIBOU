import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, Pin, PinOff } from "lucide-react-native";
import { BACKGROUND } from "@/constants/theme";
import { useHomeSchedule, type DayPlanItem } from "@/context/HomeScheduleContext";
import { useTasks, type Subject, makeDateKey } from "@/context/TasksContext";
import { taskTitleWithSegment } from "@/lib/taskSegmentLabel";
import { planSpanFromLoose, formatPlanRangeLabel } from "@/lib/planTime";
import { PlanEditorModal } from "@/components/PlanEditorModal";

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
type DayCell = { date: number; isCurrentMonth: boolean };

function buildMonth(year: number, month0: number): DayCell[] {
  const first = new Date(year, month0, 1);
  const firstWeekday = first.getDay();
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const cells: DayCell[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ date: 0, isCurrentMonth: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: d, isCurrentMonth: true });
  while (cells.length < 42) cells.push({ date: 0, isCurrentMonth: false });
  return cells;
}

function clampHour(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(23, Math.floor(v)));
}

function formatDateLabel(key: string): string {
  const [y, m, d] = key.split("-").map((v) => parseInt(v, 10));
  const dt = new Date(y, m - 1, d);
  return `${m}/${d} (${DAY_LABELS[dt.getDay()]})`;
}

export default function DayDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const dateKey = typeof params.date === "string" ? params.date : "";

  const {
    getPlans,
    ensureDayPlans,
    addPlan,
    updatePlan,
    deletePlan,
  } = useHomeSchedule();
  const { tasks, addTask, updateTask, deleteTask, toggleTask, togglePin } = useTasks();

  const dayTasks = useMemo(() => tasks.filter((t) => t.date === dateKey), [tasks, dateKey]);
  const dayPlans = getPlans(dateKey);

  const [planEditorOpen, setPlanEditorOpen] = useState(false);
  const [planEditorPlan, setPlanEditorPlan] = useState<DayPlanItem | null>(null);

  const [taskModal, setTaskModal] = useState<{
    open: boolean;
    taskId: string | null;
    title: string;
    hour: string;
    date: string;
    subject: Subject;
  }>({ open: false, taskId: null, title: "", hour: "19", date: dateKey, subject: "english" });
  const [taskDatePickerVisible, setTaskDatePickerVisible] = useState(false);
  const [taskPickerMonthOffset, setTaskPickerMonthOffset] = useState(0);

  useEffect(() => {
    if (dateKey) ensureDayPlans(dateKey);
  }, [dateKey, ensureDayPlans]);

  if (!dateKey) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BACKGROUND, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#64748b" }}>日付が見つかりません。</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BACKGROUND }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 10 }}>
        <Pressable onPress={() => router.back()} style={{ paddingVertical: 6, paddingRight: 10 }}>
          <Text style={{ fontSize: 14, color: "#2563eb", fontWeight: "600" }}>戻る</Text>
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: "700", color: "#0f172a" }}>
          {formatDateLabel(dateKey)} の詳細
        </Text>
      </View>

      <View style={{ flex: 1, padding: 12, minHeight: 0 }}>
        <View style={{ flexDirection: "row", columnGap: 10, flex: 1 }}>
          <View style={{ flex: 1, minWidth: 0, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, backgroundColor: "#ffffff" }}>
            <SectionHeader
              title="予定"
              onAdd={() => {
                setPlanEditorPlan(null);
                setPlanEditorOpen(true);
              }}
            />
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 8 }}>
              {dayPlans.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    setPlanEditorPlan(p);
                    setPlanEditorOpen(true);
                  }}
                  style={cardStyle}
                >
                  <Text style={idStyle}>{formatPlanRangeLabel(planSpanFromLoose(p))}</Text>
                  <Text style={titleStyle}>{p.title}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={{ flex: 1, minWidth: 0, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, backgroundColor: "#ffffff" }}>
            <SectionHeader
              title="タスク"
              onAdd={() =>
                setTaskModal({
                  open: true,
                  taskId: null,
                  title: "",
                  hour: "19",
                  date: dateKey,
                  subject: "english",
                })
              }
            />
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 8 }}>
              {dayTasks.map((t) => (
                <View key={t.id} style={cardStyle}>
                  <Pressable
                    onPress={() =>
                      setTaskModal({
                        open: true,
                        taskId: t.id,
                        title: t.title,
                        hour: String(t.hour),
                        date: t.date,
                        subject: t.subject,
                      })
                    }
                  >
                    <Text style={idStyle}>{t.id}</Text>
                    <Text style={titleStyle} numberOfLines={2}>
                      {taskTitleWithSegment(t.title, t)}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                      {formatDateLabel(t.date)} / {t.subject === "english" ? "英語" : "数学"}
                    </Text>
                  </Pressable>
                  <View style={{ marginTop: 8, flexDirection: "row", columnGap: 10 }}>
                    <Pressable
                      onPress={() => toggleTask(t.id)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: t.completed ? "#16a34a" : "#cbd5e1",
                        backgroundColor: t.completed ? "#dcfce7" : "#ffffff",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Check size={16} color={t.completed ? "#166534" : "#64748b"} />
                    </Pressable>
                    <Pressable
                      onPress={() => togglePin(t.id)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: t.pinned ? "#2563eb" : "#cbd5e1",
                        backgroundColor: t.pinned ? "#dbeafe" : "#ffffff",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {t.pinned ? (
                        <Pin size={16} color="#1d4ed8" />
                      ) : (
                        <PinOff size={16} color="#64748b" />
                      )}
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>

      <PlanEditorModal
        visible={planEditorOpen}
        onClose={() => {
          setPlanEditorOpen(false);
          setPlanEditorPlan(null);
        }}
        dateKey={dateKey}
        initialPlan={planEditorPlan}
        onSave={(c) => {
          const payload = {
            title: c.title,
            startMin: c.startMin,
            endMinExclusive: c.endMinExclusive,
            allDay: c.allDay,
          };
          if (planEditorPlan) {
            ensureDayPlans(dateKey);
            ensureDayPlans(c.dateKey);
            if (c.dateKey !== dateKey) {
              deletePlan(dateKey, planEditorPlan.id);
              addPlan(c.dateKey, payload);
            } else {
              updatePlan(dateKey, planEditorPlan.id, payload);
            }
          } else {
            ensureDayPlans(c.dateKey);
            addPlan(c.dateKey, payload);
          }
          setPlanEditorOpen(false);
          setPlanEditorPlan(null);
        }}
        onDelete={
          planEditorPlan
            ? () => {
                deletePlan(dateKey, planEditorPlan.id);
                setPlanEditorOpen(false);
                setPlanEditorPlan(null);
              }
            : undefined
        }
      />

      <Modal visible={taskModal.open} transparent animationType="fade" onRequestClose={() => setTaskModal((t) => ({ ...t, open: false }))}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={overlayStyle}>
          <View style={taskModalCardStyle}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: TASK_MODAL_SCROLL_MAX }}
              contentContainerStyle={{ padding: 14, paddingBottom: 8 }}
              showsVerticalScrollIndicator
            >
              <Text style={modalTitle}>タスクを編集</Text>
              <LabeledInput label="内容" value={taskModal.title} onChangeText={(v) => setTaskModal((t) => ({ ...t, title: v }))} />
              <LabeledInput label="時刻(0-23)" value={taskModal.hour} onChangeText={(v) => setTaskModal((t) => ({ ...t, hour: v }))} />
              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>日付</Text>
                <Pressable
                  onPress={() => {
                    const base = taskModal.date || dateKey;
                    const [yy, mm] = base.split("-").map((v) => parseInt(v, 10));
                    const today = new Date();
                    const diff = (yy - today.getFullYear()) * 12 + (mm - 1 - today.getMonth());
                    setTaskPickerMonthOffset(diff);
                    setTaskDatePickerVisible(true);
                  }}
                  style={{
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 10,
                    backgroundColor: "#ffffff",
                  }}
                >
                  <Text style={{ fontSize: 14, color: "#0f172a", fontWeight: "600" }}>
                    {formatDateLabel(taskModal.date)}
                  </Text>
                </Pressable>
              </View>
              <View style={{ flexDirection: "row", marginBottom: 10, columnGap: 8 }}>
                <Pressable onPress={() => setTaskModal((t) => ({ ...t, subject: "english" }))} style={pill(taskModal.subject === "english")}>
                  <Text style={pillText(taskModal.subject === "english")}>英語</Text>
                </Pressable>
                <Pressable onPress={() => setTaskModal((t) => ({ ...t, subject: "math" }))} style={pill(taskModal.subject === "math")}>
                  <Text style={pillText(taskModal.subject === "math")}>数学</Text>
                </Pressable>
                {taskModal.taskId && (
                  <Pressable onPress={() => toggleTask(taskModal.taskId!)} style={iconBtn}>
                    <Check size={16} color="#166534" />
                  </Pressable>
                )}
                {taskModal.taskId && (
                  <Pressable onPress={() => togglePin(taskModal.taskId!)} style={iconBtn}>
                    <Pin size={16} color="#1d4ed8" />
                  </Pressable>
                )}
              </View>
            </ScrollView>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                columnGap: 12,
                rowGap: 8,
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderTopWidth: 1,
                borderTopColor: "#e5e7eb",
                backgroundColor: "#f8fafc",
              }}
            >
              {taskModal.taskId ? (
                <Pressable
                  onPress={() => {
                    deleteTask(taskModal.taskId!);
                    setTaskModal((t) => ({ ...t, open: false }));
                  }}
                >
                  <Text style={{ color: "#dc2626", fontWeight: "600" }}>削除</Text>
                </Pressable>
              ) : (
                <View style={{ minWidth: 8 }} />
              )}
              <View style={{ flexDirection: "row", columnGap: 16 }}>
                <Pressable onPress={() => setTaskModal((t) => ({ ...t, open: false }))}>
                  <Text style={{ color: "#6b7280" }}>キャンセル</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    const title = taskModal.title.trim() || "新規タスク";
                    const hour = clampHour(parseInt(taskModal.hour, 10));
                    if (taskModal.taskId) {
                      updateTask(taskModal.taskId, {
                        title,
                        hour,
                        subject: taskModal.subject,
                        date: taskModal.date,
                      });
                    } else {
                      addTask({
                        title,
                        hour,
                        subject: taskModal.subject,
                        date: taskModal.date,
                      });
                    }
                    setTaskModal((t) => ({ ...t, open: false }));
                  }}
                >
                  <Text style={{ color: "#2563eb", fontWeight: "700" }}>保存</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal
        visible={taskDatePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTaskDatePickerVisible(false)}
      >
        <View style={overlayStyle}>
          <View style={modalStyle}>
            <Text style={modalTitle}>タスクの日付を選択</Text>
            {(() => {
              const today = new Date();
              const viewDate = new Date(today.getFullYear(), today.getMonth() + taskPickerMonthOffset, 1);
              const yy = viewDate.getFullYear();
              const mm0 = viewDate.getMonth();
              const cells = buildMonth(yy, mm0);
              const weeks: DayCell[][] = [];
              for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
              return (
                <>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <Pressable onPress={() => setTaskPickerMonthOffset((v) => v - 1)}>
                      <Text style={{ fontSize: 16, color: "#2563eb" }}>＜</Text>
                    </Pressable>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#0f172a" }}>
                      {yy}年 {mm0 + 1}月
                    </Text>
                    <Pressable onPress={() => setTaskPickerMonthOffset((v) => v + 1)}>
                      <Text style={{ fontSize: 16, color: "#2563eb" }}>＞</Text>
                    </Pressable>
                  </View>
                  <View style={{ borderWidth: 1, borderColor: "#e2e8f0" }}>
                    {weeks.map((week, wi) => (
                      <View key={wi} style={{ flexDirection: "row" }}>
                        {week.map((cell, ci) => {
                          const valid = cell.isCurrentMonth && cell.date > 0;
                          const key = valid ? makeDateKey(yy, mm0, cell.date) : "";
                          const selected = key === taskModal.date;
                          return (
                            <Pressable
                              key={ci}
                              disabled={!valid}
                              onPress={() => {
                                if (!valid) return;
                                setTaskModal((t) => ({ ...t, date: key }));
                                setTaskDatePickerVisible(false);
                              }}
                              style={{
                                flex: 1,
                                height: 38,
                                alignItems: "center",
                                justifyContent: "center",
                                borderRightWidth: ci === 6 ? 0 : 1,
                                borderBottomWidth: wi === weeks.length - 1 ? 0 : 1,
                                borderColor: "#e2e8f0",
                                backgroundColor: selected ? "#dbeafe" : valid ? "#ffffff" : "#f8fafc",
                              }}
                            >
                              {valid && (
                                <Text style={{ fontSize: 12, color: selected ? "#1d4ed8" : "#334155", fontWeight: "600" }}>
                                  {cell.date}
                                </Text>
                              )}
                            </Pressable>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                </>
              );
            })()}
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 10 }}>
              <Pressable onPress={() => setTaskDatePickerVisible(false)}>
                <Text style={{ color: "#6b7280" }}>閉じる</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SectionHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 10, paddingTop: 10 }}>
      <Text style={{ fontSize: 14, fontWeight: "700", color: "#0f172a" }}>{title}</Text>
      <Pressable onPress={onAdd}>
        <Text style={{ fontSize: 12, color: "#2563eb", fontWeight: "700" }}>+ 追加</Text>
      </Pressable>
    </View>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={{
          borderWidth: 1,
          borderColor: "#e5e7eb",
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 8,
          fontSize: 14,
          color: "#0f172a",
          backgroundColor: "#ffffff",
        }}
      />
    </View>
  );
}

const cardStyle = {
  borderWidth: 1,
  borderColor: "#e5e7eb",
  borderRadius: 10,
  paddingHorizontal: 10,
  paddingVertical: 8,
  marginBottom: 8,
  backgroundColor: "#ffffff",
} as const;

const idStyle = { fontSize: 10, color: "#6b7280", fontWeight: "600" } as const;
const titleStyle = { fontSize: 13, color: "#111827", marginTop: 4 } as const;

const overlayStyle = {
  flex: 1,
  backgroundColor: "rgba(15,23,42,0.35)",
  justifyContent: "center",
  alignItems: "center",
  padding: 12,
} as const;

const winH = Dimensions.get("window").height;
const TASK_MODAL_CARD_MAX = Math.min(Math.round(winH * 0.88), 520);
const TASK_MODAL_SCROLL_MAX = Math.max(160, TASK_MODAL_CARD_MAX - 130);

const modalStyle = {
  width: "90%",
  maxWidth: 460,
  borderRadius: 14,
  backgroundColor: "#ffffff",
  padding: 14,
} as const;

const taskModalCardStyle = {
  width: "100%",
  maxWidth: 460,
  maxHeight: TASK_MODAL_CARD_MAX,
  borderRadius: 14,
  backgroundColor: "#ffffff",
  overflow: "hidden" as const,
  borderWidth: 1,
  borderColor: "#e5e7eb",
} as const;

const modalTitle = {
  fontSize: 15,
  fontWeight: "700",
  color: "#0f172a",
  marginBottom: 10,
} as const;

const actionRowStyle = {
  flexDirection: "row",
  justifyContent: "flex-end",
  alignItems: "center",
  columnGap: 12,
  marginTop: 4,
} as const;

function pill(active: boolean) {
  return {
    borderWidth: 1,
    borderColor: active ? "#2563eb" : "#cbd5e1",
    backgroundColor: active ? "#dbeafe" : "#ffffff",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  } as const;
}
function pillText(active: boolean) {
  return { fontSize: 12, color: active ? "#1d4ed8" : "#64748b", fontWeight: "600" as const };
}

const iconBtn = {
  width: 30,
  height: 30,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: "#cbd5e1",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#ffffff",
} as const;

