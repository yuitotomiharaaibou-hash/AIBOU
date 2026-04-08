/**
 * 鉄緑会 校内模試 — 高二 第一回（夏）向けシナリオ定義
 *
 * 全体像: 中1〜高2 × 夏冬 × 第1回・第2回 で最大 10 パターン想定。
 * 現フェーズでは **高二・第一回（夏）のみ** を優先し、
 * **第二回（冬）は計画立案のスコープに含めない**（夏の対策が先）。
 *
 * ベースライン: 英語・数学とも目標 **60 点** から計画を組み立て、
 * その後に他の目標点・他学年へ拡張する。
 *
 * 作業順の意図: まず **英語** のタスク一覧 → カレンダー分配 → ホーム配置、
 * 続けて **数学** を同様に回す流れを想定。
 */
export const KOKO2_SUMMER_ROUND1 = {
  id: "koko2-summer-r1",
  title: "鉄緑会 校内模試 高二 第一回（夏）",
  /** 冬の第2回は今回の自動計画対象外 */
  winterRound2InScope: false,
  /** 最初に揃える目標点の仮定（マイページのスコアと連動させる） */
  baselineTargets: { english: 60, math: 60 } as const,
  /** タスク化の優先順 */
  rolloutOrder: ["english", "math"] as const,
} as const;

export function isKoko2SummerR1Context(grade: string | undefined): boolean {
  return grade === "高2";
}
