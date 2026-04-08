import type { Task } from "@/context/TasksContext";

function makeDateKey(year: number, month0: number, day: number): string {
  const mm = String(month0 + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/** 英語・毎週の宿題（5項目） */
export const HOMEWORK_TYPE_LABELS = [
  "英文和訳",
  "長文読解",
  "英作文B",
  "リスニング",
  "英作文A（テーマ英作文）",
] as const;

/** 数学・毎週の宿題（3種） */
export const MATH_HOMEWORK_TYPE_LABELS = ["例題", "練習問題", "問題集"] as const;

/**
 * リーフタスクをすべて生成（完了状態は TasksContext が保持）。
 *
 * 英語 ID:
 * - 鉄壁: TP-R{1-3}-S{01-50}
 * - 英文解釈: EK-R{1-3}-S{01-43}
 * - テーマ英作文: TA-R{1-3}-N{01-20}（周ごとに No.1〜20 をまとめる）
 * - 英文法: GB-R{1-3}-W{01-22}（周ごとに第1〜22週）
 * - 英語宿題: HW-W{01-22}-K{1-5}
 *
 * 数学 ID:
 * - 例題（第1〜22週）: M-R{1-3}-W{01-22}
 * - 数学宿題: MH-W{01-22}-K{1-3}
 */
export function buildAllKoko2LeafTasks(): Task[] {
  const out: Task[] = [];
  let index = 0;
  const today = new Date();
  const spanDays = 120;
  const hours = [6, 7, 9, 10, 14, 15, 16, 19, 20, 21];

  const pushEn = (id: string, title: string) => {
    const d = new Date(today);
    d.setDate(d.getDate() + (index % spanDays));
    const dateKey = makeDateKey(d.getFullYear(), d.getMonth(), d.getDate());
    out.push({
      id,
      subject: "english",
      title,
      date: dateKey,
      hour: hours[index % hours.length],
      completed: false,
    });
    index++;
  };

  const pushMath = (id: string, title: string) => {
    const d = new Date(today);
    d.setDate(d.getDate() + (index % spanDays));
    const dateKey = makeDateKey(d.getFullYear(), d.getMonth(), d.getDate());
    out.push({
      id,
      subject: "math",
      title,
      date: dateKey,
      hour: hours[index % hours.length],
      completed: false,
    });
    index++;
  };

  for (let r = 1; r <= 3; r++) {
    for (let s = 1; s <= 50; s++) {
      pushEn(
        `TP-R${r}-S${String(s).padStart(2, "0")}`,
        `鉄壁 ${r}周目 §${s}`
      );
    }
  }

  for (let r = 1; r <= 3; r++) {
    for (let s = 1; s <= 43; s++) {
      pushEn(
        `EK-R${r}-S${String(s).padStart(2, "0")}`,
        `英文解釈 ${r}周目 §${s}`
      );
    }
  }

  for (let r = 1; r <= 3; r++) {
    for (let n = 1; n <= 20; n++) {
      pushEn(
        `TA-R${r}-N${String(n).padStart(2, "0")}`,
        `テーマ英作文 ${r}周目 No.${n}`
      );
    }
  }

  for (let r = 1; r <= 3; r++) {
    for (let w = 1; w <= 22; w++) {
      pushEn(
        `GB-R${r}-W${String(w).padStart(2, "0")}`,
        `英文法 ${r}周目 第${w}週`
      );
    }
  }

  for (let w = 1; w <= 22; w++) {
    HOMEWORK_TYPE_LABELS.forEach((label, k) => {
      pushEn(
        `HW-W${String(w).padStart(2, "0")}-K${k + 1}`,
        `第${w}週 宿題・${label}`
      );
    });
  }

  for (let r = 1; r <= 3; r++) {
    for (let w = 1; w <= 22; w++) {
      pushMath(
        `M-R${r}-W${String(w).padStart(2, "0")}`,
        `数学 例題 ${r}周目 第${w}週`
      );
    }
  }

  for (let w = 1; w <= 22; w++) {
    MATH_HOMEWORK_TYPE_LABELS.forEach((label, k) => {
      pushMath(
        `MH-W${String(w).padStart(2, "0")}-K${k + 1}`,
        `第${w}週 数学宿題・${label}`
      );
    });
  }

  return out;
}
