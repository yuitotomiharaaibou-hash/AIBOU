import { View, Text } from "react-native";

function keyToMs(k: string): number {
  const [y, m, d] = k.split("-").map((v) => parseInt(v, 10));
  return new Date(y, m - 1, d).getTime();
}

function compareKeys(a: string, b: string): number {
  return a.localeCompare(b);
}

export type RoadmapMarker = { dateKey: string; label: string; emphasis?: boolean };

/**
 * 校内模試までの横タイムライン。直近帯＝タスクで詰める区間、その先＝マイルストーン中心。
 */
export function Koko2RoadmapStrip({
  routeStart,
  routeEnd,
  todayKey,
  taskBandEndKey,
  accent,
  width,
  markers,
}: {
  routeStart: string;
  routeEnd: string;
  todayKey: string;
  taskBandEndKey: string;
  accent: string;
  width: number;
  markers: RoadmapMarker[];
}) {
  const t0 = keyToMs(routeStart);
  const t1 = keyToMs(routeEnd);
  const span = Math.max(1, t1 - t0);
  const pos = (k: string) => {
    const p = (keyToMs(k) - t0) / span;
    return Math.min(1, Math.max(0, p));
  };

  let bandFrom = todayKey;
  if (compareKeys(bandFrom, routeStart) < 0) bandFrom = routeStart;
  if (compareKeys(bandFrom, routeEnd) > 0) bandFrom = routeEnd;

  let bandTo = taskBandEndKey;
  if (compareKeys(bandTo, bandFrom) < 0) bandTo = bandFrom;
  if (compareKeys(bandTo, routeEnd) > 0) bandTo = routeEnd;

  const p0 = pos(bandFrom);
  const p1 = pos(bandTo);
  const bandLeft = p0 * width;
  const bandW = Math.max(0, (p1 - p0) * width);
  const pToday = pos(todayKey);

  const trackH = 10;
  const labelH = 28;

  return (
    <View style={{ width }}>
      <View
        style={{
          height: trackH,
          borderRadius: 5,
          backgroundColor: "#e5e7eb",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {p1 < 1 ? (
          <View
            style={{
              position: "absolute",
              left: pos(bandTo) * width,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: "#f1f5f9",
            }}
          />
        ) : null}
        {bandW > 0 ? (
          <View
            style={{
              position: "absolute",
              left: bandLeft,
              width: bandW,
              top: 0,
              bottom: 0,
              backgroundColor: accent,
              opacity: 0.38,
            }}
          />
        ) : null}
      </View>
      <View style={{ height: labelH, marginTop: 2, position: "relative", width }}>
        <View
          style={{
            position: "absolute",
            left: Math.min(width - 6, Math.max(0, pToday * width - 3)),
            top: 2,
            width: 6,
            height: 6,
            backgroundColor: "#0f172a",
            borderRadius: 1,
            transform: [{ rotate: "45deg" }],
          }}
        />
        {markers.map((m) => {
          const p = pos(m.dateKey);
          const left = Math.min(width - 20, Math.max(0, p * width - 10));
          return (
            <View
              key={`${m.dateKey}-${m.label}`}
              style={{ position: "absolute", left, top: 12, width: 44, alignItems: "center" }}
            >
              <View
                style={{
                  width: 2,
                  height: 8,
                  backgroundColor: m.emphasis ? accent : "#94a3b8",
                  borderRadius: 1,
                }}
              />
              <Text
                numberOfLines={1}
                style={{
                  marginTop: 2,
                  fontSize: 9,
                  fontWeight: m.emphasis ? "700" : "600",
                  color: m.emphasis ? accent : "#64748b",
                  maxWidth: 52,
                  textAlign: "center",
                }}
              >
                {m.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
