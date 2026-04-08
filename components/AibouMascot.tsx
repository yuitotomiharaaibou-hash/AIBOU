import { View } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";
import {
  AIBOU_BLUE,
  AIBOU_BLUE_DEEP,
  AIBOU_SHAPE,
  AIBOU_VB,
  AIBOU_WHITE,
} from "@/constants/aibouBrand";

export type AibouMascotProps = {
  size?: number;
  /** 小さな行内表示: 口元なし・目をやや簡略 */
  compact?: boolean;
  /**
   * onLight: 明るい背景向け（ブルーのシルエット）
   * onBrand: ブランド色の上向け（白いシルエット）
   */
  tone?: "onLight" | "onBrand";
  /** 淡い円形の下敷き（プロフィールアバター向け） */
  pad?: boolean;
};

/**
 * アプリアイコンと同じ幾何ルールの相棒マーク。
 * 重なる二円 = 「相棒」、均一な曲線・限られた色数でホーム画面アイコンと視覚的に連続する。
 */
export function AibouMascot({
  size = 56,
  compact = false,
  tone = "onLight",
  pad = false,
}: AibouMascotProps) {
  const { left, right, eyeL, eyeR, smile, smileStroke } = AIBOU_SHAPE;
  const body = tone === "onLight" ? AIBOU_BLUE : AIBOU_WHITE;
  const eyeOuter = tone === "onLight" ? AIBOU_WHITE : AIBOU_BLUE;
  const eyeInner = tone === "onLight" ? AIBOU_BLUE_DEEP : AIBOU_BLUE_DEEP;
  const smileColor = tone === "onLight" ? AIBOU_BLUE_DEEP : AIBOU_BLUE;

  const eyeRo = compact ? Math.max(eyeL.rO - 0.6, 3) : eyeL.rO;
  const eyeRi = compact ? Math.max(eyeL.rI - 0.3, 1.5) : eyeL.rI;

  const tilt = compact ? "rotate(0)" : `rotate(-2 ${AIBOU_VB / 2} ${AIBOU_VB / 2})`;
  const glyph = (
    <Svg width={size} height={size} viewBox={`0 0 ${AIBOU_VB} ${AIBOU_VB}`} accessibilityLabel="AIBOU">
      <G transform={tilt}>
        <Circle cx={left.cx} cy={left.cy} r={left.r} fill={body} />
        <Circle cx={right.cx} cy={right.cy} r={right.r} fill={body} />
        <Circle cx={eyeL.cx} cy={eyeL.cy} r={eyeRo} fill={eyeOuter} />
        <Circle cx={eyeR.cx} cy={eyeR.cy} r={eyeRo} fill={eyeOuter} />
        <Circle cx={eyeL.cx} cy={eyeL.cy} r={eyeRi} fill={eyeInner} />
        <Circle cx={eyeR.cx} cy={eyeR.cy} r={eyeRi} fill={eyeInner} />
        {!compact ? (
          <Path
            d={smile}
            stroke={smileColor}
            strokeWidth={smileStroke}
            fill="none"
            strokeLinecap="round"
          />
        ) : null}
      </G>
    </Svg>
  );

  if (!pad) {
    return (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>{glyph}</View>
    );
  }

  const padSize = Math.round(size * 1.12);
  return (
    <View
      style={{
        width: padSize,
        height: padSize,
        borderRadius: padSize / 2,
        backgroundColor: "#EFF6FF",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {glyph}
    </View>
  );
}
