import type { SubjectId, SubjectScore } from "@/context/ScoreContext";
import type { ProfileState } from "@/context/ProfileContext";
import type { RulesState } from "@/context/RulesContext";

export type QuestionConfig = {
  /** 1, 2, 3 ... 大問番号 */
  id: number;
  /** その大問の満点（将来: 難易度なども拡張予定） */
  maxScore: number;
  /** テーマ（例: 文法 / 長文 / 計算 / 図形 など） */
  topic: string;
  /** 関連する教材 ID 群（後で実データに差し替え予定） */
  materialIds: string[];
};

export type ExamConfig = {
  subject: SubjectId;
  /** 「中3」「高2」など ProfileState.grade と対応させる想定 */
  grade: string;
  /** 試験日 YYYY-MM-DD */
  examDate: string;
  questions: QuestionConfig[];
};

export type Material = {
  id: string;
  name: string;
  /** 1 回あたりの想定学習時間（分） */
  estimatedMinutes: number;
};

export type Curriculum = {
  subject: SubjectId;
  grade: string;
  materials: Material[];
};

export type PlanningInputs = {
  profile: ProfileState;
  scores: Record<SubjectId, SubjectScore>;
  rules: RulesState;
  /** 学年ごとの試験設定（後で代表が実データを入力） */
  exams: ExamConfig[];
  /** 教材カリキュラム（後で代表が実データを入力） */
  curricula: Curriculum[];
};

