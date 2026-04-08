import type { Task } from "@/context/TasksContext";
import type { ProfileState } from "@/context/ProfileContext";
import { inferHomeScheduleLevels } from "@/lib/homeScheduleInference";

function makeDateKey(year: number, month0: number, day: number): string {
  const mm = String(month0 + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function pickStudyHour(
  dateKey: string,
  profile: Partial<ProfileState>,
  salt: number
): number {
  const [y, m, d] = dateKey.split("-").map((v) => parseInt(v, 10));
  const levels = inferHomeScheduleLevels(new Date(y, m - 1, d), profile);
  const free: number[] = [];
  for (let h = 6; h <= 22; h++) {
    if ((levels[h] ?? 0) === 0) free.push(h);
  }
  if (free.length === 0) return 20;
  return free[salt % free.length];
}

/** 鉄緑会以外：短い逆算リスト（従来の巨大KOKO2タスクを避ける） */
export function buildGenericOpeningTasks(input: {
  profile: Partial<ProfileState>;
  scores: { english: { total: number }; math: { total: number } };
  today: Date;
}): Task[] {
  const { profile, today, scores } = input;
  const span = 35;
  const titles: { subject: "english" | "math"; title: string }[] = [
    { subject: "english", title: "英語・長文1本（時間を測る）" },
    { subject: "math", title: "数学・例題のおさらい" },
    { subject: "english", title: "英語・単語30分" },
    { subject: "math", title: "数学・小問セット" },
    { subject: "english", title: "英語・リスニング" },
    { subject: "math", title: "数学・過去問パート" },
    { subject: "english", title: "英語・文法ミニ" },
    { subject: "math", title: "数学・図形1問" },
    { subject: "english", title: "英語・週次ふりかえり" },
    { subject: "math", title: "数学・週次ふりかえり" },
    { subject: "english", title: "英語・弱点1テーマ" },
    { subject: "math", title: "数学・弱点1テーマ" },
  ];

  const denom = Math.max(1, titles.length - 1);
  return titles.map((row, i) => {
    const offset = Math.round((i / denom) * (span - 1));
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    const dateKey = makeDateKey(d.getFullYear(), d.getMonth(), d.getDate());
    const hint = row.subject === "english" ? scores.english.total : scores.math.total;
    return {
      id: `GEN-OPEN-${String(i + 1).padStart(2, "0")}`,
      subject: row.subject,
      title: `${row.title}（目標${hint}点）`,
      date: dateKey,
      hour: pickStudyHour(dateKey, profile, i * 2),
      completed: false,
      pinned: i < 1,
    };
  });
}
