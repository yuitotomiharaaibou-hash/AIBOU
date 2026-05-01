import { addDaysKey, type Koko2RouteSubject } from "@/lib/mainKoko2RouteSeries";

function compareKeys(a: string, b: string): number {
  return a.localeCompare(b);
}

/** 日付キー間の暦日数（両端含む） */
function daysInclusive(startKey: string, endKey: string): number {
  const [y1, m1, d1] = startKey.split("-").map((v) => parseInt(v, 10));
  const [y2, m2, d2] = endKey.split("-").map((v) => parseInt(v, 10));
  const t0 = new Date(y1, m1 - 1, d1).getTime();
  const t1 = new Date(y2, m2 - 1, d2).getTime();
  return Math.max(1, Math.round((t1 - t0) / 86400000) + 1);
}

export type MainKoko2TaskBand = {
  startKey: string;
  endKey: string;
  label: string;
  color?: string;
};

/**
 * 校内模試までをタスクで読み切れる前提で、ルート全体を4フェーズの実行帯に分割する。
 */
export function buildMainKoko2TaskBands(
  routeStart: string,
  routeEnd: string,
  subject: Koko2RouteSubject
): MainKoko2TaskBand[] {
  if (compareKeys(routeStart, routeEnd) > 0) return [];

  const n = 4;
  const total = daysInclusive(routeStart, routeEnd);
  const baseDays = Math.max(1, Math.floor(total / n));

  const labels =
    subject === "english"
      ? ["語彙・文法の土台", "長文・要約の型", "演習と弱点トピック", "直前・仕上げ（模試まで）"]
      : ["教科書・定理の整理", "典型・標準の突破", "応用・演習の回転", "直前・仕上げ（模試まで）"];

  const colors =
    subject === "english"
      ? ["#0EA5E9", "#38BDF8", "#0284C7", "#0369A1"]
      : ["#FB923C", "#F97316", "#EA580C", "#C2410C"];

  const bands: MainKoko2TaskBand[] = [];
  let cursor = routeStart;
  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1;
    let end: string;
    if (isLast) {
      end = routeEnd;
    } else {
      end = addDaysKey(cursor, baseDays - 1);
      if (compareKeys(end, routeEnd) > 0) end = routeEnd;
    }
    if (compareKeys(cursor, end) <= 0) {
      bands.push({ startKey: cursor, endKey: end, label: labels[i], color: colors[i] });
    }
    if (isLast) break;
    cursor = addDaysKey(end, 1);
    if (compareKeys(cursor, routeEnd) > 0) break;
  }
  return bands;
}
