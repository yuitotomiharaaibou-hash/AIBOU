import type { Task, ReplanLog } from "@/context/TasksContext";
import type { PlannerPreference } from "@/lib/plannerPreference";

export type ReplanReason =
  | "overdue-priority"
  | "manual-regenerate"
  | "subject-balance"
  | "workload-smoothing"
  | "tomorrow-manual"
  | "tomorrow-auto";

type Candidate = {
  task: Task;
  score: number;
  reason: ReplanReason;
};

function toDate(key: string): Date {
  const [y, m, d] = key.split("-").map((v) => parseInt(v, 10));
  return new Date(y, m - 1, d);
}

function dateKey(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function dayDiff(from: string, to: string): number {
  const a = toDate(from);
  const b = toDate(to);
  const ms = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function buildCandidate(task: Task, refKey: string): Candidate {
  const overdueDays = Math.max(0, dayDiff(task.date, refKey));
  let score = overdueDays * 100;
  let reason: ReplanReason = overdueDays > 0 ? "overdue-priority" : "workload-smoothing";

  // 科目バランス: 英語に寄りすぎる場合は数学、数学に寄りすぎる場合は英語を押し上げる余地。
  if (task.subject === "math") score += 3;
  else score += 1;

  // 手動再生成は常に全体を軽くシャッフルしやすくする。
  if (overdueDays === 0) {
    score += 5;
  }

  if (task.subject === "math" && overdueDays === 0) {
    reason = "subject-balance";
  }

  return { task, score, reason };
}

export function buildPreferenceAwareCandidate(
  task: Task,
  refKey: string,
  pref: PlannerPreference
): Candidate {
  const base = buildCandidate(task, refKey);
  const overdueDays = Math.max(0, dayDiff(task.date, refKey));
  let score = base.score;
  let reason = base.reason;

  score += overdueDays * 25 * pref.weights.deadlineUrgency;

  const subjectBias = task.subject === "english" ? pref.subjectBias.english : pref.subjectBias.math;
  score += (subjectBias - 1) * 30 * pref.weights.subjectBalance;

  const isPreferredHour = pref.preferredHours.includes(task.hour);
  score += isPreferredHour ? 8 * pref.weights.completionRhythm : -4 * pref.weights.timeBlockStability;

  if (task.hour >= pref.avoidAfterHour) {
    score -= 20 * pref.weights.lateNightAvoidance;
    reason = "workload-smoothing";
  }

  if (task.subject === "math" && overdueDays === 0 && pref.weights.subjectBalance > 1.05) {
    reason = "subject-balance";
  }

  return { task, score, reason };
}

export function pseudoAibouReplan(params: {
  tasks: Task[];
  referenceDate: string;
  mode: "manual" | "auto";
  preference?: PlannerPreference;
}): { tasks: Task[]; logs: ReplanLog[] } {
  const { tasks, referenceDate, mode, preference } = params;
  const movable = tasks.filter((t) => !t.completed && !t.pinned && t.date <= referenceDate);
  if (movable.length === 0) return { tasks, logs: [] };

  const ranked = movable
    .map((t) =>
      preference
        ? buildPreferenceAwareCandidate(t, referenceDate, preference)
        : buildCandidate(t, referenceDate)
    )
    .sort((a, b) => b.score - a.score);

  const base = toDate(referenceDate);
  const slots =
    preference && preference.preferredHours.length > 0
      ? preference.preferredHours
          .filter((h) => h < preference.avoidAfterHour)
          .slice(0, 8)
      : [17, 18, 19, 20, 21];
  const dailyLimit = preference?.maxTasksPerDay ?? slots.length;
  const safeSlots = slots.length > 0 ? slots : [17, 18, 19, 20];
  const placement = new Map<string, { date: string; hour: number; reason: ReplanReason }>();

  ranked.forEach((cand, idx) => {
    const dayOffset = Math.floor(idx / dailyLimit) + 1;
    const h = safeSlots[idx % safeSlots.length];
    const d = new Date(base);
    d.setDate(base.getDate() + dayOffset);
    placement.set(cand.task.id, {
      date: dateKey(d),
      hour: h,
      reason: mode === "manual" ? "manual-regenerate" : cand.reason,
    });
  });

  const logs: ReplanLog[] = [];
  const nextTasks = tasks.map((t) => {
    const p = placement.get(t.id);
    if (!p) return t;
    logs.push({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      taskId: t.id,
      fromDate: t.date,
      toDate: p.date,
      fromHour: t.hour,
      toHour: p.hour,
      reason: p.reason,
      createdAt: new Date().toISOString(),
    });
    return { ...t, date: p.date, hour: p.hour };
  });

  return { tasks: nextTasks, logs };
}

export function pseudoAibouReasonLabel(reason: string): string {
  switch (reason) {
    case "overdue-priority":
      return "期限超過を優先";
    case "manual-regenerate":
      return "手動で再提案";
    case "subject-balance":
      return "科目バランス調整";
    case "workload-smoothing":
      return "負荷平準化";
    case "auto-overdue":
      return "期限超過の自動更新";
    case "tomorrow-manual":
      return "明日の予定（手動ヒアリング）";
    case "tomorrow-auto":
      return "明日の予定（自動）";
    default:
      return "再配置";
  }
}

