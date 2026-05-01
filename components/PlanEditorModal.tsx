import { useEffect, useState, type ReactNode } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  Switch,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, X } from "lucide-react-native";
import type { DayPlanItem } from "@/context/HomeScheduleContext";
import { makeDateKey } from "@/context/TasksContext";
import { normalizePlanSpan, spanFromClock, planSpanFromLoose } from "@/lib/planTime";

export type PlanEditorCommit = {
  title: string;
  allDay: boolean;
  startMin: number;
  endMinExclusive: number;
  /** 予定が属する日（開始・終了の日付はこれに揃える） */
  dateKey: string;
};

type PlanEditorModalProps = {
  visible: boolean;
  onClose: () => void;
  dateKey: string;
  initialPlan: DayPlanItem | null;
  /** true のとき日付UIを隠す（曜日単位編集など） */
  hideDateControls?: boolean;
  onSave: (payload: PlanEditorCommit) => void;
  onDelete?: () => void;
  bannerText?: string | null;
  extraFooter?: ReactNode;
};

const DAY_WD = ["日", "月", "火", "水", "木", "金", "土"];

function formatDateJaPlain(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map((v) => parseInt(v, 10));
  return `${y}年${m}月${d}日`;
}

function parseYmd(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map((v) => parseInt(v, 10));
  return { y, m0: m - 1, d };
}

/** 当月のみ。先頭は null で埋め、末尾も null で 7 の倍数に */
function buildSimpleMonth(year: number, month0: number): (number | null)[][] {
  const firstWd = new Date(year, month0, 1).getDay();
  const dim = new Date(year, month0 + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWd; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function clampH(n: number) {
  return Math.max(0, Math.min(23, n));
}
function clampM(n: number) {
  return Math.max(0, Math.min(59, n));
}

export function PlanEditorModal({
  visible,
  onClose,
  dateKey,
  initialPlan,
  hideDateControls = false,
  onSave,
  onDelete,
  bannerText,
  extraFooter,
}: PlanEditorModalProps) {
  const [title, setTitle] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [sh, setSh] = useState("9");
  const [sm, setSm] = useState("0");
  const [eh, setEh] = useState("10");
  const [em, setEm] = useState("0");
  const [planDateKey, setPlanDateKey] = useState(dateKey);
  const [miniCalOpen, setMiniCalOpen] = useState(false);
  const [calY, setCalY] = useState(() => parseYmd(dateKey).y);
  const [calM0, setCalM0] = useState(() => parseYmd(dateKey).m0);

  const canEditDate = !hideDateControls && !initialPlan?.id.includes("-rec-");

  useEffect(() => {
    if (!visible) return;
    setPlanDateKey(dateKey);
    if (initialPlan) {
      const n = normalizePlanSpan(planSpanFromLoose(initialPlan));
      const endIn = Math.max(n.startMin, n.endMinExclusive - 1);
      setTitle(n.title);
      const full =
        initialPlan.allDay === true || (n.startMin <= 0 && n.endMinExclusive >= 24 * 60);
      setAllDay(!!full);
      if (full) {
        setSh("0");
        setSm("0");
        setEh("23");
        setEm("59");
      } else {
        setSh(String(Math.floor(n.startMin / 60)));
        setSm(String(n.startMin % 60));
        setEh(String(Math.floor(endIn / 60)));
        setEm(String(endIn % 60));
      }
    } else {
      setTitle("");
      setAllDay(false);
      setSh("9");
      setSm("0");
      setEh("10");
      setEm("0");
    }
  }, [visible, dateKey, initialPlan]);

  const openMiniCalendar = () => {
    if (!canEditDate) return;
    const { y, m0 } = parseYmd(planDateKey);
    setCalY(y);
    setCalM0(m0);
    setMiniCalOpen(true);
  };

  const doSave = () => {
    if (allDay) {
      onSave({
        title: title.trim() || "予定",
        allDay: true,
        startMin: 0,
        endMinExclusive: 24 * 60,
        dateKey: planDateKey,
      });
      return;
    }
    const shn = clampH(parseInt(sh, 10) || 0);
    const smn = clampM(parseInt(sm, 10) || 0);
    const ehn = clampH(parseInt(eh, 10) || 0);
    const emn = clampM(parseInt(em, 10) || 0);
    const span = normalizePlanSpan(spanFromClock(title.trim() || "予定", shn, smn, ehn, emn));
    onSave({
      title: span.title,
      allDay: false,
      startMin: span.startMin,
      endMinExclusive: span.endMinExclusive,
      dateKey: planDateKey,
    });
  };

  const shiftMonth = (delta: number) => {
    const dt = new Date(calY, calM0 + delta, 1);
    setCalY(dt.getFullYear());
    setCalM0(dt.getMonth());
  };

  const weeks = buildSimpleMonth(calY, calM0);

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }} edges={["top"]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 8,
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: "#e5e7eb",
              }}
            >
              <Pressable onPress={onClose} hitSlop={12} style={{ padding: 8 }}>
                <X size={24} color="#0f172a" />
              </Pressable>
              <View style={{ flex: 1 }} />
              <Pressable onPress={doSave} style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
                <Text style={{ fontSize: 17, fontWeight: "600", color: "#2563eb" }}>保存</Text>
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 48 }}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="タイトル"
                placeholderTextColor="#94a3b8"
                style={{ fontSize: 24, fontWeight: "700", color: "#0f172a", paddingVertical: 6 }}
              />
              {bannerText ? (
                <Text style={{ marginTop: 10, fontSize: 12, color: "#64748b", lineHeight: 18 }}>{bannerText}</Text>
              ) : null}

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 28,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: "#e5e7eb",
                }}
              >
                <Text style={{ fontSize: 16, color: "#0f172a" }}>終日</Text>
                <Switch value={allDay} onValueChange={setAllDay} />
              </View>

              <Text style={{ marginTop: 20, fontSize: 13, fontWeight: "600", color: "#64748b" }}>開始</Text>
              <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                {!hideDateControls ? (
                  <Pressable
                    onPress={openMiniCalendar}
                    disabled={!canEditDate}
                    style={{
                      backgroundColor: canEditDate ? "#e0f2fe" : "#f1f5f9",
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderWidth: 1,
                      borderColor: canEditDate ? "#38bdf8" : "#e2e8f0",
                      opacity: canEditDate ? 1 : 0.55,
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: "600", color: "#0f172a" }}>
                      {formatDateJaPlain(planDateKey)}
                    </Text>
                  </Pressable>
                ) : null}
                {!allDay ? (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TextInput
                      value={sh}
                      onChangeText={setSh}
                      keyboardType="number-pad"
                      placeholder="時"
                      style={{
                        width: 44,
                        borderWidth: 1,
                        borderColor: "#2563eb",
                        borderRadius: 10,
                        padding: 10,
                        fontSize: 16,
                        fontWeight: "700",
                        textAlign: "center",
                        color: "#0f172a",
                      }}
                    />
                    <TextInput
                      value={sm}
                      onChangeText={setSm}
                      keyboardType="number-pad"
                      placeholder="分"
                      style={{
                        width: 44,
                        borderWidth: 1,
                        borderColor: "#e2e8f0",
                        borderRadius: 10,
                        padding: 10,
                        fontSize: 16,
                        textAlign: "center",
                        color: "#0f172a",
                      }}
                    />
                  </View>
                ) : null}
              </View>

              <Text style={{ marginTop: 22, fontSize: 13, fontWeight: "600", color: "#64748b" }}>終了</Text>
              <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                {!hideDateControls ? (
                  <Pressable
                    onPress={openMiniCalendar}
                    disabled={!canEditDate}
                    style={{
                      backgroundColor: canEditDate ? "#e0f2fe" : "#f1f5f9",
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderWidth: 1,
                      borderColor: canEditDate ? "#38bdf8" : "#e2e8f0",
                      opacity: canEditDate ? 1 : 0.55,
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: "600", color: "#0f172a" }}>
                      {formatDateJaPlain(planDateKey)}
                    </Text>
                  </Pressable>
                ) : null}
                {!allDay ? (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TextInput
                      value={eh}
                      onChangeText={setEh}
                      keyboardType="number-pad"
                      style={{
                        width: 44,
                        borderWidth: 1,
                        borderColor: "#e2e8f0",
                        borderRadius: 10,
                        padding: 10,
                        fontSize: 16,
                        fontWeight: "700",
                        textAlign: "center",
                        color: "#0f172a",
                      }}
                    />
                    <TextInput
                      value={em}
                      onChangeText={setEm}
                      keyboardType="number-pad"
                      style={{
                        width: 44,
                        borderWidth: 1,
                        borderColor: "#e2e8f0",
                        borderRadius: 10,
                        padding: 10,
                        fontSize: 16,
                        textAlign: "center",
                        color: "#0f172a",
                      }}
                    />
                  </View>
                ) : null}
              </View>

              {extraFooter}

              {initialPlan && onDelete ? (
                <Pressable
                  onPress={onDelete}
                  style={{ marginTop: 36, alignSelf: "center", paddingVertical: 12 }}
                >
                  <Text style={{ fontSize: 16, fontWeight: "600", color: "#dc2626" }}>この予定を削除</Text>
                </Pressable>
              ) : null}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={miniCalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMiniCalOpen(false)}
      >
        <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
          <Pressable
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15,23,42,0.4)" }}
            onPress={() => setMiniCalOpen(false)}
          />
          <View
            style={{
              alignSelf: "center",
              width: "100%",
              maxWidth: 340,
              borderRadius: 16,
              backgroundColor: "#ffffff",
              padding: 14,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#0f172a", marginBottom: 10 }}>日付を選ぶ</Text>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <Pressable
                onPress={() => shiftMonth(-1)}
                style={{ padding: 8, borderRadius: 8, backgroundColor: "#f1f5f9" }}
              >
                <ChevronLeft size={22} color="#334155" />
              </Pressable>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#0f172a" }}>
                {calY}年 {calM0 + 1}月
              </Text>
              <Pressable
                onPress={() => shiftMonth(1)}
                style={{ padding: 8, borderRadius: 8, backgroundColor: "#f1f5f9" }}
              >
                <ChevronRight size={22} color="#334155" />
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", marginBottom: 6 }}>
              {DAY_WD.map((w) => (
                <View key={w} style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: "#64748b" }}>{w}</Text>
                </View>
              ))}
            </View>
            {weeks.map((row, ri) => (
              <View key={ri} style={{ flexDirection: "row" }}>
                {row.map((day, ci) => {
                  const key = day != null ? makeDateKey(calY, calM0, day) : "";
                  const sel = day != null && key === planDateKey;
                  return (
                    <View key={ci} style={{ flex: 1, aspectRatio: 1, maxHeight: 40, padding: 2 }}>
                      {day != null ? (
                        <Pressable
                          onPress={() => {
                            setPlanDateKey(key);
                            setMiniCalOpen(false);
                          }}
                          style={{
                            flex: 1,
                            borderRadius: 999,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: sel ? "#2563eb" : "transparent",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: sel ? "#ffffff" : "#0f172a",
                            }}
                          >
                            {day}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ))}
            <Pressable
              onPress={() => setMiniCalOpen(false)}
              style={{ marginTop: 12, alignSelf: "center", paddingVertical: 10 }}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#2563eb" }}>閉じる</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
