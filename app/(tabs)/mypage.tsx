import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Pencil,
  Plus,
  Scale,
  Trash2,
  School,
  GraduationCap,
  Trophy,
  Building2,
  Calculator,
  X,
} from "lucide-react-native";
import {
  PRIMARY,
  PRIMARY_LIGHT,
  UI_BORDER,
  UI_MUTED,
  UI_RADIUS_LG,
  UI_RADIUS_MD,
  UI_RADIUS_XL,
  UI_SCREEN,
  UI_SURFACE,
  UI_TEXT,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY,
  uiCardShadow,
} from "@/constants/theme";
import { useProfile, PROFILE_OPTIONS, ProfileKey } from "@/context/ProfileContext";
import { useScores } from "@/context/ScoreContext";
import { useTasks, getTodayKey } from "@/context/TasksContext";
import { buildPlannerHypothesis } from "@/lib/plannerHypothesis";
import { AibouMascot } from "@/components/AibouMascot";
import { useJudgmentRules, type JudgmentRuleItem } from "@/context/JudgmentRulesContext";
import { useHomeSchedule } from "@/context/HomeScheduleContext";
import { StartPickerModal } from "@/components/StartPickerModal";
import { nextAugustMockExamSaturday } from "@/lib/tetsuryokuOpeningPlan";

const PROFILE_FIELDS: {
  key: ProfileKey;
  label: string;
  icon: typeof School;
}[] = [
  { key: "school", label: "学校", icon: School },
  { key: "grade", label: "学年", icon: GraduationCap },
  { key: "club", label: "部活", icon: Trophy },
  { key: "juku", label: "塾", icon: Building2 },
  { key: "englishSlots", label: "英語コマ", icon: BookOpen },
  { key: "mathSlots", label: "数学コマ", icon: Calculator },
];

const MODAL_CARD_MAX_H = Math.min(440, Dimensions.get("window").height * 0.78);

export default function MyPageScreen() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(28, insets.bottom + 56);
  const { profile, setField } = useProfile();
  const { scores, setTotal } = useScores();
  const { tasks, replanLogs, plannerPreference } = useTasks();
  const { getLevel } = useHomeSchedule();
  const today = getTodayKey();
  const {
    items,
    ready: rulesReady,
    ingestPlannerHypothesis,
    addUserRule,
    approve,
    reject,
    updateRule,
    deleteRule,
    approveAllPending,
  } = useJudgmentRules();

  const [basicOpen, setBasicOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [activeField, setActiveField] = useState<ProfileKey | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addSummary, setAddSummary] = useState("");
  const [addDetail, setAddDetail] = useState("");
  const [editTarget, setEditTarget] = useState<JudgmentRuleItem | null>(null);
  const [editSummary, setEditSummary] = useState("");
  const [editDetail, setEditDetail] = useState("");
  const [ruleInfoOpen, setRuleInfoOpen] = useState(false);
  const [expandedPendingId, setExpandedPendingId] = useState<string | null>(null);

  const currentField = PROFILE_FIELDS.find((f) => f.key === activeField);

  const todayBusySlotCount = useMemo(() => {
    let n = 0;
    for (let h = 0; h < 24; h++) {
      if (getLevel(today, h) >= 1) n += 1;
    }
    return n;
  }, [getLevel, today]);

  const hypothesis = useMemo(
    () =>
      buildPlannerHypothesis({
        profile: {
          school: profile.school,
          grade: profile.grade,
          juku: profile.juku,
        },
        preference: plannerPreference,
        tasks,
        replanLogs,
        todayKey: today,
        todayBusySlotCount,
      }),
    [
      plannerPreference,
      profile.grade,
      profile.juku,
      profile.school,
      replanLogs,
      tasks,
      today,
      todayBusySlotCount,
    ]
  );

  const insightKey = hypothesis.insights.join("\n");

  useEffect(() => {
    if (!rulesReady) return;
    ingestPlannerHypothesis(hypothesis);
  }, [rulesReady, hypothesis.headline, insightKey, ingestPlannerHypothesis]);

  const pending = items.filter((i) => i.status === "pending");
  const active = items.filter((i) => i.status === "active");

  const mockExamHint = useMemo(() => {
    const ex = nextAugustMockExamSaturday(new Date());
    return `${ex.getMonth() + 1}/${ex.getDate()}（土）目安`;
  }, []);

  const inferredRows = useMemo(
    () => [
      { label: "今日の埋まり時間帯", value: `${todayBusySlotCount} コマが学習以外で埋まり気味` },
      { label: "睡眠・休息の目安", value: "0:00〜7:00 は濃いマス（推奨：就寝優先）" },
      { label: "相棒の仮説ライン", value: hypothesis.headline },
    ],
    [todayBusySlotCount, hypothesis.headline]
  );

  const openEdit = (r: JudgmentRuleItem) => {
    setEditTarget(r);
    setEditSummary(r.summary);
    setEditDetail(r.detail);
  };

  const saveEdit = () => {
    if (!editTarget) return;
    updateRule(editTarget.id, { summary: editSummary, detail: editDetail });
    setEditTarget(null);
  };

  const submitAdd = () => {
    addUserRule(addSummary, addDetail);
    setAddSummary("");
    setAddDetail("");
    setAddOpen(false);
  };

  const displayName = profile.username?.trim() || "なまえ未設定";
  const subtitle = profile.grade ? `学習者 · ${profile.grade}` : "学習者";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: UI_SCREEN }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: bottomPad,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          <Text style={{ fontSize: 32, fontWeight: "700", color: UI_TEXT, letterSpacing: -0.8 }}>マイページ</Text>
          <Pressable
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: UI_MUTED,
              alignItems: "center",
              justifyContent: "center",
            }}
            accessibilityLabel="通知（準備中）"
          >
            <Bell size={22} color={UI_TEXT} strokeWidth={2} />
          </Pressable>
        </View>

        <View
          style={{
            marginTop: 20,
            borderRadius: UI_RADIUS_XL,
            backgroundColor: UI_SURFACE,
            borderWidth: 1,
            borderColor: UI_BORDER,
            padding: 18,
            ...uiCardShadow,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "stretch" }}>
            <View
              style={{
                width: "42%",
                paddingRight: 14,
                borderRightWidth: 1,
                borderRightColor: UI_BORDER,
                alignItems: "center",
              }}
            >
              <View style={{ position: "relative" }}>
                <View
                  style={{
                    width: 92,
                    height: 92,
                    borderRadius: 46,
                    backgroundColor: PRIMARY_LIGHT,
                    borderWidth: 3,
                    borderColor: "#FFFFFF",
                    alignItems: "center",
                    justifyContent: "center",
                    ...Platform.select({
                      ios: {
                        shadowColor: "#000",
                        shadowOpacity: 0.08,
                        shadowRadius: 12,
                        shadowOffset: { width: 0, height: 4 },
                      },
                      default: { elevation: 3 },
                    }),
                  }}
                >
                  <AibouMascot size={72} />
                </View>
                <View
                  style={{
                    position: "absolute",
                    right: -2,
                    bottom: -2,
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: "#E11D48",
                    borderWidth: 2,
                    borderColor: "#fff",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Check size={14} color="#fff" strokeWidth={3} />
                </View>
              </View>
              <Text style={{ marginTop: 12, fontSize: 20, fontWeight: "800", color: UI_TEXT, textAlign: "center" }}>
                {displayName}
              </Text>
              <Text style={{ marginTop: 4, fontSize: 13, color: UI_TEXT_SECONDARY, textAlign: "center" }}>{subtitle}</Text>
            </View>

            <View style={{ flex: 1, paddingLeft: 14, justifyContent: "center" }}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: UI_TEXT_TERTIARY, letterSpacing: 0.6 }}>校内模試目標</Text>
              <View style={{ marginTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: UI_BORDER }}>
                <Text style={{ fontSize: 12, color: UI_TEXT_SECONDARY }}>英語</Text>
                <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 4 }}>
                  <TextInput
                    style={{ fontSize: 26, fontWeight: "800", color: UI_TEXT, paddingVertical: 0, minWidth: 44 }}
                    keyboardType="numeric"
                    value={String(scores.english.total)}
                    onChangeText={(t) => setTotal("english", parseInt(t || "0", 10))}
                  />
                  <Text style={{ fontSize: 13, color: UI_TEXT_SECONDARY }}>/120</Text>
                </View>
              </View>
              <View style={{ marginTop: 10, paddingBottom: 4 }}>
                <Text style={{ fontSize: 12, color: UI_TEXT_SECONDARY }}>数学</Text>
                <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 4 }}>
                  <TextInput
                    style={{ fontSize: 26, fontWeight: "800", color: UI_TEXT, paddingVertical: 0, minWidth: 44 }}
                    keyboardType="numeric"
                    value={String(scores.math.total)}
                    onChangeText={(t) => setTotal("math", parseInt(t || "0", 10))}
                  />
                  <Text style={{ fontSize: 13, color: UI_TEXT_SECONDARY }}>/120</Text>
                </View>
              </View>
              <Text style={{ marginTop: 8, fontSize: 11, color: UI_TEXT_TERTIARY }}>模試の目安日 {mockExamHint}</Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: "row", columnGap: 12, marginTop: 16 }}>
          <Pressable
            onPress={() => setBasicOpen(true)}
            style={{
              flex: 1,
              minHeight: 132,
              borderRadius: UI_RADIUS_LG,
              backgroundColor: UI_SURFACE,
              borderWidth: 1,
              borderColor: UI_BORDER,
              padding: 14,
              justifyContent: "space-between",
              ...uiCardShadow,
            }}
          >
            <View style={{ alignItems: "center", paddingVertical: 8 }}>
              <BookOpen size={36} color={PRIMARY} strokeWidth={1.75} />
            </View>
            <Text style={{ fontSize: 15, fontWeight: "800", color: UI_TEXT, textAlign: "center" }}>基本情報</Text>
            <Text style={{ fontSize: 11, color: UI_TEXT_SECONDARY, textAlign: "center", marginTop: 4 }}>タップで詳細</Text>
          </Pressable>
          <Pressable
            onPress={() => setRulesOpen(true)}
            style={{
              flex: 1,
              minHeight: 132,
              borderRadius: UI_RADIUS_LG,
              backgroundColor: UI_SURFACE,
              borderWidth: 1,
              borderColor: UI_BORDER,
              padding: 14,
              justifyContent: "space-between",
              ...uiCardShadow,
            }}
          >
            <View style={{ alignItems: "center", paddingVertical: 8 }}>
              <Scale size={36} color={PRIMARY} strokeWidth={1.75} />
            </View>
            <Text style={{ fontSize: 15, fontWeight: "800", color: UI_TEXT, textAlign: "center" }}>判断基準</Text>
            <Text style={{ fontSize: 11, color: UI_TEXT_SECONDARY, textAlign: "center", marginTop: 4 }}>
              承認待ち {pending.length}件
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={basicOpen}
        animationType="slide"
        onRequestClose={() => {
          setBasicOpen(false);
          setActiveField(null);
        }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: UI_SCREEN }} edges={["top"]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: UI_BORDER }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: UI_TEXT }}>基本情報</Text>
            <Pressable
              onPress={() => {
                setBasicOpen(false);
                setActiveField(null);
              }}
              style={{ padding: 8 }}
            >
              <X size={24} color={UI_TEXT} strokeWidth={2} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottomPad, paddingTop: 16 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: UI_TEXT_SECONDARY }}>表示名</Text>
            <View style={{ marginTop: 8, borderRadius: UI_RADIUS_LG, backgroundColor: UI_MUTED, paddingVertical: 14, paddingHorizontal: 16 }}>
              <TextInput
                value={profile.username ?? ""}
                onChangeText={(v) => setField("username", v)}
                placeholder="例: ゆいと"
                placeholderTextColor={UI_TEXT_TERTIARY}
                style={{ fontSize: 16, color: UI_TEXT }}
              />
            </View>

            <Text style={{ marginTop: 24, marginBottom: 10, fontSize: 13, fontWeight: "600", color: UI_TEXT_SECONDARY }}>
              スタート時に入力した項目
            </Text>
            <View style={{ borderRadius: UI_RADIUS_XL, backgroundColor: UI_SURFACE, borderWidth: 1, borderColor: UI_BORDER, overflow: "hidden", ...uiCardShadow }}>
              {PROFILE_FIELDS.map(({ key, label }) => {
                const value = profile[key] ?? "タップして設定";
                const isPlaceholder = !profile[key];
                return (
                  <Pressable
                    key={key}
                    onPress={() => setActiveField(key)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 18,
                      paddingVertical: 16,
                      borderBottomWidth: key === PROFILE_FIELDS[PROFILE_FIELDS.length - 1].key ? 0 : 1,
                      borderBottomColor: UI_BORDER,
                    }}
                  >
                    <Text style={{ fontSize: 16, color: UI_TEXT, flexShrink: 0, marginRight: 8 }}>{label}</Text>
                    <View style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", justifyContent: "flex-end" }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "500",
                          color: isPlaceholder ? "#DC2626" : PRIMARY,
                          textAlign: "right",
                        }}
                        numberOfLines={1}
                      >
                        {value}
                      </Text>
                    </View>
                    <ChevronRight size={20} color={UI_TEXT_TERTIARY} strokeWidth={2} style={{ marginLeft: 6 }} />
                  </Pressable>
                );
              })}
            </View>

            <Text style={{ marginTop: 28, marginBottom: 10, fontSize: 13, fontWeight: "600", color: UI_TEXT_SECONDARY }}>
              計画づくりで参照している情報
            </Text>
            <View style={{ borderRadius: UI_RADIUS_XL, backgroundColor: UI_MUTED, borderWidth: 1, borderColor: UI_BORDER, overflow: "hidden" }}>
              {inferredRows.map((row) => (
                <View key={row.label} style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: UI_BORDER }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: UI_TEXT_TERTIARY }}>{row.label}</Text>
                  <Text style={{ marginTop: 6, fontSize: 15, color: UI_TEXT, lineHeight: 22 }}>{row.value}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={rulesOpen} animationType="slide" onRequestClose={() => setRulesOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: UI_SCREEN }} edges={["top"]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: UI_BORDER }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: UI_TEXT }}>判断基準</Text>
            <Pressable onPress={() => setRulesOpen(false)} style={{ padding: 8 }}>
              <X size={24} color={UI_TEXT} strokeWidth={2} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottomPad, paddingTop: 12 }}
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              onPress={() => setRuleInfoOpen((v) => !v)}
              style={{
                borderRadius: UI_RADIUS_LG,
                backgroundColor: UI_MUTED,
                paddingVertical: 14,
                paddingHorizontal: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: UI_TEXT, flex: 1 }}>
                仮説の承認について{ruleInfoOpen ? "" : " · タップ"}
              </Text>
              {ruleInfoOpen ? (
                <ChevronUp size={18} color={UI_TEXT_SECONDARY} strokeWidth={2} />
              ) : (
                <ChevronDown size={18} color={UI_TEXT_SECONDARY} strokeWidth={2} />
              )}
            </Pressable>
            {ruleInfoOpen ? (
              <Text style={{ marginTop: 8, fontSize: 13, color: UI_TEXT_SECONDARY, lineHeight: 19 }}>
                自動では採用されません。承認したものだけが判断軸に乗ります（ベータ）。
              </Text>
            ) : null}

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 24 }}>
              <Text style={{ fontSize: 17, fontWeight: "700", color: UI_TEXT }}>承認待ち</Text>
              <Text style={{ fontSize: 14, color: UI_TEXT_SECONDARY, fontWeight: "600" }}>{pending.length} 件</Text>
            </View>

            {pending.length > 1 ? (
              <Pressable
                onPress={() => approveAllPending()}
                style={{
                  alignSelf: "flex-start",
                  marginTop: 12,
                  paddingHorizontal: 18,
                  paddingVertical: 10,
                  borderRadius: UI_RADIUS_MD,
                  backgroundColor: PRIMARY,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#ffffff" }}>まとめて承認</Text>
              </Pressable>
            ) : null}

            {pending.length === 0 ? (
              <Text style={{ marginTop: 12, fontSize: 14, color: UI_TEXT_TERTIARY }}>なし</Text>
            ) : (
              pending.map((r) => {
                const ex = expandedPendingId === r.id;
                return (
                  <View
                    key={r.id}
                    style={{
                      marginTop: 12,
                      borderRadius: UI_RADIUS_XL,
                      borderWidth: 1,
                      borderColor: "#FDE68A",
                      backgroundColor: "#FFFBEB",
                      overflow: "hidden",
                    }}
                  >
                    <Pressable
                      onPress={() => setExpandedPendingId((id) => (id === r.id ? null : r.id))}
                      style={{ padding: 16, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}
                    >
                      <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: "700", color: "#92400E" }} numberOfLines={ex ? undefined : 2}>
                          {r.summary}
                        </Text>
                        {!ex ? (
                          <Text style={{ marginTop: 6, fontSize: 13, color: PRIMARY, fontWeight: "600" }}>くわしく</Text>
                        ) : null}
                      </View>
                      {ex ? (
                        <ChevronUp size={20} color="#92400E" strokeWidth={2} />
                      ) : (
                        <ChevronDown size={20} color="#92400E" strokeWidth={2} />
                      )}
                    </Pressable>
                    {ex ? (
                      <>
                        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                          <Text style={{ fontSize: 14, color: "#78350F", lineHeight: 21 }}>{r.detail}</Text>
                        </View>
                        <View style={{ flexDirection: "row", justifyContent: "flex-end", columnGap: 10, padding: 16, paddingTop: 0 }}>
                          <Pressable
                            onPress={() => reject(r.id)}
                            style={{
                              paddingHorizontal: 16,
                              paddingVertical: 10,
                              borderRadius: UI_RADIUS_MD,
                              backgroundColor: UI_SURFACE,
                              borderWidth: 1,
                              borderColor: UI_BORDER,
                            }}
                          >
                            <Text style={{ fontSize: 14, fontWeight: "600", color: UI_TEXT_SECONDARY }}>見送り</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => approve(r.id)}
                            style={{
                              paddingHorizontal: 18,
                              paddingVertical: 10,
                              borderRadius: UI_RADIUS_MD,
                              backgroundColor: "#16A34A",
                            }}
                          >
                            <Text style={{ fontSize: 14, fontWeight: "700", color: "#ffffff" }}>承認</Text>
                          </Pressable>
                        </View>
                      </>
                    ) : null}
                  </View>
                );
              })
            )}

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 28 }}>
              <Text style={{ fontSize: 17, fontWeight: "700", color: UI_TEXT }}>採用中の判断軸</Text>
              <Pressable
                onPress={() => setAddOpen(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  columnGap: 6,
                  backgroundColor: UI_TEXT,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: UI_RADIUS_MD,
                }}
              >
                <Plus size={16} color="#ffffff" strokeWidth={2.5} />
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#ffffff" }}>追加</Text>
              </Pressable>
            </View>

            {active.length === 0 ? (
              <Text style={{ marginTop: 10, fontSize: 14, color: UI_TEXT_TERTIARY }}>まだなし · 承認か追加で</Text>
            ) : (
              active.map((r) => (
                <RuleActiveCard
                  key={r.id}
                  rule={r}
                  expanded={expandedId === r.id}
                  onToggle={() => setExpandedId((id) => (id === r.id ? null : r.id))}
                  onEdit={() => openEdit(r)}
                  onDelete={() => deleteRule(r.id)}
                />
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {currentField && (
        <StartPickerModal
          visible={basicOpen && activeField !== null}
          title={currentField.label}
          options={PROFILE_OPTIONS[currentField.key]}
          onSelect={(value) => setField(currentField.key, value)}
          onClose={() => setActiveField(null)}
        />
      )}

      <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => setAddOpen(false)}>
        <View style={modalStyles.root}>
          <Pressable style={[StyleSheet.absoluteFillObject, modalStyles.backdrop]} onPress={() => setAddOpen(false)} accessibilityLabel="閉じる" />
          <View pointerEvents="box-none" style={[StyleSheet.absoluteFillObject, modalStyles.centerWrap]}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={modalStyles.kav}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces={false}
                style={{ maxHeight: MODAL_CARD_MAX_H }}
                contentContainerStyle={{ flexGrow: 0 }}
              >
                <View style={modalStyles.card}>
                  <Text style={{ fontSize: 20, fontWeight: "700", color: UI_TEXT }}>判断軸を追加</Text>
                  <Text style={{ fontSize: 13, color: UI_TEXT_SECONDARY, marginTop: 4 }}>見出し · 詳細</Text>
                  <TextInput value={addSummary} onChangeText={setAddSummary} placeholder="見出し" style={modalInput as object} />
                  <TextInput
                    value={addDetail}
                    onChangeText={setAddDetail}
                    placeholder="詳細"
                    multiline
                    style={[modalInput, { minHeight: 88, textAlignVertical: "top" }] as object}
                  />
                  <View style={{ flexDirection: "row", justifyContent: "flex-end", columnGap: 20, marginTop: 12 }}>
                    <Pressable onPress={() => setAddOpen(false)} style={{ paddingVertical: 8 }}>
                      <Text style={{ color: UI_TEXT_SECONDARY, fontWeight: "600", fontSize: 16 }}>キャンセル</Text>
                    </Pressable>
                    <Pressable onPress={submitAdd} style={{ paddingVertical: 8 }}>
                      <Text style={{ color: PRIMARY, fontWeight: "700", fontSize: 16 }}>追加</Text>
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>

      <Modal visible={editTarget !== null} transparent animationType="fade" onRequestClose={() => setEditTarget(null)}>
        <View style={modalStyles.root}>
          <Pressable style={[StyleSheet.absoluteFillObject, modalStyles.backdrop]} onPress={() => setEditTarget(null)} accessibilityLabel="閉じる" />
          <View pointerEvents="box-none" style={[StyleSheet.absoluteFillObject, modalStyles.centerWrap]}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={modalStyles.kav}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces={false}
                style={{ maxHeight: MODAL_CARD_MAX_H }}
                contentContainerStyle={{ flexGrow: 0 }}
              >
                <View style={modalStyles.card}>
                  <Text style={{ fontSize: 20, fontWeight: "700", color: UI_TEXT }}>判断軸を編集</Text>
                  <TextInput value={editSummary} onChangeText={setEditSummary} placeholder="見出し" style={modalInput as object} />
                  <TextInput
                    value={editDetail}
                    onChangeText={setEditDetail}
                    placeholder="詳細"
                    multiline
                    style={[modalInput, { minHeight: 88, textAlignVertical: "top" }] as object}
                  />
                  <View style={{ flexDirection: "row", justifyContent: "flex-end", columnGap: 20, marginTop: 12 }}>
                    <Pressable onPress={() => setEditTarget(null)} style={{ paddingVertical: 8 }}>
                      <Text style={{ color: UI_TEXT_SECONDARY, fontWeight: "600", fontSize: 16 }}>キャンセル</Text>
                    </Pressable>
                    <Pressable onPress={saveEdit} style={{ paddingVertical: 8 }}>
                      <Text style={{ color: PRIMARY, fontWeight: "700", fontSize: 16 }}>保存</Text>
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const modalInput = {
  borderWidth: 1,
  borderColor: UI_BORDER,
  borderRadius: UI_RADIUS_MD,
  paddingHorizontal: 14,
  paddingVertical: 12,
  marginTop: 12,
  fontSize: 16,
  color: UI_TEXT,
  backgroundColor: UI_MUTED,
} as const;

const modalStyles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { backgroundColor: "rgba(0,0,0,0.45)" },
  centerWrap: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  kav: { width: "100%", maxWidth: 420, alignSelf: "center" },
  card: {
    borderRadius: UI_RADIUS_XL,
    backgroundColor: UI_SCREEN,
    padding: 20,
    width: "100%",
    ...uiCardShadow,
  },
});

function RuleActiveCard({
  rule,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  rule: JudgmentRuleItem;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={{ marginTop: 12, borderRadius: UI_RADIUS_XL, backgroundColor: UI_SURFACE, ...uiCardShadow }}>
      <View
        style={{
          borderRadius: UI_RADIUS_XL,
          borderWidth: 1,
          borderColor: UI_BORDER,
          backgroundColor: UI_SURFACE,
          overflow: "hidden",
        }}
      >
        <Pressable
          onPress={onToggle}
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: 18,
            columnGap: 12,
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 11, color: UI_TEXT_TERTIARY, fontWeight: "600" }}>
              {rule.proposedBy === "aibou" ? "AIBOU" : "自分"}
            </Text>
            <Text style={{ marginTop: 4, fontSize: 16, fontWeight: "700", color: UI_TEXT }} numberOfLines={expanded ? undefined : 2}>
              {rule.summary}
            </Text>
            {!expanded ? (
              <Text style={{ marginTop: 6, fontSize: 13, color: PRIMARY, fontWeight: "600" }}>くわしく</Text>
            ) : null}
          </View>
          {expanded ? (
            <ChevronUp size={22} color={UI_TEXT_SECONDARY} strokeWidth={2} />
          ) : (
            <ChevronDown size={22} color={UI_TEXT_SECONDARY} strokeWidth={2} />
          )}
        </Pressable>
        {expanded && (
          <View style={{ paddingHorizontal: 18, paddingBottom: 18 }}>
            <Text style={{ fontSize: 14, color: UI_TEXT_SECONDARY, lineHeight: 22 }}>{rule.detail}</Text>
            <View style={{ flexDirection: "row", justifyContent: "flex-end", columnGap: 10, marginTop: 16 }}>
              <Pressable
                onPress={onEdit}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  columnGap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: UI_RADIUS_MD,
                  backgroundColor: UI_MUTED,
                }}
              >
                <Pencil size={16} color={UI_TEXT_SECONDARY} strokeWidth={2} />
                <Text style={{ fontSize: 14, fontWeight: "600", color: UI_TEXT }}>編集</Text>
              </Pressable>
              <Pressable
                onPress={onDelete}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  columnGap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: UI_RADIUS_MD,
                  backgroundColor: "#FEF2F2",
                }}
              >
                <Trash2 size={16} color="#B91C1C" strokeWidth={2} />
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#B91C1C" }}>削除</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
