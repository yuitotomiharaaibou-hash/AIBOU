import type { ProfileKey } from "@/context/ProfileContext";

export type OnboardingQuestionKey =
  | ProfileKey
  | "englishTarget"
  | "mathTarget";

export type OnboardingStep =
  | { kind: "hero"; variant: "morning" | "night" | "welcome" }
  | { kind: "feature"; variant: "wave" | "trust" | "midnight" }
  | { kind: "account_intro" }
  | { kind: "question"; key: OnboardingQuestionKey }
  | { kind: "post_setup" };

/**
 * オンボーディングの流れ（最新）
 * 1) イントロ3枚: ようこそ → 相棒で再立案できる旨 → ヒアリング案内
 * 2) 質問: 学校 → 学年 → 部活動・課外活動の曜日・時間 → 塾 → 英語コマ → 数学コマ → 英目標点 → 数目標点 → ユーザ名
 * 3) 1週間予定確認 → タスク調整 → 期限/重要度設定 → 時間帯好み分類 → ホーム
 */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  { kind: "hero", variant: "welcome" },
  { kind: "feature", variant: "midnight" },
  { kind: "account_intro" },
  { kind: "question", key: "school" },
  { kind: "question", key: "grade" },
  { kind: "question", key: "club" },
  { kind: "question", key: "juku" },
  { kind: "question", key: "englishSlots" },
  { kind: "question", key: "mathSlots" },
  { kind: "question", key: "englishTarget" },
  { kind: "question", key: "mathTarget" },
  { kind: "question", key: "username" },
  { kind: "post_setup" },
];

export const ONBOARDING_STORAGE_KEY = "aibou_onboarding_v1_complete";
