/**
 * 課外活動スケジュール（曜日＋種別＋種別ごとの共有時間）。
 * AIBOUCS2: 時間カスタム・平日その他・土日その他・不定期対応
 * AIBOUCS1: 互換読み取り
 */

export const CLUB_PROFILE_MACHINE_PREFIX = "AIBOUCS1";
export const CLUB_PROFILE_MACHINE_PREFIX_V2 = "AIBOUCS2";

export type TimeRange = { startH: number; startM: number; endH: number; endM: number };

/** 一般的な課外活動の時間帯（変更前のデフォルト） */
export const CLUB_SLOT_TIMES = {
  morning: { startH: 7, startM: 0, endH: 8, endM: 30 },
  evening: { startH: 16, startM: 0, endH: 18, endM: 0 },
  weekendAm: { startH: 9, startM: 0, endH: 12, endM: 0 },
  weekendPm: { startH: 12, startM: 0, endH: 15, endM: 0 },
} as const;

export const DEFAULT_OTHER_WEEKDAY: TimeRange = { startH: 19, startM: 0, endH: 21, endM: 0 };
export const DEFAULT_OTHER_WEEKEND: TimeRange = { startH: 14, startM: 0, endH: 17, endM: 0 };

function cloneTime(t: TimeRange): TimeRange {
  return { ...t };
}

export type ClubScheduleSpecV1 = {
  none: boolean;
  morningWeekdays: number[];
  eveningWeekdays: number[];
  satAm: boolean;
  satPm: boolean;
  sunAm: boolean;
  sunPm: boolean;
};

/** true = すでに1回目の「全体」編集が済み → 以降は曜日別オーバーライドのみ。false = 次の編集は times.* を全体更新 */
export type TimeFirstCommitDone = {
  morning: boolean;
  evening: boolean;
  otherWeekday: boolean;
  weekendAm: boolean;
  weekendPm: boolean;
  otherWeekend: boolean;
};

export type TimeOverrides = {
  morning: Partial<Record<number, TimeRange>>;
  evening: Partial<Record<number, TimeRange>>;
  otherWeekday: Partial<Record<number, TimeRange>>;
  weekendAm: Partial<Record<number, TimeRange>>;
  weekendPm: Partial<Record<number, TimeRange>>;
  otherWeekend: Partial<Record<number, TimeRange>>;
};

export type ClubScheduleResolved = {
  /** 未設定（保存文字列なし）。UI の初期状態。none はユーザーが「課外活動なし」を選んだとき */
  mode: "unset" | "none" | "irregular" | "standard";
  morningWeekdays: number[];
  eveningWeekdays: number[];
  otherWeekdays: number[];
  satAm: boolean;
  satPm: boolean;
  satOther: boolean;
  sunAm: boolean;
  sunPm: boolean;
  sunOther: boolean;
  times: {
    morning: TimeRange;
    evening: TimeRange;
    otherWeekday: TimeRange;
    weekendAm: TimeRange;
    weekendPm: TimeRange;
    otherWeekend: TimeRange;
  };
  timeFirstCommitDone: TimeFirstCommitDone;
  timeOverrides: TimeOverrides;
};

const DEFAULT_TIME_FIRST_COMMIT_DONE: TimeFirstCommitDone = {
  morning: false,
  evening: false,
  otherWeekday: false,
  weekendAm: false,
  weekendPm: false,
  otherWeekend: false,
};

export const EMPTY_RESOLVED: ClubScheduleResolved = {
  mode: "none",
  morningWeekdays: [],
  eveningWeekdays: [],
  otherWeekdays: [],
  satAm: false,
  satPm: false,
  satOther: false,
  sunAm: false,
  sunPm: false,
  sunOther: false,
  times: {
    morning: cloneTime(CLUB_SLOT_TIMES.morning),
    evening: cloneTime(CLUB_SLOT_TIMES.evening),
    otherWeekday: cloneTime(DEFAULT_OTHER_WEEKDAY),
    weekendAm: cloneTime(CLUB_SLOT_TIMES.weekendAm),
    weekendPm: cloneTime(CLUB_SLOT_TIMES.weekendPm),
    otherWeekend: cloneTime(DEFAULT_OTHER_WEEKEND),
  },
  timeFirstCommitDone: { ...DEFAULT_TIME_FIRST_COMMIT_DONE },
  timeOverrides: {
    morning: {},
    evening: {},
    otherWeekday: {},
    weekendAm: {},
    weekendPm: {},
    otherWeekend: {},
  },
};

export const EMPTY_CLUB_SPEC: ClubScheduleSpecV1 = {
  none: true,
  morningWeekdays: [],
  eveningWeekdays: [],
  satAm: false,
  satPm: false,
  sunAm: false,
  sunPm: false,
};

export const SCHOOL_CLUB_SCHEDULE_HINTS: Record<string, Partial<ClubScheduleSpecV1>> = {};

export function mergeSchoolClubHint(
  school: string | undefined,
  base: ClubScheduleSpecV1
): ClubScheduleSpecV1 {
  const key = (school ?? "").trim();
  if (!key) return base;
  const hint = SCHOOL_CLUB_SCHEDULE_HINTS[key];
  if (!hint) return base;
  return {
    ...base,
    ...hint,
    morningWeekdays: hint.morningWeekdays ?? base.morningWeekdays,
    eveningWeekdays: hint.eveningWeekdays ?? base.eveningWeekdays,
  };
}

function sortUniqueDays(d: number[]): number[] {
  return [...new Set(d)].filter((x) => x >= 1 && x <= 5).sort((a, b) => a - b);
}

function parseDayDigits(s: string): number[] {
  const out: number[] = [];
  for (const ch of s) {
    const n = parseInt(ch, 10);
    if (n >= 1 && n <= 5) out.push(n);
  }
  return sortUniqueDays(out);
}

function parseTimeToken(s: string | undefined, fallback: TimeRange): TimeRange {
  if (!s) return cloneTime(fallback);
  const p = s.split(",").map((x) => parseInt(x, 10));
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return cloneTime(fallback);
  return { startH: p[0], startM: p[1], endH: p[2], endM: p[3] };
}

function formatTimeToken(t: TimeRange): string {
  return `${t.startH},${t.startM},${t.endH},${t.endM}`;
}

/** 旧データ（|fc なし）: 常に曜日別編集相当 */
const LEGACY_TIME_FIRST_COMMIT: TimeFirstCommitDone = {
  morning: true,
  evening: true,
  otherWeekday: true,
  weekendAm: true,
  weekendPm: true,
  otherWeekend: true,
};

function parseOverrideSegment(seg: string | undefined): Partial<Record<number, TimeRange>> {
  if (!seg?.trim()) return {};
  const parts = seg.split(",").map((x) => parseInt(x, 10));
  const out: Partial<Record<number, TimeRange>> = {};
  for (let i = 0; i + 4 < parts.length; i += 5) {
    const d = parts[i];
    if (Number.isNaN(d)) continue;
    out[d] = {
      startH: parts[i + 1],
      startM: parts[i + 2],
      endH: parts[i + 3],
      endM: parts[i + 4],
    };
  }
  return out;
}

function formatOverrideSegment(map: Partial<Record<number, TimeRange>>): string {
  const entries = Object.entries(map)
    .filter(([, v]) => v != null)
    .map(([d, t]) => [Number(d), t as TimeRange] as const)
    .sort((a, b) => a[0] - b[0]);
  if (entries.length === 0) return "";
  return entries.flatMap(([d, t]) => [d, t.startH, t.startM, t.endH, t.endM]).join(",");
}

function parseFcBlock(s: string | undefined): TimeFirstCommitDone | null {
  if (!s || s.length !== 6) return null;
  const bit = (i: number) => s[i] === "1";
  return {
    morning: bit(0),
    evening: bit(1),
    otherWeekday: bit(2),
    weekendAm: bit(3),
    weekendPm: bit(4),
    otherWeekend: bit(5),
  };
}

function formatFcBlock(fc: TimeFirstCommitDone): string {
  const b = (x: boolean) => (x ? "1" : "0");
  return `${b(fc.morning)}${b(fc.evening)}${b(fc.otherWeekday)}${b(fc.weekendAm)}${b(fc.weekendPm)}${b(fc.otherWeekend)}`;
}

export function effectiveMorningTime(r: ClubScheduleResolved, weekday: number): TimeRange {
  const o = r.timeOverrides.morning[weekday];
  return o ? cloneTime(o) : cloneTime(r.times.morning);
}

export function effectiveEveningTime(r: ClubScheduleResolved, weekday: number): TimeRange {
  const o = r.timeOverrides.evening[weekday];
  return o ? cloneTime(o) : cloneTime(r.times.evening);
}

export function effectiveOtherWeekdayTime(r: ClubScheduleResolved, weekday: number): TimeRange {
  const o = r.timeOverrides.otherWeekday[weekday];
  return o ? cloneTime(o) : cloneTime(r.times.otherWeekday);
}

export function effectiveWeekendAmTime(r: ClubScheduleResolved, day: 6 | 0): TimeRange {
  const o = r.timeOverrides.weekendAm[day];
  return o ? cloneTime(o) : cloneTime(r.times.weekendAm);
}

export function effectiveWeekendPmTime(r: ClubScheduleResolved, day: 6 | 0): TimeRange {
  const o = r.timeOverrides.weekendPm[day];
  return o ? cloneTime(o) : cloneTime(r.times.weekendPm);
}

export function effectiveOtherWeekendTime(r: ClubScheduleResolved, day: 6 | 0): TimeRange {
  const o = r.timeOverrides.otherWeekend[day];
  return o ? cloneTime(o) : cloneTime(r.times.otherWeekend);
}

function v1ToResolved(v: ClubScheduleSpecV1): ClubScheduleResolved {
  if (v.none) return { ...EMPTY_RESOLVED, mode: "none" };
  return {
    mode: "standard",
    morningWeekdays: [...v.morningWeekdays],
    eveningWeekdays: [...v.eveningWeekdays],
    otherWeekdays: [],
    satAm: v.satAm,
    satPm: v.satPm,
    satOther: false,
    sunAm: v.sunAm,
    sunPm: v.sunPm,
    sunOther: false,
    times: {
      morning: cloneTime(CLUB_SLOT_TIMES.morning),
      evening: cloneTime(CLUB_SLOT_TIMES.evening),
      otherWeekday: cloneTime(DEFAULT_OTHER_WEEKDAY),
      weekendAm: cloneTime(CLUB_SLOT_TIMES.weekendAm),
      weekendPm: cloneTime(CLUB_SLOT_TIMES.weekendPm),
      otherWeekend: cloneTime(DEFAULT_OTHER_WEEKEND),
    },
    timeFirstCommitDone: { ...LEGACY_TIME_FIRST_COMMIT },
    timeOverrides: {
      morning: {},
      evening: {},
      otherWeekday: {},
      weekendAm: {},
      weekendPm: {},
      otherWeekend: {},
    },
  };
}

function tryDecodeCS2(first: string): ClubScheduleResolved | null {
  if (!first.startsWith(CLUB_PROFILE_MACHINE_PREFIX_V2)) return null;
  const rest = first.slice(CLUB_PROFILE_MACHINE_PREFIX_V2.length);
  const modeM = rest.match(/\|mode:(none|irr|std)/);
  let mode = modeM?.[1];
  if (!mode) {
    if (/\|none\b/.test(rest)) mode = "none";
    else if (/\|irr\b/.test(rest)) mode = "irr";
    else mode = "std";
  }
  if (mode === "none") return { ...EMPTY_RESOLVED, mode: "none" };
  if (mode === "irregular" || mode === "irr") return { ...EMPTY_RESOLVED, mode: "irregular" };
  if (mode !== "std") return { ...EMPTY_RESOLVED, mode: "none" };

  const spec: ClubScheduleResolved = {
    mode: "standard",
    morningWeekdays: [],
    eveningWeekdays: [],
    otherWeekdays: [],
    satAm: false,
    satPm: false,
    satOther: false,
    sunAm: false,
    sunPm: false,
    sunOther: false,
    times: { ...EMPTY_RESOLVED.times },
    timeFirstCommitDone: { ...LEGACY_TIME_FIRST_COMMIT },
    timeOverrides: {
      morning: {},
      evening: {},
      otherWeekday: {},
      weekendAm: {},
      weekendPm: {},
      otherWeekend: {},
    },
  };

  const m = rest.match(/\|m:([1-5]*)/);
  const e = rest.match(/\|e:([1-5]*)/);
  const ow = rest.match(/\|ow:([1-5]*)/);
  const sa = rest.match(/\|sa:([01])/);
  const sp = rest.match(/\|sp:([01])/);
  const so = rest.match(/\|so:([01])/);
  const ua = rest.match(/\|ua:([01])/);
  const up = rest.match(/\|up:([01])/);
  const uo = rest.match(/\|uo:([01])/);
  if (m) spec.morningWeekdays = parseDayDigits(m[1] ?? "");
  if (e) spec.eveningWeekdays = parseDayDigits(e[1] ?? "");
  if (ow) spec.otherWeekdays = parseDayDigits(ow[1] ?? "");
  if (sa) spec.satAm = sa[1] === "1";
  if (sp) spec.satPm = sp[1] === "1";
  if (so) spec.satOther = so[1] === "1";
  if (ua) spec.sunAm = ua[1] === "1";
  if (up) spec.sunPm = up[1] === "1";
  if (uo) spec.sunOther = uo[1] === "1";

  const tm = rest.match(/\|tm:([^|]+)/);
  const te = rest.match(/\|te:([^|]+)/);
  const tow = rest.match(/\|tow:([^|]+)/);
  const twa = rest.match(/\|twa:([^|]+)/);
  const twp = rest.match(/\|twp:([^|]+)/);
  const towe = rest.match(/\|towe:([^|]+)/);
  spec.times.morning = parseTimeToken(tm?.[1], CLUB_SLOT_TIMES.morning);
  spec.times.evening = parseTimeToken(te?.[1], CLUB_SLOT_TIMES.evening);
  spec.times.otherWeekday = parseTimeToken(tow?.[1], DEFAULT_OTHER_WEEKDAY);
  spec.times.weekendAm = parseTimeToken(twa?.[1], CLUB_SLOT_TIMES.weekendAm);
  spec.times.weekendPm = parseTimeToken(twp?.[1], CLUB_SLOT_TIMES.weekendPm);
  spec.times.otherWeekend = parseTimeToken(towe?.[1], DEFAULT_OTHER_WEEKEND);

  const fcRaw = rest.match(/\|fc:([01]{6})/)?.[1];
  const parsedFc = parseFcBlock(fcRaw);
  if (parsedFc) spec.timeFirstCommitDone = parsedFc;
  else spec.timeFirstCommitDone = { ...LEGACY_TIME_FIRST_COMMIT };

  const owm = rest.match(/\|owm:([^|]+)/)?.[1];
  const owe = rest.match(/\|owe:([^|]+)/)?.[1];
  const owo = rest.match(/\|owo:([^|]+)/)?.[1];
  const owam = rest.match(/\|owam:([^|]+)/)?.[1];
  const owpm = rest.match(/\|owpm:([^|]+)/)?.[1];
  const owom = rest.match(/\|owom:([^|]+)/)?.[1];
  spec.timeOverrides.morning = parseOverrideSegment(owm);
  spec.timeOverrides.evening = parseOverrideSegment(owe);
  spec.timeOverrides.otherWeekday = parseOverrideSegment(owo);
  spec.timeOverrides.weekendAm = parseOverrideSegment(owam);
  spec.timeOverrides.weekendPm = parseOverrideSegment(owpm);
  spec.timeOverrides.otherWeekend = parseOverrideSegment(owom);

  return spec;
}

export function decodeClubProfileString(club: string | undefined): ClubScheduleSpecV1 | null {
  const r = decodeClubScheduleResolved(club);
  if (!r) return null;
  if (r.mode === "unset") return null;
  if (r.mode !== "standard") return { ...EMPTY_CLUB_SPEC, none: true };
  return {
    none: false,
    morningWeekdays: [...r.morningWeekdays],
    eveningWeekdays: [...r.eveningWeekdays],
    satAm: r.satAm,
    satPm: r.satPm,
    sunAm: r.sunAm,
    sunPm: r.sunPm,
  };
}

/** 推論・UI 共通の解決結果 */
export function decodeClubScheduleResolved(club: string | undefined): ClubScheduleResolved | null {
  if (!club?.trim()) return null;
  const first = club.split("\n")[0]?.trim() ?? "";
  const cs2 = tryDecodeCS2(first);
  if (cs2) return cs2;
  if (first.startsWith(CLUB_PROFILE_MACHINE_PREFIX)) {
    const v1 = decodeClubProfileStringV1Only(first);
    if (v1) return v1ToResolved(v1);
  }
  return null;
}

function decodeClubProfileStringV1Only(first: string): ClubScheduleSpecV1 | null {
  if (!first.startsWith(CLUB_PROFILE_MACHINE_PREFIX)) return null;
  const rest = first.slice(CLUB_PROFILE_MACHINE_PREFIX.length);
  if (rest === "|none" || rest.startsWith("|none")) {
    return { ...EMPTY_CLUB_SPEC, none: true };
  }
  const spec: ClubScheduleSpecV1 = {
    none: false,
    morningWeekdays: [],
    eveningWeekdays: [],
    satAm: false,
    satPm: false,
    sunAm: false,
    sunPm: false,
  };
  const m = rest.match(/\|m:([1-5]*)/);
  const e = rest.match(/\|e:([1-5]*)/);
  const sa = rest.match(/\|sa:([01])/);
  const sp = rest.match(/\|sp:([01])/);
  const ua = rest.match(/\|ua:([01])/);
  const up = rest.match(/\|up:([01])/);
  if (m) spec.morningWeekdays = parseDayDigits(m[1] ?? "");
  if (e) spec.eveningWeekdays = parseDayDigits(e[1] ?? "");
  if (sa) spec.satAm = sa[1] === "1";
  if (sp) spec.satPm = sp[1] === "1";
  if (ua) spec.sunAm = ua[1] === "1";
  if (up) spec.sunPm = up[1] === "1";
  const hasAny =
    spec.morningWeekdays.length > 0 ||
    spec.eveningWeekdays.length > 0 ||
    spec.satAm ||
    spec.satPm ||
    spec.sunAm ||
    spec.sunPm;
  if (!hasAny) return { ...EMPTY_CLUB_SPEC, none: true };
  return spec;
}

export function encodeClubScheduleResolved(r: ClubScheduleResolved): string {
  if (r.mode === "unset") return "";
  const human = formatClubScheduleHumanFromResolved(r);
  if (r.mode === "none") {
    return `${CLUB_PROFILE_MACHINE_PREFIX_V2}|mode:none\n${human}`;
  }
  if (r.mode === "irregular") {
    return `${CLUB_PROFILE_MACHINE_PREFIX_V2}|mode:irr\n${human}`;
  }
  const m = sortUniqueDays(r.morningWeekdays).join("");
  const e = sortUniqueDays(r.eveningWeekdays).join("");
  const ow = sortUniqueDays(r.otherWeekdays).join("");
  const t = r.times;
  const fc = formatFcBlock(r.timeFirstCommitDone);
  const owm = formatOverrideSegment(r.timeOverrides.morning);
  const owe = formatOverrideSegment(r.timeOverrides.evening);
  const owo = formatOverrideSegment(r.timeOverrides.otherWeekday);
  const owam = formatOverrideSegment(r.timeOverrides.weekendAm);
  const owpm = formatOverrideSegment(r.timeOverrides.weekendPm);
  const owom = formatOverrideSegment(r.timeOverrides.otherWeekend);
  const machine = [
    `${CLUB_PROFILE_MACHINE_PREFIX_V2}|mode:std`,
    `|m:${m}`,
    `|e:${e}`,
    `|ow:${ow}`,
    `|sa:${r.satAm ? 1 : 0}`,
    `|sp:${r.satPm ? 1 : 0}`,
    `|so:${r.satOther ? 1 : 0}`,
    `|ua:${r.sunAm ? 1 : 0}`,
    `|up:${r.sunPm ? 1 : 0}`,
    `|uo:${r.sunOther ? 1 : 0}`,
    `|tm:${formatTimeToken(t.morning)}`,
    `|te:${formatTimeToken(t.evening)}`,
    `|tow:${formatTimeToken(t.otherWeekday)}`,
    `|twa:${formatTimeToken(t.weekendAm)}`,
    `|twp:${formatTimeToken(t.weekendPm)}`,
    `|towe:${formatTimeToken(t.otherWeekend)}`,
    `|fc:${fc}`,
    owm ? `|owm:${owm}` : "",
    owe ? `|owe:${owe}` : "",
    owo ? `|owo:${owo}` : "",
    owam ? `|owam:${owam}` : "",
    owpm ? `|owpm:${owpm}` : "",
    owom ? `|owom:${owom}` : "",
  ].join("");
  return `${machine}\n${human}`;
}

/** @deprecated 新規は encodeClubScheduleResolved を使う */
export function encodeClubProfileString(spec: ClubScheduleSpecV1): string {
  return encodeClubScheduleResolved(v1ToResolved(spec));
}

export function formatClubScheduleHumanFromResolved(spec: ClubScheduleResolved): string {
  if (spec.mode === "unset") return "";
  if (spec.mode === "none") return "課外活動なし";
  if (spec.mode === "irregular") return "課外活動（不定期）";
  const hasSlots =
    spec.morningWeekdays.length > 0 ||
    spec.eveningWeekdays.length > 0 ||
    spec.otherWeekdays.length > 0 ||
    spec.satAm ||
    spec.satPm ||
    spec.satOther ||
    spec.sunAm ||
    spec.sunPm ||
    spec.sunOther;
  if (!hasSlots) return "課外活動の曜日・種類を設定中";
  const parts: string[] = [];
  const dayJa = (d: number) => ["", "月", "火", "水", "木", "金"][d] ?? "";
  const fmt = (tr: TimeRange) =>
    `${String(tr.startH).padStart(2, "0")}:${String(tr.startM).padStart(2, "0")}〜${tr.endH}:${String(tr.endM).padStart(2, "0")}`;

  function groupWeekdayLine(
    label: string,
    days: number[],
    getTr: (d: number) => TimeRange
  ): string {
    const buckets = new Map<string, number[]>();
    for (const d of days.sort((a, b) => a - b)) {
      const tr = getTr(d);
      const key = `${tr.startH},${tr.startM},${tr.endH},${tr.endM}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(d);
    }
    const segs: { ord: number; text: string }[] = [];
    for (const [, ds] of buckets) {
      const tr = getTr(ds[0]);
      segs.push({ ord: Math.min(...ds), text: `${ds.map(dayJa).join("・")}（${fmt(tr)}）` });
    }
    segs.sort((a, b) => a.ord - b.ord);
    return `${label} ${segs.map((s) => s.text).join(" ")}`;
  }

  if (spec.morningWeekdays.length > 0) {
    parts.push(groupWeekdayLine("朝", spec.morningWeekdays, (d) => effectiveMorningTime(spec, d)));
  }
  if (spec.eveningWeekdays.length > 0) {
    parts.push(groupWeekdayLine("放課後", spec.eveningWeekdays, (d) => effectiveEveningTime(spec, d)));
  }
  if (spec.otherWeekdays.length > 0) {
    parts.push(
      groupWeekdayLine("その他（平日）", spec.otherWeekdays, (d) => effectiveOtherWeekdayTime(spec, d))
    );
  }
  if (spec.satAm)
    parts.push(`土・午前 ${fmt(effectiveWeekendAmTime(spec, 6))}`);
  if (spec.satPm)
    parts.push(`土・午後 ${fmt(effectiveWeekendPmTime(spec, 6))}`);
  if (spec.satOther)
    parts.push(`土・その他 ${fmt(effectiveOtherWeekendTime(spec, 6))}`);
  if (spec.sunAm)
    parts.push(`日・午前 ${fmt(effectiveWeekendAmTime(spec, 0))}`);
  if (spec.sunPm)
    parts.push(`日・午後 ${fmt(effectiveWeekendPmTime(spec, 0))}`);
  if (spec.sunOther)
    parts.push(`日・その他 ${fmt(effectiveOtherWeekendTime(spec, 0))}`);
  return parts.length > 0 ? parts.join(" ／ ") : "課外活動なし";
}

export function getClubDisplayForUi(club: string | undefined): string {
  if (!club?.trim()) return "";
  const lines = club.split("\n");
  const first = lines[0]?.trim() ?? "";
  if (first.startsWith(CLUB_PROFILE_MACHINE_PREFIX_V2) || first.startsWith(CLUB_PROFILE_MACHINE_PREFIX)) {
    const r = decodeClubScheduleResolved(club);
    return r ? formatClubScheduleHumanFromResolved(r) : lines.slice(1).join("\n").trim();
  }
  return club.trim();
}

export function getClubCompanionLine(club: string | undefined): string | undefined {
  if (!club?.trim()) return undefined;
  const human = getClubDisplayForUi(club);
  const r = decodeClubScheduleResolved(club);
  if (!r) return `club=${club}`;
  return `club_schedule=${human}`;
}

export function presetTypicalClubWeek(): ClubScheduleResolved {
  return {
    mode: "standard",
    morningWeekdays: [1, 2, 3, 4, 5],
    eveningWeekdays: [1, 3, 5],
    otherWeekdays: [],
    satAm: true,
    satPm: false,
    satOther: false,
    sunAm: false,
    sunPm: false,
    sunOther: false,
    times: { ...EMPTY_RESOLVED.times },
    timeFirstCommitDone: { ...DEFAULT_TIME_FIRST_COMMIT_DONE },
    timeOverrides: {
      morning: {},
      evening: {},
      otherWeekday: {},
      weekendAm: {},
      weekendPm: {},
      otherWeekend: {},
    },
  };
}
