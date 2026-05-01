import type { DayPlanItem } from "@/context/HomeScheduleContext";

/** 月カレンダーのセルでは睡眠・通学・移動などを出さない（ホーム・日詳細ではそのまま） */
export function shouldOmitPlanFromCalendarCell(plan: Pick<DayPlanItem, "title" | "id">): boolean {
  const t = (plan.title ?? "").trim();
  if (t === "睡眠" || t.startsWith("睡眠")) return true;
  if (t.includes("通学")) return true;
  if (t.includes("移動")) return true;
  if (t.includes("→")) return true;
  return false;
}

export function planDisplayAllDay(plan: Pick<DayPlanItem, "startMin" | "endMinExclusive" | "allDay">): boolean {
  if (plan.allDay === true) return true;
  if (plan.allDay === false) return false;
  return plan.startMin <= 0 && plan.endMinExclusive >= 24 * 60;
}

export function sortPlansForCalendarCell<T extends Pick<DayPlanItem, "startMin" | "endMinExclusive" | "allDay">>(
  plans: T[]
): T[] {
  return [...plans].sort((a, b) => {
    const ad = planDisplayAllDay(a);
    const bd = planDisplayAllDay(b);
    if (ad !== bd) return ad ? -1 : 1;
    return a.startMin - b.startMin;
  });
}
