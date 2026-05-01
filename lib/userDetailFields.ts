/** マイページ「詳細情報」ブロックのキー（アプリが仮入力し、ユーザーが修正可能） */

export const USER_DETAIL_KEYS = [
  "sleepWindow",
  "lastMockEnglish",
  "lastMockMath",
  "weekdayStudyFocus",
  "commuteTime",
  "digitalCutoff",
  "mockReviewCadence",
  "planningNote",
] as const;

export type UserDetailKey = (typeof USER_DETAIL_KEYS)[number];

export type UserDetailState = Partial<Record<UserDetailKey, string>>;

export const USER_DETAIL_META: { key: UserDetailKey; label: string; hint: string }[] = [
  { key: "sleepWindow", label: "睡眠の目安", hint: "例: 0:00〜7:00" },
  { key: "lastMockEnglish", label: "英語・前回相当の得点メモ", hint: "校内模試や登録スコアに基づく仮値" },
  { key: "lastMockMath", label: "数学・前回相当の得点メモ", hint: "同上" },
  { key: "weekdayStudyFocus", label: "平日の学習しやすい帯", hint: "塾コマや課外活動後の目安" },
  { key: "commuteTime", label: "通学時間の目安", hint: "片道の分数など" },
  { key: "digitalCutoff", label: "デジタル区切りの目安", hint: "就寝前のスマホなど" },
  { key: "mockReviewCadence", label: "模試・振り返りのペース", hint: "どのくらいの頻度で見直すか" },
  { key: "planningNote", label: "計画メモ（科目バランス等）", hint: "相棒が参照する短文メモ" },
];
