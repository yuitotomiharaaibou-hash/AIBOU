import type { AiTaskAdjustmentPatch } from "@/lib/aiTaskAdjustmentPatch";

type LogRow = {
  id: string;
  taskId: string;
  fromDate: string;
  toDate: string;
  fromHour: number;
  toHour: number;
  reason: string;
  createdAt: string;
};

type TaskRow = {
  id: string;
  date: string;
  hour: number;
  completed: boolean;
  pinned?: boolean;
};

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * AI が返した taskAdjustments を検証して適用する（自然言語意図の実行層）。
 * id は一覧に載っているもののみ。未完了・固定以外。
 */
export function applyAiTaskAdjustments<T extends TaskRow>(
  tasks: T[],
  patches: AiTaskAdjustmentPatch[] | undefined
): { tasks: T[]; logs: LogRow[] } {
  if (!patches?.length) return { tasks, logs: [] };
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const logs: LogRow[] = [];
  for (const p of patches.slice(0, 48)) {
    if (typeof p.id !== "string" || !p.id.trim()) continue;
    if (typeof p.date !== "string" || !DATE_KEY.test(p.date.trim())) continue;
    const t = byId.get(p.id.trim());
    if (!t || t.completed || t.pinned === true) continue;
    const toDate = p.date.trim();
    const toHour = typeof p.hour === "number" && p.hour >= 0 && p.hour <= 23 ? p.hour : t.hour;
    if (t.date === toDate && t.hour === toHour) continue;
    logs.push({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      taskId: t.id,
      fromDate: t.date,
      toDate,
      fromHour: t.hour,
      toHour,
      reason: "ai-intent",
      createdAt: new Date().toISOString(),
    });
    byId.set(t.id, { ...t, date: toDate, hour: toHour });
  }
  return { tasks: tasks.map((t) => byId.get(t.id) ?? t), logs };
}
