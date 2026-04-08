import type { Task } from "@/context/TasksContext";

export type WeeklyReport = {
  weekKey: string;
  label: string;
  total: number;
  completed: number;
  completionRate: number;
  autoReplans: number;
  pinnedCount: number;
};

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekKeyFromDate(date: Date): string {
  const ws = getWeekStart(date);
  return toDateKey(ws);
}

export function getWeekLabel(weekStartKey: string): string {
  const [y, m, d] = weekStartKey.split("-").map((v) => parseInt(v, 10));
  const start = new Date(y, m - 1, d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
}

export function summarizeWeek(
  tasks: Task[],
  replanLogs: { createdAt: string; reason: string }[],
  weekStartKey: string
): WeeklyReport {
  const [y, m, d] = weekStartKey.split("-").map((v) => parseInt(v, 10));
  const ws = new Date(y, m - 1, d);
  const we = new Date(ws);
  we.setDate(we.getDate() + 6);
  const startKey = toDateKey(ws);
  const endKey = toDateKey(we);

  const weekTasks = tasks.filter((t) => t.date >= startKey && t.date <= endKey);
  const completed = weekTasks.filter((t) => t.completed).length;
  const total = weekTasks.length;
  const pinnedCount = weekTasks.filter((t) => t.pinned).length;
  const autoReplans = replanLogs.filter((l) => {
    const auto =
      l.reason === "overdue-priority" ||
      l.reason === "subject-balance" ||
      l.reason === "workload-smoothing" ||
      l.reason === "auto-overdue";
    if (!auto) return false;
    const at = new Date(l.createdAt);
    return at >= ws && at <= we;
  }).length;

  return {
    weekKey: weekStartKey,
    label: getWeekLabel(weekStartKey),
    total,
    completed,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    autoReplans,
    pinnedCount,
  };
}

export function buildRecentWeeklyReports(
  tasks: Task[],
  replanLogs: { createdAt: string; reason: string }[],
  weeks = 8
): WeeklyReport[] {
  const now = new Date();
  const out: WeeklyReport[] = [];
  for (let i = 0; i < weeks; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const key = getWeekKeyFromDate(d);
    out.push(summarizeWeek(tasks, replanLogs, key));
  }
  return out;
}

