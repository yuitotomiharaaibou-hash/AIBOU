import type { ProfileState } from "@/context/ProfileContext";
import {
  decodeClubScheduleResolved,
  effectiveEveningTime,
  effectiveMorningTime,
  effectiveOtherWeekdayTime,
  effectiveOtherWeekendTime,
  effectiveWeekendAmTime,
  effectiveWeekendPmTime,
  type ClubScheduleResolved,
  type TimeRange,
} from "@/lib/clubScheduleProfile";
import { legacyHourInclusiveToSpan, spanFromClock, type PlanSpan } from "@/lib/planTime";

/** ホーム・カレンダーでプロフィールから出す予定名（細かい種別は編集で後から変更可） */
export const EXTRACURRICULAR_PLAN_TITLE = "部活動・課外活動";

/** 0=なし（白） 1=薄い 2=濃い */
export type ScheduleLevel = 0 | 1 | 2;
/** 予定1件（分単位・終端 exclusive） */
export type InferredPlanItem = PlanSpan;

const DAY_KANJI_TO_GETDAY: Record<string, number> = {
  日: 0,
  月: 1,
  火: 2,
  水: 3,
  木: 4,
  金: 5,
  土: 6,
};

function parseJukuSlot(slot: string): {
  weekday: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
} | null {
  if (!slot || slot === "受講なし") return null;
  const m = slot.match(
    /^(日|月|火|水|木|金|土)曜(\d{1,2}):(\d{2})~(\d{1,2}):(\d{2})/
  );
  if (!m) return null;
  const weekday = DAY_KANJI_TO_GETDAY[m[1]];
  if (weekday === undefined) return null;
  const startHour = parseInt(m[2], 10);
  const startMinute = parseInt(m[3], 10);
  const endHour = parseInt(m[4], 10);
  const endMinute = parseInt(m[5], 10);
  return { weekday, startHour, startMinute, endHour, endMinute };
}

function setRange(
  levels: Record<number, ScheduleLevel>,
  from: number,
  to: number,
  level: ScheduleLevel
) {
  for (let h = from; h <= to; h++) {
    if (h < 0 || h > 23) continue;
    levels[h] = Math.max(levels[h], level) as ScheduleLevel;
  }
}

function setByMinuteRange(
  levels: Record<number, ScheduleLevel>,
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number
) {
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  applyMinuteOverlapToLevels(levels, start, end);
}

function applyMinuteOverlapToLevels(
  levels: Record<number, ScheduleLevel>,
  startMin: number,
  endMinExclusive: number
) {
  for (let h = 0; h < 24; h++) {
    const hourStart = h * 60;
    const hourEnd = hourStart + 60;
    const overlap = Math.max(0, Math.min(endMinExclusive, hourEnd) - Math.max(startMin, hourStart));
    if (overlap <= 0) continue;
    const ratio = overlap / 60;
    const level: ScheduleLevel = ratio >= 0.75 ? 2 : 1;
    levels[h] = Math.max(levels[h], level) as ScheduleLevel;
  }
}

function toMin(h: number, m: number) {
  return h * 60 + m;
}

function applyRangeToLevels(levels: Record<number, ScheduleLevel>, tr: TimeRange) {
  applyMinuteOverlapToLevels(
    levels,
    toMin(tr.startH, tr.startM),
    toMin(tr.endH, tr.endM) + 1
  );
}

function applyClubResolvedToLevels(
  levels: Record<number, ScheduleLevel>,
  weekday: number,
  r: ClubScheduleResolved
) {
  if (r.mode === "none" || r.mode === "irregular" || r.mode === "unset") return;
  if (weekday >= 1 && weekday <= 5) {
    if (r.morningWeekdays.includes(weekday))
      applyRangeToLevels(levels, effectiveMorningTime(r, weekday));
    if (r.eveningWeekdays.includes(weekday))
      applyRangeToLevels(levels, effectiveEveningTime(r, weekday));
    if (r.otherWeekdays.includes(weekday))
      applyRangeToLevels(levels, effectiveOtherWeekdayTime(r, weekday));
  }
  if (weekday === 6) {
    if (r.satAm) applyRangeToLevels(levels, effectiveWeekendAmTime(r, 6));
    if (r.satPm) applyRangeToLevels(levels, effectiveWeekendPmTime(r, 6));
    if (r.satOther) applyRangeToLevels(levels, effectiveOtherWeekendTime(r, 6));
  }
  if (weekday === 0) {
    if (r.sunAm) applyRangeToLevels(levels, effectiveWeekendAmTime(r, 0));
    if (r.sunPm) applyRangeToLevels(levels, effectiveWeekendPmTime(r, 0));
    if (r.sunOther) applyRangeToLevels(levels, effectiveOtherWeekendTime(r, 0));
  }
}

function clubSpansForDayResolved(weekday: number, r: ClubScheduleResolved): InferredPlanItem[] {
  if (r.mode === "none" || r.mode === "irregular" || r.mode === "unset") return [];
  const out: InferredPlanItem[] = [];
  if (weekday >= 1 && weekday <= 5) {
    if (r.morningWeekdays.includes(weekday)) {
      const t = effectiveMorningTime(r, weekday);
      out.push(spanFromClock(EXTRACURRICULAR_PLAN_TITLE, t.startH, t.startM, t.endH, t.endM));
    }
    if (r.eveningWeekdays.includes(weekday)) {
      const t = effectiveEveningTime(r, weekday);
      out.push(spanFromClock(EXTRACURRICULAR_PLAN_TITLE, t.startH, t.startM, t.endH, t.endM));
    }
    if (r.otherWeekdays.includes(weekday)) {
      const t = effectiveOtherWeekdayTime(r, weekday);
      out.push(spanFromClock(EXTRACURRICULAR_PLAN_TITLE, t.startH, t.startM, t.endH, t.endM));
    }
  }
  if (weekday === 6) {
    if (r.satAm) {
      const t = effectiveWeekendAmTime(r, 6);
      out.push(spanFromClock(EXTRACURRICULAR_PLAN_TITLE, t.startH, t.startM, t.endH, t.endM));
    }
    if (r.satPm) {
      const t = effectiveWeekendPmTime(r, 6);
      out.push(spanFromClock(EXTRACURRICULAR_PLAN_TITLE, t.startH, t.startM, t.endH, t.endM));
    }
    if (r.satOther) {
      const t = effectiveOtherWeekendTime(r, 6);
      out.push(spanFromClock(EXTRACURRICULAR_PLAN_TITLE, t.startH, t.startM, t.endH, t.endM));
    }
  }
  if (weekday === 0) {
    if (r.sunAm) {
      const t = effectiveWeekendAmTime(r, 0);
      out.push(spanFromClock(EXTRACURRICULAR_PLAN_TITLE, t.startH, t.startM, t.endH, t.endM));
    }
    if (r.sunPm) {
      const t = effectiveWeekendPmTime(r, 0);
      out.push(spanFromClock(EXTRACURRICULAR_PLAN_TITLE, t.startH, t.startM, t.endH, t.endM));
    }
    if (r.sunOther) {
      const t = effectiveOtherWeekendTime(r, 0);
      out.push(spanFromClock(EXTRACURRICULAR_PLAN_TITLE, t.startH, t.startM, t.endH, t.endM));
    }
  }
  return out;
}

/**
 * プロフィールと曜日から、左列マスの初期濃淡を推測する。
 * - 睡眠: 0–6 時 濃い（0:00〜7:00）
 * - 平日朝: 7–8 薄い（家→学校）
 * - 開成授業: 8:30 開始の公式夏/冬スケジュールに合わせた分単位
 * - 課外・塾: 該当帯は薄い〜濃い（max）
 */
export function inferHomeScheduleLevels(
  d: Date,
  profile: Partial<ProfileState>
): Record<number, ScheduleLevel> {
  const levels: Record<number, ScheduleLevel> = {};
  for (let h = 0; h < 24; h++) levels[h] = 0;

  const weekday = d.getDay();
  const month = d.getMonth() + 1;
  const school = profile.school ?? "";
  const isKaisei = school.includes("開成");
  const isTetsu = profile.juku === "鉄緑会";
  const isHigh2 = profile.grade === "高2";
  const isSummer = month >= 4 && month <= 10;

  setRange(levels, 0, 6, 2);

  const isWeekday = weekday >= 1 && weekday <= 5;
  const isSaturday = weekday === 6;

  if (isKaisei) {
    if (isWeekday || isSaturday) {
      if (isSummer) {
        setByMinuteRange(levels, 8, 0, 8, 30);
        if (weekday === 3) {
          setByMinuteRange(levels, 8, 30, 11, 20);
          setByMinuteRange(levels, 11, 25, 11, 55);
          setByMinuteRange(levels, 12, 0, 12, 50);
          setByMinuteRange(levels, 12, 50, 13, 30);
          setByMinuteRange(levels, 13, 30, 15, 20);
        } else if (isSaturday) {
          setByMinuteRange(levels, 8, 30, 12, 20);
        } else {
          setByMinuteRange(levels, 8, 30, 12, 20);
          setByMinuteRange(levels, 12, 20, 13, 0);
          setByMinuteRange(levels, 13, 0, 14, 50);
        }
      } else {
        setByMinuteRange(levels, 8, 0, 8, 30);
        if (weekday === 3) {
          setByMinuteRange(levels, 8, 30, 11, 20);
          setByMinuteRange(levels, 11, 25, 11, 55);
          setByMinuteRange(levels, 12, 0, 12, 50);
          setByMinuteRange(levels, 12, 50, 13, 30);
          setByMinuteRange(levels, 13, 30, 15, 20);
        } else if (isSaturday) {
          setByMinuteRange(levels, 8, 30, 12, 20);
        } else {
          setByMinuteRange(levels, 8, 30, 12, 20);
          setByMinuteRange(levels, 12, 20, 13, 0);
          setByMinuteRange(levels, 13, 0, 14, 50);
        }
      }
      setRange(levels, 7, 8, 1);
      setRange(levels, 15, 16, 1);
    }
  } else if (isWeekday) {
    setRange(levels, 7, 8, 1);
    setRange(levels, 9, 15, 1);
    setRange(levels, 16, 16, 1);
  }

  const club = profile.club;
  const clubResolved = decodeClubScheduleResolved(club);
  if (clubResolved) {
    applyClubResolvedToLevels(levels, weekday, clubResolved);
  } else if (club && club !== "帰宅部" && (weekday === 2 || weekday === 4)) {
    setRange(levels, 16, 18, 2);
  }

  let slots = [profile.englishSlots, profile.mathSlots].filter(Boolean) as string[];
  if (slots.length === 0 && isKaisei && isHigh2 && isTetsu) {
    slots = ["月曜17:20~20:20", "水曜17:20~20:20"];
  }
  for (const slot of slots) {
    const parsed = parseJukuSlot(slot);
    if (!parsed) continue;
    if (parsed.weekday !== weekday) continue;
    const startMin = parsed.startHour * 60 + parsed.startMinute;
    const endExclusive = parsed.endHour * 60 + parsed.endMinute + 1;
    applyMinuteOverlapToLevels(levels, startMin, endExclusive);
  }

  return levels;
}

/**
 * 日別詳細画面向けの、ざっくり予定リスト。
 * ホームの濃淡推測と整合（開成は授業 8:30 開始・睡眠 0〜7 時）。
 */
export function inferDailyPlanItems(
  d: Date,
  profile: Partial<ProfileState>
): InferredPlanItem[] {
  const weekday = d.getDay();
  const month = d.getMonth() + 1;
  const school = profile.school ?? "";
  const isKaisei = school.includes("開成");
  const isSummer = month >= 4 && month <= 10;
  const out: InferredPlanItem[] = [];

  out.push(legacyHourInclusiveToSpan("睡眠", 0, 6));

  const isWeekday = weekday >= 1 && weekday <= 5;
  const isSaturday = weekday === 6;
  if (isKaisei && (isWeekday || isSaturday)) {
    out.push(legacyHourInclusiveToSpan("家→学校", 7, 8));
    if (isSummer) {
      if (weekday === 3) {
        out.push(spanFromClock("学校（開成）8:30-15:20", 8, 30, 15, 20));
      } else if (isSaturday) {
        out.push(spanFromClock("学校（開成・土曜4限）8:30-12:20", 8, 30, 12, 20));
      } else {
        out.push(spanFromClock("学校（開成）8:30-14:50", 8, 30, 14, 50));
      }
    } else if (weekday === 3) {
      out.push(spanFromClock("学校（開成）8:30-15:20", 8, 30, 15, 20));
    } else if (isSaturday) {
      out.push(spanFromClock("学校（開成・土曜4限）8:30-12:20", 8, 30, 12, 20));
    } else {
      out.push(spanFromClock("学校（開成）8:30-14:50", 8, 30, 14, 50));
    }
    out.push(legacyHourInclusiveToSpan("学校→家", 15, 16));
  } else if (isWeekday) {
    out.push(legacyHourInclusiveToSpan("家→学校", 7, 8));
    out.push(legacyHourInclusiveToSpan("学校", 9, 15));
    out.push(legacyHourInclusiveToSpan("学校→家", 16, 16));
  }

  const club = profile.club;
  const clubResolved = decodeClubScheduleResolved(club);
  if (clubResolved) {
    out.push(...clubSpansForDayResolved(weekday, clubResolved));
  } else if (club && club !== "帰宅部" && (weekday === 2 || weekday === 4)) {
    out.push(legacyHourInclusiveToSpan(EXTRACURRICULAR_PLAN_TITLE, 16, 18));
  }

  let slots = [profile.englishSlots, profile.mathSlots].filter(Boolean) as string[];
  if (slots.length === 0 && isKaisei && profile.grade === "高2" && profile.juku === "鉄緑会") {
    slots = ["月曜17:20~20:20", "水曜17:20~20:20"];
  }
  for (const slot of slots) {
    const parsed = parseJukuSlot(slot);
    if (!parsed || parsed.weekday !== weekday) continue;
    out.push(
      spanFromClock("鉄緑会", parsed.startHour, parsed.startMinute, parsed.endHour, parsed.endMinute)
    );
  }

  return out;
}
