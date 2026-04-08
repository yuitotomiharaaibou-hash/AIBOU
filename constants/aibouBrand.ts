/**
 * AIBOU 相棒マーク — アプリアイコンとアプリ内マスコットで同一の「文法」を共有する。
 * 参考にした一般的なルール: シルエット優先・2〜3色・均一な線の重み・小サイズでも判読できる単純形状。
 */
import { PRIMARY } from "@/constants/theme";

export const AIBOU_BLUE = PRIMARY;
export const AIBOU_BLUE_DEEP = "#1D4ED7";
export const AIBOU_WHITE = "#FFFFFF";

/** viewBox 0 0 100 100 上のマスター形状（アイコンSVGと同一比率） */
export const AIBOU_VB = 100;

export const AIBOU_SHAPE = {
  /** 左の円 */
  left: { cx: 38.5, cy: 54, r: 26 },
  /** 右の円（重なり = 「ふたり・相棒」の抽象） */
  right: { cx: 61.5, cy: 54, r: 26 },
  /** 目（白ベース上のブルー瞳） */
  eyeL: { cx: 44, cy: 51, rO: 4.2, rI: 2 },
  eyeR: { cx: 56, cy: 51, rO: 4.2, rI: 2 },
  /** 口元（compact では非表示） */
  smile: "M 42 60.5 Q 50 66.5 58 60.5" as const,
  smileStroke: 2.25,
} as const;
