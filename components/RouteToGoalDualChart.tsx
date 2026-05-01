import { View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from "react-native-svg";

const PAD_X = 8;
const PAD_Y = 10;

/**
 * 計画ルート（薄いエリア＋破線）と実績（濃いエリア＋実線）。今日位置に縦線＋ドット。
 */
export function RouteToGoalDualChart({
  planned,
  actual,
  todayIndex,
  accent,
  muted,
  width,
  height,
  gradPlannedId,
  gradActualId,
}: {
  planned: number[];
  actual: number[];
  todayIndex: number;
  accent: string;
  muted: string;
  width: number;
  height: number;
  gradPlannedId: string;
  gradActualId: string;
}) {
  const maxY = Math.max(...planned, ...actual, 1);

  const innerW = Math.max(1, width - PAD_X * 2);
  const innerH = Math.max(1, height - PAD_Y * 2);
  const bottomY = PAD_Y + innerH;

  const toCoords = (vals: number[]) => {
    const pts = vals.length >= 2 ? vals : vals.length === 1 ? [vals[0], vals[0]] : [0, 0];
    return pts.map((v, i) => {
      const x = PAD_X + (pts.length <= 1 ? innerW / 2 : (i / (pts.length - 1)) * innerW);
      const y = PAD_Y + innerH - (v / maxY) * innerH;
      return { x, y, v };
    });
  };

  const cPlanned = toCoords(planned);
  const cActual = toCoords(actual);

  const lineP = cPlanned.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const areaP =
    cPlanned.length > 0
      ? `M ${cPlanned[0].x.toFixed(1)} ${bottomY.toFixed(1)} L ${cPlanned[0].x.toFixed(1)} ${cPlanned[0].y.toFixed(1)} ${cPlanned
          .slice(1)
          .map((c) => `L ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
          .join(" ")} L ${cPlanned[cPlanned.length - 1].x.toFixed(1)} ${bottomY.toFixed(1)} Z`
      : "";

  const lineA = cActual.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const areaA =
    cActual.length > 0
      ? `M ${cActual[0].x.toFixed(1)} ${bottomY.toFixed(1)} L ${cActual[0].x.toFixed(1)} ${cActual[0].y.toFixed(1)} ${cActual
          .slice(1)
          .map((c) => `L ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
          .join(" ")} L ${cActual[cActual.length - 1].x.toFixed(1)} ${bottomY.toFixed(1)} Z`
      : "";

  const ti = Math.max(0, Math.min(todayIndex, cActual.length - 1));
  const todayPt = cActual[ti] ?? cActual[cActual.length - 1];

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={gradPlannedId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={muted} stopOpacity={0.22} />
            <Stop offset="1" stopColor={muted} stopOpacity={0.03} />
          </LinearGradient>
          <LinearGradient id={gradActualId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={accent} stopOpacity={0.35} />
            <Stop offset="1" stopColor={accent} stopOpacity={0.05} />
          </LinearGradient>
        </Defs>
        {areaP ? <Path d={areaP} fill={`url(#${gradPlannedId})`} /> : null}
        {lineP ? (
          <Path
            d={lineP}
            stroke={muted}
            strokeWidth={1.5}
            fill="none"
            strokeDasharray="5 4"
            strokeOpacity={0.85}
            strokeLinejoin="round"
          />
        ) : null}
        {areaA ? <Path d={areaA} fill={`url(#${gradActualId})`} /> : null}
        {lineA ? (
          <Path d={lineA} stroke={accent} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        ) : null}
        {todayPt ? (
          <>
            <Line
              x1={todayPt.x}
              y1={PAD_Y}
              x2={todayPt.x}
              y2={bottomY}
              stroke="#64748b"
              strokeWidth={1}
              strokeDasharray="4 4"
              strokeOpacity={0.45}
            />
            <Circle cx={todayPt.x} cy={todayPt.y} r={5} fill="#ffffff" stroke={accent} strokeWidth={2} />
          </>
        ) : null}
      </Svg>
    </View>
  );
}
