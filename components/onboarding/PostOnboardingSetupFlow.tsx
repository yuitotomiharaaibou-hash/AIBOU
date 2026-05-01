import { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, Modal, TextInput } from "react-native";
import { Plus, ChevronRight } from "lucide-react-native";
import { makeDateKey, useTasks, type TaskImportance } from "@/context/TasksContext";
import { useHomeSchedule, type DayPlanItem } from "@/context/HomeScheduleContext";
import { formatPlanRangeLabel, planSpanFromLoose } from "@/lib/planTime";
import { PlanEditorModal } from "@/components/PlanEditorModal";
import { PRIMARY, UI_BORDER, UI_MUTED, UI_TEXT, UI_TEXT_SECONDARY } from "@/constants/theme";

type Props = {
  bottomPad: number;
  onComplete: () => void;
};

const STAGES = ["1週間の予定確認", "タスクリスト調整", "期限・重要度設定", "時間帯の好み"] as const;
const DAY = ["日", "月", "火", "水", "木", "金", "土"];
const PREF_BUCKETS = ["特になし", "朝", "昼", "夕方", "夜"] as const;
type PrefBucket = (typeof PREF_BUCKETS)[number];

function todayKey() {
  const d = new Date();
  return makeDateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

function weekSundayBase(): Date {
  const d = new Date();
  const w = d.getDay();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - w);
}

function addDate(base: Date, offset: number): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset);
  return makeDateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

function coarseTaskLabel(title: string): string {
  const t = (title ?? "")
    .replace(/（[^）]*）/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/No\.?\d+/gi, "")
    .replace(/§\s*\d+/g, "")
    .replace(/第?\d+回/g, "")
    .replace(/第?\d+週/g, "")
    .replace(/W\d+/gi, "")
    .replace(/\d+\/\d+/g, "")
    .replace(/[0-9]+-[0-9]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return t || "タスク";
}

function normalizeSummaryTitle(title: string): string | null {
  const t = coarseTaskLabel(title);
  if (!t) return null;
  if (t.includes("宿題")) {
    if (t.includes("リスニング")) return "宿題（リスニング）";
    if (t.includes("英作文")) return "宿題（英作文）";
    if (t.includes("文法")) return "宿題（文法）";
    if (t.includes("解釈")) return "宿題（解釈）";
    if (t.includes("語彙")) return "宿題（語彙）";
    if (t.includes("数学")) return "宿題（数学）";
    return "宿題（その他）";
  }
  if (t.includes("鉄壁")) return t;
  if (t.includes("英文解釈")) return t;
  if (t.includes("テーマ英作文")) return t;
  if (t.includes("英文法")) return t;
  if (t.includes("例題") || t.includes("数学")) return t;
  if (t.includes("校内模試")) return "校内模試対策";
  if (t.includes("長文")) return t;
  if (t.includes("計算")) return t;
  return null;
}

function isValidDateKey(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function addDaysToKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map((v) => parseInt(v, 10));
  const dt = new Date(y, m - 1, d + days);
  return makeDateKey(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

export function PostOnboardingSetupFlow({ bottomPad, onComplete }: Props) {
  const [stage, setStage] = useState(0);
  const [focusDate, setFocusDate] = useState(todayKey());
  const [weekdayPickOpen, setWeekdayPickOpen] = useState(false);
  const [planEditorOpen, setPlanEditorOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<DayPlanItem | null>(null);
  const [prefMap, setPrefMap] = useState<Record<string, PrefBucket>>({});
  const [selectedPrefTaskId, setSelectedPrefTaskId] = useState<string | null>(null);
  const [syncedTitleOnce, setSyncedTitleOnce] = useState<Record<string, true>>({});
  const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null);
  const [groupTitleDraft, setGroupTitleDraft] = useState("");
  const [groupImportanceDraft, setGroupImportanceDraft] = useState<TaskImportance>("B");
  const [groupStartDateDraft, setGroupStartDateDraft] = useState(todayKey());
  const [groupDueDateDraft, setGroupDueDateDraft] = useState(addDaysToKey(todayKey(), 6));
  const { getPlans, ensureDayPlans, updatePlan, deletePlan, addPlan } = useHomeSchedule();
  const { tasks, updateTask } = useTasks();

  const weekKeys = useMemo(() => {
    const base = weekSundayBase();
    return Array.from({ length: 7 }, (_v, i) => addDate(base, i));
  }, []);

  useEffect(() => {
    weekKeys.forEach((k) => ensureDayPlans(k));
  }, [ensureDayPlans, weekKeys]);

  useEffect(() => {
    for (const t of tasks) {
      const patch: Partial<{ importance: TaskImportance; startDate: string; dueDate: string; endDate: string }> = {};
      if (!t.importance) patch.importance = "B";
      if (!t.startDate) patch.startDate = t.date;
      if (!t.dueDate || t.dueDate === t.date) patch.dueDate = addDaysToKey(t.date, 6);
      if (!t.endDate || t.endDate === t.date) patch.endDate = (t.dueDate && t.dueDate !== t.date) ? t.dueDate : addDaysToKey(t.date, 6);
      if (Object.keys(patch).length > 0) updateTask(t.id, patch);
    }
  }, [tasks, updateTask]);

  const weekBody = (
    <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 86 }}>
      {weekKeys.map((k, i) => {
        const plans = getPlans(k).sort((a, b) => a.startMin - b.startMin);
        return (
          <View key={k} style={{ marginBottom: 12, borderWidth: 1, borderColor: UI_BORDER, borderRadius: 12, backgroundColor: "#fff", padding: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: UI_TEXT }}>{DAY[i]}</Text>
            {plans.length === 0 ? (
              <Text style={{ marginTop: 6, color: UI_TEXT_SECONDARY, fontSize: 12 }}>予定なし</Text>
            ) : (
              plans.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    setFocusDate(k);
                    setEditingPlan(p);
                    setPlanEditorOpen(true);
                  }}
                  style={{ marginTop: 6, borderWidth: 1, borderColor: "#dbeafe", backgroundColor: "#eff6ff", borderRadius: 8, padding: 8 }}
                >
                  <Text style={{ fontSize: 11, color: "#1d4ed8", fontWeight: "700" }}>{formatPlanRangeLabel(planSpanFromLoose(p))}</Text>
                  <Text style={{ fontSize: 13, color: "#1e3a8a", marginTop: 2 }}>{p.title}</Text>
                </Pressable>
              ))
            )}
          </View>
        );
      })}
    </ScrollView>
  );

  const summaryRows = useMemo(() => {
    const map = new Map<
      string,
      { key: string; title: string; count: number; taskIds: string[]; representativeTaskId: string; importance: TaskImportance; startDate: string; dueDate: string }
    >();
    for (const t of tasks) {
      const normalized = normalizeSummaryTitle(t.title);
      if (!normalized) continue;
      const key = normalized;
      const prev = map.get(key);
      if (prev) {
        prev.count += 1;
        prev.taskIds.push(t.id);
      } else {
        map.set(key, {
          key,
          title: normalized,
          count: 1,
          taskIds: [t.id],
          representativeTaskId: t.id,
          importance: (t.importance ?? "B") as TaskImportance,
          startDate: t.startDate ?? t.date,
          dueDate: t.dueDate ?? addDaysToKey(t.date, 6),
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
  }, [tasks]);

  useEffect(() => {
    const next: Record<string, PrefBucket> = {};
    summaryRows.forEach((g) => {
      const id = g.representativeTaskId;
      next[id] = prefMap[id] ?? "特になし";
    });
    setPrefMap(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryRows.length]);

  const openGroupEditor = (groupKey: string) => {
    const g = summaryRows.find((x) => x.key === groupKey);
    if (!g) return;
    setEditingGroupKey(groupKey);
    setGroupTitleDraft(g.title);
    setGroupImportanceDraft(g.importance);
    setGroupStartDateDraft(g.startDate);
    setGroupDueDateDraft(g.dueDate);
  };

  const saveGroupEditor = () => {
    if (!editingGroupKey) return;
    const g = summaryRows.find((x) => x.key === editingGroupKey);
    if (!g) {
      setEditingGroupKey(null);
      return;
    }
    const startDate = isValidDateKey(groupStartDateDraft) ? groupStartDateDraft : g.startDate;
    const dueDate = isValidDateKey(groupDueDateDraft) ? groupDueDateDraft : g.dueDate;
    for (const id of g.taskIds) {
      updateTask(id, {
        title: groupTitleDraft.trim() || g.title,
        importance: groupImportanceDraft,
        startDate,
        dueDate,
        endDate: dueDate,
      });
    }
    setEditingGroupKey(null);
  };

  const taskBody = (
    <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 86 }}>
      <View style={{ borderWidth: 1, borderColor: UI_BORDER, borderRadius: 12, backgroundColor: "#fff", padding: 10, marginBottom: 10 }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: UI_TEXT }}>週あたりの宿題イメージ</Text>
        <Text style={{ marginTop: 4, fontSize: 12, color: UI_TEXT_SECONDARY }}>
          下は最小単位ではなく、教材・目的ベースでまとめた表示です。
        </Text>
      </View>
      {summaryRows.map((row) => (
        <Pressable
          key={row.key}
          onPress={() => openGroupEditor(row.key)}
          style={{ borderWidth: 1, borderColor: UI_BORDER, backgroundColor: "#fff", borderRadius: 10, padding: 10, marginBottom: 8 }}
        >
          <Text style={{ fontSize: 14, color: UI_TEXT, fontWeight: "700" }}>{row.title}</Text>
        </Pressable>
      ))}
      <View style={{ marginTop: 8 }}>
        <Text style={{ fontSize: 12, color: UI_TEXT_SECONDARY }}>
          追加は右下の + から行えます。教材粒度の大きいタスクだけをここで調整します。
        </Text>
      </View>
    </ScrollView>
  );

  const timelineBody = (
    <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 86 }}>
      {summaryRows.map((g) => (
        <Pressable
          key={g.key}
          onPress={() => openGroupEditor(g.key)}
          style={{ borderWidth: 1, borderColor: UI_BORDER, backgroundColor: "#fff", borderRadius: 10, padding: 10, marginBottom: 8 }}
        >
          <Text style={{ fontSize: 14, color: UI_TEXT, fontWeight: "700" }}>{g.title}</Text>
          <View style={{ flexDirection: "row", marginTop: 8, gap: 6 }}>
            {(["A", "B", "C"] as TaskImportance[]).map((imp) => (
              <Pressable
                key={imp}
                onPress={() => {
                  for (const id of g.taskIds) updateTask(id, { importance: imp });
                }}
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: g.importance === imp ? PRIMARY : UI_BORDER, backgroundColor: g.importance === imp ? "#dbeafe" : UI_MUTED }}
              >
                <Text style={{ color: g.importance === imp ? "#1d4ed8" : UI_TEXT_SECONDARY, fontSize: 12, fontWeight: "700" }}>{imp}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={{ marginTop: 6, fontSize: 11, color: UI_TEXT_SECONDARY }}>開始: {g.startDate}</Text>
          <Text style={{ marginTop: 2, fontSize: 11, color: UI_TEXT_SECONDARY }}>期限: {g.dueDate}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  const prefTasks = summaryRows.map((g) => ({
    id: g.representativeTaskId,
    key: g.key,
    title: g.title,
  }));
  const prefBody = (
    <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 86 }}>
      <View style={{ borderWidth: 1, borderColor: UI_BORDER, borderRadius: 12, backgroundColor: "#fff", padding: 10, marginBottom: 10 }}>
        <Text style={{ fontSize: 13, color: UI_TEXT_SECONDARY }}>
          まず「特になし」のタスクをタップして選択し、移動先の時間帯をタップしてください。
        </Text>
      </View>
      {PREF_BUCKETS.map((bucket) => (
        <Pressable
          key={bucket}
          onPress={() => {
            if (!selectedPrefTaskId) return;
            setPrefMap((prev) => ({ ...prev, [selectedPrefTaskId]: bucket }));
          }}
          style={{ marginBottom: 12, borderWidth: 1, borderColor: UI_BORDER, borderRadius: 10, backgroundColor: "#fff", padding: 10 }}
        >
          <Text style={{ fontSize: 13, color: UI_TEXT, fontWeight: "700" }}>{bucket}</Text>
          <View style={{ flexDirection: "column", marginTop: 8, rowGap: 6 }}>
            {prefTasks.filter((t) => (prefMap[t.id] ?? "特になし") === bucket).map((t) => (
              <Pressable
                key={t.id}
                onPress={() => {
                  if (bucket === "特になし") setSelectedPrefTaskId(t.id);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: selectedPrefTaskId === t.id ? PRIMARY : "#bfdbfe",
                  backgroundColor: selectedPrefTaskId === t.id ? "#dbeafe" : "#eff6ff",
                  borderRadius: 10,
                  padding: 8,
                }}
              >
                <Text style={{ flex: 1, fontSize: 12, color: "#1e3a8a" }} numberOfLines={1}>
                  {t.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );

  const body = [weekBody, taskBody, timelineBody, prefBody][stage];

  const onPlus = () => {
    if (stage === 0) {
      setWeekdayPickOpen(true);
      return;
    }
    if (stage === 1) return;
  };

  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 8 }}>
      <Text style={{ fontSize: 20, fontWeight: "800", color: UI_TEXT }}>{STAGES[stage]}</Text>
      <Text style={{ marginTop: 6, fontSize: 13, color: UI_TEXT_SECONDARY }}>
        {stage === 0 && "一般的な1週間（日〜土）を表示します。タップで編集、＋で追加できます。"}
        {stage === 1 && "最小単位ではなく、ざっくりした教材単位で確認します。"}
        {stage === 2 && "重要度・期限はアプリ提案を初期値にし、必要なら編集します（この画面では追加しません）。"}
        {stage === 3 && "タスク選択→移動先時間帯タップで分類します。"}
      </Text>
      <View style={{ flex: 1, marginTop: 10 }}>{body}</View>

      {stage === 0 || stage === 1 ? (
        <View style={{ position: "absolute", right: 20, bottom: bottomPad + 74 }}>
          <Pressable onPress={onPlus} style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: "#0ea5e9", alignItems: "center", justifyContent: "center" }}>
            <Plus size={24} color="#fff" />
          </Pressable>
        </View>
      ) : null}
      <View style={{ position: "absolute", right: 20, bottom: bottomPad + 8 }}>
        <Pressable
          onPress={() => {
            if (stage >= STAGES.length - 1) onComplete();
            else setStage((p) => p + 1);
          }}
          style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center" }}
        >
          <ChevronRight size={28} color="#fff" />
        </Pressable>
      </View>

      <PlanEditorModal
        visible={planEditorOpen}
        onClose={() => setPlanEditorOpen(false)}
        dateKey={focusDate}
        initialPlan={editingPlan}
        hideDateControls={!!editingPlan}
        onSave={(p) => {
          if (!editingPlan) {
            addPlan(p.dateKey, {
              title: p.title,
              allDay: p.allDay,
              startMin: p.startMin,
              endMinExclusive: p.endMinExclusive,
            });
          } else {
            updatePlan(focusDate, editingPlan.id, {
              title: p.title,
              allDay: p.allDay,
              startMin: p.startMin,
              endMinExclusive: p.endMinExclusive,
            });
            if (!syncedTitleOnce[editingPlan.title]) {
              for (const dk of weekKeys) {
                const peers = getPlans(dk).filter((x) => x.id !== editingPlan.id && x.title === editingPlan.title);
                for (const peer of peers) {
                  updatePlan(dk, peer.id, {
                    title: p.title,
                    allDay: p.allDay,
                    startMin: p.startMin,
                    endMinExclusive: p.endMinExclusive,
                  });
                }
              }
              setSyncedTitleOnce((prev) => ({ ...prev, [editingPlan.title]: true }));
            }
          }
          setPlanEditorOpen(false);
        }}
        onDelete={
          editingPlan
            ? () => {
                deletePlan(focusDate, editingPlan.id);
                setPlanEditorOpen(false);
              }
            : undefined
        }
      />
      {weekdayPickOpen ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: "rgba(15,23,42,0.35)",
            justifyContent: "center",
            paddingHorizontal: 18,
          }}
        >
          <View style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: UI_BORDER, padding: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: UI_TEXT, marginBottom: 8 }}>追加する曜日を選択</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {DAY.map((d, i) => (
                <Pressable
                  key={d}
                  onPress={() => {
                    setFocusDate(weekKeys[i]);
                    setEditingPlan(null);
                    setWeekdayPickOpen(false);
                    setPlanEditorOpen(true);
                  }}
                  style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: UI_BORDER, backgroundColor: "#fff" }}
                >
                  <Text style={{ fontSize: 12, color: UI_TEXT }}>{d}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => setWeekdayPickOpen(false)} style={{ marginTop: 10, alignSelf: "flex-end", paddingHorizontal: 10, paddingVertical: 6 }}>
              <Text style={{ color: UI_TEXT_SECONDARY, fontSize: 12 }}>キャンセル</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <Modal visible={editingGroupKey != null} transparent animationType="fade" onRequestClose={() => setEditingGroupKey(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.35)", justifyContent: "center", paddingHorizontal: 16 }}>
          <View style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: UI_BORDER, padding: 12, maxHeight: "84%" }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: UI_TEXT, marginBottom: 8 }}>タスク編集</Text>
            <TextInput
              value={groupTitleDraft}
              onChangeText={setGroupTitleDraft}
              placeholder="タスク名"
              style={{ borderWidth: 1, borderColor: UI_BORDER, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: UI_TEXT }}
            />
            <Text style={{ marginTop: 10, fontSize: 12, color: UI_TEXT_SECONDARY }}>重要度</Text>
            <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
              {(["A", "B", "C"] as TaskImportance[]).map((imp) => (
                <Pressable
                  key={imp}
                  onPress={() => setGroupImportanceDraft(imp)}
                  style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: groupImportanceDraft === imp ? PRIMARY : UI_BORDER, backgroundColor: groupImportanceDraft === imp ? "#dbeafe" : UI_MUTED }}
                >
                  <Text style={{ color: groupImportanceDraft === imp ? "#1d4ed8" : UI_TEXT_SECONDARY, fontSize: 12, fontWeight: "700" }}>{imp}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={{ marginTop: 10, fontSize: 12, color: UI_TEXT_SECONDARY }}>開始日</Text>
            <TextInput
              value={groupStartDateDraft}
              onChangeText={setGroupStartDateDraft}
              placeholder="2026-05-01"
              style={{ marginTop: 6, borderWidth: 1, borderColor: UI_BORDER, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: UI_TEXT }}
            />

            <Text style={{ marginTop: 6, fontSize: 12, color: UI_TEXT_SECONDARY }}>期限日</Text>
            <TextInput
              value={groupDueDateDraft}
              onChangeText={setGroupDueDateDraft}
              placeholder="2026-05-08"
              style={{ marginTop: 6, borderWidth: 1, borderColor: UI_BORDER, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: UI_TEXT }}
            />

            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
              <Pressable onPress={() => setEditingGroupKey(null)} style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ fontSize: 12, color: UI_TEXT_SECONDARY }}>キャンセル</Text>
              </Pressable>
              <Pressable onPress={saveGroupEditor} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: PRIMARY }}>
                <Text style={{ fontSize: 12, color: "#fff", fontWeight: "700" }}>保存</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

