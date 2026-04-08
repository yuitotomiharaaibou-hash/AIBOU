import { View, Text } from "react-native";
import Svg, { Circle, Rect } from "react-native-svg";
import { PRIMARY, UI_BORDER, UI_MUTED, UI_TEXT, UI_TEXT_SECONDARY, UI_TEXT_TERTIARY } from "@/constants/theme";
import type { WeeklyReport } from "@/lib/weeklyReport";

const GREEN = "#22C55E";
const AMBER = "#F59E0B";
const MATH = "#D97706";

export type DayMomentum = "done" | "partial" | "empty";

type Props = {
  todayDone: number;
  todayTotal: number;
  streak: number;
  englishTotal: number;
  mathTotal: number;
  learningFillPct: number;
  last7Days: DayMomentum[];
  weekly: WeeklyReport[];
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/** 自己実現・達成感を視覚で伝える（文言は最小） */
export function GoalMomentumVisuals({
  todayDone,
  todayTotal,
  streak,
  englishTotal,
  mathTotal,
  learningFillPct,
  last7Days,
  weekly,
}: Props) {
  const todayPct = todayTotal > 0 ? todayDone / todayTotal : 0;
  const r = 38;
  const c = 2 * Math.PI * r;
  const dashOffset = c * (1 - clamp(todayPct, 0, 1));

  const engPct = clamp(englishTotal / 120, 0, 1);
  const mathPct = clamp(mathTotal / 120, 0, 1);
  const momentumPct = clamp(learningFillPct / 100, 0, 1);

  const barW = 200;
  const maxWeekly = weekly.reduce((m, w) => Math.max(m, w.completionRate), 0) || 100;

  return (
    <View style={{ marginTop: 4 }}>
      <Text style={{ fontSize: 11, fontWeight: "700", color: UI_TEXT_TERTIARY, letterSpacing: 0.5, marginBottom: 12 }}>
        いまの勢い
      </Text>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <View style={{ alignItems: "center" }}>
          <Svg width={100} height={100} viewBox="0 0 100 100">
            <Circle cx={50} cy={50} r={r} stroke={UI_MUTED} strokeWidth={10} fill="none" />
            <Circle
              cx={50}
              cy={50}
              r={r}
              stroke={todayTotal === 0 ? UI_TEXT_TERTIARY : GREEN}
              strokeWidth={10}
              fill="none"
              strokeDasharray={`${c} ${c}`}
              strokeDashoffset={todayTotal === 0 ? c * 0.85 : dashOffset}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          </Svg>
          <Text style={{ marginTop: 4, fontSize: 22, fontWeight: "700", color: UI_TEXT }}>
            {todayTotal === 0 ? "—" : `${Math.round(todayPct * 100)}`}
            <Text style={{ fontSize: 14, fontWeight: "600", color: UI_TEXT_SECONDARY }}>%</Text>
          </Text>
        </View>

        <View style={{ flex: 1, minWidth: 140 }}>
          <Text style={{ fontSize: 11, color: UI_TEXT_TERTIARY, marginBottom: 6 }}>7日</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            {last7Days.map((d, i) => (
              <View
                key={i}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: d === "done" ? GREEN : d === "partial" ? AMBER : UI_BORDER,
                  borderWidth: d === "empty" ? 1 : 0,
                  borderColor: UI_BORDER,
                }}
              />
            ))}
          </View>
          <View style={{ marginTop: 14 }}>
            <Text style={{ fontSize: 11, color: UI_TEXT_TERTIARY, marginBottom: 4 }}>連続</Text>
            <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
              <Text style={{ fontSize: 28, fontWeight: "800", color: PRIMARY }}>{streak}</Text>
              <Text style={{ fontSize: 13, color: UI_TEXT_SECONDARY, marginBottom: 4, marginLeft: 2 }}>日</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={{ marginTop: 20 }}>
        <Text style={{ fontSize: 11, color: UI_TEXT_TERTIARY, marginBottom: 8 }}>目標まで（120）</Text>
        <View style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: PRIMARY }}>英語</Text>
            <Text style={{ fontSize: 12, color: UI_TEXT_SECONDARY }}>{englishTotal}</Text>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: UI_MUTED, overflow: "hidden" }}>
            <View style={{ width: `${engPct * 100}%`, height: "100%", borderRadius: 4, backgroundColor: PRIMARY }} />
          </View>
        </View>
        <View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: MATH }}>数学</Text>
            <Text style={{ fontSize: 12, color: UI_TEXT_SECONDARY }}>{mathTotal}</Text>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: UI_MUTED, overflow: "hidden" }}>
            <View style={{ width: `${mathPct * 100}%`, height: "100%", borderRadius: 4, backgroundColor: MATH }} />
          </View>
        </View>
      </View>

      <View style={{ marginTop: 18 }}>
        <Text style={{ fontSize: 11, color: UI_TEXT_TERTIARY, marginBottom: 6 }}>蓄積（操作・完了）</Text>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: UI_MUTED, overflow: "hidden" }}>
          <View style={{ width: `${momentumPct * 100}%`, height: "100%", backgroundColor: PRIMARY, borderRadius: 3 }} />
        </View>
      </View>

      {weekly.length > 0 ? (
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 11, color: UI_TEXT_TERTIARY, marginBottom: 8 }}>週の達成</Text>
          <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", height: 100, paddingHorizontal: 8 }}>
            {weekly
              .slice()
              .reverse()
              .map((w) => {
                const h = maxWeekly > 0 ? (w.completionRate / maxWeekly) * 88 : 0;
                return (
                  <View key={w.weekKey} style={{ alignItems: "center", flex: 1 }}>
                    <Svg width={36} height={92} viewBox="0 0 36 92">
                      <Rect x={8} y={8} width={20} height={76} rx={5} fill={UI_MUTED} />
                      <Rect
                        x={8}
                        y={8 + (76 - h)}
                        width={20}
                        height={Math.max(h, 4)}
                        rx={5}
                        fill={PRIMARY}
                      />
                    </Svg>
                    <Text style={{ fontSize: 10, color: UI_TEXT_SECONDARY, marginTop: 4 }}>{w.completionRate}%</Text>
                  </View>
                );
              })}
          </View>
        </View>
      ) : null}
    </View>
  );
}
