import type { Task } from "@/context/TasksContext";

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** TP-R1-S01 / EK-R1-S01 / TA-R1-N01 / GB-R1-W01 / M-R1-W01 形式 */
export function filterTwoDigitLeafTasks(tasks: Task[], prefix: string): Task[] {
  const re = new RegExp(`^${escapeRegExp(prefix)}\\d{2}$`);
  return tasks.filter((t) => re.test(t.id));
}

export function filterEnglishHomeworkWeek(tasks: Task[], week: number): Task[] {
  const p = `HW-W${String(week).padStart(2, "0")}-`;
  const re = new RegExp(`^${escapeRegExp(p)}K[1-5]$`);
  return tasks.filter((t) => re.test(t.id));
}

export function filterMathHomeworkWeek(tasks: Task[], week: number): Task[] {
  const p = `MH-W${String(week).padStart(2, "0")}-`;
  const re = new RegExp(`^${escapeRegExp(p)}K[1-3]$`);
  return tasks.filter((t) => re.test(t.id));
}
