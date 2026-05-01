import type { Task } from "@/context/TasksContext";

export function addDaysKey(baseKey: string, add: number): string {
  const [y, mo, da] = baseKey.split("-").map((v) => parseInt(v, 10));
  const dt = new Date(y, mo - 1, da);
  dt.setDate(dt.getDate() + add);
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

function compareKeys(a: string, b: string): number {
  return a.localeCompare(b);
}

function startOfCalendarDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * 校内模試の目安: 8月15日（今年を過ぎていれば翌年）
 */
export function mockExamAugust15DateKey(fromTodayKey: string): string {
  const [y, m, d] = fromTodayKey.split("-").map((v) => parseInt(v, 10));
  const base = new Date(y, m - 1, d);
  let year = base.getFullYear();
  let exam = new Date(year, 7, 15);
  if (startOfCalendarDay(exam) < startOfCalendarDay(base)) {
    exam = new Date(year + 1, 7, 15);
  }
  const mm = String(exam.getMonth() + 1).padStart(2, "0");
  const dd = String(exam.getDate()).padStart(2, "0");
  return `${exam.getFullYear()}-${mm}-${dd}`;
}

export function isValidDateKey(k: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return false;
  const [y, m, d] = k.split("-").map((v) => parseInt(v, 10));
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** ユーザー指定のタスク読切（模試目安）があれば検証して採用。無効なら 8/15 目安。 */
export function resolveKoko2RouteEnd(today: string, override: string | null | undefined): string {
  const fallback = mockExamAugust15DateKey(today);
  if (override == null || override === "") return fallback;
  const t = override.trim();
  if (!isValidDateKey(t)) return fallback;
  if (compareKeys(t, today) < 0) return fallback;
  const maxK = addDaysKey(today, 800);
  if (compareKeys(t, maxK) > 0) return fallback;
  return t;
}

export type BuildKoko2MockRouteOptions = {
  routeEndOverride?: string | null;
};

export type Koko2RouteSubject = "english" | "math";

function matchesSubject(t: Task, mode: Koko2RouteSubject): boolean {
  return t.subject === mode;
}

export type Koko2RouteSeries = {
  dateKeys: string[];
  planned: number[];
  actual: number[];
  routeStart: string;
  routeEnd: string;
  targetTotal: number;
  todayIndex: number;
};

/**
 * 8/15 校内模試目安までの計画ルート（コマ数）と実績累積。
 */
export function buildKoko2MockExamRoute(
  tasks: Task[],
  today: string,
  mode: Koko2RouteSubject,
  options?: BuildKoko2MockRouteOptions
): Koko2RouteSeries {
  const routeEnd = resolveKoko2RouteEnd(today, options?.routeEndOverride ?? null);
  const subset = tasks.filter((t) => matchesSubject(t, mode));
  const dated = subset.map((t) => t.date).filter(Boolean);
  const earliest = dated.length ? dated.reduce((a, b) => (compareKeys(a, b) < 0 ? a : b)) : null;

  let routeStart = earliest ?? addDaysKey(today, -45);
  if (compareKeys(routeStart, routeEnd) >= 0) routeStart = addDaysKey(routeEnd, -60);
  if (compareKeys(routeStart, today) > 0) routeStart = today;

  const dateKeys: string[] = [];
  for (let k = routeStart; compareKeys(k, routeEnd) <= 0; k = addDaysKey(k, 1)) {
    dateKeys.push(k);
  }
  if (dateKeys.length === 0) dateKeys.push(today);

  const n = dateKeys.length;
  const inWindow = subset.filter(
    (t) => compareKeys(t.date, routeStart) >= 0 && compareKeys(t.date, routeEnd) <= 0
  );
  const totalScheduled = inWindow.length;
  const targetTotal = Math.max(totalScheduled, 24, 1);

  const planned: number[] = [];
  const actual: number[] = [];
  let cumA = 0;
  for (let i = 0; i < n; i++) {
    planned.push((n <= 1 ? 1 : i / (n - 1)) * targetTotal);
    const dk = dateKeys[i];
    cumA += subset.filter((x) => x.date === dk && x.completed).length;
    actual.push(cumA);
  }

  let todayIndex = dateKeys.findIndex((k) => k === today);
  if (todayIndex < 0) {
    if (compareKeys(today, routeStart) < 0) todayIndex = 0;
    else if (compareKeys(today, routeEnd) > 0) todayIndex = n - 1;
    else {
      todayIndex = 0;
      for (let i = 0; i < n; i++) {
        if (compareKeys(dateKeys[i], today) <= 0) todayIndex = i;
      }
    }
  }

  return { dateKeys, planned, actual, routeStart, routeEnd, targetTotal, todayIndex };
}

export function formatShortDate(key: string): string {
  const [, m, d] = key.split("-");
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}

export function downsampleRouteSeries(
  dateKeys: string[],
  planned: number[],
  actual: number[],
  maxPts: number,
  todayIndex: number
): { dateKeys: string[]; planned: number[]; actual: number[]; todayIndex: number } {
  const n = dateKeys.length;
  if (n <= maxPts) return { dateKeys, planned, actual, todayIndex };

  const take = new Set<number>([0, n - 1, Math.max(0, Math.min(todayIndex, n - 1))]);
  const denom = Math.max(1, maxPts - 1);
  for (let i = 0; i < maxPts; i++) {
    take.add(Math.round((i / denom) * (n - 1)));
  }
  const sorted = [...take].filter((i) => i >= 0 && i < n).sort((a, b) => a - b);
  const outDates = sorted.map((i) => dateKeys[i]);
  const outP = sorted.map((i) => planned[i]);
  const outA = sorted.map((i) => actual[i]);
  const tk = dateKeys[Math.max(0, Math.min(todayIndex, n - 1))];
  let newToday = 0;
  for (let i = 0; i < outDates.length; i++) {
    if (compareKeys(outDates[i], tk) <= 0) newToday = i;
  }
  return { dateKeys: outDates, planned: outP, actual: outA, todayIndex: newToday };
}

export type Koko2CombinedRouteSeries = {
  dateKeys: string[];
  plannedEng: number[];
  actualEng: number[];
  plannedMath: number[];
  actualMath: number[];
  routeStart: string;
  routeEnd: string;
  targetEng: number;
  targetMath: number;
  todayIndex: number;
};

function buildSubjectSeriesOnKeys(
  subset: Task[],
  dateKeys: string[],
  routeStart: string,
  routeEnd: string
): { planned: number[]; actual: number[]; targetTotal: number } {
  const n = dateKeys.length;
  const inWindow = subset.filter(
    (t) => compareKeys(t.date, routeStart) >= 0 && compareKeys(t.date, routeEnd) <= 0
  );
  const totalScheduled = inWindow.length;
  const targetTotal = Math.max(totalScheduled, 24, 1);
  const planned: number[] = [];
  const actual: number[] = [];
  let cumA = 0;
  for (let i = 0; i < n; i++) {
    planned.push((n <= 1 ? 1 : i / (n - 1)) * targetTotal);
    const dk = dateKeys[i];
    cumA += subset.filter((x) => x.date === dk && x.completed).length;
    actual.push(cumA);
  }
  return { planned, actual, targetTotal };
}

/** 英語・数学を同一の日付軸に載せたルート（計画2本・実績2本）。 */
export function buildKoko2MockExamRouteCombined(
  tasks: Task[],
  today: string,
  options?: BuildKoko2MockRouteOptions
): Koko2CombinedRouteSeries {
  const routeEnd = resolveKoko2RouteEnd(today, options?.routeEndOverride ?? null);
  const eng = tasks.filter((t) => matchesSubject(t, "english"));
  const math = tasks.filter((t) => matchesSubject(t, "math"));
  const dated = [...eng, ...math].map((t) => t.date).filter(Boolean);
  const earliest = dated.length ? dated.reduce((a, b) => (compareKeys(a, b) < 0 ? a : b)) : null;

  let routeStart = earliest ?? addDaysKey(today, -45);
  if (compareKeys(routeStart, routeEnd) >= 0) routeStart = addDaysKey(routeEnd, -60);
  if (compareKeys(routeStart, today) > 0) routeStart = today;

  const dateKeys: string[] = [];
  for (let k = routeStart; compareKeys(k, routeEnd) <= 0; k = addDaysKey(k, 1)) {
    dateKeys.push(k);
  }
  if (dateKeys.length === 0) dateKeys.push(today);

  const engS = buildSubjectSeriesOnKeys(eng, dateKeys, routeStart, routeEnd);
  const mathS = buildSubjectSeriesOnKeys(math, dateKeys, routeStart, routeEnd);

  const n = dateKeys.length;
  let todayIndex = dateKeys.findIndex((k) => k === today);
  if (todayIndex < 0) {
    if (compareKeys(today, routeStart) < 0) todayIndex = 0;
    else if (compareKeys(today, routeEnd) > 0) todayIndex = n - 1;
    else {
      todayIndex = 0;
      for (let i = 0; i < n; i++) {
        if (compareKeys(dateKeys[i], today) <= 0) todayIndex = i;
      }
    }
  }

  return {
    dateKeys,
    plannedEng: engS.planned,
    actualEng: engS.actual,
    plannedMath: mathS.planned,
    actualMath: mathS.actual,
    routeStart,
    routeEnd,
    targetEng: engS.targetTotal,
    targetMath: mathS.targetTotal,
    todayIndex,
  };
}

export function downsampleCombinedRouteSeries(
  dateKeys: string[],
  plannedEng: number[],
  actualEng: number[],
  plannedMath: number[],
  actualMath: number[],
  maxPts: number,
  todayIndex: number
): {
  dateKeys: string[];
  plannedEng: number[];
  actualEng: number[];
  plannedMath: number[];
  actualMath: number[];
  todayIndex: number;
} {
  const n = dateKeys.length;
  if (n <= maxPts) {
    return { dateKeys, plannedEng, actualEng, plannedMath, actualMath, todayIndex };
  }

  const take = new Set<number>([0, n - 1, Math.max(0, Math.min(todayIndex, n - 1))]);
  const denom = Math.max(1, maxPts - 1);
  for (let i = 0; i < maxPts; i++) {
    take.add(Math.round((i / denom) * (n - 1)));
  }
  const sorted = [...take].filter((i) => i >= 0 && i < n).sort((a, b) => a - b);
  const outDates = sorted.map((i) => dateKeys[i]);
  const outPE = sorted.map((i) => plannedEng[i]);
  const outAE = sorted.map((i) => actualEng[i]);
  const outPM = sorted.map((i) => plannedMath[i]);
  const outAM = sorted.map((i) => actualMath[i]);
  const tk = dateKeys[Math.max(0, Math.min(todayIndex, n - 1))];
  let newToday = 0;
  for (let i = 0; i < outDates.length; i++) {
    if (compareKeys(outDates[i], tk) <= 0) newToday = i;
  }
  return {
    dateKeys: outDates,
    plannedEng: outPE,
    actualEng: outAE,
    plannedMath: outPM,
    actualMath: outAM,
    todayIndex: newToday,
  };
}
