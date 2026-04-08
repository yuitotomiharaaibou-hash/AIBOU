import { Task, makeDateKey } from "@/context/TasksContext";
import { SubjectId } from "@/context/ScoreContext";
import type { PlanningInputs } from "./types";

// 内部ユーティリティ: 日数差を計算
function diffDays(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.max(1, Math.round((utcB - utcA) / msPerDay));
}

// 内部ユーティリティ: YYYY-MM-DD 文字列を Date に変換
function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map((v) => parseInt(v, 10));
  return new Date(y, m - 1, d);
}

// 科目ごとのプレースホルダ ExamConfig を生成（代表が後で本番データに差し替え）
function buildDefaultExamConfig(
  subject: SubjectId,
  grade: string,
  today: Date
) {
  // ひとまず「30 日後」を試験日とする（後で本番の日付に置き換え）
  const exam = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 30
  );
  const examDate = makeDateKey(
    exam.getFullYear(),
    exam.getMonth(),
    exam.getDate()
  );

  const questions = Array.from({ length: 6 }, (_, idx) => ({
    id: idx + 1,
    maxScore: 20,
    topic: subject === "english" ? "英語 大問" + (idx + 1) : "数学 大問" + (idx + 1),
    materialIds: [], // 代表が後で埋める想定
  }));

  return {
    subject,
    grade,
    examDate,
    questions,
  };
}

// プレースホルダ: 1 タスクあたり 30 分想定、単純に 2 タスク / 大問 作る
function generateSubjectTasks(params: {
  subject: SubjectId;
  grade: string;
  total: number;
  questionScores: number[];
  examDateKey: string;
}): Task[] {
  const { subject, grade, total, questionScores, examDateKey } = params;
  const today = new Date();
  const examDate = parseDateKey(examDateKey);
  const days = diffDays(today, examDate);

  const displaySubject = subject === "english" ? "英語" : "数学";

  const perQuestionTasks: Task[] = [];
  let runningIndex = 0;

  questionScores.forEach((qScore, idx) => {
    const qId = idx + 1;
    // ひとまず「目標点が 0 ならタスクなし、それ以外は 2 タスク」という超単純なルール
    if (qScore <= 0) return;

    const baseTitle =
      `${displaySubject} 第${qId}問 対策` +
      (grade ? `（${grade}）` : "");

    for (let r = 0; r < 2; r++) {
      const taskIndex = runningIndex++;
      const dayOffset = taskIndex % days;
      const target = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + dayOffset
      );
      const dateKey = makeDateKey(
        target.getFullYear(),
        target.getMonth(),
        target.getDate()
      );

      // とりあえず朝・夜に単純配置（後で Profile のコマや固定予定を見て賢くする）
      const candidateHours = [6, 7, 20, 21];
      const hour = candidateHours[taskIndex % candidateHours.length];

      const idPrefix = subject === "english" ? "E" : "M";
      const id = `${idPrefix}${qId}-${r + 1}`;

      perQuestionTasks.push({
        id,
        subject,
        title: baseTitle,
        date: dateKey,
        hour,
        completed: false,
      });
    }
  });

  // 合計点 total は今のところタスク数に直接は使っていないが、
  // 将来的には「高得点ほど復習タスクを増やす/減らす」などに使える余地を残しておく。
  void total;

  return perQuestionTasks;
}

/**
 * 逆算エンジンのエントリポイント。
 *
 * - Profile（学年など）
 * - Scores（合計 & 大問ごとの目標点）
 * - Rules.enabled（ON のときだけ動く）
 * - ExamConfig / Curriculum（今はプレースホルダ）
 *
 * を元に、TasksContext に食わせられる Task[] を生成する。
 */
export function buildPlan(inputs: PlanningInputs): Task[] {
  const { profile, scores, rules } = inputs;

  if (!rules.enabled) {
    // 連動 OFF のときは何も生成しない（呼び出し側でハンドリング）
    return [];
  }

  const today = new Date();
  const grade = profile.grade ?? "未設定";

  // 高二・第一回（夏）などの詳細シナリオは planning/exams/ に定義し、段階的に buildPlan に接続する

  // ひとまず英数それぞれについて、プレースホルダの ExamConfig を生成して利用
  const englishExam = buildDefaultExamConfig("english", grade, today);
  const mathExam = buildDefaultExamConfig("math", grade, today);

  const english = scores.english;
  const math = scores.math;

  const englishTasks = generateSubjectTasks({
    subject: "english",
    grade,
    total: english.total,
    questionScores: english.questions,
    examDateKey: englishExam.examDate,
  });

  const mathTasks = generateSubjectTasks({
    subject: "math",
    grade,
    total: math.total,
    questionScores: math.questions,
    examDateKey: mathExam.examDate,
  });

  return [...englishTasks, ...mathTasks];
}

