import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import type { PlannerHypothesis } from "@/lib/plannerHypothesis";
import {
  PRIMARY,
  UI_BORDER,
  UI_MUTED,
  UI_RADIUS_LG,
  UI_SURFACE,
  UI_TEXT,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY,
  uiCardShadow,
} from "@/constants/theme";

type Props = {
  hypothesis: PlannerHypothesis;
  compact?: boolean;
  /** 最初から開く（デフォルトは閉じた「宣伝っぽい」見た目） */
  defaultOpen?: boolean;
  learningFillPct?: number;
};

export function AibouHypothesisCard({ hypothesis, compact, defaultOpen, learningFillPct }: Props) {
  const [open, setOpen] = useState(!!defaultOpen);
  const pad = compact ? 12 : 16;

  return (
    <View
      style={{
        borderRadius: UI_RADIUS_LG,
        borderWidth: 1,
        borderColor: UI_BORDER,
        backgroundColor: UI_SURFACE,
        padding: pad,
        marginBottom: compact ? 8 : 0,
        ...uiCardShadow,
      }}
    >
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", columnGap: 10 }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: UI_TEXT_TERTIARY, marginBottom: 4 }}>仮説</Text>
          <Text
            style={{ fontSize: 16, fontWeight: "600", color: UI_TEXT, lineHeight: 22 }}
            numberOfLines={open ? undefined : 2}
          >
            {hypothesis.headline}
          </Text>
          {!open ? (
            <Text style={{ fontSize: 13, color: PRIMARY, fontWeight: "600", marginTop: 8 }}>くわしく</Text>
          ) : null}
        </View>
        {open ? (
          <ChevronUp size={22} color={UI_TEXT_SECONDARY} strokeWidth={2} />
        ) : (
          <ChevronDown size={22} color={UI_TEXT_SECONDARY} strokeWidth={2} />
        )}
      </Pressable>

      {open && (
        <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: UI_BORDER }}>
          <Text style={{ fontSize: 13, color: UI_TEXT_SECONDARY, marginBottom: 12 }}>
            確信度 {hypothesis.confidence}
          </Text>
          {typeof learningFillPct === "number" ? (
            <View style={{ marginBottom: 14 }}>
              <View
                style={{
                  height: 6,
                  borderRadius: 4,
                  backgroundColor: UI_MUTED,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${Math.max(4, Math.min(100, learningFillPct))}%`,
                    height: "100%",
                    borderRadius: 4,
                    backgroundColor: PRIMARY,
                  }}
                />
              </View>
            </View>
          ) : null}
          <Text style={{ fontSize: 11, fontWeight: "700", color: UI_TEXT_TERTIARY, marginBottom: 4 }}>目標の軸</Text>
          <Text style={{ fontSize: 14, color: UI_TEXT_SECONDARY, lineHeight: 21, marginBottom: 12 }}>
            {hypothesis.goalPillar}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: "700", color: UI_TEXT_TERTIARY, marginBottom: 4 }}>リズム</Text>
          <Text style={{ fontSize: 14, color: UI_TEXT_SECONDARY, lineHeight: 21, marginBottom: 12 }}>
            {hypothesis.fitPillar}
          </Text>
          {hypothesis.insights.length > 0 ? (
            <>
              <Text style={{ fontSize: 11, fontWeight: "700", color: UI_TEXT_TERTIARY, marginBottom: 6 }}>気づき</Text>
              {hypothesis.insights.map((line, i) => (
                <Text key={i} style={{ fontSize: 14, color: UI_TEXT, lineHeight: 21, marginBottom: 4 }}>
                  · {line}
                </Text>
              ))}
            </>
          ) : null}
        </View>
      )}
    </View>
  );
}
