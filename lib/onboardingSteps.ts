import type { ProfileKey } from "@/context/ProfileContext";

export type OnboardingQuestionKey =
  | ProfileKey
  | "englishTarget"
  | "mathTarget";

export type OnboardingStep =
  | { kind: "hero"; variant: "morning" | "night" }
  | { kind: "feature"; variant: "wave" | "trust" }
  | { kind: "account_intro" }
  | { kind: "question"; key: OnboardingQuestionKey }
  | { kind: "finish" };

/** 説明（冒頭）→ プロフィール案内 → 質問連打（間に解説なし）→ 完了 */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  { kind: "hero", variant: "morning" },
  { kind: "hero", variant: "night" },
  { kind: "feature", variant: "wave" },
  { kind: "feature", variant: "trust" },
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
  { kind: "finish" },
];

export const ONBOARDING_STORAGE_KEY = "aibou_onboarding_v1_complete";
