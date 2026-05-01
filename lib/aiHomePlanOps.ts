const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** ホーム画面の「予定」（DayPlanItem）に対する AI 指示（承認後に適用） */
export type HomePlanOp =
  | { op: "clear_day"; date: string }
  | { op: "delete"; date: string; planIds: string[] };

export function asHomePlanOps(v: unknown): HomePlanOp[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: HomePlanOp[] = [];
  for (const x of v.slice(0, 20)) {
    if (!x || typeof x !== "object") continue;
    const row = x as Record<string, unknown>;
    const op = row.op;
    const date = typeof row.date === "string" ? row.date.trim() : "";
    if (!DATE_KEY.test(date)) continue;
    if (op === "clear_day") {
      out.push({ op: "clear_day", date });
      continue;
    }
    if (op === "delete" && Array.isArray(row.planIds)) {
      const planIds = row.planIds
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
        .map((id) => id.trim())
        .slice(0, 48);
      if (planIds.length > 0) out.push({ op: "delete", date, planIds });
    }
  }
  return out.length > 0 ? out : undefined;
}
