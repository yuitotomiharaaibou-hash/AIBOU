import type { ProfileState } from "@/context/ProfileContext";
import { KOKO2_SUMMER_ROUND1 } from "./koko2SummerRound1";

/**
 * マイページ等に出す「どの模試を想定しているか」の見出し文言。
 * 現フェーズは高二・第一回（夏）に固定。
 */
export function getExamScenarioTitle(_profile: Partial<ProfileState>): string {
  return KOKO2_SUMMER_ROUND1.title;
}

export { KOKO2_SUMMER_ROUND1, isKoko2SummerR1Context } from "./koko2SummerRound1";
