import { View, Text } from "react-native";

function keyToMs(k: string): number {
  const [y, m, d] = k.split("-").map((v) => parseInt(v, 10));
  return new Date(y, m - 1, d).getTime();
}

function compareKeys(a: string, b: string): number {
  return a.localeCompare(b);
}

function clampKey(k: string, lo: string, hi: string): string {
  if (compareKeys(k, lo) < 0) return lo;
  if (compareKeys(k, hi) > 0) return hi;
  return k;
}

export type Koko2GanttBand = {
  startKey: string;
  endKey: string;
  label: string;
  color?: string;
};

/**
 * タスク粒度で詰める期間を複数行の横バーで表示。timeline は表示レンジ（メインはルート全体）。
 */
export function Koko2RoadmapGantt({
  timelineStart,
  timelineEnd,
  width,
  bands,
  defaultColor,
}: {
  timelineStart: string;
  timelineEnd: string;
  width: number;
  bands: Koko2GanttBand[];
  defaultColor: string;
}) {
  const t0 = keyToMs(timelineStart);
  const t1 = keyToMs(timelineEnd);
  const span = Math.max(1, t1 - t0);
  const pos = (k: string) => {
    const p = (keyToMs(k) - t0) / span;
    return Math.min(1, Math.max(0, p));
  };

  const visible = bands.filter((b) => {
    const s = clampKey(b.startKey, timelineStart, timelineEnd);
    const e = clampKey(b.endKey, timelineStart, timelineEnd);
    return compareKeys(s, e) <= 0;
  });

  return (
    <View style={{ width }}>
      {visible.map((b, i) => {
        const s = clampKey(b.startKey, timelineStart, timelineEnd);
        const e = clampKey(b.endKey, timelineStart, timelineEnd);
        const pS = pos(s);
        const pE = pos(e);
        const left = pS * width;
        const barW = Math.max(2, (pE - pS) * width);
        const col = b.color ?? defaultColor;
        return (
          <View
            key={`${b.startKey}-${b.endKey}-${i}`}
            style={{ marginBottom: 6, minHeight: 28, justifyContent: "center" }}
          >
            <View style={{ position: "relative", height: 14, width }}>
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  backgroundColor: "#e5e7eb",
                  borderRadius: 4,
                }}
              />
              <View
                style={{
                  position: "absolute",
                  left,
                  width: barW,
                  top: 0,
                  bottom: 0,
                  backgroundColor: col,
                  opacity: 0.85,
                  borderRadius: 4,
                }}
              />
            </View>
            <Text
              numberOfLines={2}
              style={{
                marginTop: 4,
                fontSize: 10,
                fontWeight: "600",
                color: "#334155",
                lineHeight: 13,
              }}
            >
              {b.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
