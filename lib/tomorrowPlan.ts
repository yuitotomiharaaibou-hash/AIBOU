import type { Task, ReplanLog } from "@/context/TasksContext";
import type { PlannerPreference } from "@/lib/plannerPreference";
import { buildPreferenceAwareCandidate } from "@/lib/pseudoAibouPlanner";

export type TomorrowHearing = {
  /** 明日の忙しさ 0=ゆとり 1=ふつう 2=かなり忙しい */
  busy: 0 | 1 | 2;
  /** 朝はゆっくり始めたい */
  lateStart: boolean;
  /** 科目の厚み */
  subjectLean: "english" | "math" | "balance";
};

function dateKeyFromDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function getTomorrowKey(from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  return dateKeyFromDate(d);
}

function pickSlots(pref: PlannerPreference, hearing: TomorrowHearing): number[] {
  let base =
    pref.preferredHours.length > 0
      ? pref.preferredHours.filter((h) => h < pref.avoidAfterHour)
      : [17, 18, 19, 20, 21];
  if (base.length === 0) base = [17, 18, 19, 20];

  if (hearing.lateStart) {
    base = base.filter((h) => h >= 11);
    if (base.length === 0) base = [14, 16, 18, 20];
  }

  if (hearing.busy === 2) {
    return base.slice(-2).length >= 2 ? base.slice(-2) : base.slice(0, 2);
  }
  if (hearing.busy === 1) {
    return base.slice(0, Math.min(4, base.length));
  }
  return base.slice(0, Math.min(6, base.length));
}

function maxTasksForHearing(hearing: TomorrowHearing, pref: PlannerPreference): number {
  const cap = pref.maxTasksPerDay ?? 5;
  if (hearing.busy === 2) return Math.min(2, cap);
  if (hearing.busy === 1) return Math.min(4, cap);
  return Math.min(6, cap);
}

/**
 * 今日以前の未完了（固定以外）を明日にまとめて置くプレビュー用。
 */
export function buildTomorrowPlanProposal(params: {
  tasks: Task[];
  todayKey: string;
  tomorrowKey: string;
  preference: PlannerPreference;
  hearing: TomorrowHearing;
  reason: "tomorrow-manual" | "tomorrow-auto";
}): { tasks: Task[]; logs: ReplanLog[] } {
  const { tasks, todayKey, tomorrowKey, preference, hearing, reason } = params;

  const pool = tasks.filter(
    (t) => !t.completed && !t.pinned && t.date <= todayKey
  );
  if (pool.length === 0) return { tasks, logs: [] };

  const ranked = pool
    .map((t) => {
      const c = buildPreferenceAwareCandidate(t, todayKey, preference);
      let score = c.score;
      if (hearing.subjectLean === "english" && t.subject === "english") score += 25;
      if (hearing.subjectLean === "math" && t.subject === "math") score += 25;
      if (hearing.subjectLean === "balance") {
        const h = (t.id.charCodeAt(0) + t.hour) % 5;
        score += h * 0.01;
      }
      return { task: t, score, baseReason: c.reason };
    })
    .sort((a, b) => b.score - a.score);

  const slots = pickSlots(preference, hearing);
  const maxN = maxTasksForHearing(hearing, preference);
  const take = ranked.slice(0, Math.min(maxN, ranked.length));

  const hourUsage = new Map<number, number>();
  const pickHour = (idx: number): number => {
    const base = slots[idx % slots.length] ?? 19;
    let h = base;
    let guard = 0;
    while ((hourUsage.get(h) ?? 0) > 0 && guard < 48) {
      h = (h + 1) % 24;
      guard += 1;
    }
    hourUsage.set(h, (hourUsage.get(h) ?? 0) + 1);
    return h;
  };

  const placement = new Map<string, { hour: number }>();
  take.forEach((c, idx) => {
    placement.set(c.task.id, { hour: pickHour(idx) });
  });

  const logs: ReplanLog[] = [];
  const nextTasks = tasks.map((t) => {
    const p = placement.get(t.id);
    if (!p) return t;
    logs.push({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      taskId: t.id,
      fromDate: t.date,
      toDate: tomorrowKey,
      fromHour: t.hour,
      toHour: p.hour,
      reason,
      createdAt: new Date().toISOString(),
    });
    return { ...t, date: tomorrowKey, hour: p.hour };
  });

  return { tasks: nextTasks, logs };
}

export function hearingForAuto(
  todayBusySlotCount: number,
  preference: PlannerPreference
): TomorrowHearing {
  let busy: 0 | 1 | 2 = 1;
  if (todayBusySlotCount >= 14) busy = 2;
  else if (todayBusySlotCount <= 5) busy = 0;
  return {
    busy,
    lateStart: false,
    subjectLean:
      preference.subjectBias.english > preference.subjectBias.math + 0.08
        ? "english"
        : preference.subjectBias.math > preference.subjectBias.english + 0.08
          ? "math"
          : "balance",
  };
}
