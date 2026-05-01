import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import type { ProfileState } from "@/context/ProfileContext";
import { buildAllKoko2LeafTasks } from "@/lib/koko2LeafTasks";
import {
  distributeKoko2TasksForProfile,
  profileScheduleSignature,
} from "@/lib/koko2TaskDistribution";
import { pseudoAibouReplan } from "@/lib/pseudoAibouPlanner";
import {
  applySuccessTemplate,
  createDefaultPreference,
  getSuccessTemplateByHints,
  learnFromEvent,
  type PlannerProfileHints,
  type PlannerPreference,
} from "@/lib/plannerPreference";
import { simpleStorageGet, simpleStorageSet } from "@/lib/simpleStorage";
import {
  buildTomorrowPlanProposal,
  getTomorrowKey,
  hearingForAuto,
  type TomorrowHearing,
} from "@/lib/tomorrowPlan";
import {
  requestAiTomorrowHearing,
  type AiClarifyQuestion,
  type AiTomorrowPlanResult,
  type CompanionAiChain,
  type HomePlanOp,
} from "@/lib/aiTomorrowPlanner";
import { applyAiTaskAdjustments } from "@/lib/applyAiTaskAdjustments";
import { applyAiTaskCreates } from "@/lib/applyAiTaskCreates";
import { applyTaskMonthClear, applyTaskDeletesByIds } from "@/lib/applyAiTaskBulk";
import { mergeHomePlanOpsWithFallback } from "@/lib/companionHomePlanFallback";

export type Subject = "english" | "math";

export type TaskImportance = "A" | "B" | "C";

export type Task = {
  id: string; // タスクA〜JなどのID
  subject: Subject;
  title: string;
  date: string; // YYYY-MM-DD
  hour: number; // 0-23
  completed: boolean;
  pinned?: boolean;
  /** 重要度（未設定時は UI では B 扱い） */
  importance?: TaskImportance;
  /** 期限 YYYY-MM-DD（任意） */
  dueDate?: string;
  /** 開始日 YYYY-MM-DD（詳細・未設定時は date と同義扱い） */
  startDate?: string;
  /** 終了日 YYYY-MM-DD（詳細・未設定時は dueDate と同義扱い） */
  endDate?: string;
  /** 備考 */
  notes?: string;
  /** 同一タスクを複数コマに分けたときの位置（1 始まり）と総数（2 以上で UI に（i/n）） */
  segmentIndex?: number;
  segmentTotal?: number;
};

export type ReplanLog = {
  id: string;
  taskId: string;
  fromDate: string;
  toDate: string;
  fromHour: number;
  toHour: number;
  reason: string;
  createdAt: string;
};

/** 手動提案のプレビュー（承認までタスクは未反映） */
export type PendingPlanProposal = {
  referenceDate: string;
  nextTasks: Task[];
  logs: ReplanLog[];
};

export type ReplanInsight = {
  shortReason: string;
  shortChange: string;
  detailLines: string[];
  phaseNotes: string[];
  restartFrom: string;
  source: "ai" | "fallback";
  modelUsed?: string;
  generatedAt: string;
};

export type TasksContextValue = {
  tasks: Task[];
  replanLogs: ReplanLog[];
  pendingProposal: PendingPlanProposal | null;
  proposalNotice: string | null;
  setProposalNotice: (v: string | null) => void;
  isAiPlanning: boolean;
  lastReplanInsight: ReplanInsight | null;
  pendingAiQuestions: AiClarifyQuestion[];
  plannerPreference: PlannerPreference;
  toggleTask: (id: string) => void;
  updateTaskSchedule: (id: string, date: string, hour: number) => void;
  updateTask: (id: string, patch: Partial<Omit<Task, "id">>) => void;
  addTask: (input: Omit<Task, "id" | "completed"> & { id?: string }) => void;
  deleteTask: (id: string) => void;
  togglePin: (id: string) => void;
  setPlannerUser: (userId: string) => void;
  applySuccessTemplateFromProfile: (hints: PlannerProfileHints) => void;
  proposeTomorrowPlan: (hearing: TomorrowHearing) => void;
  tryAutoTomorrowPlan: (input: {
    todayKey: string;
    tomorrowKey: string;
    todayBusySlotCount: number;
    hourNow: number;
    enabled: boolean;
  }) => void;
  /** 今日の埋まり具合からヒアリングを自動決定し、明日の計画を即反映（確認ステップなし） */
  commitTomorrowPlanNow: (input: {
    todayKey: string;
    tomorrowKey: string;
    todayBusySlotCount: number;
    /** プロフィール・タスク事実など（相棒フローから渡す） */
    sessionContext?: string;
    /** 直前の prefetchCompanionAiPlan と同じ入力なら再呼び出ししない */
    reusePrefetchDraft?: boolean;
    /**
     * 承認チェックで加工した案をそのまま反映（指定時は prefetch の ref を使わない）
     */
    prefetchedPlanOverride?: AiTomorrowPlanResult | null;
    /** AI が返した home_plan_ops をホーム予定に反映（相棒から渡す） */
    applyHomePlanOps?: (ops: HomePlanOp[]) => void;
    /**
     * true（既定）: 「今日以前→明日」ローカル一括ロールをしない（AI の JSON のみ反映）。
     * false: 深夜の自動処理など限定的にローカルロールを併用。
     */
    skipLocalTomorrowRoll?: boolean;
  }) => Promise<boolean>;
  companionPlanDraft: AiTomorrowPlanResult | null;
  prefetchCompanionAiPlan: (input: {
    todayKey: string;
    tomorrowKey: string;
    todayBusySlotCount: number;
    sessionContext: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  approvePendingPlan: () => void;
  rejectPendingPlan: () => void;
  autoReplanIfNeeded: (referenceDate?: string) => void;
  saveAiQuestionAnswers: (answers: Record<string, string>) => void;
  clearAiQuestions: () => void;
  /** KOKO2 全タスクを維持したまま、プロフィールの空き枠に合わせて日付・時刻を再配分 */
  applyKoko2TaskDistribution: (profile: Partial<ProfileState>, force?: boolean) => void;
};

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

function buildReplanInsight(input: {
  source: "ai" | "fallback";
  modelUsed?: string;
  reason?: string;
  changeSummary?: string;
  phaseNotes?: string[];
  companionChain?: CompanionAiChain;
  hearing: TomorrowHearing;
  movedCount: number;
}): ReplanInsight {
  const busyLabel = input.hearing.busy === 2 ? "高" : input.hearing.busy === 1 ? "中" : "低";
  const leanLabel =
    input.hearing.subjectLean === "english"
      ? "英語寄せ"
      : input.hearing.subjectLean === "math"
        ? "数学寄せ"
        : "バランス";
  const chainLines: string[] = [];
  const cc = input.companionChain;
  if (cc) {
    if (cc.execution.trim()) chainLines.push(`実行: ${cc.execution.trim()}`);
    if (cc.goal.trim()) chainLines.push(`目標: ${cc.goal.trim()}`);
    if (cc.information.trim()) chainLines.push(`情報: ${cc.information.trim()}`);
    if (cc.placement.trim()) chainLines.push(`立案: ${cc.placement.trim()}`);
  }
  return {
    shortReason:
      (input.reason ??
        `負荷${busyLabel}・${leanLabel}として翌日へ${input.movedCount}件を再配置`) +
      (input.source === "ai" && input.modelUsed ? `（model: ${input.modelUsed}）` : ""),
    shortChange:
      input.changeSummary ??
      `未完了${input.movedCount}件を明日の空きへ再配置（${leanLabel}）`,
    detailLines: [
      ...chainLines,
      `再立案開始点: 実行記録→確認→改善→明日再配置`,
      `負荷判定: ${busyLabel}`,
      `科目方針: ${leanLabel}`,
      `開始遅め: ${input.hearing.lateStart ? "はい" : "いいえ"}`,
      `移動件数: ${input.movedCount}件`,
      `推論ソース: ${input.source === "ai" ? "AI接続" : "ローカルフォールバック"}`,
      ...(input.source === "ai" && input.modelUsed ? [`モデル: ${input.modelUsed}`] : []),
    ],
    phaseNotes:
      input.phaseNotes && input.phaseNotes.length > 0
        ? input.phaseNotes
        : [
            "確認: 未完了と負荷を確認",
            "改善: 明日の開始時刻と科目偏りを補正",
            "再配置: 空き枠へ優先タスクを割当",
          ],
    restartFrom: "confirm-and-improve",
    source: input.source,
    modelUsed: input.modelUsed,
    generatedAt: new Date().toISOString(),
  };
}

function inferTaskBulkFromQa(input: {
  qaContext: string;
  tasks: Task[];
  todayKey: string;
  tomorrowKey: string;
}): { taskMonthClear?: { yearMonth: string; includePinned: boolean }; taskDeletes?: string[] } {
  const text = (input.qaContext ?? "").replace(/\s+/g, " ").trim();
  if (!text) return {};
  const asksDelete = /削除|消して|消す|クリア|空に|リセット|なくして/.test(text);
  const asksAll = /全部|すべて|全て/.test(text);
  const mentionsTask = /タスク|課題|宿題|予定/.test(text);
  if (!(asksDelete && mentionsTask)) return {};

  const ym = (() => {
    const iso = text.match(/(20\d{2})-(0[1-9]|1[0-2])/);
    if (iso) return `${iso[1]}-${iso[2]}`;
    const ja = text.match(/(20\d{2})\s*年\s*(1[0-2]|0?[1-9])\s*月/);
    if (ja) return `${ja[1]}-${String(parseInt(ja[2], 10)).padStart(2, "0")}`;
    return "";
  })();
  if (ym) return { taskMonthClear: { yearMonth: ym, includePinned: true } };

  const inDayIds = (dateKey: string) =>
    input.tasks.filter((t) => t.date === dateKey).map((t) => t.id);
  if (/明日|翌日|あした/.test(text)) return { taskDeletes: inDayIds(input.tomorrowKey) };
  if (/今日|本日|きょう/.test(text)) return { taskDeletes: inDayIds(input.todayKey) };

  if (asksAll) {
    return { taskDeletes: input.tasks.map((t) => t.id) };
  }
  return {};
}

export function makeDateKey(year: number, month0: number, day: number): string {
  const mm = String(month0 + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export function getTodayKey(): string {
  const d = new Date();
  return makeDateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

const INITIAL_TASKS: Task[] = buildAllKoko2LeafTasks();

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [replanLogs, setReplanLogs] = useState<ReplanLog[]>([]);
  const [pendingProposal, setPendingProposal] = useState<PendingPlanProposal | null>(null);
  const [proposalNotice, setProposalNotice] = useState<string | null>(null);
  const [isAiPlanning, setIsAiPlanning] = useState(false);
  const [lastReplanInsight, setLastReplanInsight] = useState<ReplanInsight | null>(null);
  const [pendingAiQuestions, setPendingAiQuestions] = useState<AiClarifyQuestion[]>([]);
  const [plannerUserId, setPlannerUserId] = useState("default");
  const [plannerPreference, setPlannerPreference] = useState<PlannerPreference>(
    createDefaultPreference()
  );
  const regenerateSessionRef = useRef(0);
  const plannerPrefRef = useRef(plannerPreference);
  plannerPrefRef.current = plannerPreference;
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const pendingProposalRef = useRef<PendingPlanProposal | null>(null);
  pendingProposalRef.current = pendingProposal;
  const lastKoko2DistSigRef = useRef<string | null>(null);
  const aiQaContextRef = useRef<Record<string, string>>({});
  const companionDraftRef = useRef<{ result: AiTomorrowPlanResult; fingerprint: string } | null>(
    null
  );
  const [companionPlanDraft, setCompanionPlanDraft] = useState<AiTomorrowPlanResult | null>(null);

  const buildCompanionFingerprint = useCallback(
    (parts: {
      todayKey: string;
      tomorrowKey: string;
      todayBusySlotCount: number;
      qaContext: string;
      sessionContext: string;
    }) => JSON.stringify(parts),
    []
  );

  const aiQaPrompt = () => {
    const rows = Object.entries(aiQaContextRef.current)
      .map(([k, v]) => [k, v.trim()] as const)
      .filter(([, v]) => v.length > 0);
    if (rows.length === 0) return "";
    return rows.map(([k, v]) => `${k}: ${v}`).join("\n");
  };

  const prefetchCompanionAiPlan = useCallback(
    async (input: {
      todayKey: string;
      tomorrowKey: string;
      todayBusySlotCount: number;
      sessionContext: string;
    }): Promise<{ ok: boolean; error?: string }> => {
      const qaContext = aiQaPrompt();
      const fingerprint = buildCompanionFingerprint({
        todayKey: input.todayKey,
        tomorrowKey: input.tomorrowKey,
        todayBusySlotCount: input.todayBusySlotCount,
        qaContext,
        sessionContext: input.sessionContext,
      });
      const fallback = hearingForAuto(input.todayBusySlotCount, plannerPrefRef.current);
      try {
        const ai = await requestAiTomorrowHearing({
          tasks: tasksRef.current,
          todayKey: input.todayKey,
          tomorrowKey: input.tomorrowKey,
          todayBusySlotCount: input.todayBusySlotCount,
          fallback,
          qaContext,
          sessionContext: input.sessionContext,
        });
        companionDraftRef.current = { result: ai, fingerprint };
        setCompanionPlanDraft(ai);
        if (ai.source === "fallback" && ai.error) return { ok: false, error: ai.error };
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "prefetch失敗" };
      }
    },
    [buildCompanionFingerprint]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      const raw = await simpleStorageGet(`aibou.pref.${plannerUserId}`);
      if (!mounted) return;
      if (!raw) {
        setPlannerPreference(createDefaultPreference());
        return;
      }
      try {
        const parsed = JSON.parse(raw) as PlannerPreference;
        setPlannerPreference(parsed);
      } catch {
        setPlannerPreference(createDefaultPreference());
      }
    })();
    return () => {
      mounted = false;
    };
  }, [plannerUserId]);

  useEffect(() => {
    simpleStorageSet(`aibou.pref.${plannerUserId}`, JSON.stringify(plannerPreference));
  }, [plannerPreference, plannerUserId]);

  const toggleTask = useCallback((id: string) => {
    let completedTask: Task | null = null;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t, completed: !t.completed };
        if (next.completed) completedTask = next;
        return next;
      })
    );
    if (completedTask) {
      setPlannerPreference((prev) =>
        learnFromEvent(prev, {
          kind: "complete",
          hour: completedTask!.hour,
          subject: completedTask!.subject,
        })
      );
    }
  }, []);

  const updateTaskSchedule = useCallback(
    (id: string, date: string, hour: number) => {
      let moved: { fromHour: number; toHour: number; subject: Subject } | null = null;
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          moved = { fromHour: t.hour, toHour: hour, subject: t.subject };
          return { ...t, date, hour };
        })
      );
      if (moved) {
        setPlannerPreference((prev) =>
          learnFromEvent(prev, {
            kind: "manual-move",
            fromHour: moved!.fromHour,
            toHour: moved!.toHour,
            subject: moved!.subject,
          })
        );
      }
    },
    []
  );

  const updateTask = useCallback((id: string, patch: Partial<Omit<Task, "id">>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const addTask = useCallback(
    (input: Omit<Task, "id" | "completed"> & { id?: string }) => {
      setTasks((prev) => {
        const safeId =
          input.id ??
          `USR-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        const task: Task = {
          id: safeId,
          subject: input.subject,
          title: input.title,
          date: input.date,
          hour: input.hour,
          completed: false,
          pinned: input.pinned ?? false,
          importance: input.importance ?? "B",
          dueDate: input.dueDate,
          startDate: input.startDate,
          endDate: input.endDate,
          notes: input.notes,
          segmentIndex: input.segmentIndex,
          segmentTotal: input.segmentTotal,
        };
        return [task, ...prev];
      });
    },
    []
  );

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const togglePin = useCallback((id: string) => {
    let pinned: Task | null = null;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t, pinned: !t.pinned };
        if (next.pinned) pinned = next;
        return next;
      })
    );
    if (pinned) {
      setPlannerPreference((prev) =>
        learnFromEvent(prev, {
          kind: "pin",
          hour: pinned!.hour,
          subject: pinned!.subject,
        })
      );
    }
  }, []);

  const setPlannerUser = useCallback((userId: string) => {
    const normalized = (userId || "").trim() || "default";
    setPlannerUserId(normalized);
  }, []);

  const applySuccessTemplateFromProfile = useCallback((hints: PlannerProfileHints) => {
    const t = getSuccessTemplateByHints(hints);
    if (!t) return;
    const appliedKey = `aibou.pref.templateApplied.${plannerUserId}.${t.id}`;
    (async () => {
      const done = await simpleStorageGet(appliedKey);
      if (done === "1") return;
      setPlannerPreference((prev) => applySuccessTemplate(prev, t, 0.35));
      await simpleStorageSet(appliedKey, "1");
    })();
  }, [plannerUserId]);

  const proposeTomorrowPlan = useCallback((hearing: TomorrowHearing) => {
    setProposalNotice(null);
    const today = getTodayKey();
    const tomorrow = getTomorrowKey();
    const out = buildTomorrowPlanProposal({
      tasks: tasksRef.current,
      todayKey: today,
      tomorrowKey: tomorrow,
      preference: plannerPrefRef.current,
      hearing,
      reason: "tomorrow-manual",
    });
    if (out.logs.length === 0) {
      setPendingProposal(null);
      setProposalNotice("明日に移せる未完了タスクがありません");
      setTimeout(() => setProposalNotice(null), 12000);
      return;
    }
    setPendingProposal({
      referenceDate: today,
      nextTasks: out.tasks,
      logs: out.logs,
    });
  }, []);

  const tryAutoTomorrowPlan = useCallback(
    (input: {
      todayKey: string;
      tomorrowKey: string;
      todayBusySlotCount: number;
      hourNow: number;
      enabled: boolean;
    }) => {
      if (!input.enabled || input.hourNow < 5) return;
      void (async () => {
        setPendingAiQuestions([]);
        const last = await simpleStorageGet("aibou.tomorrow.autoLast");
        if (last === input.tomorrowKey) return;
        const fallback = hearingForAuto(input.todayBusySlotCount, plannerPrefRef.current);
        const qaContext = aiQaPrompt();
        const ai = await requestAiTomorrowHearing({
          tasks: tasksRef.current,
          todayKey: input.todayKey,
          tomorrowKey: input.tomorrowKey,
          todayBusySlotCount: input.todayBusySlotCount,
          fallback,
          qaContext,
          sessionContext: "",
        });
        if (ai.questions && ai.questions.length > 0) {
          setPendingAiQuestions(ai.questions);
          setProposalNotice("AIから確認質問があります。回答後に再実行してください");
          return;
        }
        const hearing = ai.hearing;
        let t0 = tasksRef.current;
        const inferredBulk = inferTaskBulkFromQa({
          qaContext,
          tasks: t0,
          todayKey: input.todayKey,
          tomorrowKey: input.tomorrowKey,
        });
        const mergedTaskMonthClear = ai.taskMonthClear ?? inferredBulk.taskMonthClear;
        const mergedTaskDeletes = Array.from(
          new Set([...(ai.taskDeletes ?? []), ...(inferredBulk.taskDeletes ?? [])])
        );
        let removedBulk = 0;
        const mc = applyTaskMonthClear(t0, mergedTaskMonthClear);
        t0 = mc.tasks;
        removedBulk += mc.removed;
        const td = applyTaskDeletesByIds(t0, mergedTaskDeletes);
        t0 = td.tasks;
        removedBulk += td.removed;
        const afterCreate = applyAiTaskCreates(t0, ai.taskCreates);
        const afterIntent = applyAiTaskAdjustments(afterCreate.tasks, ai.taskAdjustments);
        const out = buildTomorrowPlanProposal({
          tasks: afterIntent.tasks,
          todayKey: input.todayKey,
          tomorrowKey: input.tomorrowKey,
          preference: plannerPrefRef.current,
          hearing,
          reason: "tomorrow-auto",
        });
        await simpleStorageSet("aibou.tomorrow.autoLast", input.tomorrowKey);
        const allLogs = [...afterIntent.logs, ...out.logs];
        const homeOpN = ai.homePlanOps?.length ?? 0;
        if (
          allLogs.length === 0 &&
          afterCreate.added.length === 0 &&
          removedBulk === 0 &&
          homeOpN === 0
        )
          return;
        setTasks(out.tasks);
        setReplanLogs((logs) => [...allLogs, ...logs].slice(0, 300));
        setLastReplanInsight(
          buildReplanInsight({
            source: ai.source,
            modelUsed: ai.modelUsed,
            reason: ai.reason,
            changeSummary: ai.changeSummary,
            phaseNotes: ai.phaseNotes,
            companionChain: ai.companionChain,
            hearing,
            movedCount: allLogs.length + afterCreate.added.length + removedBulk + homeOpN,
          })
        );
        regenerateSessionRef.current = 0;
      })();
    },
    []
  );

  const commitTomorrowPlanNow = useCallback(
    async (input: {
      todayKey: string;
      tomorrowKey: string;
      todayBusySlotCount: number;
      sessionContext?: string;
      reusePrefetchDraft?: boolean;
      prefetchedPlanOverride?: AiTomorrowPlanResult | null;
      applyHomePlanOps?: (ops: HomePlanOp[]) => void;
      skipLocalTomorrowRoll?: boolean;
    }) => {
      setProposalNotice(null);
      setIsAiPlanning(true);
      setPendingAiQuestions([]);
      setProposalNotice("AIが明日の修正を考えています…");
      if (pendingProposalRef.current) {
        setPendingProposal(null);
      }
      try {
        const fallback = hearingForAuto(input.todayBusySlotCount, plannerPrefRef.current);
        const qaContext = aiQaPrompt();
        const sessionContext = input.sessionContext ?? "";
        const fingerprint = buildCompanionFingerprint({
          todayKey: input.todayKey,
          tomorrowKey: input.tomorrowKey,
          todayBusySlotCount: input.todayBusySlotCount,
          qaContext,
          sessionContext,
        });
        let ai: AiTomorrowPlanResult;
        if (input.prefetchedPlanOverride) {
          ai = input.prefetchedPlanOverride;
        } else if (input.reusePrefetchDraft && companionDraftRef.current?.fingerprint === fingerprint) {
          ai = companionDraftRef.current.result;
          companionDraftRef.current = null;
          setCompanionPlanDraft(null);
        } else {
          ai = await requestAiTomorrowHearing({
            tasks: tasksRef.current,
            todayKey: input.todayKey,
            tomorrowKey: input.tomorrowKey,
            todayBusySlotCount: input.todayBusySlotCount,
            fallback,
            qaContext,
            sessionContext,
          });
        }
        if (ai.questions && ai.questions.length > 0) {
          setPendingAiQuestions(ai.questions);
          setProposalNotice("AIから確認質問があります。回答後に再実行してください");
          setTimeout(() => setProposalNotice(null), 12000);
          return false;
        }
        const hearing = ai.hearing;
        let t0 = tasksRef.current;
        const inferredBulk = inferTaskBulkFromQa({
          qaContext,
          tasks: t0,
          todayKey: input.todayKey,
          tomorrowKey: input.tomorrowKey,
        });
        const mergedTaskMonthClear = ai.taskMonthClear ?? inferredBulk.taskMonthClear;
        const mergedTaskDeletes = Array.from(
          new Set([...(ai.taskDeletes ?? []), ...(inferredBulk.taskDeletes ?? [])])
        );
        let removedBulk = 0;
        const mc = applyTaskMonthClear(t0, mergedTaskMonthClear);
        t0 = mc.tasks;
        removedBulk += mc.removed;
        const td = applyTaskDeletesByIds(t0, mergedTaskDeletes);
        t0 = td.tasks;
        removedBulk += td.removed;
        const afterCreate = applyAiTaskCreates(t0, ai.taskCreates);
        const afterIntent = applyAiTaskAdjustments(afterCreate.tasks, ai.taskAdjustments);
        const skipLocalTomorrowRoll = input.skipLocalTomorrowRoll ?? true;
        const out = skipLocalTomorrowRoll
          ? { tasks: afterIntent.tasks, logs: [] as ReplanLog[] }
          : buildTomorrowPlanProposal({
              tasks: afterIntent.tasks,
              todayKey: input.todayKey,
              tomorrowKey: input.tomorrowKey,
              preference: plannerPrefRef.current,
              hearing,
              reason: "tomorrow-tap",
            });
        const allLogs = [...afterIntent.logs, ...out.logs];
        const mergedHomeOps = input.applyHomePlanOps
          ? mergeHomePlanOpsWithFallback(
              ai.homePlanOps,
              qaContext,
              input.todayKey,
              input.tomorrowKey
            )
          : ai.homePlanOps ?? [];
        const homeOpN = mergedHomeOps.length;
        const movedOrCreate =
          allLogs.length + afterCreate.added.length + homeOpN + removedBulk;
        if (movedOrCreate === 0) {
          setProposalNotice(
            ai.source === "ai"
              ? ai.reason
                ? `AI判断: ${ai.reason}（今回の再配置変更はありません）${ai.modelUsed ? ` [model:${ai.modelUsed}]` : ""}`
                : `AI判断: 今回は再配置変更なしで維持が妥当です${ai.modelUsed ? ` [model:${ai.modelUsed}]` : ""}`
              : "明日に移せる未完了タスクがありません（今回は変更なし）"
          );
          setTimeout(() => setProposalNotice(null), 12000);
          return true;
        }
        setTasks(out.tasks);
        input.applyHomePlanOps?.(mergedHomeOps);
        setReplanLogs((logs) => [...allLogs, ...logs].slice(0, 300));
        setLastReplanInsight(
          buildReplanInsight({
            source: ai.source,
            modelUsed: ai.modelUsed,
            reason: ai.reason,
            changeSummary: ai.changeSummary,
            phaseNotes: ai.phaseNotes,
            companionChain: ai.companionChain,
            hearing,
            movedCount: movedOrCreate,
          })
        );
        regenerateSessionRef.current = 0;
        if (ai.source === "ai") {
          setProposalNotice(
            ai.reason
              ? `AI判断: ${ai.reason}${ai.modelUsed ? ` [model:${ai.modelUsed}]` : ""}`
              : `AIが明日の再配置を提案・反映しました${ai.modelUsed ? ` [model:${ai.modelUsed}]` : ""}`
          );
          setTimeout(() => setProposalNotice(null), 12000);
        } else {
          setProposalNotice(
            ai.error
              ? `AI接続に失敗（${ai.error}）のため、ローカル方針で再配置しました`
              : "AI接続なしのため、ローカル方針で再配置しました"
          );
          setTimeout(() => setProposalNotice(null), 12000);
        }
        setPlannerPreference((prev) => {
          const learned = learnFromEvent(prev, { kind: "accept-plan" });
          plannerPrefRef.current = learned;
          return learned;
        });
        return true;
      } finally {
        setIsAiPlanning(false);
      }
    },
    [buildCompanionFingerprint]
  );

  const approvePendingPlan = useCallback(() => {
    const p = pendingProposalRef.current;
    if (!p) return;
    setProposalNotice(null);
    setPendingProposal(null);
    setTasks(p.nextTasks);
    setReplanLogs((logs) => [...p.logs, ...logs].slice(0, 300));
    regenerateSessionRef.current = 0;
    setPlannerPreference((prev) => {
      const learned = learnFromEvent(prev, { kind: "accept-plan" });
      plannerPrefRef.current = learned;
      return learned;
    });
  }, []);

  const rejectPendingPlan = useCallback(() => {
    if (!pendingProposalRef.current) return;
    setProposalNotice(null);
    setPendingProposal(null);
    regenerateSessionRef.current += 1;
    setPlannerPreference((prev) => {
      const learned = learnFromEvent(prev, {
        kind: "regenerate",
        countInSession: regenerateSessionRef.current,
      });
      plannerPrefRef.current = learned;
      return learned;
    });
  }, []);

  const autoReplanIfNeeded = useCallback((referenceDate?: string) => {
    const ref = referenceDate ?? getTodayKey();
    regenerateSessionRef.current = 0;
    setTasks((prev) => {
      const hasOverdue = prev.some((t) => !t.completed && !t.pinned && t.date < ref);
      if (!hasOverdue) return prev;
      const out = pseudoAibouReplan({
        tasks: prev,
        referenceDate: ref,
        mode: "auto",
        preference: plannerPrefRef.current,
      });
      if (out.logs.length > 0) {
        setPendingProposal(null);
        setReplanLogs((logs) => [...out.logs, ...logs].slice(0, 300));
      }
      return out.tasks;
    });
  }, []);

  const saveAiQuestionAnswers = useCallback((answers: Record<string, string>) => {
    const merged: Record<string, string> = { ...aiQaContextRef.current };
    for (const [k, v] of Object.entries(answers)) {
      const t = (v ?? "").trim();
      if (t) merged[k] = t;
    }
    aiQaContextRef.current = merged;
    setPendingAiQuestions([]);
    setProposalNotice("回答を保存しました。次の日ボタンでもう一度AI再立案できます");
    setTimeout(() => setProposalNotice(null), 12000);
  }, []);

  const clearAiQuestions = useCallback(() => {
    setPendingAiQuestions([]);
  }, []);

  const applyKoko2TaskDistribution = useCallback(
    (profile: Partial<ProfileState>, force = false) => {
      const sig = profileScheduleSignature(profile);
      if (!force && lastKoko2DistSigRef.current === sig) return;
      lastKoko2DistSigRef.current = sig;
      const base = buildAllKoko2LeafTasks();
      setTasks((prev) => {
        const distributed = distributeKoko2TasksForProfile(base, profile, {
          anchorDate: new Date(),
        });
        const prevById = new Map(prev.map((t) => [t.id, t]));
        return distributed.map((t) => {
          const old = prevById.get(t.id);
          if (!old) return t;
          return {
            ...t,
            completed: old.completed,
            pinned: old.pinned,
            title: old.title,
            importance: old.importance,
            dueDate: old.dueDate,
            startDate: old.startDate,
            endDate: old.endDate,
            notes: old.notes,
            segmentIndex: old.segmentIndex ?? t.segmentIndex,
            segmentTotal: old.segmentTotal ?? t.segmentTotal,
          };
        });
      });
    },
    []
  );

  const value = useMemo(
    () => ({
      tasks,
      replanLogs,
      pendingProposal,
      proposalNotice,
      setProposalNotice,
      isAiPlanning,
      lastReplanInsight,
      companionPlanDraft,
      prefetchCompanionAiPlan,
      pendingAiQuestions,
      plannerPreference,
      toggleTask,
      updateTaskSchedule,
      updateTask,
      addTask,
      deleteTask,
      togglePin,
      setPlannerUser,
      applySuccessTemplateFromProfile,
      proposeTomorrowPlan,
      tryAutoTomorrowPlan,
      commitTomorrowPlanNow,
      approvePendingPlan,
      rejectPendingPlan,
      autoReplanIfNeeded,
      saveAiQuestionAnswers,
      clearAiQuestions,
      applyKoko2TaskDistribution,
    }),
    [
      tasks,
      replanLogs,
      pendingProposal,
      proposalNotice,
      setProposalNotice,
      isAiPlanning,
      lastReplanInsight,
      companionPlanDraft,
      prefetchCompanionAiPlan,
      pendingAiQuestions,
      plannerPreference,
      toggleTask,
      updateTaskSchedule,
      updateTask,
      addTask,
      deleteTask,
      togglePin,
      setPlannerUser,
      applySuccessTemplateFromProfile,
      proposeTomorrowPlan,
      tryAutoTomorrowPlan,
      commitTomorrowPlanNow,
      approvePendingPlan,
      rejectPendingPlan,
      autoReplanIfNeeded,
      saveAiQuestionAnswers,
      clearAiQuestions,
      applyKoko2TaskDistribution,
    ]
  );

  return (
    <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
  );
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) {
    throw new Error("useTasks must be used within TasksProvider");
  }
  return ctx;
}

