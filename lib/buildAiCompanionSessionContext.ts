import type { ProfileState } from "@/context/ProfileContext";
import { getClubCompanionLine } from "@/lib/clubScheduleProfile";
import type { UserDetailState } from "@/lib/userDetailFields";
import { USER_DETAIL_META } from "@/lib/userDetailFields";
import type { PlannerPreference } from "@/lib/plannerPreference";

export type CompanionTaskSlice = {
  id: string;
  title: string;
  subject: string;
  date: string;
  hour: number;
  completed: boolean;
  pinned?: boolean;
};

export function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split("-").map((v) => parseInt(v, 10));
  const dt = new Date(y, m - 1, d + deltaDays);
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

function addMonthsToYm(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map((v) => parseInt(v, 10));
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function summarizeTasksForMonth(tasks: CompanionTaskSlice[], yearMonth: string): string {
  const pref = `${yearMonth}-`;
  const pool = tasks
    .filter((t) => t.date.startsWith(pref))
    .sort((a, b) => a.date.localeCompare(b.date) || a.hour - b.hour)
    .slice(0, 50)
    .map(
      (t) =>
        `id=${t.id} ${t.date} ${String(t.hour).padStart(2, "0")}:00 subject=${t.subject} ${t.completed ? "済" : "未"} ${t.title}`
    );
  return pool.join("\n");
}

function summarizeTasksForDay(
  tasks: CompanionTaskSlice[],
  dayKey: string,
  opts: { onlyIncomplete?: boolean }
): string {
  const rows = tasks
    .filter((t) => {
      if (t.date !== dayKey) return false;
      if (opts.onlyIncomplete && (t.completed || t.pinned === true)) return false;
      return true;
    })
    .sort((a, b) => a.hour - b.hour)
    .slice(0, 28)
    .map(
      (t) =>
        `id=${t.id} ${String(t.hour).padStart(2, "0")}:00 ${t.completed ? "済" : "未"} subject=${t.subject} ${t.title}`
    );
  return rows.join("\n");
}

function plannerBrief(pref: PlannerPreference): string {
  return [
    `maxTasksPerDay=${pref.maxTasksPerDay}`,
    `avoidAfterHour=${pref.avoidAfterHour}`,
    `preferredHours=${pref.preferredHours.slice(0, 12).join(",")}`,
    `subjectBias_en=${pref.subjectBias.english.toFixed(2)}_math=${pref.subjectBias.math.toFixed(2)}`,
  ].join(" / ");
}

/**
 * 再立案AIが参照する「裏側の事実」テキスト。UIには出さない想定。
 */
export function buildAiCompanionSessionContext(input: {
  profile: ProfileState;
  userDetails: UserDetailState;
  tasks: CompanionTaskSlice[];
  todayKey: string;
  tomorrowKey: string;
  /** ホーム「予定」1行ずつ（id=… を含む。home_plan_ops の対象） */
  homeTodayPlanLines: string[];
  homeTomorrowPlanLines: string[];
  plannerPreference: PlannerPreference;
}): string {
  const yesterdayKey = addDaysToDateKey(input.todayKey, -1);
  const lines: string[] = [];

  lines.push("[プロフィール]");
  const p = input.profile;
  const profileBits = [
    p.school && `school=${p.school}`,
    p.grade && `grade=${p.grade}`,
    p.club && getClubCompanionLine(p.club),
    p.juku && `juku=${p.juku}`,
    p.username && `username=${p.username}`,
    p.englishSlots && `englishSlots=${p.englishSlots}`,
    p.mathSlots && `mathSlots=${p.mathSlots}`,
  ].filter(Boolean);
  lines.push(profileBits.length ? profileBits.join(" ") : "(未設定)");

  lines.push("[詳細メモ userDetails]");
  const udLines: string[] = [];
  for (const meta of USER_DETAIL_META) {
    const v = input.userDetails[meta.key]?.trim();
    if (v) udLines.push(`${meta.label}=${v}`);
  }
  lines.push(udLines.length ? udLines.join("\n") : "(空)");

  lines.push(`[昨日 ${yesterdayKey} のタスク（事実）]`);
  lines.push(summarizeTasksForDay(input.tasks, yesterdayKey, {}) || "(なし)");

  lines.push(`[今日 ${input.todayKey} の未完了（事実）]`);
  lines.push(
    summarizeTasksForDay(input.tasks, input.todayKey, { onlyIncomplete: true }) || "(なし)"
  );

  lines.push(`[明日 ${input.tomorrowKey} に既に載っている未完了（抜粋）]`);
  lines.push(
    summarizeTasksForDay(input.tasks, input.tomorrowKey, { onlyIncomplete: true }) || "(なし)"
  );

  const baseYm = input.todayKey.slice(0, 7);
  const monthRing = [
    addMonthsToYm(baseYm, -1),
    baseYm,
    addMonthsToYm(baseYm, 1),
    addMonthsToYm(baseYm, 2),
  ];
  for (const ym of monthRing) {
    const cnt = input.tasks.filter((t) => t.date.startsWith(`${ym}-`)).length;
    lines.push(`[学習タスク一覧 ${ym}（date がその月・事実）]`);
    lines.push(`count=${cnt}`);
    lines.push(summarizeTasksForMonth(input.tasks, ym) || "(なし)");
  }

  lines.push(`[ホーム予定・今日 ${input.todayKey}（id 付き。削除は home_plan_ops）]`);
  lines.push(
    input.homeTodayPlanLines.length
      ? input.homeTodayPlanLines.slice(0, 20).join("\n")
      : "(なし)"
  );

  lines.push(`[ホーム予定・明日 ${input.tomorrowKey}（id 付き。削除は home_plan_ops）]`);
  lines.push(
    input.homeTomorrowPlanLines.length
      ? input.homeTomorrowPlanLines.slice(0, 20).join("\n")
      : "(なし)"
  );

  lines.push("[学習プランナー内部設定の要約]");
  lines.push(plannerBrief(input.plannerPreference));

  return lines.join("\n\n");
}
