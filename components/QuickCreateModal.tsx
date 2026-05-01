import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useHomeSchedule, type DayPlanItem } from "@/context/HomeScheduleContext";
import { useTasks, type Subject, type TaskImportance } from "@/context/TasksContext";
import { normalizePlanSpan, spanFromClock } from "@/lib/planTime";

type TopTab = "plan" | "task";
type TaskSub = "new" | "existing";

export type QuickCreateModalProps = {
  visible: boolean;
  onClose: () => void;
  defaultDateKey: string;
  initialHour?: number | null;
  initialTab?: TopTab;
  /** 既存予定の編集（保存で updatePlan） */
  editingPlanId?: string | null;
};

function clampHour(h: number): number {
  if (Number.isNaN(h)) return 9;
  return Math.max(0, Math.min(23, Math.floor(h)));
}

function clampMin(m: number): number {
  if (Number.isNaN(m)) return 0;
  return Math.max(0, Math.min(59, Math.floor(m)));
}

function parseHour(s: string, fallback: number): number {
  const n = parseInt(s, 10);
  return clampHour(Number.isNaN(n) ? fallback : n);
}

function parseMin(s: string, fallback: number): number {
  const n = parseInt(s, 10);
  return clampMin(Number.isNaN(n) ? fallback : n);
}

export function QuickCreateModal({
  visible,
  onClose,
  defaultDateKey,
  initialHour,
  initialTab = "plan",
  editingPlanId,
}: QuickCreateModalProps) {
  const { ensureDayPlans, addPlan, getPlans, updatePlan, deletePlan } = useHomeSchedule();
  const { tasks, addTask, updateTaskSchedule } = useTasks();

  const [tab, setTab] = useState<TopTab>(initialTab);
  const [taskSub, setTaskSub] = useState<TaskSub>("new");

  const [planTitle, setPlanTitle] = useState("");
  const [planSh, setPlanSh] = useState("9");
  const [planSm, setPlanSm] = useState("0");
  const [planEh, setPlanEh] = useState("10");
  const [planEm, setPlanEm] = useState("0");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskHour, setTaskHour] = useState("19");
  const [taskSubject, setTaskSubject] = useState<Subject>("english");
  const [taskImportance, setTaskImportance] = useState<TaskImportance>("B");

  useEffect(() => {
    if (!visible) return;
    setTab(initialTab);
    setTaskSub("new");
    ensureDayPlans(defaultDateKey);
    const h = initialHour != null ? clampHour(initialHour) : 9;
    if (editingPlanId) {
      const list = getPlans(defaultDateKey);
      const p = list.find((x) => x.id === editingPlanId);
      if (p) {
        const n = normalizePlanSpan(p);
        const endIn = Math.max(n.startMin, n.endMinExclusive - 1);
        setPlanTitle(p.title);
        setPlanSh(String(Math.floor(n.startMin / 60)));
        setPlanSm(String(n.startMin % 60));
        setPlanEh(String(Math.floor(endIn / 60)));
        setPlanEm(String(endIn % 60));
        setTab("plan");
      }
    } else {
      setPlanTitle("");
      setPlanSh(String(h));
      setPlanSm("0");
      setPlanEh(String(Math.min(23, h + 1)));
      setPlanEm("0");
    }
    setTaskHour(String(initialHour != null ? clampHour(initialHour) : 19));
    setTaskTitle("");
  }, [visible, defaultDateKey, initialHour, initialTab, ensureDayPlans, editingPlanId, getPlans]);

  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => a.date.localeCompare(b.date) || a.hour - b.hour || a.id.localeCompare(b.id)),
    [tasks]
  );

  const savePlan = () => {
    const sh = parseHour(planSh, 9);
    const sm = parseMin(planSm, 0);
    const eh = parseHour(planEh, 10);
    const em = parseMin(planEm, 0);
    const span = normalizePlanSpan(
      spanFromClock(planTitle.trim() || "予定", sh, sm, eh, em)
    );
    if (editingPlanId) {
      updatePlan(defaultDateKey, editingPlanId, {
        title: span.title,
        startMin: span.startMin,
        endMinExclusive: span.endMinExclusive,
      } as Partial<DayPlanItem>);
    } else {
      addPlan(defaultDateKey, {
        title: span.title,
        startMin: span.startMin,
        endMinExclusive: span.endMinExclusive,
      });
    }
    onClose();
  };

  const saveNewTask = () => {
    addTask({
      title: taskTitle.trim() || "タスク",
      date: defaultDateKey,
      hour: parseHour(taskHour, 19),
      subject: taskSubject,
      importance: taskImportance,
    });
    onClose();
  };

  const pickExisting = (id: string) => {
    updateTaskSchedule(id, defaultDateKey, parseHour(taskHour, 19));
    onClose();
  };

  const removePlan = () => {
    if (editingPlanId) deletePlan(defaultDateKey, editingPlanId);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View
          style={{
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            backgroundColor: "#ffffff",
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 24,
            maxHeight: "88%",
          }}
        >
          <View style={{ flexDirection: "row", marginBottom: 12, backgroundColor: "#f1f5f9", borderRadius: 10, padding: 3 }}>
            {(["plan", "task"] as const).map((k) => (
              <Pressable
                key={k}
                onPress={() => setTab(k)}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: tab === k ? "#ffffff" : "transparent",
                }}
              >
                <Text style={{ textAlign: "center", fontWeight: "700", fontSize: 13, color: tab === k ? "#0f172a" : "#64748b" }}>
                  {k === "plan" ? "予定" : "タスク"}
                </Text>
              </Pressable>
            ))}
          </View>

          {tab === "plan" ? (
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>
                {defaultDateKey} · {editingPlanId ? "予定を編集" : "予定を追加"}（終了の時・分まで含みます）
              </Text>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#334155", marginBottom: 4 }}>内容</Text>
              <TextInput
                value={planTitle}
                onChangeText={setPlanTitle}
                placeholder="例: 睡眠 · 塾"
                placeholderTextColor="#94a3b8"
                style={{
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                  borderRadius: 10,
                  padding: 10,
                  fontSize: 15,
                  marginBottom: 12,
                }}
              />
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#334155", marginBottom: 4 }}>開始（時 / 分）</Text>
              <View style={{ flexDirection: "row", columnGap: 10, marginBottom: 10 }}>
                <TextInput
                  value={planSh}
                  onChangeText={setPlanSh}
                  keyboardType="number-pad"
                  placeholder="0–23"
                  style={{ flex: 1, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, padding: 10, fontSize: 15 }}
                />
                <TextInput
                  value={planSm}
                  onChangeText={setPlanSm}
                  keyboardType="number-pad"
                  placeholder="0–59"
                  style={{ flex: 1, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, padding: 10, fontSize: 15 }}
                />
              </View>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#334155", marginBottom: 4 }}>終了（時 / 分・含む）</Text>
              <View style={{ flexDirection: "row", columnGap: 10, marginBottom: 16 }}>
                <TextInput
                  value={planEh}
                  onChangeText={setPlanEh}
                  keyboardType="number-pad"
                  placeholder="0–23"
                  style={{ flex: 1, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, padding: 10, fontSize: 15 }}
                />
                <TextInput
                  value={planEm}
                  onChangeText={setPlanEm}
                  keyboardType="number-pad"
                  placeholder="0–59"
                  style={{ flex: 1, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, padding: 10, fontSize: 15 }}
                />
              </View>
              <View style={{ flexDirection: "row", columnGap: 10 }}>
                {editingPlanId ? (
                  <Pressable onPress={removePlan} style={{ flex: 1, borderRadius: 12, paddingVertical: 12, backgroundColor: "#fef2f2" }}>
                    <Text style={{ color: "#b91c1c", fontWeight: "800", textAlign: "center", fontSize: 15 }}>削除</Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={savePlan} style={{ flex: 1, backgroundColor: "#2563eb", borderRadius: 12, paddingVertical: 12 }}>
                  <Text style={{ color: "#fff", fontWeight: "800", textAlign: "center", fontSize: 15 }}>保存</Text>
                </Pressable>
              </View>
            </ScrollView>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>{defaultDateKey} のタスク</Text>
              <View style={{ flexDirection: "row", marginBottom: 12, columnGap: 8 }}>
                <Pressable
                  onPress={() => setTaskSub("new")}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 999,
                    backgroundColor: taskSub === "new" ? "#dbeafe" : "#f1f5f9",
                  }}
                >
                  <Text style={{ fontWeight: "700", fontSize: 12, color: taskSub === "new" ? "#1d4ed8" : "#64748b" }}>新規</Text>
                </Pressable>
                <Pressable
                  onPress={() => setTaskSub("existing")}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 999,
                    backgroundColor: taskSub === "existing" ? "#dbeafe" : "#f1f5f9",
                  }}
                >
                  <Text style={{ fontWeight: "700", fontSize: 12, color: taskSub === "existing" ? "#1d4ed8" : "#64748b" }}>既存から配置</Text>
                </Pressable>
              </View>

              <Text style={{ fontSize: 12, fontWeight: "600", color: "#334155", marginBottom: 4 }}>配置する時刻（0〜23）</Text>
              <TextInput
                value={taskHour}
                onChangeText={setTaskHour}
                keyboardType="number-pad"
                style={{ borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, padding: 10, fontSize: 15, marginBottom: 12, maxWidth: 120 }}
              />

              {taskSub === "new" ? (
                <>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#334155", marginBottom: 4 }}>タイトル</Text>
                  <TextInput
                    value={taskTitle}
                    onChangeText={setTaskTitle}
                    placeholder="タスク名"
                    placeholderTextColor="#94a3b8"
                    style={{
                      borderWidth: 1,
                      borderColor: "#e2e8f0",
                      borderRadius: 10,
                      padding: 10,
                      fontSize: 15,
                      marginBottom: 12,
                    }}
                  />
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#334155", marginBottom: 6 }}>科目</Text>
                  <View style={{ flexDirection: "row", columnGap: 8, marginBottom: 12 }}>
                    {(["english", "math"] as const).map((s) => (
                      <Pressable
                        key={s}
                        onPress={() => setTaskSubject(s)}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: taskSubject === s ? "#2563eb" : "#e2e8f0",
                          backgroundColor: taskSubject === s ? "#eff6ff" : "#fff",
                        }}
                      >
                        <Text style={{ fontWeight: "700", fontSize: 12, color: taskSubject === s ? "#1d4ed8" : "#64748b" }}>
                          {s === "english" ? "英語" : "数学"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#334155", marginBottom: 6 }}>重要度</Text>
                  <View style={{ flexDirection: "row", columnGap: 8, marginBottom: 16 }}>
                    {(["A", "B", "C"] as const).map((im) => (
                      <Pressable
                        key={im}
                        onPress={() => setTaskImportance(im)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: taskImportance === im ? "#2563eb" : "#e2e8f0",
                          backgroundColor: taskImportance === im ? "#eff6ff" : "#fff",
                        }}
                      >
                        <Text style={{ fontWeight: "800", fontSize: 12, color: taskImportance === im ? "#1d4ed8" : "#64748b" }}>{im}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable onPress={saveNewTask} style={{ backgroundColor: "#0f766e", borderRadius: 12, paddingVertical: 12 }}>
                    <Text style={{ color: "#fff", fontWeight: "800", textAlign: "center", fontSize: 15 }}>タスクを追加</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>一覧から選ぶと、上記の日付・時刻に移します。</Text>
                  {sortedTasks.map((t) => (
                    <Pressable
                      key={t.id}
                      onPress={() => pickExisting(t.id)}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 8,
                        borderBottomWidth: 1,
                        borderColor: "#f1f5f9",
                      }}
                    >
                      <Text style={{ fontSize: 10, color: "#94a3b8" }}>{t.date} {t.hour}:00</Text>
                      <Text style={{ fontSize: 13, color: "#0f172a", marginTop: 2 }} numberOfLines={2}>
                        {t.title}
                      </Text>
                    </Pressable>
                  ))}
                </>
              )}
            </ScrollView>
          )}

          <Pressable onPress={onClose} style={{ marginTop: 12, paddingVertical: 8 }}>
            <Text style={{ textAlign: "center", color: "#64748b", fontWeight: "600" }}>閉じる</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
