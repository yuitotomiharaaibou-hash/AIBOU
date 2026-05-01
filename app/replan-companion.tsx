import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowRight, Check, ChevronLeft, X } from "lucide-react-native";
import { useTasks, getTodayKey } from "@/context/TasksContext";
import { useHomeSchedule, type DayPlanItem } from "@/context/HomeScheduleContext";
import { useProfile } from "@/context/ProfileContext";
import { buildAiCompanionSessionContext } from "@/lib/buildAiCompanionSessionContext";
import { inferHomeScheduleLevels } from "@/lib/homeScheduleInference";
import { getTomorrowKey } from "@/lib/tomorrowPlan";
import { planTitleShortDisplay } from "@/lib/planTitleDisplay";
import type { AiTomorrowPlanResult, CompanionAiChain } from "@/lib/aiTomorrowPlanner";

/** companionChain が空でも phaseNotes / reason を4段に割り当てて具体表示する */
function syntheticCompanionChain(d: AiTomorrowPlanResult | null): CompanionAiChain | null {
  if (!d) return null;
  const c = d.companionChain;
  if (
    c?.execution?.trim() ||
    c?.goal?.trim() ||
    c?.information?.trim() ||
    c?.placement?.trim()
  ) {
    return c;
  }
  const notes = (d.phaseNotes ?? []).map((x) => x.trim()).filter(Boolean);
  if (notes.length === 0 && !d.reason?.trim()) return null;
  const execution = notes[0] ?? d.reason ?? "";
  const goal = notes[1] ?? d.changeSummary ?? "";
  const information =
    notes.length > 3 ? notes.slice(2, -1).join(" ") : notes[2] ?? "";
  const placement =
    notes.length > 1 ? notes[notes.length - 1]! : d.changeSummary ?? "";
  if (!execution && !goal && !information && !placement) return null;
  return { execution, goal, information, placement };
}

type FlowStep = {
  key: "実行" | "目標" | "情報" | "立案";
  summary: string;
  logic: string[];
};

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

const THINKING_INTRO =
  "前提として、カレンダー事実・タスク状況・あなたの要望を揃えました。\n\n" +
  "このあと「実行 → 目標 → 不足情報 → 立案」の順に、一段ずつ追記していきます。\n\n";

type SourceApprovalRow = { id: string; changeLine: string; reasonLine: string; sourceIds: string[] };

function sharedReasonSnippet(d: AiTomorrowPlanResult): string {
  return [d.reason, d.changeSummary, ...(d.phaseNotes ?? []).slice(0, 2)]
    .filter((x): x is string => Boolean(x && String(x).trim()))
    .join("。")
    .replace(/\s+/g, " ")
    .slice(0, 160);
}

function formatFlowSteps(flow: FlowStep[], from: number, toExclusive: number): string {
  let s = "";
  for (let i = from; i < toExclusive && i < flow.length; i++) {
    const step = flow[i]!;
    s += `STEP ${i + 1} · ${step.key}\n\n`;
    s += `${step.summary}\n\n`;
    for (const line of step.logic) {
      s += `・${line}\n`;
    }
    s += "\n";
  }
  return s.trimEnd();
}

function mergeSourceRowsMax3(rows: SourceApprovalRow[]): SourceApprovalRow[] {
  if (rows.length <= 3) return rows;
  const a = rows[0]!;
  const b = rows[1]!;
  const tail = rows.slice(2);
  return [
    a,
    b,
    {
      id: "merged-more",
      changeLine: `ほかの変更（${tail.length}件をまとめて反映）`,
      reasonLine: tail
        .map((t) => `${t.changeLine}（${t.reasonLine.slice(0, 72)}）`)
        .join(" / ")
        .slice(0, 220),
      sourceIds: tail.flatMap((t) => t.sourceIds),
    },
  ];
}

function buildSourceApprovalRowsMain(d: AiTomorrowPlanResult | null): SourceApprovalRow[] {
  if (!d) return [];
  const snip = sharedReasonSnippet(d);
  const row = (id: string, changeLine: string, reasonHint: string): SourceApprovalRow => ({
    id,
    changeLine,
    reasonLine: `${reasonHint} — ${snip}`.replace(/ — $/, "").slice(0, 220),
    sourceIds: [id],
  });
  const raw: SourceApprovalRow[] = [];
  if (d.taskMonthClear) {
    raw.push(
      row(
        "task-month",
        `月クリア ${d.taskMonthClear.yearMonth}${d.taskMonthClear.includePinned ? "（ピン含む）" : ""}`,
        "月内の学習タスクを一括整理する提案です。"
      )
    );
  }
  if ((d.taskDeletes?.length ?? 0) > 0) {
    raw.push(row("task-del", `タスク削除 ${d.taskDeletes!.length}件`, "一覧からの削除を反映します。"));
  }
  if ((d.taskAdjustments?.length ?? 0) > 0) {
    raw.push(row("task-adj", `日時変更 ${d.taskAdjustments!.length}件`, "日付・開始時刻の移動を反映します。"));
  }
  if ((d.taskCreates?.length ?? 0) > 0) {
    raw.push(row("task-new", `新規タスク ${d.taskCreates!.length}件`, "追加タスクを反映します。"));
  }
  if ((d.homePlanOps?.length ?? 0) > 0) {
    raw.push(row("home", `ホーム予定 ${d.homePlanOps!.length}操作`, "カレンダーブロックの整理を反映します。"));
  }
  return mergeSourceRowsMax3(raw);
}

function applyRejectSourceIdMain(next: AiTomorrowPlanResult, sid: string) {
  switch (sid) {
    case "task-month":
      next.taskMonthClear = undefined;
      break;
    case "task-del":
      next.taskDeletes = [];
      break;
    case "task-adj":
      next.taskAdjustments = [];
      break;
    case "task-new":
      next.taskCreates = [];
      break;
    case "home":
      next.homePlanOps = [];
      break;
    default:
      break;
  }
}

function questionsFingerprint(d: AiTomorrowPlanResult | null): string {
  const qs = d?.questions ?? [];
  if (qs.length === 0) return "";
  return qs.map((q) => q.id).join("\x1e");
}

function filterCompanionDraftBySourceRows(
  d: AiTomorrowPlanResult,
  rows: SourceApprovalRow[],
  checks: Record<string, boolean>
): AiTomorrowPlanResult {
  const next = { ...d };
  for (const row of rows) {
    if (checks[row.id] !== false) continue;
    for (const sid of row.sourceIds) {
      applyRejectSourceIdMain(next, sid);
    }
  }
  return next;
}

function formatHomePlanAiLine(p: DayPlanItem): string {
  const fmt = (m: number) => {
    const h = Math.floor(m / 60);
    const mi = m % 60;
    return `${h}:${String(mi).padStart(2, "0")}`;
  };
  return `id=${p.id} ${fmt(p.startMin)}-${fmt(p.endMinExclusive)} title=${planTitleShortDisplay(p.title)}`;
}

function labelFromDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map((v) => parseInt(v, 10));
  const dt = new Date(y, m - 1, d);
  const day = DAY_LABELS[dt.getDay()];
  return `${m}/${d} (${day})`;
}

function buildReviewFlow(input: {
  userNote: string;
  answers: string[];
  hasPlans: boolean;
  companionChain?: CompanionAiChain | null;
}): FlowStep[] {
  const note = input.userNote.trim();
  const answers = input.answers.filter((v) => v.trim().length > 0);
  const firstAnswer = answers[0]?.trim();
  const secondAnswer = answers[1]?.trim();
  const thirdAnswer = answers[2]?.trim();
  const priority = firstAnswer || "優先成果は短期で達成可能な内容へ暫定設定";
  const constraints = secondAnswer || "制約時間は保守的に見積もって過密を回避";
  const acceptance = thirdAnswer || "完了条件は結果が分かる形で明確化";
  const noteLine =
    note.length > 0
      ? `自由要望「${note.slice(0, 200)}${note.length > 200 ? "…" : ""}」`
      : answers.length > 0
        ? `AI質問への回答${answers.length}件を主入力とする（自由要望が空でもここから具体化）`
        : "自由要望・質問回答は未入力（sessionContext の事実のみで補完）";
  const baseline = input.hasPlans
    ? "既存予定を基準に負荷の偏りと未完了原因を再評価"
    : "既存予定が少ないため、着手しやすい初動を優先";
  const joinedAnswers = answers.join(" ");
  const noteMentionsPlanEdit =
    (note.length > 0 &&
      /(削除|消して|クリア|空に|全部|すべて|全て|リセット|予定|ホーム|カレンダー|タスク|月)/.test(
        note
      )) ||
    /(削除|消して|クリア|全部|すべて|全て|タスク|月)/.test(joinedAnswers);

  const splitBody = (body: string, fallback: string[]): string[] => {
    const t = body.trim();
    if (!t) return fallback;
    const chunks = t
      .split(/(?<=[。．!?？])\s*/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return chunks.length > 0 ? chunks.slice(0, 10) : [t];
  };

  const cc = input.companionChain;
  const execLogic = cc?.execution?.trim()
    ? splitBody(cc.execution, [
        `${baseline}`,
        "完了/未完了/変更の3観点で理由・意図を仮説化",
        `${noteLine}`,
      ])
    : noteMentionsPlanEdit
      ? [
          `${baseline}`,
          `整理・削除の要望がある場合、承認後は task_month_clear / task_deletes / home_plan_ops で反映（タスク繰越だけではない）。`,
          `${noteLine}`,
        ]
      : [`${baseline}`, "完了/未完了/変更の3観点で理由・意図を仮説化", `${noteLine}`];
  const goalLogic = cc?.goal?.trim()
    ? splitBody(cc.goal, [
        `優先成果: ${priority}`,
        `達成判定: ${acceptance}`,
        "未来像と現実の間に論理飛躍がないか確認",
      ])
    : [`優先成果: ${priority}`, `達成判定: ${acceptance}`, "未来像と現実の間に論理飛躍がないか確認"];
  const infoLogic = cc?.information?.trim()
    ? splitBody(cc.information, [
        `制約条件: ${constraints}`,
        "有効性・実現性・納得感の不足点を抽出",
        "説明可能な根拠を残して判断する",
      ])
    : [
        `制約条件: ${constraints}`,
        "有効性・実現性・納得感の不足点を抽出",
        "説明可能な根拠を残して判断する",
      ];
  const placementFallback = noteMentionsPlanEdit || answers.length > 0
    ? [
        note.length > 0
          ? `要望の具体: ${note.slice(0, 140)}${note.length > 140 ? "…" : ""}`
          : answers.length > 0
            ? `回答に基づく具体案: 優先「${(answers[0] ?? "").slice(0, 100)}${(answers[0] ?? "").length > 100 ? "…" : ""}」→制約「${(answers[1] ?? "").slice(0, 80)}」→条件「${(answers[2] ?? "").slice(0, 80)}」`
            : "目標細分化から当日配置までを一貫ルートで構築",
        "実行の事実→目標の細分化（日付入り）→タスクリスト→カレンダー配分→明日の打ち手まで、一文脈でつなぐ（方針だけ書かない）。",
        "例: 夜に眠いならその時間帯の予定は翌朝へ（home_plan_ops と taskAdjustments をセットで）。",
        "例: ◯月の学習タスク全削除は task_month_clear。個別は task_deletes。予定ブロックは home_plan_ops。",
        "採択後は task_month_clear / task_deletes / taskCreates / taskAdjustments / home_plan_ops でアプリに反映。",
      ]
    : [
        "目標細分化から当日配置までを一貫ルートで構築",
        "崩れた場合の代替ルートも同時に用意",
        "採択した仮説のみ反映して再立案を確定",
      ];
  const placeLogic = cc?.placement?.trim()
    ? splitBody(cc.placement, placementFallback)
    : placementFallback;

  return [
    {
      key: "実行",
      summary: cc?.execution?.trim()
        ? "実行の振り返り（AIが事実と要望から具体化）"
        : "まず実行結果から、次に効く打ち手を逆算する",
      logic: execLogic,
    },
    {
      key: "目標",
      summary: cc?.goal?.trim()
        ? "目標の腹落ちと便益（AI具体案）"
        : "次に目標を具体化し、達成判定を固定する",
      logic: goalLogic,
    },
    {
      key: "情報",
      summary: cc?.information?.trim()
        ? "不足情報と打ち手の型（AI具体案）"
        : "目標達成に必要な不足情報とリスクを補う",
      logic: infoLogic,
    },
    {
      key: "立案",
      summary: cc?.placement?.trim()
        ? "タスク・日程・明日の打ち手（AI具体案）"
        : "目標→タスク→日程→当日配置へ逆算して計画化する",
      logic: placeLogic,
    },
  ];
}

function ChatBubble({ children, tone }: { children: ReactNode; tone: "assistant" | "system" }) {
  const isAsst = tone === "assistant";
  return (
    <View
      style={{
        alignSelf: "stretch",
        maxWidth: "100%",
        marginTop: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: isAsst ? "#e2e8f0" : "#fef9c3",
        borderWidth: 1,
        borderColor: isAsst ? "#cbd5e1" : "#fde047",
      }}
    >
      {children}
    </View>
  );
}

type ThinkingPiece =
  | { kind: "spacer" }
  | { kind: "step"; text: string }
  | { kind: "bullet"; text: string }
  | { kind: "para"; lines: string[] };

function thinkingPiecesFromText(text: string): ThinkingPiece[] {
  const rawLines = text.split(/\n/);
  const pieces: ThinkingPiece[] = [];
  let paraBuf: string[] = [];
  const flushPara = () => {
    if (paraBuf.length) {
      pieces.push({ kind: "para", lines: [...paraBuf] });
      paraBuf = [];
    }
  };
  for (const line of rawLines) {
    if (line === "") {
      flushPara();
      const last = pieces[pieces.length - 1];
      if (!last || last.kind !== "spacer") pieces.push({ kind: "spacer" });
      continue;
    }
    if (/^STEP \d+/.test(line)) {
      flushPara();
      pieces.push({ kind: "step", text: line });
      continue;
    }
    if (line.startsWith("・")) {
      flushPara();
      pieces.push({ kind: "bullet", text: line });
      continue;
    }
    paraBuf.push(line);
  }
  flushPara();
  return pieces;
}

function ThinkingStreamBody({ text, showCaret }: { text: string; showCaret: boolean }) {
  const pieces = useMemo(() => thinkingPiecesFromText(text), [text]);
  if (!text && !showCaret) return null;
  const caretEl = <Text style={{ color: "#2563eb" }}>▍</Text>;
  const lastIdx = pieces.length - 1;
  return (
    <View style={{ marginTop: 10 }}>
      {pieces.map((p, idx) => {
        const isLast = idx === lastIdx;
        const tail = isLast && showCaret ? caretEl : null;
        if (p.kind === "spacer") {
          return <View key={`s-${idx}`} style={{ height: 10 }} />;
        }
        if (p.kind === "step") {
          const stepOrdinal = pieces.slice(0, idx + 1).filter((x) => x.kind === "step").length;
          return (
            <Text
              key={`t-${idx}`}
              style={[styles.thinkingStep, stepOrdinal === 1 ? { marginTop: 2 } : { marginTop: 18 }]}
            >
              {p.text}
              {tail}
            </Text>
          );
        }
        if (p.kind === "bullet") {
          return (
            <Text key={`b-${idx}`} style={styles.thinkingBullet}>
              {p.text}
              {tail}
            </Text>
          );
        }
        return (
          <Text key={`p-${idx}`} style={styles.thinkingPara}>
            {p.lines.join("\n")}
            {tail}
          </Text>
        );
      })}
    </View>
  );
}

export default function ReplanCompanionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, userDetails } = useProfile();
  const { getPlans, ensureDayPlans, deletePlan, clearAllPlansForDay } = useHomeSchedule();
  const {
    commitTomorrowPlanNow,
    saveAiQuestionAnswers,
    proposalNotice,
    tasks,
    plannerPreference,
    prefetchCompanionAiPlan,
    companionPlanDraft,
  } = useTasks();

  const [screenStep, setScreenStep] = useState<"request" | "review">("request");
  const [focusDateKey, setFocusDateKey] = useState(() => getTodayKey());
  const [userNote, setUserNote] = useState("");
  const [questionDrafts, setQuestionDrafts] = useState<Record<string, string>>({});
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [finishing, setFinishing] = useState(false);
  const [prefetchingReview, setPrefetchingReview] = useState(false);
  const [localStatus, setLocalStatus] = useState<string | null>(null);
  const [clarifyRounds, setClarifyRounds] = useState(0);

  const companionPlanDraftRef = useRef(companionPlanDraft);
  companionPlanDraftRef.current = companionPlanDraft;
  const screenStepRef = useRef(screenStep);
  screenStepRef.current = screenStep;

  const todayKey = getTodayKey();
  const tomorrowKey = useMemo(() => getTomorrowKey(), [todayKey]);

  const todayBusySlotCount = useMemo(() => {
    const [y, m, d] = todayKey.split("-").map((v) => parseInt(v, 10));
    const levels = inferHomeScheduleLevels(new Date(y, m - 1, d), profile);
    let n = 0;
    for (let h = 0; h < 24; h++) {
      if ((levels[h] ?? 0) >= 1) n += 1;
    }
    return n;
  }, [todayKey, profile]);

  useEffect(() => {
    ensureDayPlans(focusDateKey);
  }, [focusDateKey, ensureDayPlans]);

  useEffect(() => {
    ensureDayPlans(tomorrowKey);
  }, [tomorrowKey, ensureDayPlans]);

  const planPreview = useMemo(() => {
    const plans = getPlans(focusDateKey);
    return plans.slice(0, 8).map((p) => planTitleShortDisplay(p.title));
  }, [getPlans, focusDateKey]);

  const homeTodayPlanLines = useMemo(() => {
    return getPlans(todayKey).slice(0, 24).map(formatHomePlanAiLine);
  }, [getPlans, todayKey]);

  const homeTomorrowPlanLines = useMemo(() => {
    return getPlans(tomorrowKey).slice(0, 24).map(formatHomePlanAiLine);
  }, [getPlans, tomorrowKey]);

  const aiQuestionsForReview = useMemo(() => {
    if (screenStep !== "review") return [];
    return (companionPlanDraft?.questions ?? []).slice(0, 3);
  }, [screenStep, companionPlanDraft?.questions]);

  const approvalRows = useMemo(() => buildSourceApprovalRowsMain(companionPlanDraft), [companionPlanDraft]);

  useEffect(() => {
    if (!companionPlanDraft) return;
    const rows = buildSourceApprovalRowsMain(companionPlanDraft);
    setChecks((prev) => {
      const next: Record<string, boolean> = {};
      for (const r of rows) {
        next[r.id] = prev[r.id] !== false;
      }
      return next;
    });
  }, [companionPlanDraft]);

  const toggleCheck = useCallback((id: string) => {
    setChecks((prev) => ({ ...prev, [id]: !(prev[id] !== false) }));
  }, []);

  const streamSessionRef = useRef(0);
  const typingCommittedRef = useRef("");
  const typingBufferRef = useRef("");
  const flowStepsRef = useRef<FlowStep[]>([]);
  /** いまタイプライトしているステップ番号 0..3（STEP1=実行 … STEP4=立案） */
  const typingSegmentRef = useRef(0);
  const streamInitializedRef = useRef(false);
  const questionPanelsShownRef = useRef(0);
  const resolvedQuestionsFpRef = useRef("");
  const pendingPanelFpRef = useRef("");
  const questionActionInFlightRef = useRef(false);
  const [streamTick, setStreamTick] = useState(0);
  const [displayedThinking, setDisplayedThinking] = useState("");
  const [showQuestionPanel, setShowQuestionPanel] = useState(false);
  const [streamDone, setStreamDone] = useState(false);

  const continueAfterSegment = (completedSeg: number) => {
    const next = completedSeg + 1;
    if (next >= 4) {
      setStreamDone(true);
      return;
    }
    typingSegmentRef.current = next;
    typingBufferRef.current = formatFlowSteps(flowStepsRef.current, next, next + 1);
    setStreamTick((x) => x + 1);
  };

  const onSkipQuestions = () => {
    if (questionActionInFlightRef.current) return;
    if (pendingPanelFpRef.current) {
      resolvedQuestionsFpRef.current = pendingPanelFpRef.current;
    }
    setShowQuestionPanel(false);
    continueAfterSegment(typingSegmentRef.current);
  };

  const onSubmitQuestions = () => {
    if (questionActionInFlightRef.current) return;
    void (async () => {
      questionActionInFlightRef.current = true;
      setPrefetchingReview(true);
      try {
        await executePrefetch({ skipClarifyCount: false });
      } finally {
        setPrefetchingReview(false);
        questionActionInFlightRef.current = false;
      }
      if (pendingPanelFpRef.current) {
        resolvedQuestionsFpRef.current = pendingPanelFpRef.current;
      }
      const draft = companionPlanDraftRef.current;
      const qs = (draft?.questions ?? []).slice(0, 3);
      const ans = qs.map((q) => (questionDrafts[q.id] ?? "").trim());
      flowStepsRef.current = buildReviewFlow({
        userNote,
        answers: ans,
        hasPlans: planPreview.length > 0,
        companionChain: syntheticCompanionChain(draft),
      });
      setShowQuestionPanel(false);
      continueAfterSegment(typingSegmentRef.current);
    })();
  };

  const executePrefetch = async (opts: { skipClarifyCount: boolean }) => {
    const hadQ = (companionPlanDraftRef.current?.questions?.length ?? 0) > 0;
    const aiQ = (companionPlanDraftRef.current?.questions ?? []).slice(0, 3);
    const answers: Record<string, string> = {};
    for (const q of aiQ) {
      answers[q.id] = (questionDrafts[q.id] ?? "").trim();
    }
    saveAiQuestionAnswers({
      ...answers,
      ...(userNote.trim() ? { "companion.userNote": userNote.trim() } : {}),
    });
    const sessionContext = buildAiCompanionSessionContext({
      profile,
      userDetails,
      tasks,
      todayKey,
      tomorrowKey,
      homeTodayPlanLines,
      homeTomorrowPlanLines,
      plannerPreference,
    });
    setLocalStatus(null);
    const r = await prefetchCompanionAiPlan({
      todayKey,
      tomorrowKey,
      todayBusySlotCount,
      sessionContext,
    });
    if (!r.ok) {
      setLocalStatus(
        r.error ? `案の取得に失敗しました（${r.error}）。` : "案の取得に失敗しました。"
      );
      return { ok: false as const };
    }
    if (!opts.skipClarifyCount && screenStepRef.current === "review" && hadQ) {
      setClarifyRounds((n) => Math.min(3, n + 1));
    }
    return { ok: true as const };
  };

  const goToReview = () => {
    streamSessionRef.current += 1;
    const sid = streamSessionRef.current;
    saveAiQuestionAnswers(userNote.trim() ? { "companion.userNote": userNote.trim() } : {});
    setQuestionDrafts({});
    setClarifyRounds(0);
    setLocalStatus(null);
    streamInitializedRef.current = false;
    questionPanelsShownRef.current = 0;
    resolvedQuestionsFpRef.current = "";
    pendingPanelFpRef.current = "";
    typingSegmentRef.current = 0;
    flowStepsRef.current = [];
    typingCommittedRef.current = "";
    typingBufferRef.current = "";
    setDisplayedThinking("");
    setShowQuestionPanel(false);
    setStreamDone(false);
    setScreenStep("review");
    setPrefetchingReview(true);
    void (async () => {
      try {
        await executePrefetch({ skipClarifyCount: true });
      } finally {
        if (streamSessionRef.current === sid) {
          setPrefetchingReview(false);
        }
      }
    })();
  };

  useEffect(() => {
    if (screenStep !== "review") return;
    if (prefetchingReview) return;
    if (!companionPlanDraft) {
      setStreamDone(true);
      return;
    }
    if (streamInitializedRef.current) return;
    streamInitializedRef.current = true;
    const draft = companionPlanDraft;
    const flow = buildReviewFlow({
      userNote,
      answers: [],
      hasPlans: planPreview.length > 0,
      companionChain: syntheticCompanionChain(draft),
    });
    flowStepsRef.current = flow;
    typingSegmentRef.current = 0;
    typingCommittedRef.current = "";
    typingBufferRef.current = THINKING_INTRO + formatFlowSteps(flow, 0, 1);
    setDisplayedThinking("");
    setStreamTick((x) => x + 1);
  }, [screenStep, prefetchingReview, companionPlanDraft, userNote, planPreview.length]);

  useEffect(() => {
    if (screenStep !== "review") return;
    if (!typingBufferRef.current.length) return;
    let pos = 0;
    const id = setInterval(() => {
      const buf = typingBufferRef.current;
      if (!buf.length) {
        clearInterval(id);
        return;
      }
      pos = Math.min(buf.length, pos + 2);
      setDisplayedThinking(typingCommittedRef.current + buf.slice(0, pos));
      if (pos >= buf.length) {
        clearInterval(id);
        typingCommittedRef.current += buf;
        typingBufferRef.current = "";
        const completedSeg = typingSegmentRef.current;
        const d = companionPlanDraftRef.current;
        const fp = questionsFingerprint(d);
        setDisplayedThinking(typingCommittedRef.current);
        if (
          fp.length > 0 &&
          questionPanelsShownRef.current < 3 &&
          fp !== resolvedQuestionsFpRef.current
        ) {
          pendingPanelFpRef.current = fp;
          questionPanelsShownRef.current += 1;
          setShowQuestionPanel(true);
          return;
        }
        continueAfterSegment(completedSeg);
      }
    }, 20);
    return () => clearInterval(id);
  }, [streamTick, screenStep]);

  const canFinish = streamDone && Boolean(companionPlanDraft);

  const finish = async () => {
    if (!companionPlanDraft) {
      setLocalStatus("先に「思考と承認へ」で案を取得してください。");
      return;
    }
    if (!canFinish) {
      setLocalStatus("STEP4までの思考表示が終わるまでお待ちください（確認はスキップ可）。");
      return;
    }
    const aiQ = (companionPlanDraft.questions ?? []).slice(0, 3);
    const answers: Record<string, string> = {};
    for (const q of aiQ) {
      answers[q.id] = (questionDrafts[q.id] ?? "").trim();
    }
    saveAiQuestionAnswers({
      ...answers,
      ...(userNote.trim() ? { "companion.userNote": userNote.trim() } : {}),
    });
    const filtered = filterCompanionDraftBySourceRows(companionPlanDraft, approvalRows, checks);
    setLocalStatus(null);
    setFinishing(true);
    try {
      const sessionContext = buildAiCompanionSessionContext({
        profile,
        userDetails,
        tasks,
        todayKey,
        tomorrowKey,
        homeTodayPlanLines,
        homeTomorrowPlanLines,
        plannerPreference,
      });
      const ok = await commitTomorrowPlanNow({
        todayKey,
        tomorrowKey,
        todayBusySlotCount,
        sessionContext,
        reusePrefetchDraft: false,
        prefetchedPlanOverride: filtered,
        applyHomePlanOps: (ops) => {
          for (const op of ops) {
            if (op.op === "clear_day") {
              ensureDayPlans(op.date);
              clearAllPlansForDay(op.date);
            } else if (op.op === "delete") {
              ensureDayPlans(op.date);
              for (const id of op.planIds) deletePlan(op.date, id);
            }
          }
        },
      });
      if (!ok) {
        setLocalStatus("AIの確認待ち、または接続エラーです。質問に答えて再推論するか、メッセージを確認してください。");
        return;
      }
      router.replace({
        pathname: "/(tabs)/home",
        params: { companionViewDate: focusDateKey },
      });
    } finally {
      setFinishing(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f1f5f9" }} edges={["top"]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 10,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: "#e2e8f0",
          backgroundColor: "#ffffff",
        }}
      >
        {screenStep === "review" ? (
          <Pressable
            onPress={() => {
              setScreenStep("request");
              streamInitializedRef.current = false;
              questionPanelsShownRef.current = 0;
              resolvedQuestionsFpRef.current = "";
              pendingPanelFpRef.current = "";
              typingSegmentRef.current = 0;
              flowStepsRef.current = [];
              typingCommittedRef.current = "";
              setStreamDone(false);
              setDisplayedThinking("");
              setShowQuestionPanel(false);
              typingBufferRef.current = "";
            }}
            hitSlop={10}
            style={{ flexDirection: "row", alignItems: "center", columnGap: 4, minWidth: 88 }}
          >
            <ChevronLeft size={22} color="#64748b" />
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#64748b" }}>要望</Text>
          </Pressable>
        ) : (
          <View style={{ minWidth: 88 }} />
        )}
        <Text style={{ fontSize: 15, fontWeight: "800", color: "#0f172a", flex: 1, textAlign: "center" }}>
          相棒と見直す
        </Text>
        <Pressable
          onPress={() =>
            router.replace({
              pathname: "/(tabs)/home",
              params: { companionViewDate: focusDateKey },
            })
          }
          hitSlop={10}
          style={{ flexDirection: "row", alignItems: "center", columnGap: 4, minWidth: 88, justifyContent: "flex-end" }}
        >
          <X size={22} color="#64748b" />
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#64748b" }}>閉じる</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 28 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        {screenStep === "request" ? (
          <>
            <Text style={styles.lead}>
              まず対象日と要望だけを決めます。次の画面で AI が思考を進め、必要ならそこでだけ質問します。
            </Text>

            <Text style={styles.sectionTitle}>対象の日</Text>
            <View style={styles.dayToggleRow}>
              <Pressable
                onPress={() => setFocusDateKey(todayKey)}
                style={[styles.dayChip, focusDateKey === todayKey && styles.dayChipOn]}
              >
                <Text style={[styles.dayChipText, focusDateKey === todayKey && styles.dayChipTextOn]}>今日</Text>
              </Pressable>
              <Pressable
                onPress={() => setFocusDateKey(tomorrowKey)}
                style={[styles.dayChip, focusDateKey === tomorrowKey && styles.dayChipOn]}
              >
                <Text style={[styles.dayChipText, focusDateKey === tomorrowKey && styles.dayChipTextOn]}>明日</Text>
              </Pressable>
            </View>
            <Text style={styles.dateSubLabel}>{labelFromDateKey(focusDateKey)}</Text>

            <Text style={[styles.sectionTitle, { marginTop: 14 }]}>この日の予定（抜粋）</Text>
            <View style={styles.planBox}>
              {planPreview.length === 0 ? (
                <Text style={styles.muted}>予定がありません</Text>
              ) : (
                planPreview.map((t, i) => (
                  <Text key={`${i}-${t}`} style={styles.planLine}>
                    ・{t}
                  </Text>
                ))
              )}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 14 }]}>自由要望</Text>
            <TextInput
              value={userNote}
              onChangeText={setUserNote}
              placeholder="例: 明日は午後から忙しい / 英語を厚めにしたい"
              multiline
              style={styles.noteInput}
              placeholderTextColor="#94a3b8"
            />
          </>
        ) : (
          <>
            <Text style={styles.lead}>
              思考は下にリアルタイムで追記されます。必要なら途中に確認ボックスが出ます（最大3回）。終わったら変更内容と理由を最大3件まで選んで承認します。
            </Text>

            <Text style={[styles.sectionTitle, { marginTop: 4 }]}>対象の日</Text>
            <Text style={styles.dateSubLabel}>{labelFromDateKey(focusDateKey)}</Text>

            <Text style={[styles.phaseTitle, { marginTop: 18 }]}>思考の流れ</Text>
            <Text style={styles.phaseCaption}>
              段落・見出し・箇条書きを分けて表示します。内容は下へ追記されていきます。
            </Text>

            <ChatBubble tone="assistant">
              <Text style={{ fontSize: 12, fontWeight: "800", color: "#334155" }}>相棒</Text>
              {prefetchingReview && !displayedThinking ? (
                <View style={{ flexDirection: "row", alignItems: "center", columnGap: 8, marginTop: 10 }}>
                  <ActivityIndicator color="#475569" />
                  <Text style={{ fontSize: 13, color: "#475569" }}>要望とスケジュールから案を組み立てています…</Text>
                </View>
              ) : null}
              <ThinkingStreamBody
                text={displayedThinking}
                showCaret={!streamDone && displayedThinking.length > 0}
              />
            </ChatBubble>

            {showQuestionPanel ? (
              <ChatBubble tone="system">
                <Text style={{ fontSize: 12, fontWeight: "800", color: "#854d0e" }}>確認（このやり取りは最大3回）</Text>
                {aiQuestionsForReview.map((q, idx) => (
                  <View key={q.id} style={{ marginTop: idx === 0 ? 10 : 12 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#713f12" }}>
                      Q{idx + 1}. {q.text}
                    </Text>
                    <TextInput
                      value={questionDrafts[q.id] ?? ""}
                      onChangeText={(v) => setQuestionDrafts((p) => ({ ...p, [q.id]: v }))}
                      placeholder="回答を入力（空のままスキップも可）"
                      multiline
                      style={[styles.noteInput, { minHeight: 56, marginTop: 6 }]}
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                ))}
                {!prefetchingReview ? (
                  <View style={{ flexDirection: "row", columnGap: 10, marginTop: 14 }}>
                    <Pressable
                      onPress={onSkipQuestions}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: "#cbd5e1",
                        backgroundColor: "#f8fafc",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "700", color: "#64748b" }}>スキップ</Text>
                    </Pressable>
                    <Pressable
                      onPress={onSubmitQuestions}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 10,
                        backgroundColor: "#2563eb",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "700", color: "#ffffff" }}>回答を反映</Text>
                    </Pressable>
                  </View>
                ) : null}
                {prefetchingReview ? (
                  <View style={{ flexDirection: "row", alignItems: "center", columnGap: 8, marginTop: 10 }}>
                    <ActivityIndicator color="#854d0e" />
                    <Text style={{ fontSize: 12, color: "#713f12" }}>回答を反映しています…</Text>
                  </View>
                ) : null}
              </ChatBubble>
            ) : null}

            {proposalNotice || localStatus ? (
              <View style={[styles.noticeBox, { marginTop: 10 }]}>
                <Text style={styles.noticeText}>{proposalNotice ?? localStatus}</Text>
              </View>
            ) : null}

            {streamDone ? (
              <>
                <Text style={[styles.phaseTitle, { marginTop: 22 }]}>承認する変更</Text>
                <Text style={styles.phaseCaption}>
                  最大3件。チェックを外した行は反映しません（既定オン）。
                  {companionPlanDraft?.source === "ai" ? " 接続あり" : " フォールバック"}
                  {companionPlanDraft?.error ? `（${companionPlanDraft.error}）` : ""}
                </Text>

                {approvalRows.length === 0 ? (
                  <Text style={[styles.muted, { marginTop: 10 }]}>
                    この案に構造化された変更はありません。
                  </Text>
                ) : (
                  approvalRows.map((row) => (
                    <Pressable
                      key={row.id}
                      onPress={() => toggleCheck(row.id)}
                      style={[
                        styles.checkRow,
                        {
                          marginTop: 10,
                          borderColor: checks[row.id] !== false ? "#93c5fd" : "#e2e8f0",
                          backgroundColor: checks[row.id] !== false ? "#eff6ff" : "#f8fafc",
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.checkBox,
                          {
                            borderColor: checks[row.id] !== false ? "#2563eb" : "#94a3b8",
                            backgroundColor: checks[row.id] !== false ? "#2563eb" : "#ffffff",
                          },
                        ]}
                      >
                        {checks[row.id] !== false ? <Check size={14} color="#ffffff" strokeWidth={3} /> : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.checkTitle, { marginBottom: 4 }]}>{row.changeLine}</Text>
                        <Text style={styles.approvalReason}>{row.reasonLine}</Text>
                      </View>
                    </Pressable>
                  ))
                )}
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {screenStep === "request" ? (
          <Pressable onPress={goToReview} style={styles.nextFab}>
            <Text style={styles.nextFabText}>思考と承認へ</Text>
            <ArrowRight size={20} color="#ffffff" />
          </Pressable>
        ) : (
          <Pressable
            onPress={() => void finish()}
            disabled={finishing || !canFinish}
            style={[styles.nextFab, (finishing || !canFinish) && { opacity: 0.55 }]}
          >
            {finishing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.nextFabText}>承認して反映して戻る</Text>
                <ArrowRight size={20} color="#ffffff" />
              </>
            )}
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  lead: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 21,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1e40af",
    letterSpacing: 0.3,
  },
  dayToggleRow: {
    marginTop: 10,
    flexDirection: "row",
    columnGap: 10,
  },
  dayChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    alignItems: "center",
  },
  dayChipOn: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  dayChipText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#64748b",
  },
  dayChipTextOn: {
    color: "#1d4ed8",
  },
  dateSubLabel: {
    marginTop: 8,
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  planBox: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    padding: 12,
  },
  planLine: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
  },
  muted: {
    fontSize: 11,
    color: "#64748b",
    lineHeight: 16,
  },
  noteInput: {
    marginTop: 8,
    minHeight: 100,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#ffffff",
    textAlignVertical: "top",
  },
  phaseTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },
  phaseCaption: {
    marginTop: 4,
    fontSize: 13,
    color: "#475569",
  },
  thinkingStep: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1e40af",
    letterSpacing: 0.2,
    lineHeight: 18,
  },
  thinkingPara: {
    fontSize: 13,
    color: "#0f172a",
    lineHeight: 22,
    marginTop: 2,
  },
  thinkingBullet: {
    fontSize: 13,
    color: "#0f172a",
    lineHeight: 22,
    marginTop: 6,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: "#cbd5e1",
  },
  noticeBox: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  noticeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1e3a8a",
    lineHeight: 18,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1e40af",
  },
  flowCard: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dbeafe",
    backgroundColor: "#ffffff",
    padding: 12,
  },
  flowStepLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1d4ed8",
    letterSpacing: 0.3,
  },
  flowSummary: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  flowLine: {
    fontSize: 12,
    color: "#334155",
    lineHeight: 18,
  },
  checkRow: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    columnGap: 10,
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  approvalReason: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    alignItems: "flex-end",
  },
  nextFab: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
    backgroundColor: "#2563eb",
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 999,
    shadowColor: "#1e40af",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  nextFabText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryFab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    columnGap: 8,
    alignSelf: "stretch",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#93c5fd",
    backgroundColor: "#eff6ff",
  },
  secondaryFabText: {
    color: "#1d4ed8",
    fontSize: 14,
    fontWeight: "800",
  },
});
