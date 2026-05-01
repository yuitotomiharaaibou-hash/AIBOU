import type { Task } from "@/context/TasksContext";
import type { AiTaskCreatePatch } from "@/lib/aiTaskCreatePatch";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function newId(): string {
  return `ai-new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * AI が返した taskCreates を検証してタスクを追加する。
 */
export function applyAiTaskCreates(
  tasks: Task[],
  creates: AiTaskCreatePatch[] | undefined
): { tasks: Task[]; added: Task[] } {
  if (!creates?.length) return { tasks, added: [] };
  const added: Task[] = [];
  for (const c of creates.slice(0, 14)) {
    const title = typeof c.title === "string" ? c.title.trim() : "";
    if (title.length < 1 || title.length > 200) continue;
    const date = typeof c.date === "string" ? c.date.trim() : "";
    if (!DATE_KEY.test(date)) continue;
    if (c.subject !== "english" && c.subject !== "math") continue;
    const hour =
      typeof c.hour === "number" && c.hour >= 0 && c.hour <= 23 ? c.hour : 19;
    const importance =
      c.importance === "A" || c.importance === "B" || c.importance === "C"
        ? c.importance
        : "B";
    const notes =
      typeof c.notes === "string" && c.notes.trim().length > 0
        ? c.notes.trim().slice(0, 500)
        : undefined;
    added.push({
      id: newId(),
      subject: c.subject,
      title: title.slice(0, 200),
      date,
      hour,
      completed: false,
      pinned: false,
      importance,
      notes,
    });
  }
  if (added.length === 0) return { tasks, added: [] };
  return { tasks: [...added, ...tasks], added };
}
