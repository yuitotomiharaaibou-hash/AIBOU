import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Dimensions,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronLeft,
  ChevronRight,
  School,
  GraduationCap,
  Trophy,
  Building2,
  BookOpen,
  Calculator,
  Target,
  UserRound,
  Moon,
  Sparkles,
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
  UI_TEXT,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY,
  uiCardShadow,
} from "@/constants/theme";
import { AibouMascot } from "@/components/AibouMascot";
import { ClubSchedulePicker } from "@/components/ClubSchedulePicker";
import { useProfile, PROFILE_OPTIONS, ProfileKey } from "@/context/ProfileContext";
import { useScores } from "@/context/ScoreContext";
import {
  ONBOARDING_STEPS,
  type OnboardingQuestionKey,
  type OnboardingStep,
} from "@/lib/onboardingSteps";
import { getClubDisplayForUi } from "@/lib/clubScheduleProfile";
import { PostOnboardingSetupFlow } from "@/components/onboarding/PostOnboardingSetupFlow";

const { width: WIN_W, height: WIN_H } = Dimensions.get("window");
const HERO_H = Math.min(WIN_H * 0.48, 380);
const PRIMARY_DARK = "#1d4ed8";
const TEAL_TINT = "#0d9488";
const TEAL_LIGHT = "#ccfbf1";

const TARGET_OPTIONS: string[] = Array.from({ length: 25 }, (_v, i) =>
  String(120 - i * 5)
);

const QUESTION_ICONS: Record<OnboardingQuestionKey, typeof School> = {
  school: School,
  grade: GraduationCap,
  club: Trophy,
  juku: Building2,
  englishSlots: BookOpen,
  mathSlots: Calculator,
  englishTarget: Target,
  mathTarget: Target,
  username: UserRound,
};

const QUESTION_LABELS: Record<OnboardingQuestionKey, string> = {
  school: "学校を選択",
  grade: "学年を選択",
  club: "部活動・課外活動の時間",
  juku: "塾を選択",
  englishSlots: "英語コマを選択",
  mathSlots: "数学コマを選択",
  englishTarget: "英語の目標点数を選択",
  mathTarget: "数学の目標点数を選択",
  username: "ユーザ名を登録",
};

function GradientPillButton({
  title,
  onPress,
  style,
}: {
  title: string;
  onPress: () => void;
  style?: object;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[{ borderRadius: 999, overflow: "hidden", height: 54 }, style]}
    >
      <View style={{ flex: 1, flexDirection: "row" }}>
        <View style={{ flex: 1, backgroundColor: "#3b82f6" }} />
        <View style={{ flex: 1, backgroundColor: PRIMARY_DARK }} />
      </View>
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { alignItems: "center", justifyContent: "center" },
        ]}
      >
        <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700" }}>{title}</Text>
      </View>
    </Pressable>
  );
}

function FabNext({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 56,
        height: 56,
        borderRadius: 999,
        backgroundColor: PRIMARY,
        alignItems: "center",
        justifyContent: "center",
        ...PlatformSelectShadow(),
      }}
    >
      <ChevronRight size={28} color="#fff" strokeWidth={2.5} />
    </Pressable>
  );
}

function PlatformSelectShadow() {
  return {
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  };
}

function ProgressHeader({
  ratio,
  onBack,
  showBack,
}: {
  ratio: number;
  onBack: () => void;
  showBack: boolean;
}) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        {showBack ? (
          <Pressable
            onPress={onBack}
            style={styles.iconCircle}
            accessibilityLabel="戻る"
          >
            <ChevronLeft size={22} color={UI_TEXT} strokeWidth={2} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.min(1, ratio) * 100}%` }]} />
      </View>
    </View>
  );
}

function HeroDecor() {
  return (
    <>
      <View
        style={{
          position: "absolute",
          top: -40,
          right: -30,
          width: 160,
          height: 160,
          borderRadius: 80,
          backgroundColor: "#7dd3fc",
          opacity: 0.45,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 60,
          left: -50,
          width: 200,
          height: 120,
          borderRadius: 60,
          backgroundColor: "#38bdf8",
          opacity: 0.35,
          transform: [{ rotate: "-12deg" }],
        }}
      />
      <Svg
        width={WIN_W}
        height={100}
        style={{ position: "absolute", bottom: 0, left: 0 }}
        viewBox={`0 0 ${WIN_W} 100`}
        preserveAspectRatio="none"
      >
        <Path
          d={`M0,40 Q${WIN_W * 0.25},10 ${WIN_W * 0.5},35 T${WIN_W},25 L${WIN_W},100 L0,100 Z`}
          fill="#bae6fd"
          opacity={0.5}
        />
      </Svg>
    </>
  );
}

function WaveInsightVisual() {
  const w = WIN_W - 48;
  const h = 150;
  return (
    <View style={{ alignItems: "center", marginTop: 8 }}>
      <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <Path
          d={`M0,${h * 0.75} C${w * 0.2},${h * 0.55} ${w * 0.35},${h * 0.85} ${w * 0.5},${h * 0.45} S${w * 0.85},${h * 0.35} ${w},${h * 0.6} L${w},${h} L0,${h} Z`}
          fill={TEAL_LIGHT}
          opacity={0.9}
        />
        <Path
          d={`M0,${h * 0.82} C${w * 0.25},${h * 0.62} ${w * 0.4},${h * 0.92} ${w * 0.55},${h * 0.52} S${w * 0.88},${h * 0.42} ${w},${h * 0.68} L${w},${h} L0,${h} Z`}
          fill="#99f6e4"
          opacity={0.85}
        />
        <Path
          d={`M${w * 0.48},0 L${w * 0.52},0 L${w * 0.52},${h * 0.52} L${w * 0.48},${h * 0.52} Z`}
          fill={PRIMARY}
          opacity={0.35}
        />
      </Svg>
      <View
        style={{
          alignSelf: "stretch",
          marginTop: 12,
          backgroundColor: UI_SCREEN,
          borderRadius: UI_RADIUS_MD,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: UI_BORDER,
          ...uiCardShadow,
        }}
      >
        <Text style={{ fontSize: 14, color: PRIMARY, fontWeight: "600" }}>
          週のムリが続いてそうですね
        </Text>
      </View>
    </View>
  );
}

type Props = { onComplete: () => void | Promise<void> };

export function AibouOnboardingFlow({ onComplete }: Props) {
  const insets = useSafeAreaInsets();
  const [ix, setIx] = useState(0);
  const { profile, setField } = useProfile();
  const { scores, setTotal } = useScores();

  const step = ONBOARDING_STEPS[ix];
  const total = ONBOARDING_STEPS.length;
  const progressRatio = ix / Math.max(1, total - 1);

  const goNext = () => {
    if (ix >= total - 1) void onComplete();
    else setIx((p) => p + 1);
  };
  const goBack = () => ix > 0 && setIx((p) => p - 1);

  const handleSelect = (key: OnboardingQuestionKey, value: string) => {
    if (
      key === "school" ||
      key === "grade" ||
      key === "club" ||
      key === "juku" ||
      key === "englishSlots" ||
      key === "mathSlots" ||
      key === "username"
    ) {
      setField(key, value);
    } else if (key === "englishTarget") {
      const num = parseInt(value, 10);
      if (!Number.isNaN(num)) setTotal("english", num);
    } else if (key === "mathTarget") {
      const num = parseInt(value, 10);
      if (!Number.isNaN(num)) setTotal("math", num);
    }
  };

  const bottomPad = Math.max(20, insets.bottom + 12);
  const fabBottom = bottomPad + 8;

  const body = renderStepBody(step, {
    profile,
    scores,
    handleSelect,
    goNext,
    bottomPad,
  });

  const showFab = step.kind === "feature" || step.kind === "question";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: UI_SCREEN }} edges={["top"]}>
      <ProgressHeader ratio={progressRatio} onBack={goBack} showBack={ix > 0} />
      <View style={{ flex: 1 }}>{body}</View>
      {showFab && (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            right: 20,
            bottom: fabBottom,
          }}
        >
          <FabNext onPress={goNext} />
        </View>
      )}
    </SafeAreaView>
  );
}

type RenderCtx = {
  profile: ReturnType<typeof useProfile>["profile"];
  scores: ReturnType<typeof useScores>["scores"];
  handleSelect: (k: OnboardingQuestionKey, v: string) => void;
  goNext: () => void;
  bottomPad: number;
};

function renderStepBody(step: OnboardingStep, ctx: RenderCtx) {
  switch (step.kind) {
    case "hero":
      return <HeroSlide variant={step.variant} bottomPad={ctx.bottomPad} onNext={ctx.goNext} />;
    case "feature":
      return <FeatureSlide variant={step.variant} bottomPad={ctx.bottomPad} onNext={ctx.goNext} />;
    case "account_intro":
      return <AccountIntroSlide bottomPad={ctx.bottomPad} onNext={ctx.goNext} />;
    case "question":
      return (
        <QuestionSlide
          qkey={step.key}
          profile={ctx.profile}
          scores={ctx.scores}
          onSelect={ctx.handleSelect}
          bottomPad={ctx.bottomPad}
        />
      );
    case "post_setup":
      return <PostOnboardingSetupFlow bottomPad={ctx.bottomPad} onComplete={ctx.goNext} />;
    default:
      return null;
  }
}

function HeroSlide({
  variant,
  bottomPad,
  onNext,
}: {
  variant: "morning" | "night" | "welcome";
  bottomPad: number;
  onNext: () => void;
}) {
  if (variant === "welcome") {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ height: HERO_H, backgroundColor: "#e0f2fe", overflow: "hidden" }}>
          <HeroDecor />
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 24 }}>
            <AibouMascot size={88} />
          </View>
        </View>
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 28 }}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "800",
              color: "#0c4a6e",
              lineHeight: 34,
            }}
          >
            {"AIBOUへようこそ"}
          </Text>
          <Text
            style={{
              marginTop: 14,
              fontSize: 15,
              lineHeight: 24,
              color: "#0369a1",
            }}
          >
            自己実現に向けた学習計画を、いっしょに続けやすくする相棒です。まずは流れだけ、さっと見ていきましょう。
          </Text>
          <View style={{ flex: 1 }} />
          <GradientPillButton title="つぎへ" onPress={onNext} style={{ marginBottom: bottomPad }} />
        </View>
      </View>
    );
  }

  const morning = variant === "morning";
  return (
    <View style={{ flex: 1 }}>
      <View style={{ height: HERO_H, backgroundColor: morning ? "#e0f2fe" : "#1e293b", overflow: "hidden" }}>
        <HeroDecor />
        {!morning && (
          <View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "rgba(15,23,42,0.35)" },
            ]}
          />
        )}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 24 }}>
          <AibouMascot size={88} />
        </View>
      </View>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 28 }}>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "800",
            color: morning ? "#0c4a6e" : "#0f172a",
            lineHeight: 34,
          }}
        >
          {morning
            ? "朝、目覚めた瞬間から\n一日のはじまりを応援"
            : "夜、気持ちが沈むときも\n隣で見ています"}
        </Text>
        <Text
          style={{
            marginTop: 14,
            fontSize: 15,
            lineHeight: 24,
            color: morning ? "#0369a1" : UI_TEXT_SECONDARY,
          }}
        >
          {morning
            ? "今日も自分らしく勉強できるように、相棒がすみつきを支えます。"
            : "人に話しづらい時間帯も、相棒が今日のことを一緒に整理します。"}
        </Text>
        <View style={{ flex: 1 }} />
        <GradientPillButton title="つぎへ" onPress={onNext} style={{ marginBottom: bottomPad }} />
      </View>
    </View>
  );
}

function FeatureSlide({
  variant,
  bottomPad,
}: {
  variant: "wave" | "trust" | "midnight";
  bottomPad: number;
  onNext: () => void;
}) {
  if (variant === "midnight") {
    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: bottomPad + 72, paddingHorizontal: 22 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", columnGap: 10, marginBottom: 8 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: "#cffafe",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Moon size={26} color="#0e7490" strokeWidth={2.2} />
          </View>
          <Sparkles size={22} color={TEAL_TINT} strokeWidth={2} />
        </View>
        <Text style={[styles.featureTitle, { color: "#0f172a" }]}>
          相棒のボタンから、{"\n"}いつでも計画を再立案できます
        </Text>
        <Text style={styles.featureSub}>
          「計画の修正がめんどくさい」は受験でもよくある壁です。AIBOUでは、ホームから相棒（再立案）に進み、状況や要望を伝えると学習タスクや予定の組み直し案を出せます。夜中に自動で勝手に進むのではなく、あなたのタイミングで相棒に預けて整えられます。
        </Text>
        <View
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: UI_RADIUS_LG,
            backgroundColor: "#f0fdfa",
            borderWidth: 1,
            borderColor: "#99f6e4",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#134e4a", marginBottom: 6 }}>
            このアプリの強み
          </Text>
          <Text style={{ fontSize: 14, lineHeight: 22, color: UI_TEXT_SECONDARY }}>
            意志力に頼り切らず、毎日ちゃんと「次の一手」がそろうこと。手を動かす前に計画で消耗しないこと。まずはそこを、できるだけ楽にします。
          </Text>
        </View>
        <View style={{ alignItems: "center", marginTop: 24 }}>
          <AibouMascot size={72} />
        </View>
      </ScrollView>
    );
  }
  if (variant === "wave") {
    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: bottomPad + 72, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.featureTitle}>ひとりでは気づきにくい{"\n"}ペースの波が見えてくる</Text>
        <Text style={styles.featureSub}>
          タスクのこなれ具合やゴールの進みから、相棒が「いまの負荷」をなめらかに可視化します。
        </Text>
        <View style={{ marginTop: 8 }}>
          <WaveInsightVisual />
          <View style={{ alignItems: "center", marginTop: 20 }}>
            <AibouMascot size={72} />
          </View>
        </View>
      </ScrollView>
    );
  }
  if (variant === "trust") {
    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: bottomPad + 72, paddingHorizontal: 22 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.featureTitle, { textAlign: "center", color: TEAL_TINT }]}>
          計画と振り返りの型を{"\n"}毎日コンパクトにお届け
        </Text>
        <View
          style={{
            marginTop: 20,
            borderRadius: UI_RADIUS_XL,
            overflow: "hidden",
            height: 200,
            backgroundColor: UI_MUTED,
            borderWidth: 1,
            borderColor: UI_BORDER,
          }}
        >
          <View style={{ flex: 1, backgroundColor: "#e0f2fe", padding: 16, justifyContent: "flex-end" }}>
            <View
              style={{
                alignSelf: "flex-start",
                backgroundColor: TEAL_TINT,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>AIBOU 研究メモ</Text>
            </View>
          </View>
        </View>
        <Text style={[styles.featureSub, { textAlign: "center", marginTop: 16 }]}>
          受験スケジュールの組み立て方や、小さな振り返りのコツを、相棒があなたのデータに合わせて短くまとめます。
        </Text>
        <View
          style={{
            marginTop: 24,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            paddingVertical: 16,
            borderRadius: UI_RADIUS_LG,
            borderWidth: 1,
            borderColor: UI_BORDER,
            backgroundColor: UI_SCREEN,
          }}
        >
          <Text style={{ fontWeight: "800", color: UI_TEXT, fontSize: 16 }}>AIBOU</Text>
          <Text style={{ color: UI_TEXT_TERTIARY }}>×</Text>
          <Text style={{ fontWeight: "600", color: UI_TEXT_SECONDARY }}>あなたのペース</Text>
        </View>
      </ScrollView>
    );
  }
  return null;
}

function AccountIntroSlide({ bottomPad, onNext }: { bottomPad: number; onNext: () => void }) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 24 }}>
      <Text style={[styles.featureTitle, { marginTop: 8 }]}>
        最初の計画のために、{"\n"}少しだけヒアリングします
      </Text>
      <Text style={styles.featureSub}>
        学校・学年・部活動・課外活動の時間・塾・コマ・目標点など、あなたの情報を教えてください。入れてもらえるほど、最初の立案が現実に近づきます。あとからマイページでも変更できます。
      </Text>
      <View style={{ marginTop: 20, gap: 12 }}>
        {[
          "所要時間の目安はおよそ2分です",
          "選ばなくても先に進められます（あとから直せます）",
          "計画の組み直しは相棒フローからいつでも実行できます",
        ].map((t) => (
          <View key={t} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
            <Text style={{ color: TEAL_TINT, fontWeight: "800" }}>•</Text>
            <Text style={{ flex: 1, fontSize: 15, color: UI_TEXT, lineHeight: 22 }}>{t}</Text>
          </View>
        ))}
      </View>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <AibouMascot size={96} />
      </View>
      <GradientPillButton title="つぎへ" onPress={onNext} style={{ marginBottom: bottomPad }} />
    </View>
  );
}

function QuestionSlide({
  qkey,
  profile,
  scores,
  onSelect,
  bottomPad,
}: {
  qkey: OnboardingQuestionKey;
  profile: ReturnType<typeof useProfile>["profile"];
  scores: ReturnType<typeof useScores>["scores"];
  onSelect: (k: OnboardingQuestionKey, v: string) => void;
  bottomPad: number;
}) {
  const Icon = QUESTION_ICONS[qkey];
  let currentValue: string | undefined;
  if (
    qkey === "school" ||
    qkey === "grade" ||
    qkey === "club" ||
    qkey === "juku" ||
    qkey === "englishSlots" ||
    qkey === "mathSlots" ||
    qkey === "username"
  ) {
    currentValue = profile[qkey as ProfileKey];
  } else if (qkey === "englishTarget") {
    currentValue = String(scores.english.total);
  } else if (qkey === "mathTarget") {
    currentValue = String(scores.math.total);
  }
  const options =
    qkey === "englishTarget" || qkey === "mathTarget"
      ? TARGET_OPTIONS
      : PROFILE_OPTIONS[qkey as ProfileKey];

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: bottomPad + 88,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={{ alignItems: "center", marginBottom: 16 }}>
        <View style={styles.qIconWrap}>
          <Icon size={26} color={PRIMARY} strokeWidth={2} />
        </View>
        <Text style={styles.qTitle}>{QUESTION_LABELS[qkey]}</Text>
        {currentValue ? (
          <Text style={{ fontSize: 12, color: UI_TEXT_SECONDARY, marginTop: 4 }}>
            選択中: {qkey === "club" ? getClubDisplayForUi(currentValue) : currentValue}
          </Text>
        ) : null}
      </View>
      {qkey === "username" ? (
        <View style={styles.qCard}>
          <TextInput
            value={currentValue ?? ""}
            onChangeText={(v) => onSelect("username", v)}
            placeholder="例: ゆいと"
            autoCapitalize="none"
            style={styles.qInput}
          />
        </View>
      ) : qkey === "club" ? (
        <ClubSchedulePicker
          value={profile.club}
          school={profile.school}
          onChange={(v) => onSelect("club", v)}
          contentBottomPad={bottomPad + 72}
        />
      ) : (
        <View style={styles.qCard}>
          <ScrollView style={{ maxHeight: WIN_H * 0.42 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {options.map((opt) => {
              const selected = opt === currentValue;
              return (
                <Pressable
                  key={opt}
                  onPress={() => onSelect(qkey, opt)}
                  style={[
                    styles.qOption,
                    selected && styles.qOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.qOptionText,
                      selected && styles.qOptionTextSelected,
                    ]}
                  >
                    {opt}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}

function FinishSlide({
  bottomPad,
  onComplete,
  juku,
}: {
  bottomPad: number;
  onComplete: () => void;
  juku?: string;
}) {
  const tetsu = juku === "鉄緑会";
  return (
    <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 32 }}>
      <Text style={[styles.featureTitle, { textAlign: "center" }]}>セットアップ完了</Text>
      <Text style={[styles.featureSub, { textAlign: "center", marginTop: 12 }]}>
        プロフィールに合わせて、目標点数から逆算したタスクをカレンダー上に配置しました。ホームでは今日の時間帯に表示されます。
      </Text>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        {tetsu ? (
          <View
            style={{
              padding: 22,
              borderRadius: UI_RADIUS_XL,
              backgroundColor: "#f0fdfa",
              borderWidth: 1,
              borderColor: "#99f6e4",
              maxWidth: 320,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#134e4a", textAlign: "center" }}>
              鉄緑会ペースの初期計画
            </Text>
            <Text style={{ fontSize: 13, color: UI_TEXT_SECONDARY, textAlign: "center", marginTop: 8, lineHeight: 20 }}>
              通常授業1周目の宿題・復習が未完の想定です。8月の校内模試（最初の土曜想定）まで逆算したタスク列を並べています。
            </Text>
          </View>
        ) : (
          <View
            style={{
              padding: 22,
              borderRadius: UI_RADIUS_XL,
              backgroundColor: PRIMARY_LIGHT,
              borderWidth: 1,
              borderColor: "#bfdbfe",
              maxWidth: 320,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: PRIMARY, textAlign: "center" }}>
              あなた用のスタートセット
            </Text>
            <Text style={{ fontSize: 13, color: UI_TEXT_SECONDARY, textAlign: "center", marginTop: 8, lineHeight: 20 }}>
              空き時間帯に英数タスクをばらしています。データタブやゴールからいつでも調整できます。
            </Text>
          </View>
        )}
        <View style={{ marginTop: 24 }}>
          <AibouMascot size={88} />
        </View>
      </View>
      <GradientPillButton title="ホームへ" onPress={onComplete} style={{ marginBottom: bottomPad }} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: UI_MUTED,
    alignItems: "center",
    justifyContent: "center",
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: UI_BORDER,
    marginTop: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: TEAL_TINT,
    borderRadius: 2,
  },
  featureTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0c4a6e",
    lineHeight: 32,
  },
  featureSub: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 24,
    color: UI_TEXT_SECONDARY,
  },
  qIconWrap: {
    marginBottom: 10,
    borderRadius: 999,
    backgroundColor: PRIMARY_LIGHT,
    padding: 12,
  },
  qTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: UI_TEXT,
  },
  qCard: {
    borderRadius: UI_RADIUS_XL,
    backgroundColor: UI_SCREEN,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: UI_BORDER,
    ...uiCardShadow,
  },
  qInput: {
    borderWidth: 1,
    borderColor: UI_BORDER,
    borderRadius: UI_RADIUS_MD,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: UI_TEXT,
    backgroundColor: UI_MUTED,
  },
  qOption: {
    borderRadius: UI_RADIUS_MD,
    borderWidth: 1,
    borderColor: UI_BORDER,
    backgroundColor: UI_SCREEN,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  qOptionSelected: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY_LIGHT,
  },
  qOptionText: {
    fontSize: 15,
    color: UI_TEXT,
    textAlign: "center",
  },
  qOptionTextSelected: {
    color: PRIMARY,
    fontWeight: "700",
  },
});
