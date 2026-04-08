import type { ProfileState } from "@/context/ProfileContext";

/** 0=なし（白） 1=薄い 2=濃い */
export type ScheduleLevel = 0 | 1 | 2;
export type InferredPlanItem = {
  title: string;
  startHour: number;
  endHour: number;
};

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
  endHour: number;
} | null {
  if (!slot || slot === "受講なし") return null;
  const m = slot.match(
    /^(日|月|火|水|木|金|土)曜(\d{1,2}):(\d{2})~(\d{1,2}):(\d{2})/
  );
  if (!m) return null;
  const weekday = DAY_KANJI_TO_GETDAY[m[1]];
  if (weekday === undefined) return null;
  const startHour = parseInt(m[2], 10);
  const endHour = parseInt(m[4], 10);
  return { weekday, startHour, endHour };
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
  for (let h = 0; h < 24; h++) {
    const hourStart = h * 60;
    const hourEnd = hourStart + 60;
    const overlap = Math.max(0, Math.min(end, hourEnd) - Math.max(start, hourStart));
    if (overlap <= 0) continue;
    const ratio = overlap / 60;
    const level: ScheduleLevel = ratio >= 0.75 ? 2 : 1;
    levels[h] = Math.max(levels[h], level) as ScheduleLevel;
  }
}

/**
 * プロフィールと曜日から、左列マスの初期濃淡を推測する。
 * - 睡眠: 0–6 時 濃い
 * - 平日朝: 7–8 薄い（通学・準備）
 * - 平日授業: 9–15 薄い
 * - 平日帰宅: 16 薄い（移動）
 * - 部活: 帰宅部以外は火木 16–18 濃い（例）
 * - 英語・数学コマ（塾）: 該当曜日の時間帯は薄い（上書きで競合時は max）
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

  // 睡眠（0–6）濃い
  setRange(levels, 0, 6, 2);

  const isWeekday = weekday >= 1 && weekday <= 5;
  const isSaturday = weekday === 6;

  // 開成の時間割（公式の夏時間/冬時間）をホーム濃淡に反映
  if (isKaisei) {
    if (isWeekday || isSaturday) {
      if (isSummer) {
        // 予鈴〜1限前
        setByMinuteRange(levels, 8, 0, 8, 10);
        if (weekday === 3) {
          // 水曜（HRあり）
          setByMinuteRange(levels, 8, 10, 11, 0);
          setByMinuteRange(levels, 11, 5, 11, 35); // HR
          setByMinuteRange(levels, 11, 40, 12, 30);
          setByMinuteRange(levels, 12, 30, 13, 10); // 昼休み
          setByMinuteRange(levels, 13, 10, 15, 0);
        } else if (isSaturday) {
          // 土曜4限まで
          setByMinuteRange(levels, 8, 10, 12, 0);
        } else {
          setByMinuteRange(levels, 8, 10, 12, 0);
          setByMinuteRange(levels, 12, 0, 12, 40); // 昼休み
          setByMinuteRange(levels, 12, 40, 14, 30);
        }
      } else {
        // 冬時間
        setByMinuteRange(levels, 8, 10, 8, 20);
        if (weekday === 3) {
          setByMinuteRange(levels, 8, 20, 11, 10);
          setByMinuteRange(levels, 11, 15, 11, 45); // HR
          setByMinuteRange(levels, 11, 50, 12, 40);
          setByMinuteRange(levels, 12, 40, 13, 20); // 昼休み
          setByMinuteRange(levels, 13, 20, 15, 10);
        } else if (isSaturday) {
          setByMinuteRange(levels, 8, 20, 12, 10);
        } else {
          setByMinuteRange(levels, 8, 20, 12, 10);
          setByMinuteRange(levels, 12, 10, 12, 50); // 昼休み
          setByMinuteRange(levels, 12, 50, 14, 40);
        }
      }
      // 通学/下校の余白
      setRange(levels, 7, 7, 1);
      setRange(levels, 15, 16, 1);
    }
  } else if (isWeekday) {
    // 既定値（開成以外）
    setRange(levels, 7, 8, 1);
    setRange(levels, 9, 15, 1);
    setRange(levels, 16, 16, 1);
  }

  const club = profile.club;
  if (club && club !== "帰宅部" && (weekday === 2 || weekday === 4)) {
    setRange(levels, 16, 18, 2);
  }

  let slots = [profile.englishSlots, profile.mathSlots].filter(Boolean) as string[];
  // ペルソナ既定: 開成高2・鉄緑会は月水17:20-20:20（英数を週2）
  if (slots.length === 0 && isKaisei && isHigh2 && isTetsu) {
    slots = ["月曜17:20~20:20", "水曜17:20~20:20"];
  }
  for (const slot of slots) {
    const parsed = parseJukuSlot(slot);
    if (!parsed) continue;
    if (parsed.weekday !== weekday) continue;
    const { startHour, endHour } = parsed;
    setRange(levels, startHour, endHour, 1);
  }

  return levels;
}

/**
 * 日別詳細画面向けの、ざっくり予定リスト。
 * ホームの濃淡推測ロジックと同じ前提で、編集可能な初期候補として使う。
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

  out.push({ title: "睡眠", startHour: 0, endHour: 6 });

  const isWeekday = weekday >= 1 && weekday <= 5;
  const isSaturday = weekday === 6;
  if (isKaisei && (isWeekday || isSaturday)) {
    out.push({ title: "通学・準備", startHour: 7, endHour: 8 });
    if (isSummer) {
      if (weekday === 3) {
        out.push({ title: "学校（開成）8:10-15:00", startHour: 8, endHour: 15 });
      } else if (isSaturday) {
        out.push({ title: "学校（開成・土曜4限）8:10-12:00", startHour: 8, endHour: 12 });
      } else {
        out.push({ title: "学校（開成）8:10-14:30", startHour: 8, endHour: 14 });
      }
    } else if (weekday === 3) {
      out.push({ title: "学校（開成）8:20-15:10", startHour: 8, endHour: 15 });
    } else if (isSaturday) {
      out.push({ title: "学校（開成・土曜4限）8:20-12:10", startHour: 8, endHour: 12 });
    } else {
      out.push({ title: "学校（開成）8:20-14:40", startHour: 8, endHour: 14 });
    }
    out.push({ title: "移動", startHour: 15, endHour: 16 });
  } else if (isWeekday) {
    out.push({ title: "通学・準備", startHour: 7, endHour: 8 });
    out.push({ title: "学校", startHour: 9, endHour: 15 });
    out.push({ title: "移動", startHour: 16, endHour: 16 });
  }

  const club = profile.club;
  if (club && club !== "帰宅部" && (weekday === 2 || weekday === 4)) {
    out.push({ title: `部活（${club}）`, startHour: 16, endHour: 18 });
  }

  let slots = [profile.englishSlots, profile.mathSlots].filter(Boolean) as string[];
  if (slots.length === 0 && isKaisei && profile.grade === "高2" && profile.juku === "鉄緑会") {
    slots = ["月曜17:20~20:20", "水曜17:20~20:20"];
  }
  for (const slot of slots) {
    const parsed = parseJukuSlot(slot);
    if (!parsed || parsed.weekday !== weekday) continue;
    out.push({ title: "鉄緑会", startHour: parsed.startHour, endHour: parsed.endHour });
  }

  return out;
}
