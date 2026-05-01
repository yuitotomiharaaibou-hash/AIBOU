import { View, Text, Pressable, StyleSheet, type ViewStyle } from "react-native";
import { UI_TEXT_TERTIARY } from "@/constants/theme";
import { formatShortDate } from "@/lib/mainKoko2RouteSeries";
import { hexToRgba } from "@/lib/colorUtils";

function compareRowKeys(a: string, b: string): number {
  return a.localeCompare(b);
}

function listWindowRowWrapStyle(
  dateKey: string,
  todayKey: string | undefined,
  horizonKey: string | undefined,
  accent: string
): ViewStyle {
  const base: ViewStyle = {
    marginBottom: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
  };
  if (!todayKey || !horizonKey) return base;
  if (compareRowKeys(dateKey, horizonKey) > 0) {
    return { ...base, backgroundColor: "transparent", paddingVertical: 6 };
  }
  if (compareRowKeys(dateKey, todayKey) >= 0 && compareRowKeys(dateKey, horizonKey) <= 0) {
    return { ...base, backgroundColor: hexToRgba(accent, 0.18) };
  }
  return { ...base, backgroundColor: "#f1f5f9" };
}

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

export function VerticalRouteSpanSummary({
  routeStart,
  routeEnd,
  todayKey,
  taskBandEndKey,
  accent,
}: {
  routeStart: string;
  routeEnd: string;
  todayKey: string;
  taskBandEndKey: string;
  accent: string;
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
  const pToday = pos(todayKey);
  const greyLeftPct = pos(bandTo) * 100;
  const bandLeftPct = p0 * 100;
  const bandWidthPct = Math.max(0, (p1 - p0) * 100);

  return (
    <View style={{ alignSelf: "stretch" }}>
      <View
        style={{
          height: 12,
          borderRadius: 6,
          backgroundColor: "#e5e7eb",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {greyLeftPct < 100 ? (
          <View
            style={{
              position: "absolute",
              left: `${greyLeftPct}%`,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: "#f1f5f9",
            }}
          />
        ) : null}
        {bandWidthPct > 0 ? (
          <View
            style={{
              position: "absolute",
              left: `${bandLeftPct}%`,
              width: `${bandWidthPct}%`,
              top: 0,
              bottom: 0,
              backgroundColor: accent,
              opacity: 0.38,
            }}
          />
        ) : null}
        <View
          style={{
            position: "absolute",
            left: `${Math.min(100, Math.max(0, pToday * 100))}%`,
            top: -2,
            width: 3,
            marginLeft: -1.5,
            height: 16,
            borderRadius: 2,
            backgroundColor: "#0f172a",
            opacity: 0.55,
          }}
        />
      </View>
      <Text style={{ marginTop: 6, fontSize: 10, color: "#64748b", lineHeight: 14 }}>
        帯＝今日から模試までをタスクで詰める区間のイメージです。
      </Text>
    </View>
  );
}

export type VerticalTimelineRow = {
  id: string;
  dateKey: string;
  tag: string;
  dateLabel: string;
  body?: string;
  emphasis?: boolean;
  accent?: string;
  onPress?: () => void;
};

export function VerticalRouteTimeline({
  rows,
  todayKey,
  taskHorizonKey,
  timelineAccent = "#64748B",
}: {
  rows: VerticalTimelineRow[];
  todayKey?: string;
  taskHorizonKey?: string;
  timelineAccent?: string;
}) {
  return (
    <View style={{ alignSelf: "stretch" }}>
      {rows.map((r, i) => {
        const isLast = i === rows.length - 1;
        const afterHz =
          Boolean(taskHorizonKey && todayKey && compareRowKeys(r.dateKey, taskHorizonKey) > 0);
        const baseAccent = r.accent ?? "#94a3b8";
        const dotColor = afterHz ? "#cbd5e1" : baseAccent;
        const tagColor = afterHz ? "#94a3b8" : baseAccent;
        const dateColor = afterHz ? "#94a3b8" : "#0f172a";
        const emph = Boolean(r.emphasis && !afterHz);
        const rowWrap = listWindowRowWrapStyle(r.dateKey, todayKey, taskHorizonKey, timelineAccent);
        const rail = (
          <View style={{ width: 22, alignItems: "center" }}>
            <View
              style={{
                width: emph ? 12 : 10,
                height: emph ? 12 : 10,
                borderRadius: 99,
                backgroundColor: dotColor,
                borderWidth: emph ? 2 : 0,
                borderColor: "#fff",
              }}
            />
            {!isLast ? (
              <View
                style={{
                  width: 2,
                  flexGrow: 0,
                  height: 32,
                  marginTop: 4,
                  backgroundColor: afterHz ? "#e8edf2" : "#e2e8f0",
                }}
              />
            ) : null}
          </View>
        );

        const body = (
          <View style={rowWrap}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", paddingBottom: isLast ? 0 : 0 }}>
              {rail}
              <View style={{ flex: 1, minWidth: 0, paddingLeft: 10, paddingBottom: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: afterHz ? "600" : "800", color: tagColor }}>{r.tag}</Text>
                <Text style={{ fontSize: 14, fontWeight: afterHz ? "600" : "800", color: dateColor, marginTop: 3 }}>
                  {r.dateLabel}
                </Text>
                {r.body ? (
                  <Text style={{ marginTop: 5, fontSize: 12, color: "#475569", lineHeight: 18 }}>{r.body}</Text>
                ) : null}
                {r.onPress ? (
                  <Text style={{ marginTop: 4, fontSize: 10, color: UI_TEXT_TERTIARY }}>詳細</Text>
                ) : null}
              </View>
            </View>
          </View>
        );

        if (r.onPress) {
          return (
            <Pressable key={r.id} onPress={r.onPress} style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}>
              {body}
            </Pressable>
          );
        }
        return <View key={r.id}>{body}</View>;
      })}
    </View>
  );
}

export type VerticalGanttBand = {
  startKey: string;
  endKey: string;
  label: string;
  color?: string;
};

export function VerticalGanttStack({
  timelineStart,
  timelineEnd,
  bands,
  defaultColor,
}: {
  timelineStart: string;
  timelineEnd: string;
  bands: VerticalGanttBand[];
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
    <View style={{ alignSelf: "stretch" }}>
      {visible.map((b, i) => {
        const s = clampKey(b.startKey, timelineStart, timelineEnd);
        const e = clampKey(b.endKey, timelineStart, timelineEnd);
        const pS = pos(s);
        const pE = pos(e);
        const leftPct = pS * 100;
        const widthPct = Math.max(0.35, (pE - pS) * 100);
        const col = b.color ?? defaultColor;
        return (
          <View key={`${b.startKey}-${b.endKey}-${i}`} style={{ marginBottom: 10, alignSelf: "stretch" }}>
            <View style={{ position: "relative", height: 14, alignSelf: "stretch" }}>
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
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                  top: 0,
                  bottom: 0,
                  backgroundColor: col,
                  opacity: 0.85,
                  borderRadius: 4,
                }}
              />
            </View>
            <Text
              numberOfLines={3}
              style={{
                marginTop: 4,
                fontSize: 11,
                fontWeight: "600",
                color: "#334155",
                lineHeight: 15,
              }}
            >
              {b.label}
            </Text>
            <Text style={{ marginTop: 2, fontSize: 10, color: "#94a3b8" }}>
              {s} → {e}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/**
 * 左＝読みやすい節目一覧、右＝上から順の実行フェーズ（左縁の縦アクセント）。見やすさ優先で日付の厳密比例はとらない。
 */
export function VerticalReadableRouteSplit({
  routeStart,
  routeEnd,
  accent,
  milestones,
  bands,
  todayKey,
  taskHorizonKey,
}: {
  routeStart: string;
  routeEnd: string;
  accent: string;
  milestones: VerticalTimelineRow[];
  bands: VerticalGanttBand[];
  /** 左タイムラインの「今日」基準（色分け用） */
  todayKey?: string;
  /** タスクを詰める区間の終わり＝読切（これより後はグレー） */
  taskHorizonKey?: string;
}) {
  const visibleBands = bands.filter((b) => {
    const s = clampKey(b.startKey, routeStart, routeEnd);
    const e = clampKey(b.endKey, routeStart, routeEnd);
    return compareKeys(s, e) <= 0;
  });

  const bandSpanMs = (b: VerticalGanttBand) => {
    const s = clampKey(b.startKey, routeStart, routeEnd);
    const e = clampKey(b.endKey, routeStart, routeEnd);
    return Math.max(1, keyToMs(e) - keyToMs(s));
  };

  const sortedBands = [...visibleBands].sort((a, b) => {
    const sa = clampKey(a.startKey, routeStart, routeEnd);
    const sb = clampKey(b.startKey, routeStart, routeEnd);
    return compareKeys(sa, sb);
  });

  const sumD = sortedBands.reduce((acc, b) => acc + bandSpanMs(b), 0) || 1;

  return (
    <View style={{ alignSelf: "stretch", marginTop: 8 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "stretch",
          borderRadius: 12,
          overflow: "hidden",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: "#cbd5e1",
          backgroundColor: "#fff",
        }}
      >
        <View style={{ flex: 1, maxWidth: "50%", paddingVertical: 12, paddingHorizontal: 10, backgroundColor: "#FAFAFA" }}>
          <Text style={styles.splitHead}>節目</Text>
          {todayKey && taskHorizonKey ? (
            <Text style={styles.splitWindowHint}>色付き＝今日〜読切（タスクリストで詰める期間）</Text>
          ) : null}
          <VerticalRouteTimeline
            rows={milestones}
            todayKey={todayKey}
            taskHorizonKey={taskHorizonKey}
            timelineAccent={accent}
          />
        </View>
        <View style={{ width: 1, backgroundColor: "#e2e8f0" }} />
        <View style={{ flex: 1, minWidth: 0, paddingVertical: 12, paddingHorizontal: 10, backgroundColor: "#f8fafc" }}>
          <Text style={styles.splitHead}>実行フェーズ</Text>
          <Text style={styles.splitHint}>早い期間が上。左の色帯で区切り。高さはだいたいの長さ（読みやすさ優先）。</Text>
          {sortedBands.length === 0 ? (
            <Text style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>表示する帯がありません。</Text>
          ) : (
            sortedBands.map((b, i) => {
              const s = clampKey(b.startKey, routeStart, routeEnd);
              const e = clampKey(b.endKey, routeStart, routeEnd);
              const d = bandSpanMs(b);
              const minH = Math.min(108, Math.max(60, Math.round(56 + (d / sumD) * 52)));
              const col = b.color ?? accent;
              return (
                <View
                  key={`${b.startKey}-${b.endKey}-${i}`}
                  style={{
                    minHeight: minH,
                    marginTop: i === 0 ? 8 : 10,
                    borderLeftWidth: 6,
                    borderLeftColor: col,
                    paddingLeft: 12,
                    paddingRight: 8,
                    paddingVertical: 12,
                    backgroundColor: "#ffffff",
                    borderRadius: 10,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: "rgba(15,23,42,0.08)",
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "800", color: "#0f172a", lineHeight: 18 }} numberOfLines={8}>
                    {b.label}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: "#64748b", marginTop: 8 }}>
                    {formatShortDate(s)} → {formatShortDate(e)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  splitHead: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 4,
  },
  splitHint: {
    marginTop: 4,
    fontSize: 10,
    color: "#94a3b8",
    lineHeight: 14,
  },
  splitWindowHint: {
    marginTop: 2,
    marginBottom: 6,
    fontSize: 10,
    color: "#64748b",
    lineHeight: 14,
  },
});
