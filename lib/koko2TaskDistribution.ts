import type { ProfileState } from "@/context/ProfileContext";

/** TasksContext.Task と同形（循環参照回避） */
export type Koko2SchedulableTask = {
  id: string;
  subject: "english" | "math";
  title: string;
  date: string;
  hour: number;
  completed: boolean;
  pinned?: boolean;
};
import { inferHomeScheduleLevels, type ScheduleLevel } from "@/lib/homeScheduleInference";

function makeDateKey(year: number, month0: number, day: number): string {
  const mm = String(month0 + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map((v) => parseInt(v, 10));
  return new Date(y, m - 1, d);
}

/**
 * その日の「空き」候補時刻（level 0 優先、なければ 1、それでもなければ夜間フォールバック）
 */
function candidateHoursForDate(
  dateKey: string,
  profile: Partial<ProfileState>
): number[] {
  const d = parseDateKey(dateKey);
  const levels = inferHomeScheduleLevels(d, profile);
  const pick = (maxLevel: ScheduleLevel) => {
    const out: number[] = [];
    for (let h = 6; h <= 22; h++) {
      if ((levels[h] ?? 0) <= maxLevel) out.push(h);
    }
    return out;
  };
  let hours = pick(0);
  if (hours.length < 3) hours = pick(1);
  if (hours.length === 0) hours = [19, 20, 21, 7, 6, 22, 18];
  hours.sort((a, b) => {
    const pri = (x: number) => (x >= 19 ? 0 : x <= 8 ? 1 : 2) * 100 + x;
    return pri(a) - pri(b);
  });
  return hours;
}

/**
 * KOKO2 全リーフ（buildAllKoko2LeafTasks の並び・ID・タイトル）はそのままに、
 * 日付は従来どおり span 日で巡回しつつ、時刻はプロフィールの混み具合に合わせて詰め直す。
 * 同一日・同一時間への偏りを避け、カレンダー／ホームの「どの枠に何を入れるか」を改善する。
 */
export function distributeKoko2TasksForProfile(
  tasks: Koko2SchedulableTask[],
  profile: Partial<ProfileState>,
  options?: { spanDays?: number; anchorDate?: Date }
): Koko2SchedulableTask[] {
  const spanDays = options?.spanDays ?? 120;
  const start = options?.anchorDate ?? new Date();
  const perDayHourCounts: Record<string, Record<number, number>> = {};

  return tasks.map((t, i) => {
    const dayOffset = i % spanDays;
    const d = new Date(start);
    d.setDate(d.getDate() + dayOffset);
    const dateKey = makeDateKey(d.getFullYear(), d.getMonth(), d.getDate());

    const candidates = candidateHoursForDate(dateKey, profile);
    if (!perDayHourCounts[dateKey]) perDayHourCounts[dateKey] = {};

    let bestH = candidates[0] ?? 20;
    let bestLoad = Infinity;
    for (const h of candidates) {
      const load = perDayHourCounts[dateKey][h] ?? 0;
      if (load < bestLoad) {
        bestLoad = load;
        bestH = h;
      }
    }
    perDayHourCounts[dateKey][bestH] = (perDayHourCounts[dateKey][bestH] ?? 0) + 1;

    return {
      ...t,
      date: dateKey,
      hour: bestH,
    };
  });
}

export function profileScheduleSignature(profile: Partial<ProfileState>): string {
  return [
    profile.school ?? "",
    profile.grade ?? "",
    profile.club ?? "",
    profile.juku ?? "",
    profile.englishSlots ?? "",
    profile.mathSlots ?? "",
  ].join("|");
}
