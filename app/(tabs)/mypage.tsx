import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Bell,
  BookOpen,
  Check,
  ChevronRight,
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
import { inferUserDetailProfile } from "@/lib/inferUserDetailProfile";
import { USER_DETAIL_META, type UserDetailKey } from "@/lib/userDetailFields";
import { buildPlannerHypothesis } from "@/lib/plannerHypothesis";
import { AibouMascot } from "@/components/AibouMascot";
import { inferHomeScheduleLevels } from "@/lib/homeScheduleInference";
import { StartPickerModal } from "@/components/StartPickerModal";
import { ClubSchedulePicker } from "@/components/ClubSchedulePicker";
import { getClubDisplayForUi } from "@/lib/clubScheduleProfile";
import { RUNTIME_APP_VERSION } from "@/lib/runtimeAppVersion";
import { PUBLIC_TRIAL_BADGE } from "@/constants/publicBuild";

const PROFILE_FIELDS: {
  key: ProfileKey;
  label: string;
  icon: typeof School;
}[] = [
  { key: "school", label: "学校", icon: School },
  { key: "grade", label: "学年", icon: GraduationCap },
  { key: "club", label: "部活動・課外活動の時間", icon: Trophy },
  { key: "juku", label: "塾", icon: Building2 },
  { key: "englishSlots", label: "英語コマ", icon: BookOpen },
  { key: "mathSlots", label: "数学コマ", icon: Calculator },
];

export default function MyPageScreen() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(28, insets.bottom + 56);
  const { profile, setField, userDetails, setUserDetail, mergeInferredUserDetails } = useProfile();
  const { scores } = useScores();
  const { tasks, replanLogs, plannerPreference } = useTasks();
  const today = getTodayKey();
  const [basicOpen, setBasicOpen] = useState(false);
  const [activeField, setActiveField] = useState<ProfileKey | null>(null);
  const [detailEditKey, setDetailEditKey] = useState<UserDetailKey | null>(null);
  const [detailDraft, setDetailDraft] = useState("");

  const currentField = PROFILE_FIELDS.find((f) => f.key === activeField);

  useEffect(() => {
    mergeInferredUserDetails(
      inferUserDetailProfile(profile, {
        english: scores.english,
        math: scores.math,
      })
    );
  }, [
    mergeInferredUserDetails,
    profile.grade,
    profile.school,
    profile.englishSlots,
    profile.mathSlots,
    scores.english.total,
    scores.math.total,
  ]);

  const todayBusySlotCount = useMemo(() => {
    const [y, m, d] = today.split("-").map((v) => parseInt(v, 10));
    const levels = inferHomeScheduleLevels(new Date(y, m - 1, d), profile);
    let n = 0;
    for (let h = 0; h < 24; h++) {
      if ((levels[h] ?? 0) >= 1) n += 1;
    }
    return n;
  }, [today, profile]);

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

  const inferredRows = useMemo(
    () => [
      { label: "今日の埋まり時間帯", value: `${todayBusySlotCount} コマが学習以外で埋まり気味` },
      { label: "睡眠・休息の目安", value: "0:00〜7:00 は濃いマス（推奨：就寝優先）" },
      { label: "相棒の仮説ライン", value: hypothesis.headline },
    ],
    [todayBusySlotCount, hypothesis.headline]
  );

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
            paddingVertical: 28,
            paddingHorizontal: 20,
            alignItems: "center",
            ...uiCardShadow,
          }}
        >
          <View style={{ position: "relative" }}>
            <View
              style={{
                width: 104,
                height: 104,
                borderRadius: 52,
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
              <AibouMascot size={80} />
            </View>
            <View
              style={{
                position: "absolute",
                right: -2,
                bottom: -2,
                width: 28,
                height: 28,
                borderRadius: 14,
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
          <Text style={{ marginTop: 16, fontSize: 22, fontWeight: "800", color: UI_TEXT, textAlign: "center" }}>
            {displayName}
          </Text>
          <Text style={{ marginTop: 6, fontSize: 14, color: UI_TEXT_SECONDARY, textAlign: "center" }}>{subtitle}</Text>
          <Text style={{ marginTop: 14, fontSize: 11, fontWeight: "600", color: UI_TEXT_TERTIARY }}>
            AIBOU v{RUNTIME_APP_VERSION}
            {PUBLIC_TRIAL_BADGE.trim() ? ` · ${PUBLIC_TRIAL_BADGE.trim()}` : ""}
          </Text>
        </View>

        <Pressable
          onPress={() => setBasicOpen(true)}
          style={{
            marginTop: 16,
            minHeight: 120,
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
          <Text style={{ fontSize: 15, fontWeight: "800", color: UI_TEXT, textAlign: "center" }}>ユーザー情報</Text>
          <Text style={{ fontSize: 11, color: UI_TEXT_SECONDARY, textAlign: "center", marginTop: 4 }}>
            基本＋詳細をまとめて編集
          </Text>
        </Pressable>

        <View
          style={{
            marginTop: 12,
            borderRadius: UI_RADIUS_LG,
            backgroundColor: UI_MUTED,
            borderWidth: 1,
            borderColor: UI_BORDER,
            padding: 14,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "700", color: UI_TEXT }}>計画の最適化について</Text>
          <Text style={{ marginTop: 8, fontSize: 12, color: UI_TEXT_SECONDARY, lineHeight: 18 }}>
            カレンダー・ホームで入れた予定とタスクをもとに、自動で配分と学習を進めます。判断軸の手動承認は不要な設計にしています。
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={basicOpen}
        animationType="slide"
        onRequestClose={() => {
          setBasicOpen(false);
          setActiveField(null);
          setDetailEditKey(null);
        }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: UI_SCREEN }} edges={["top"]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: UI_BORDER }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: UI_TEXT }}>ユーザー情報</Text>
            <Pressable
              onPress={() => {
                setBasicOpen(false);
                setActiveField(null);
                setDetailEditKey(null);
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
                const raw = profile[key];
                const value =
                  key === "club"
                    ? raw?.trim()
                      ? getClubDisplayForUi(raw)
                      : "タップして設定"
                    : (raw ?? "タップして設定");
                const isPlaceholder = key === "club" ? !raw?.trim() : !profile[key];
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
              詳細情報（アプリが仮入力 · タップで修正）
            </Text>
            <Text style={{ marginBottom: 10, fontSize: 11, color: UI_TEXT_TERTIARY, lineHeight: 16 }}>
              オンボードで入れた基本項目とは別枠です。推測文案を入れてあるので、あなたの実情に合わせて直すと計画の精度が上がります。
            </Text>
            <View style={{ borderRadius: UI_RADIUS_XL, backgroundColor: UI_SURFACE, borderWidth: 1, borderColor: UI_BORDER, overflow: "hidden", ...uiCardShadow }}>
              {USER_DETAIL_META.map(({ key, label, hint }, idx) => {
                const raw = userDetails[key];
                const value = raw?.trim() ? raw : "（未入力・推測を待っています）";
                const isPlaceholder = !raw?.trim();
                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      setDetailEditKey(key);
                      setDetailDraft(raw ?? "");
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 18,
                      paddingVertical: 16,
                      borderBottomWidth: idx === USER_DETAIL_META.length - 1 ? 0 : 1,
                      borderBottomColor: UI_BORDER,
                    }}
                  >
                    <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: UI_TEXT }}>{label}</Text>
                      <Text style={{ marginTop: 4, fontSize: 11, color: UI_TEXT_TERTIARY }}>{hint}</Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "500",
                        color: isPlaceholder ? UI_TEXT_TERTIARY : PRIMARY,
                        textAlign: "right",
                        maxWidth: "42%",
                      }}
                      numberOfLines={3}
                    >
                      {value}
                    </Text>
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

      {currentField && currentField.key !== "club" && (
        <StartPickerModal
          visible={basicOpen && activeField !== null}
          title={currentField.label}
          options={PROFILE_OPTIONS[currentField.key]}
          onSelect={(value) => setField(currentField.key, value)}
          onClose={() => setActiveField(null)}
        />
      )}

      <Modal
        visible={basicOpen && activeField === "club"}
        animationType="slide"
        onRequestClose={() => setActiveField(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: UI_SCREEN }} edges={["top"]}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: UI_BORDER,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "800", color: UI_TEXT }}>部活動・課外活動の時間</Text>
            <Pressable onPress={() => setActiveField(null)} style={{ padding: 8 }} accessibilityLabel="閉じる">
              <X size={24} color={UI_TEXT} strokeWidth={2} />
            </Pressable>
          </View>
          <ClubSchedulePicker
            value={profile.club}
            school={profile.school}
            onChange={(v) => setField("club", v)}
            contentBottomPad={bottomPad}
          />
        </SafeAreaView>
      </Modal>

      <Modal
        visible={detailEditKey !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setDetailEditKey(null)}
      >
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Pressable
            style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.4)" }]}
            onPress={() => setDetailEditKey(null)}
            accessibilityLabel="閉じる"
          />
          <View
            style={{
              marginHorizontal: 24,
              borderRadius: UI_RADIUS_LG,
              backgroundColor: UI_SURFACE,
              borderWidth: 1,
              borderColor: UI_BORDER,
              padding: 20,
              ...uiCardShadow,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "800", color: UI_TEXT }}>
              {detailEditKey ? USER_DETAIL_META.find((m) => m.key === detailEditKey)?.label : ""}
            </Text>
            <TextInput
              value={detailDraft}
              onChangeText={setDetailDraft}
              placeholder="内容を入力"
              placeholderTextColor={UI_TEXT_TERTIARY}
              multiline
              style={{
                marginTop: 12,
                minHeight: 100,
                borderRadius: UI_RADIUS_LG,
                borderWidth: 1,
                borderColor: UI_BORDER,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 15,
                color: UI_TEXT,
                textAlignVertical: "top",
              }}
            />
            <View style={{ flexDirection: "row", marginTop: 16, gap: 12 }}>
              <Pressable
                onPress={() => setDetailEditKey(null)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: UI_RADIUS_LG,
                  borderWidth: 1,
                  borderColor: UI_BORDER,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontWeight: "700", color: UI_TEXT_SECONDARY }}>キャンセル</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (detailEditKey) setUserDetail(detailEditKey, detailDraft.trim());
                  setDetailEditKey(null);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: UI_RADIUS_LG,
                  backgroundColor: PRIMARY,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontWeight: "800", color: "#fff" }}>保存</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
