import type { ProfileState } from "@/context/ProfileContext";
import type { UserDetailState } from "@/lib/userDetailFields";

export type ScoresForInference = {
  english: { total: number };
  math: { total: number };
};

/**
 * プロフィールと登録スコアから「詳細情報」の初期文案を返す。
 * 既にユーザーが入力している値は上書きしない（呼び出し側でマージ）。
 */
export function inferUserDetailProfile(
  profile: Partial<ProfileState>,
  scores: ScoresForInference
): UserDetailState {
  const engTotal = scores.english.total;
  const mathTotal = scores.math.total;

  const sleepWindow = "0:00〜7:00 は休息優先ゾーン（一般的な睡眠帯の目安）";
  const lastMockEnglish = `英語の登録合計 ${engTotal} 点を「前回相当」として参照（要修正可）`;
  const lastMockMath = `数学の登録合計 ${mathTotal} 点を「前回相当」として参照（要修正可）`;

  const slotBits = [profile.englishSlots, profile.mathSlots].filter(Boolean) as string[];
  const weekdayStudyFocus =
    slotBits.length > 0
      ? `塾・授業コマの目安: ${slotBits.join(" / ")}`.slice(0, 200)
      : "平日は夜枠、週末は午後に学習を置きやすい想定（仮）";

  const commuteTime = "通学 片道 35〜50 分程度（仮・学校・経路に合わせて修正）";
  const digitalCutoff = "22:30 以降は長時間スマホ控えめ（就寝前の切り替え目安）";
  const mockReviewCadence = "大きなテスト後は1週間以内に振り返り、課題を2〜3個に絞るペース（仮）";

  let planningNote = "現状の登録からは科目バランスは大きく偏っていない想定（仮）";
  if (engTotal < mathTotal - 15) {
    planningNote = "英語側に伸びしろがありそう（登録点数の比較からの仮説・要修正）";
  } else if (mathTotal < engTotal - 15) {
    planningNote = "数学側に伸びしろがありそう（登録点数の比較からの仮説・要修正）";
  }
  if (profile.grade?.includes("高3")) {
    planningNote += " / 高3ペース想定";
  }

  return {
    sleepWindow,
    lastMockEnglish,
    lastMockMath,
    weekdayStudyFocus,
    commuteTime,
    digitalCutoff,
    mockReviewCadence,
    planningNote,
  };
}
