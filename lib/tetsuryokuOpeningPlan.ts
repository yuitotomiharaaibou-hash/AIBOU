import type { Task } from "@/context/TasksContext";
import type { ProfileState } from "@/context/ProfileContext";
import { inferHomeScheduleLevels } from "@/lib/homeScheduleInference";

function makeDateKey(year: number, month0: number, day: number): string {
  const mm = String(month0 + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffCalendarDays(from: Date, to: Date): number {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return Math.max(1, Math.round((b - a) / (86400000)));
}

/** 8月の最初の土曜（校内模試の置き場所・ペルソナ用） */
export function firstSaturdayOfAugust(year: number): Date {
  const d = new Date(year, 7, 1);
  const wd = d.getDay();
  const add = wd === 6 ? 0 : (6 - wd + 7) % 7;
  d.setDate(1 + add);
  return d;
}

export function nextAugustMockExamSaturday(from: Date): Date {
  const y = from.getFullYear();
  let exam = firstSaturdayOfAugust(y);
  if (startOfDay(exam) < startOfDay(from)) {
    exam = firstSaturdayOfAugust(y + 1);
  }
  return exam;
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
  const evening = free.filter((h) => h >= 19);
  const morning = free.filter((h) => h <= 8);
  const pool = [...evening, ...morning, ...free];
  if (pool.length === 0) return 20;
  return pool[salt % pool.length];
}

type Draft = { subject: "english" | "math"; title: string };

/**
 * 鉄緑会・通常授業1周目が未完了寄り・英数60点目標の逆算イメージ。
 * ゴール（8月土曜の校内模試想定）から日付を広げ、空きコマに配置。
 */
const TETSU_DRAFTS: Draft[] = [
  { subject: "english", title: "【通常1周目】宿題・英文和訳（未了分）" },
  { subject: "english", title: "【通常1周目】宿題・長文読解（未了分）" },
  { subject: "english", title: "【通常1周目】リスニング＋音読チェック" },
  { subject: "english", title: "鉄緑会英語・前週コマの復習（語彙ノート）" },
  { subject: "english", title: "単語帳ラウンド1（重要語のみ）" },
  { subject: "english", title: "長文スキャン読み（教材1周目の続き）" },
  { subject: "math", title: "【通常1周目】宿題・例題の残り" },
  { subject: "math", title: "【通常1周目】練習問題ブロックA" },
  { subject: "math", title: "【通常1周目】練習問題ブロックB" },
  { subject: "math", title: "鉄緑会数学・基礎小問セット（計算ミス潰し）" },
  { subject: "math", title: "例題のおさらい（授業メモだけで解けるか）" },
  { subject: "english", title: "【8月校内模試想定】英語の範囲リスト化" },
  { subject: "math", title: "【8月校内模試想定】数学の範囲リスト化" },
  { subject: "english", title: "弱点1テーマだけ（英・仮定法など）" },
  { subject: "math", title: "弱点1テーマだけ（数・図形など）" },
  { subject: "english", title: "週次ふりかえり：長文の時間を記録" },
  { subject: "math", title: "週次ふりかえり：ケアレス集計" },
  { subject: "english", title: "模試1週前：英語お手本読み込み" },
  { subject: "math", title: "模試1週前：数学典型パターン再現" },
];

export function buildTetsuryokuOpeningTasks(input: {
  profile: Partial<ProfileState>;
  scores: { english: { total: number }; math: { total: number } };
  today: Date;
}): Task[] {
  const { profile, today } = input;
  const exam = nextAugustMockExamSaturday(today);
  const spreadEnd = new Date(exam);
  spreadEnd.setDate(spreadEnd.getDate() - 5);
  let span = diffCalendarDays(today, spreadEnd);
  span = Math.max(24, Math.min(100, span));

  const n = TETSU_DRAFTS.length;
  const out: Task[] = [];

  for (let i = 0; i < n; i++) {
    const ratio = n <= 1 ? 0 : i / (n - 1);
    const offset = Math.round(ratio * (span - 1));
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    const dateKey = makeDateKey(d.getFullYear(), d.getMonth(), d.getDate());
    const draft = TETSU_DRAFTS[i];
    const enT = input.scores.english.total;
    const maT = input.scores.math.total;
    const goalHint =
      draft.subject === "english"
        ? `（目標${enT}点コース）`
        : `（目標${maT}点コース）`;
    out.push({
      id: `TG-OPEN-${String(i + 1).padStart(2, "0")}`,
      subject: draft.subject,
      title: `${draft.title}${goalHint}`,
      date: dateKey,
      hour: pickStudyHour(dateKey, profile, i * 3 + (draft.subject === "math" ? 1 : 0)),
      completed: false,
      pinned: i < 2,
    });
  }

  return out;
}
