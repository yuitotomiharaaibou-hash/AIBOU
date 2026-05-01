/** 1日の分数（0〜1440、終端 exclusive） */
export const MIN_PER_DAY = 24 * 60;

export type PlanSpan = {
  title: string;
  startMin: number;
  endMinExclusive: number;
};

export function clampMin(n: number): number {
  return Math.max(0, Math.min(MIN_PER_DAY, Math.floor(n)));
}

export function normalizePlanSpan(p: PlanSpan): PlanSpan {
  let a = clampMin(p.startMin);
  let b = clampMin(p.endMinExclusive);
  if (b <= a) b = Math.min(MIN_PER_DAY, a + 15);
  return { title: p.title, startMin: a, endMinExclusive: b };
}

export function formatHm(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = ((min % 60) + 60) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * 終了表示（内部は end exclusive）。
 * 終端が整分（…:00）のときはその時刻を出し、8:00–9:00 のように見せる（:59 にしない）。
 */
export function formatPlanRangeLabel(p: PlanSpan): string {
  const n = normalizePlanSpan(p);
  if (n.endMinExclusive >= MIN_PER_DAY && n.endMinExclusive > n.startMin) {
    return `${formatHm(n.startMin)}–24:00`;
  }
  const endTick =
    n.endMinExclusive > n.startMin && n.endMinExclusive % 60 === 0
      ? n.endMinExclusive
      : Math.max(n.startMin, n.endMinExclusive - 1);
  return `${formatHm(n.startMin)}–${formatHm(endTick)}`;
}

export function legacyHourInclusiveToSpan(
  title: string,
  startHour: number,
  endHourInclusive: number
): PlanSpan {
  return normalizePlanSpan({
    title,
    startMin: startHour * 60,
    endMinExclusive: (endHourInclusive + 1) * 60,
  });
}

/** 終了「時・分」は画面上では含む最後の瞬間として扱い、exclusive はその1分後 */
export function spanFromClock(
  title: string,
  startH: number,
  startM: number,
  endH: number,
  endM: number
): PlanSpan {
  return normalizePlanSpan({
    title,
    startMin: startH * 60 + startM,
    endMinExclusive: endH * 60 + endM + 1,
  });
}

/** 旧 startHour/endHour（終了時含む）入りのオブジェクトも解釈する */
export function planSpanFromLoose(p: {
  title: string;
  startMin?: number;
  endMinExclusive?: number;
  startHour?: number;
  endHour?: number;
}): PlanSpan {
  if (typeof p.startMin === "number" && typeof p.endMinExclusive === "number") {
    return normalizePlanSpan({
      title: p.title,
      startMin: p.startMin,
      endMinExclusive: p.endMinExclusive,
    });
  }
  const sh = typeof p.startHour === "number" ? p.startHour : 0;
  const eh = typeof p.endHour === "number" ? p.endHour : sh;
  return legacyHourInclusiveToSpan(p.title, sh, eh);
}
