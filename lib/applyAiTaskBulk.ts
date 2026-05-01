import type { Task } from "@/context/TasksContext";

export type TaskMonthClearSpec = {
  yearMonth: string;
  /** true のときピン留めも削除（デフォルトは未ピンのみ） */
  includePinned?: boolean;
};

/**
 * 指定月（YYYY-MM）に date が入るタスクを一括削除（KOKO 学習タスク用）。
 */
export function applyTaskMonthClear(
  tasks: Task[],
  spec: TaskMonthClearSpec | undefined
): { tasks: Task[]; removed: number } {
  if (!spec || !/^\d{4}-\d{2}$/.test(spec.yearMonth)) return { tasks, removed: 0 };
  const prefix = `${spec.yearMonth}-`;
  const incPin = spec.includePinned === true;
  let removed = 0;
  const next = tasks.filter((t) => {
    if (!t.date.startsWith(prefix)) return true;
    if (!incPin && t.pinned === true) return true;
    removed++;
    return false;
  });
  return { tasks: next, removed };
}

/**
 * 指定 id のタスクを削除。
 */
export function applyTaskDeletesByIds(
  tasks: Task[],
  ids: string[] | undefined
): { tasks: Task[]; removed: number } {
  if (!ids?.length) return { tasks, removed: 0 };
  const want = new Set(ids.slice(0, 5000));
  let removed = 0;
  const next = tasks.filter((t) => {
    if (!want.has(t.id)) return true;
    removed++;
    return false;
  });
  return { tasks: next, removed };
}
