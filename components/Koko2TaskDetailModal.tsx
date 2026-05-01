import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import type { Task, TaskImportance } from "@/context/TasksContext";

const IMPORTANCE_CHOICES: TaskImportance[] = ["A", "B", "C"];

export type Koko2TaskDetailTarget =
  | { kind: "single"; task: Task }
  | { kind: "group"; tasks: Task[]; label: string };

function uniqStrings(vals: (string | undefined)[]): string {
  const s = new Set(vals.map((v) => (v ?? "").trim()));
  if (s.size !== 1) return "";
  return [...s][0] ?? "";
}

function uniqImportance(tasks: Task[]): TaskImportance | null {
  const vals = tasks.map((t) => (t.importance ?? "B") as TaskImportance);
  const s = new Set(vals);
  if (s.size !== 1) return null;
  return [...s][0] ?? null;
}

type Props = {
  target: Koko2TaskDetailTarget | null;
  onClose: () => void;
  updateTask: (id: string, patch: Partial<Omit<Task, "id">>) => void;
};

export function Koko2TaskDetailModal({ target, onClose, updateTask }: Props) {
  const visible = target !== null;
  const isGroup = target?.kind === "group";
  const singleTask = target?.kind === "single" ? target.task : null;
  const groupTasks = target?.kind === "group" ? target.tasks : [];

  const [title, setTitle] = useState("");
  const [importance, setImportance] = useState<TaskImportance>("B");
  const [importanceMixed, setImportanceMixed] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const mark = (key: string) => setTouched((p) => ({ ...p, [key]: true }));

  useEffect(() => {
    if (!target) return;
    setTouched({});
    if (target.kind === "single") {
      const t = target.task;
      setTitle(t.title);
      setImportance((t.importance ?? "B") as TaskImportance);
      setImportanceMixed(false);
      setStartDate((t.startDate ?? t.date ?? "").trim());
      setEndDate((t.endDate ?? t.dueDate ?? "").trim());
      setNotes((t.notes ?? "").trim());
      return;
    }
    const list = target.tasks;
    setTitle(uniqStrings(list.map((t) => t.title)));
    const imp = uniqImportance(list);
    if (imp === null) {
      setImportance("B");
      setImportanceMixed(true);
    } else {
      setImportance(imp);
      setImportanceMixed(false);
    }
    setStartDate(uniqStrings(list.map((t) => (t.startDate ?? t.date ?? "").trim())));
    setEndDate(uniqStrings(list.map((t) => (t.endDate ?? t.dueDate ?? "").trim())));
    setNotes(uniqStrings(list.map((t) => (t.notes ?? "").trim())));
  }, [target]);

  const headerLabel = useMemo(() => {
    if (!target) return "";
    if (target.kind === "single") return "タスクの詳細";
    return `まとめて編集 · ${target.label}（${target.tasks.length}件）`;
  }, [target]);

  const winH = Dimensions.get("window").height;
  const sheetMaxH = Math.round(winH * 0.88);
  const scrollMaxH = Math.max(180, sheetMaxH - 220);

  if (!target) return null;

  const applySingle = () => {
    if (singleTask) {
      const s = startDate.trim() || singleTask.date;
      const e = endDate.trim();
      updateTask(singleTask.id, {
        title: title.trim() || singleTask.title,
        importance,
        startDate: startDate.trim() || undefined,
        endDate: e || undefined,
        date: s,
        dueDate: e || undefined,
        notes: notes.trim() ? notes.trim() : undefined,
      });
    }
    onClose();
  };

  const applyGroup = () => {
    const patch: Partial<Omit<Task, "id">> = {};
    if (touched.title && title.trim()) patch.title = title.trim();
    if (touched.importance) patch.importance = importance;
    if (touched.startDate && startDate.trim()) {
      patch.startDate = startDate.trim();
      patch.date = startDate.trim();
    }
    if (touched.endDate && endDate.trim()) {
      patch.endDate = endDate.trim();
      patch.dueDate = endDate.trim();
    }
    if (touched.notes) patch.notes = notes.trim() ? notes.trim() : undefined;
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    for (const t of groupTasks) {
      updateTask(t.id, patch);
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="閉じる" />
        <View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: 20,
            paddingTop: 16,
            maxHeight: sheetMaxH,
            width: "100%",
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: "800", color: "#0f172a" }}>{headerLabel}</Text>
          {isGroup ? (
            <Text style={{ marginTop: 6, fontSize: 11, color: "#64748b", lineHeight: 16 }}>
              変更したい項目だけ入力してください。空のままにした項目は一括では更新しません（まちまちだった項目は空欄表示）。
            </Text>
          ) : (
            <Text style={{ marginTop: 4, fontSize: 12, color: "#64748b" }} numberOfLines={2}>
              {singleTask?.id}
            </Text>
          )}

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: scrollMaxH }}
            contentContainerStyle={{ paddingBottom: 12 }}
          >
            <Text style={{ marginTop: 16, fontSize: 12, fontWeight: "700", color: "#475569" }}>名称</Text>
            <TextInput
              value={title}
              onChangeText={(v) => {
                setTitle(v);
                mark("title");
              }}
              placeholder={isGroup ? "（まちまちのときは空欄）" : "タスク名"}
              placeholderTextColor="#94a3b8"
              style={{
                marginTop: 8,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 15,
                color: "#0f172a",
              }}
            />

            <Text style={{ marginTop: 18, fontSize: 12, fontWeight: "700", color: "#475569" }}>
              重要度{isGroup && importanceMixed ? "（まちまち）" : ""}
            </Text>
            <View style={{ flexDirection: "row", marginTop: 10, gap: 10 }}>
              {IMPORTANCE_CHOICES.map((c) => {
                const on = importance === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => {
                      setImportance(c);
                      setImportanceMixed(false);
                      mark("importance");
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: on ? "#2563eb" : "#e2e8f0",
                      backgroundColor: on ? "#eff6ff" : "#fff",
                    }}
                  >
                    <Text style={{ textAlign: "center", fontWeight: "800", color: on ? "#1d4ed8" : "#64748b" }}>
                      {c}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={{ marginTop: 18, fontSize: 12, fontWeight: "700", color: "#475569" }}>開始日（YYYY-MM-DD）</Text>
            <TextInput
              value={startDate}
              onChangeText={(v) => {
                setStartDate(v);
                mark("startDate");
              }}
              placeholder={singleTask?.date ?? "2026-04-15"}
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              style={{
                marginTop: 8,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 15,
                color: "#0f172a",
              }}
            />

            <Text style={{ marginTop: 18, fontSize: 12, fontWeight: "700", color: "#475569" }}>終了日（YYYY-MM-DD）</Text>
            <TextInput
              value={endDate}
              onChangeText={(v) => {
                setEndDate(v);
                mark("endDate");
              }}
              placeholder="任意"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              style={{
                marginTop: 8,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 15,
                color: "#0f172a",
              }}
            />

            <Text style={{ marginTop: 18, fontSize: 12, fontWeight: "700", color: "#475569" }}>備考</Text>
            <TextInput
              value={notes}
              onChangeText={(v) => {
                setNotes(v);
                mark("notes");
              }}
              placeholder="メモ・打合せメモなど"
              placeholderTextColor="#94a3b8"
              multiline
              style={{
                marginTop: 8,
                minHeight: 72,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 15,
                color: "#0f172a",
                textAlignVertical: "top",
              }}
            />
          </ScrollView>

          <View
            style={{
              flexDirection: "row",
              marginTop: 12,
              marginBottom: Platform.OS === "ios" ? 24 : 16,
              gap: 12,
              paddingTop: 4,
              borderTopWidth: 1,
              borderTopColor: "#e2e8f0",
            }}
          >
            <Pressable
              onPress={onClose}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                alignItems: "center",
                backgroundColor: "#f8fafc",
              }}
            >
              <Text style={{ fontWeight: "700", color: "#64748b" }}>キャンセル</Text>
            </Pressable>
            <Pressable
              onPress={isGroup ? applyGroup : applySingle}
              style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: "#2563eb", alignItems: "center" }}
            >
              <Text style={{ fontWeight: "800", color: "#fff" }}>保存</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
