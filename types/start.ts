/**
 * スタート画面で入力する項目のキー
 */
export type StartFieldKey =
  | "goal"
  | "grade"
  | "grades"
  | "juku"
  | "subject"
  | "koma"
  | "school"
  | "club";

export type StartFormValues = Partial<Record<StartFieldKey, string>>;
