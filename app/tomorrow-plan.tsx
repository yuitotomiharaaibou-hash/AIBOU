import { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CheckSquare, ChevronDown, ChevronLeft, ChevronUp, Square } from "lucide-react-native";
import {
  PRIMARY,
  UI_BORDER,
  UI_MUTED,
  UI_RADIUS_LG,
  UI_RADIUS_MD,
  UI_SCREEN,
  UI_SURFACE,
  UI_TEXT,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY,
  uiCardShadow,
} from "@/constants/theme";
import { useTasks, getTodayKey } from "@/context/TasksContext";
import { useJudgmentRules } from "@/context/JudgmentRulesContext";
import { getTomorrowKey, type TomorrowHearing } from "@/lib/tomorrowPlan";
import { simpleStorageGet, simpleStorageSet } from "@/lib/simpleStorage";

function monthDayLabel(dateKey: string): string {
  const [, m, d] = dateKey.split("-");
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}

function addDaysKey(baseKey: string, add: number): string {
  const [y, mo, da] = baseKey.split("-").map((v) => parseInt(v, 10));
  const dt = new Date(y, mo - 1, da);
  dt.setDate(dt.getDate() + add);
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

export default function TomorrowPlanScreen() {
  const router = useRouter();
  const { tasks, proposeTomorrowPlan, toggleTask } = useTasks();
  const { items, approvePendingByIds, approveAllPending } = useJudgmentRules();
  const [step, setStep] = useState(0);
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(() => new Set());
  const [hearingBusy, setHearingBusy] = useState<0 | 1 | 2>(1);
  const [hearingLate, setHearingLate] = useState(false);
  const [hearingSubject, setHearingSubject] = useState<"english" | "math" | "balance">("balance");
  const [autoTomorrow, setAutoTomorrow] = useState(true);
  const [flowHintOpen, setFlowHintOpen] = useState(false);
  const [ruleDetailId, setRuleDetailId] = useState<string | null>(null);

  const todayKey = getTodayKey();
  const tomorrowKey = useMemo(() => getTomorrowKey(), [todayKey]);

  const pendingRules = items.filter((i) => i.status === "pending");
  const todayTasksOrdered = useMemo(() => {
    const list = tasks.filter((t) => t.date === todayKey);
    return [...list].sort((a, b) => (a.hour ?? 0) - (b.hour ?? 0));
  }, [tasks, todayKey]);

  const pendingIdsKey = pendingRules.map((r) => r.id).join(",");

  useEffect(() => {
    setSelectedRuleIds(new Set());
  }, [pendingIdsKey]);

  const toggleRuleSelect = (id: string) => {
    setSelectedRuleIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const approveSelectedRules = () => {
    const ids = [...selectedRuleIds];
    if (ids.length === 0) return;
    approvePendingByIds(ids);
    setSelectedRuleIds(new Set());
  };

  const calendarPreview = useMemo(() => {
    const rows: { key: string; n: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const k = addDaysKey(todayKey, i);
      const n = tasks.filter((t) => t.date === k).length;
      rows.push({ key: k, n });
    }
    return rows;
  }, [tasks, todayKey]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const raw = await simpleStorageGet("aibou.tomorrow.autoEnabled");
      if (mounted) setAutoTomorrow(raw !== "0");
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const persistAuto = async (v: boolean) => {
    setAutoTomorrow(v);
    await simpleStorageSet("aibou.tomorrow.autoEnabled", v ? "1" : "0");
  };

  const finishWithProposal = () => {
    const hearing: TomorrowHearing = {
      busy: hearingBusy,
      lateStart: hearingLate,
      subjectLean: hearingSubject,
    };
    proposeTomorrowPlan(hearing);
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: UI_SCREEN }} edges={["top"]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: UI_BORDER,
          backgroundColor: UI_SCREEN,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center", paddingVertical: 4, paddingRight: 12 }}
        >
          <ChevronLeft size={26} color={UI_TEXT} strokeWidth={2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: UI_TEXT_TERTIARY }}>明日の予定</Text>
          <Text style={{ fontSize: 18, fontWeight: "700", color: UI_TEXT, marginTop: 2, letterSpacing: -0.3 }}>
            {monthDayLabel(tomorrowKey)}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => setFlowHintOpen((v) => !v)}
          style={{
            marginBottom: 18,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: UI_RADIUS_MD,
            backgroundColor: UI_MUTED,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: UI_TEXT, flex: 1 }}>
            4ステップ · いつでも次へOK{flowHintOpen ? "" : " · くわしく"}
          </Text>
          {flowHintOpen ? (
            <ChevronUp size={18} color={UI_TEXT_SECONDARY} strokeWidth={2} />
          ) : (
            <ChevronDown size={18} color={UI_TEXT_SECONDARY} strokeWidth={2} />
          )}
        </Pressable>
        {flowHintOpen ? (
          <Text style={{ fontSize: 13, color: UI_TEXT_SECONDARY, marginBottom: 18, lineHeight: 19 }}>
            ルール → 今日のタスク → 7日の件数 → 明日のイメージの順です。
          </Text>
        ) : null}

        {step === 0 && (
          <View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: UI_TEXT, marginBottom: 8, letterSpacing: -0.4 }}>
              1. ルール
            </Text>
            <Text style={{ fontSize: 13, color: UI_TEXT_SECONDARY, marginBottom: 14 }}>
              チェックした分だけ承認 · 詳細は「くわしく」
            </Text>
            {pendingRules.length === 0 ? (
              <Text style={{ fontSize: 14, color: UI_TEXT_TERTIARY, marginBottom: 16 }}>承認待ちなし</Text>
            ) : (
              <View style={{ marginBottom: 16 }}>
                {pendingRules.map((r) => {
                  const on = selectedRuleIds.has(r.id);
                  const detailOpen = ruleDetailId === r.id;
                  return (
                    <View
                      key={r.id}
                      style={{
                        marginBottom: 10,
                        borderRadius: UI_RADIUS_LG,
                        borderWidth: 1,
                        borderColor: on ? PRIMARY : UI_BORDER,
                        backgroundColor: on ? "#EFF6FF" : UI_SURFACE,
                        overflow: "hidden",
                        ...uiCardShadow,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "flex-start",
                          columnGap: 12,
                          paddingVertical: 14,
                          paddingHorizontal: 14,
                        }}
                      >
                        <Pressable
                          onPress={() => toggleRuleSelect(r.id)}
                          hitSlop={8}
                          style={{ paddingTop: 2 }}
                        >
                          {on ? (
                            <CheckSquare size={24} color={PRIMARY} strokeWidth={2} />
                          ) : (
                            <Square size={24} color={UI_TEXT_TERTIARY} strokeWidth={2} />
                          )}
                        </Pressable>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ fontSize: 16, fontWeight: "700", color: UI_TEXT }} numberOfLines={detailOpen ? undefined : 2}>
                            {r.summary}
                          </Text>
                          <Pressable
                            onPress={() => setRuleDetailId((id) => (id === r.id ? null : r.id))}
                            style={{ marginTop: 6, alignSelf: "flex-start" }}
                          >
                            <Text style={{ fontSize: 13, color: PRIMARY, fontWeight: "600" }}>
                              {detailOpen ? "閉じる" : "くわしく"}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                      {detailOpen ? (
                        <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 0 }}>
                          <Text style={{ fontSize: 14, color: UI_TEXT_SECONDARY, lineHeight: 20 }}>{r.detail}</Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
              <Pressable
                onPress={approveSelectedRules}
                disabled={pendingRules.length === 0 || selectedRuleIds.size === 0}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  borderRadius: UI_RADIUS_MD,
                  backgroundColor:
                    pendingRules.length === 0 || selectedRuleIds.size === 0 ? UI_MUTED : PRIMARY,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: pendingRules.length === 0 || selectedRuleIds.size === 0 ? UI_TEXT_TERTIARY : "#ffffff",
                  }}
                >
                  選択を承認
                </Text>
              </Pressable>
              <Pressable
                onPress={() => approveAllPending()}
                disabled={pendingRules.length === 0}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  borderRadius: UI_RADIUS_MD,
                  borderWidth: 1,
                  borderColor: pendingRules.length === 0 ? UI_BORDER : UI_BORDER,
                  backgroundColor: UI_SURFACE,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: pendingRules.length === 0 ? UI_TEXT_TERTIARY : UI_TEXT,
                  }}
                >
                  まとめて承認
                </Text>
              </Pressable>
            </View>

            <View
              style={{
                padding: 18,
                borderRadius: UI_RADIUS_LG,
                backgroundColor: UI_MUTED,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flex: 1, paddingRight: 12, minWidth: 0 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: UI_TEXT }}>朝5時〜 自動整理</Text>
                <Text style={{ fontSize: 12, color: UI_TEXT_SECONDARY, marginTop: 3 }}>条件が合う日に1回</Text>
              </View>
              <Pressable
                onPress={() => void persistAuto(!autoTomorrow)}
                style={{
                  width: 48,
                  height: 26,
                  borderRadius: 999,
                  padding: 2,
                  backgroundColor: autoTomorrow ? "#22c55e" : UI_BORDER,
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    backgroundColor: "#ffffff",
                    alignSelf: autoTomorrow ? "flex-end" : "flex-start",
                  }}
                />
              </Pressable>
            </View>

            <Pressable onPress={() => setStep(1)} style={{ marginTop: 20, alignSelf: "flex-end", paddingVertical: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: PRIMARY }}>次へ</Text>
            </Pressable>
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: UI_TEXT, marginBottom: 8, letterSpacing: -0.4 }}>
              2. タスク
            </Text>
            <Text style={{ fontSize: 13, color: UI_TEXT_SECONDARY, marginBottom: 14 }}>
              {monthDayLabel(todayKey)} · タップで完了のオンオフ
            </Text>
            {todayTasksOrdered.length === 0 ? (
              <Text style={{ fontSize: 14, color: UI_TEXT_TERTIARY, marginBottom: 16 }}>今日はなし</Text>
            ) : (
              <View style={{ marginBottom: 16 }}>
                {todayTasksOrdered.map((t) => (
                  <Pressable
                    key={t.id}
                    onPress={() => toggleTask(t.id)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      columnGap: 14,
                      paddingVertical: 16,
                      paddingHorizontal: 16,
                      marginBottom: 10,
                      borderRadius: UI_RADIUS_LG,
                      borderWidth: 1,
                      borderColor: t.completed ? "#86EFAC" : UI_BORDER,
                      backgroundColor: t.completed ? "#F0FDF4" : UI_SURFACE,
                      ...uiCardShadow,
                    }}
                  >
                    {t.completed ? (
                      <CheckSquare size={24} color="#16A34A" strokeWidth={2} />
                    ) : (
                      <Square size={24} color={UI_TEXT_TERTIARY} strokeWidth={2} />
                    )}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: t.completed ? "#166534" : UI_TEXT,
                          textDecorationLine: t.completed ? "line-through" : "none",
                        }}
                      >
                        {t.title}
                      </Text>
                      <Text style={{ fontSize: 13, color: UI_TEXT_SECONDARY, marginTop: 4 }}>
                        {typeof t.hour === "number" ? `${t.hour}:00 〜` : "時間未設定"}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 20 }}>
              <Pressable onPress={() => setStep(0)} style={{ paddingVertical: 10 }}>
                <Text style={{ fontSize: 16, color: UI_TEXT_SECONDARY, fontWeight: "600" }}>戻る</Text>
              </Pressable>
              <Pressable onPress={() => setStep(2)} style={{ paddingVertical: 10 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: PRIMARY }}>次へ</Text>
              </Pressable>
            </View>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: UI_TEXT, marginBottom: 8, letterSpacing: -0.4 }}>
              3. カレンダー配分
            </Text>
            <Text style={{ fontSize: 13, color: UI_TEXT_SECONDARY, marginBottom: 14 }}>7日分の件数 · 細部はカレンダーで</Text>
            <View
              style={{
                borderRadius: UI_RADIUS_LG,
                borderWidth: 1,
                borderColor: UI_BORDER,
                overflow: "hidden",
                backgroundColor: UI_SURFACE,
                ...uiCardShadow,
              }}
            >
              {calendarPreview.map((row, i) => (
                <View
                  key={row.key}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderBottomWidth: i < calendarPreview.length - 1 ? 1 : 0,
                    borderBottomColor: UI_BORDER,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: "600", color: UI_TEXT }}>{monthDayLabel(row.key)}</Text>
                  <Text style={{ fontSize: 15, color: UI_TEXT_SECONDARY }}>{row.n} 件</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 24 }}>
              <Pressable onPress={() => setStep(1)} style={{ paddingVertical: 10 }}>
                <Text style={{ fontSize: 16, color: UI_TEXT_SECONDARY, fontWeight: "600" }}>戻る</Text>
              </Pressable>
              <Pressable onPress={() => setStep(3)} style={{ paddingVertical: 10 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: PRIMARY }}>次へ</Text>
              </Pressable>
            </View>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: UI_TEXT, marginBottom: 8, letterSpacing: -0.4 }}>
              4. 明日のイメージ
            </Text>
            <Text style={{ fontSize: 13, color: UI_TEXT_SECONDARY, marginBottom: 16 }}>明日の体感 · あとからホームでも直せます</Text>

            <Text style={{ fontSize: 13, fontWeight: "700", color: UI_TEXT_SECONDARY, marginBottom: 10 }}>明日の忙しさ</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
              {(
                [
                  { v: 0 as const, t: "ゆとり" },
                  { v: 1 as const, t: "ふつう" },
                  { v: 2 as const, t: "かなり忙しい" },
                ]
              ).map((o) => {
                const sel = hearingBusy === o.v;
                return (
                  <Pressable
                    key={o.v}
                    onPress={() => setHearingBusy(o.v)}
                    style={{
                      paddingHorizontal: 18,
                      paddingVertical: 12,
                      borderRadius: 999,
                      backgroundColor: sel ? UI_TEXT : UI_MUTED,
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: "600", color: sel ? "#ffffff" : UI_TEXT_SECONDARY }}>{o.t}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={{ fontSize: 13, fontWeight: "700", color: UI_TEXT_SECONDARY, marginBottom: 10 }}>朝はゆっくり？</Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
              {[
                { v: false as const, t: "いいえ" },
                { v: true as const, t: "はい" },
              ].map((o) => {
                const sel = hearingLate === o.v;
                return (
                  <Pressable
                    key={String(o.v)}
                    onPress={() => setHearingLate(o.v)}
                    style={{
                      paddingHorizontal: 18,
                      paddingVertical: 12,
                      borderRadius: 999,
                      backgroundColor: sel ? UI_TEXT : UI_MUTED,
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: "600", color: sel ? "#ffffff" : UI_TEXT_SECONDARY }}>{o.t}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={{ fontSize: 13, fontWeight: "700", color: UI_TEXT_SECONDARY, marginBottom: 10 }}>厚めにしたい科目</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 28 }}>
              {(
                [
                  { v: "english" as const, t: "英語" },
                  { v: "math" as const, t: "数学" },
                  { v: "balance" as const, t: "バランス" },
                ]
              ).map((o) => {
                const sel = hearingSubject === o.v;
                return (
                  <Pressable
                    key={o.v}
                    onPress={() => setHearingSubject(o.v)}
                    style={{
                      paddingHorizontal: 18,
                      paddingVertical: 12,
                      borderRadius: 999,
                      backgroundColor: sel ? UI_TEXT : UI_MUTED,
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: "600", color: sel ? "#ffffff" : UI_TEXT_SECONDARY }}>{o.t}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={finishWithProposal}
              style={{
                backgroundColor: PRIMARY,
                paddingVertical: 17,
                borderRadius: UI_RADIUS_LG,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "700" }}>ホームへ反映</Text>
            </Pressable>
            <Pressable onPress={() => setStep(2)} style={{ marginTop: 16, alignSelf: "center", paddingVertical: 8 }}>
              <Text style={{ fontSize: 16, color: UI_TEXT_SECONDARY, fontWeight: "600" }}>戻る</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
