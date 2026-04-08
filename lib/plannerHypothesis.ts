import type { Task, ReplanLog } from "@/context/TasksContext";
import type { PlannerPreference, PlannerProfileHints } from "@/lib/plannerPreference";
import { createDefaultPreference, getSuccessTemplateByHints } from "@/lib/plannerPreference";

export type PlannerHypothesis = {
  /** 1行の仮説（折りたたみ時用） */
  headline: string;
  /** 骨格: 目標達成（成功者データ） */
  goalPillar: string;
  /** 骨格: 納得感・生活リズム（ユーザ側） */
  fitPillar: string;
  /** 表層の下を推す短文（最大4） */
  insights: string[];
  confidence: "低め" | "中" | "高め";
};

function isAutoReplanLog(reason: string): boolean {
  return (
    reason === "overdue-priority" ||
    reason === "subject-balance" ||
    reason === "workload-smoothing" ||
    reason === "auto-overdue"
  );
}

/**
 * 疑似AIでも「仮説 → 根拠（2軸）→ インサイト」の形で出す。
 * 本番LLMはこの型をそのまま埋める想定。
 */
export function buildPlannerHypothesis(params: {
  profile: PlannerProfileHints;
  preference: PlannerPreference;
  tasks: Task[];
  replanLogs: ReplanLog[];
  todayKey: string;
  /** 今日 0–23 でスケジュールが「埋まり/半分」相当のコマ数（任意） */
  todayBusySlotCount?: number;
}): PlannerHypothesis {
  const { profile, preference: pref, tasks, replanLogs, todayKey, todayBusySlotCount } =
    params;

  const template = getSuccessTemplateByHints(profile);
  const pending = tasks.filter((t) => !t.completed);
  const pinnedPending = pending.filter((t) => t.pinned).length;
  const overdue = pending.filter((t) => t.date < todayKey).length;
  const completed = tasks.filter((t) => t.completed);

  const manualRegens = replanLogs.filter((l) => l.reason === "manual-regenerate").length;
  const autoRegens = replanLogs.filter((l) => isAutoReplanLog(l.reason)).length;

  const nightDone = completed.filter((t) => t.hour >= 22).length;
  const morningDone = completed.filter((t) => t.hour <= 8).length;

  const preferredTop = [...pref.preferredHours].sort((a, b) => a - b).slice(0, 4);
  const preferredLabel =
    preferredTop.length > 0 ? `${preferredTop.join("・")}時台` : "夕方〜夜";

  const def = createDefaultPreference();
  const stabilityDelta = pref.weights.timeBlockStability - def.weights.timeBlockStability;
  const fixedDelta = pref.weights.fixedTaskRespect - def.weights.fixedTaskRespect;
  const replanDelta = pref.weights.replanTolerance - def.weights.replanTolerance;

  const goalPillar = template
    ? `成功者テンプレ「${template.label}」を骨格に、締切優先・科目バランス・負荷上限を守る方向で組み立てています。`
    : `一般的な受験ペースを前提に、締切・科目バランス・1日の上限から逆算する型です。`;

  const busy =
    typeof todayBusySlotCount === "number"
      ? `今日の予定の濃さ（推定）は ${todayBusySlotCount}/24 コマが忙しめです。`
      : "";

  const fitPillar =
    `${busy}${busy ? " " : ""}学習側では「${preferredLabel}」を好みとして強め、遅い時間帯は控えめ（回避 ${pref.avoidAfterHour}:00〜）に寄せています。1日は最大${pref.maxTasksPerDay}件までに抑える仮説です。`;

  const insights: string[] = [];

  if (manualRegens >= 4 && replanDelta < -0.08) {
    insights.push(
      "再提案を繰り返しているので、表面的には「配置」より、腹落ちする筋道や量の感覚を求めている可能性があります。"
    );
  }

  if (stabilityDelta > 0.12 || (manualRegens >= 2 && pref.weights.timeBlockStability > 1.08)) {
    insights.push(
      "時間帯をあまり動かしたくないサインが出ているので、毎日同じ枠に戻す設計が合うかもしれません。"
    );
  }

  if (fixedDelta > 0.1 && pinnedPending >= 2) {
    insights.push(
      "固定が増えているので、「自分で軸を決めて、そこから崩さない」運びを好む仮説です。"
    );
  }

  if (nightDone >= 8 && morningDone <= 3) {
    insights.push(
      "完了が夜に寄っているので、朝型より夜のまとまり学習（または昼の隙間が少ない）タイプの可能性があります。"
    );
  } else if (morningDone >= 8 && nightDone <= 3) {
    insights.push(
      "朝の完了が多いので、起きてすぐの短時間ブロックを主戦場にするのが合いそうです。"
    );
  }

  if (typeof todayBusySlotCount === "number" && todayBusySlotCount >= 14) {
    insights.push(
      "予定が詰まっている日は、長時間より15〜25分の細切れでも積み上がる並びの方が続きやすいかもしれません。"
    );
  }

  if (overdue >= 5 && autoRegens >= 3) {
    insights.push(
      "期限超過と自動リカバリが続いているので、いまは量より「毎日確実に終わる最小単位」を先に満たす欲求が強いかもしれません。"
    );
  }

  if (pref.rejectedPlans > pref.acceptedPlans + 6) {
    insights.push(
      "提案の取り直しが多いので、最適解より「納得して動ける説明」が先に来ている可能性があります。"
    );
  }

  const uniq = Array.from(new Set(insights));
  const trimmed = uniq.slice(0, 4);

  let confidence: PlannerHypothesis["confidence"] = "低め";
  const signalCount =
    (manualRegens >= 2 ? 1 : 0) +
    (completed.length >= 20 ? 1 : 0) +
    (replanLogs.length >= 5 ? 1 : 0) +
    (typeof todayBusySlotCount === "number" ? 1 : 0);
  if (signalCount >= 3) confidence = "中";
  if (signalCount >= 4 && trimmed.length >= 2) confidence = "高め";

  const headline =
    template && trimmed.length > 0
      ? `成功者の型（${template.label}）を骨に、あなたの行動から読んだ「${trimmed[0]?.slice(0, 28) ?? "納得感"}…」を足す仮説です。`
      : trimmed.length > 0
        ? trimmed[0]!
        : "目標達成の型と、あなたの生活リズムの両方を満たす仮説で計画を組み立てています。";

  return {
    headline,
    goalPillar,
    fitPillar,
    insights: trimmed,
    confidence,
  };
}

