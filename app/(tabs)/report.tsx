import { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Dimensions,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Line } from "react-native-svg";
import { BookOpen, Calculator, ChevronRight } from "lucide-react-native";
import {
  PRIMARY,
  UI_BORDER,
  UI_RADIUS_LG,
  UI_RADIUS_MD,
  UI_RADIUS_XL,
  UI_SURFACE,
  UI_TEXT,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY,
  uiCardShadow,
} from "@/constants/theme";
import { useProfile } from "@/context/ProfileContext";
import { useScores } from "@/context/ScoreContext";
import { useRules } from "@/context/RulesContext";
import { useTasks, getTodayKey, type Task } from "@/context/TasksContext";
import { buildPlan } from "@/planning/engine";
import { AibouMascot } from "@/components/AibouMascot";

const REPORT_BG = "#F2F2F7";
const ENG_BLUE = "#0EA5E9";
const MATH_ORANGE = "#F97316";
const AVG_GREEN = "#34C759";

const padH = 20;

function addDaysKey(baseKey: string, add: number): string {
  const [y, mo, da] = baseKey.split("-").map((v) => parseInt(v, 10));
  const dt = new Date(y, mo - 1, da);
  dt.setDate(dt.getDate() + add);
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

function weekdayJa(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map((n) => parseInt(n, 10));
  const dt = new Date(y, m - 1, d);
  return ["日", "月", "火", "水", "木", "金", "土"][dt.getDay()] ?? "";
}

type DayBucket = {
  key: string;
  englishDone: number;
  mathDone: number;
  englishTotal: number;
  mathTotal: number;
};

function bucketForDay(tasks: Task[], dateKey: string): DayBucket {
  const dayTasks = tasks.filter((t) => t.date === dateKey);
  const english = dayTasks.filter((t) => t.subject === "english");
  const math = dayTasks.filter((t) => t.subject === "math");
  return {
    key: dateKey,
    englishDone: english.filter((t) => t.completed).length,
    mathDone: math.filter((t) => t.completed).length,
    englishTotal: english.length,
    mathTotal: math.length,
  };
}

function buildLast7Days(today: string, tasks: Task[]): DayBucket[] {
  return Array.from({ length: 7 }, (_, i) => {
    const k = addDaysKey(today, -(6 - i));
    return bucketForDay(tasks, k);
  });
}

function sumCompleted(b: DayBucket) {
  return b.englishDone + b.mathDone;
}

function sumScheduled(b: DayBucket) {
  return b.englishTotal + b.mathTotal;
}

function formatCount(n: number) {
  return `${n}コマ`;
}

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(32, insets.bottom + 48);
  const { width: screenW } = Dimensions.get("window");
  const chartInnerW = screenW - padH * 2 - 36;

  const { profile } = useProfile();
  const { scores } = useScores();
  const { rules } = useRules();
  const { tasks, updateTaskSchedule } = useTasks();
  const today = getTodayKey();

  const [period, setPeriod] = useState<"week" | "day">("week");

  const buckets = useMemo(() => buildLast7Days(today, tasks), [tasks, today]);
  const todayBucket = useMemo(() => bucketForDay(tasks, today), [tasks, today]);

  const weekCompleted = useMemo(() => buckets.reduce((s, b) => s + sumCompleted(b), 0), [buckets]);
  const weekScheduled = useMemo(() => buckets.reduce((s, b) => s + sumScheduled(b), 0), [buckets]);
  const weekEnglishDone = useMemo(() => buckets.reduce((s, b) => s + b.englishDone, 0), [buckets]);
  const weekMathDone = useMemo(() => buckets.reduce((s, b) => s + b.mathDone, 0), [buckets]);

  const avgDailyCompleted = weekCompleted / 7;
  const maxDayCompleted = useMemo(
    () => Math.max(...buckets.map(sumCompleted), Math.ceil(avgDailyCompleted), 1),
    [buckets, avgDailyCompleted]
  );

  const prevWeekCompleted = useMemo(() => {
    let n = 0;
    for (let i = 13; i >= 7; i--) {
      const k = addDaysKey(today, -i);
      n += tasks.filter((t) => t.date === k && t.completed).length;
    }
    return n;
  }, [tasks, today]);

  const vsPrevPct =
    prevWeekCompleted > 0
      ? Math.round(((weekCompleted - prevWeekCompleted) / prevWeekCompleted) * 100)
      : weekCompleted > 0
        ? 100
        : null;

  const streak = useMemo(() => {
    let s = 0;
    for (let i = 0; i < 365; i++) {
      const k = addDaysKey(today, -i);
      const dayTasks = tasks.filter((t) => t.date === k);
      if (dayTasks.length === 0) continue;
      if (dayTasks.every((t) => t.completed)) s += 1;
      else break;
    }
    return s;
  }, [tasks, today]);

  const weekCompletionRate =
    weekScheduled > 0 ? Math.round((weekCompleted / weekScheduled) * 100) : weekCompleted > 0 ? 100 : 0;

  const todayDone = sumCompleted(todayBucket);
  const todayTotal = sumScheduled(todayBucket);
  const todayPct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

  const todayByHour = useMemo(() => {
    const list = tasks.filter((t) => t.date === today).sort((a, b) => a.hour - b.hour);
    return list;
  }, [tasks, today]);

  const handleBuildPlan = () => {
    if (!rules.enabled) {
      Alert.alert("ルールがOFF", "「科目ルール」画面から連動をONにしてください。");
      return;
    }

    const newTasks = buildPlan({
      profile,
      scores,
      rules,
      exams: [],
      curricula: [],
    });

    if (newTasks.length === 0) {
      Alert.alert("作成できませんでした", "目標点が0ばかりになっていないか、マイページで確認してください。");
      return;
    }

    const futureExisting = tasks.filter((t) => t.date >= today);
    const minLen = Math.min(futureExisting.length, newTasks.length);
    for (let i = 0; i < minLen; i++) {
      const src = newTasks[i];
      const dst = futureExisting[i];
      updateTaskSchedule(dst.id, src.date, src.hour);
    }

    Alert.alert("更新しました", "ホーム・カレンダーで時間割を確認できます。");
  };

  const CHART_H = 112;
  const avgY =
    maxDayCompleted > 0 ? CHART_H - (avgDailyCompleted / maxDayCompleted) * CHART_H : CHART_H * 0.5;

  const avgRounded = Math.round(avgDailyCompleted * 10) / 10;
  const avgLabel = avgRounded % 1 === 0 ? String(Math.round(avgRounded)) : avgRounded.toFixed(1);

  const subjectRows = useMemo(() => {
    const max = Math.max(weekEnglishDone, weekMathDone, 1);
    return [
      {
        key: "english",
        label: "英語",
        done: weekEnglishDone,
        color: ENG_BLUE,
        Icon: BookOpen,
      },
      {
        key: "math",
        label: "数学",
        done: weekMathDone,
        color: MATH_ORANGE,
        Icon: Calculator,
      },
    ].map((row) => ({
      ...row,
      barPct: (row.done / max) * 100,
      sublabel: `今週 ${formatCount(row.done)} 完了`,
    }));
  }, [weekEnglishDone, weekMathDone]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: REPORT_BG }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: padH, paddingTop: 8, paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: "700",
            color: UI_TEXT,
            letterSpacing: -0.6,
            marginTop: 4,
            textAlign: "center",
          }}
        >
          レポート
        </Text>
        <Text style={{ marginTop: 6, fontSize: 13, color: UI_TEXT_SECONDARY, textAlign: "center" }}>
          やったことを、数字とグラフで振り返り
        </Text>

        <View
          style={{
            marginTop: 18,
            flexDirection: "row",
            backgroundColor: "rgba(118,118,128,0.24)",
            borderRadius: 10,
            padding: 3,
          }}
        >
          {(["week", "day"] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setPeriod(m)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: period === m ? UI_SURFACE : "transparent",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: period === m ? UI_TEXT : UI_TEXT_SECONDARY,
                }}
              >
                {m === "week" ? "週" : "日"}
              </Text>
            </Pressable>
          ))}
        </View>

        {period === "week" ? (
          <>
            <Text style={styles.sectionLabel}>学習アクティビティ</Text>
            <View style={styles.card}>
              <Text style={styles.cardKicker}>1日の平均（完了コマ）</Text>
              <Text style={styles.heroNumber}>{avgLabel}</Text>
              <Text style={{ marginTop: 2, fontSize: 14, color: UI_TEXT_SECONDARY, fontWeight: "500" }}>
                コマ／日
              </Text>

              <View style={{ marginTop: 8, height: CHART_H + 22, position: "relative" }}>
                <View style={{ height: CHART_H, position: "relative", width: "100%" }}>
                  <View style={{ flexDirection: "row", height: CHART_H, alignItems: "flex-end" }}>
                    {buckets.map((b) => {
                      const done = sumCompleted(b);
                      const barTotalH =
                        maxDayCompleted > 0
                          ? Math.min(CHART_H, Math.max((done / maxDayCompleted) * CHART_H, done > 0 ? 8 : 0))
                          : 0;
                      const engH = done > 0 ? (b.englishDone / done) * barTotalH : 0;
                      const mathH = done > 0 ? (b.mathDone / done) * barTotalH : 0;
                      return (
                        <View key={b.key} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
                          <View
                            style={{
                              width: 26,
                              height: CHART_H,
                              borderRadius: 6,
                              backgroundColor: "#E8E8ED",
                              overflow: "hidden",
                              justifyContent: "flex-end",
                            }}
                          >
                            {mathH > 0 ? (
                              <View style={{ height: mathH, width: "100%", backgroundColor: MATH_ORANGE }} />
                            ) : null}
                            {engH > 0 ? (
                              <View style={{ height: engH, width: "100%", backgroundColor: ENG_BLUE }} />
                            ) : null}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                  <Svg
                    width={chartInnerW}
                    height={CHART_H}
                    style={{ position: "absolute", top: 0, left: 0 }}
                    pointerEvents="none"
                  >
                    <Line
                      x1={0}
                      y1={Math.min(Math.max(avgY, 4), CHART_H - 4)}
                      x2={chartInnerW}
                      y2={Math.min(Math.max(avgY, 4), CHART_H - 4)}
                      stroke={AVG_GREEN}
                      strokeWidth={2}
                      strokeDasharray="6 5"
                    />
                  </Svg>
                  <View style={{ position: "absolute", right: 0, top: Math.min(Math.max(avgY - 18, 0), CHART_H - 28) }}>
                    <Text style={{ fontSize: 10, fontWeight: "600", color: AVG_GREEN }}>平均</Text>
                  </View>
                </View>
                <View style={{ flexDirection: "row", marginTop: 6 }}>
                  {buckets.map((b) => (
                    <View key={b.key} style={{ flex: 1, alignItems: "center" }}>
                      <Text style={{ fontSize: 11, color: UI_TEXT_TERTIARY, fontWeight: "600" }}>
                        {weekdayJa(b.key)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: ENG_BLUE }]} />
                  <Text style={styles.legendText}>英語 · {formatCount(weekEnglishDone)}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: MATH_ORANGE }]} />
                  <Text style={styles.legendText}>数学 · {formatCount(weekMathDone)}</Text>
                </View>
              </View>

              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>7日間の合計</Text>
                <Text style={styles.summaryValue}>
                  {formatCount(weekCompleted)}
                  {weekScheduled > 0 ? (
                    <Text style={{ fontSize: 15, fontWeight: "600", color: UI_TEXT_SECONDARY }}>
                      {" "}
                      / 予定 {weekScheduled}
                    </Text>
                  ) : null}
                </Text>
              </View>
              <Text style={styles.footerMeta}>直近7日分を集計 · 目標点はマイページ</Text>
            </View>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>科目の内訳</Text>
            </View>
            <View style={styles.card}>
              {subjectRows.map((row, idx) => {
                const RowIcon = row.Icon;
                return (
                <View
                  key={row.key}
                  style={[styles.breakdownRow, idx === subjectRows.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <View style={styles.breakdownLeft}>
                    <View style={[styles.iconCircle, { backgroundColor: `${row.color}22` }]}>
                      <RowIcon size={20} color={row.color} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.breakdownTitle}>{row.label}</Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${row.barPct}%`, backgroundColor: row.color }]} />
                      </View>
                    </View>
                  </View>
                  <Text style={styles.breakdownMeta}>{row.sublabel}</Text>
                </View>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>状況メモ</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>連続「全日完了」</Text>
                <Text style={styles.infoValue}>{streak} 日</Text>
              </View>
              <View style={styles.insetDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>今週の予定に対する完了率</Text>
                <Text style={styles.infoValue}>{weekScheduled > 0 ? `${weekCompletionRate}%` : "—"}</Text>
              </View>
              <View style={styles.insetDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>先週との差（完了コマ）</Text>
                <Text style={styles.infoValue}>
                  {vsPrevPct === null ? "—" : `${vsPrevPct >= 0 ? "+" : ""}${vsPrevPct}%`}
                </Text>
              </View>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.sectionLabel}>今日のアクティビティ</Text>
            <View style={styles.card}>
              <Text style={styles.cardKicker}>今日の完了</Text>
              <Text style={styles.heroNumber}>
                {todayTotal === 0 ? "—" : `${todayDone}`}
                {todayTotal > 0 ? (
                  <Text style={{ fontSize: 22, fontWeight: "700", color: UI_TEXT_SECONDARY }}>
                    {" "}
                    / {todayTotal}
                  </Text>
                ) : null}
              </Text>
              {todayTotal > 0 ? (
                <Text style={{ marginTop: 6, fontSize: 15, color: UI_TEXT_SECONDARY }}>
                  達成率 {todayPct}%
                </Text>
              ) : (
                <Text style={{ marginTop: 6, fontSize: 15, color: UI_TEXT_SECONDARY }}>
                  今日はまだコマがありません
                </Text>
              )}

              {todayByHour.length > 0 ? (
                <>
                  <View style={[styles.divider, { marginTop: 18 }]} />
                  <Text style={{ fontSize: 12, fontWeight: "700", color: UI_TEXT_TERTIARY, marginBottom: 10 }}>
                    時間帯別
                  </Text>
                  {todayByHour.map((t) => (
                    <View key={t.id} style={styles.hourRow}>
                      <Text style={styles.hourLabel}>
                        {String(t.hour).padStart(2, "0")}:00
                      </Text>
                      <View style={{ flex: 1, marginHorizontal: 10 }}>
                        <Text style={styles.hourTitle} numberOfLines={1}>
                          {t.title}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.donePill,
                          { backgroundColor: t.completed ? `${AVG_GREEN}22` : UI_BORDER },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: t.completed ? AVG_GREEN : UI_TEXT_TERTIARY,
                          }}
                        >
                          {t.completed ? "完了" : "未"}
                        </Text>
                      </View>
                    </View>
                  ))}
                </>
              ) : null}
            </View>
          </>
        )}

        <Pressable
          onPress={handleBuildPlan}
          style={{
            marginTop: 20,
            borderRadius: UI_RADIUS_LG,
            backgroundColor: UI_SURFACE,
            paddingVertical: 16,
            paddingHorizontal: 18,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            columnGap: 10,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: UI_BORDER,
            ...uiCardShadow,
          }}
        >
          <AibouMascot size={24} compact />
          <Text style={{ fontSize: 16, fontWeight: "600", color: PRIMARY }}>時間割をAIBOUに合わせる</Text>
          <ChevronRight size={20} color={PRIMARY} strokeWidth={2} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    marginTop: 22,
    marginBottom: 8,
    marginLeft: 4,
    fontSize: 13,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
  },
  card: {
    borderRadius: UI_RADIUS_XL,
    backgroundColor: UI_SURFACE,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(60,60,67,0.12)",
    ...uiCardShadow,
  },
  cardKicker: {
    fontSize: 13,
    color: UI_TEXT_SECONDARY,
    fontWeight: "500",
  },
  heroNumber: {
    marginTop: 4,
    fontSize: 40,
    fontWeight: "700",
    color: UI_TEXT,
    letterSpacing: -1,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 16,
  },
  legendItem: { flexDirection: "row", alignItems: "center", columnGap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 14, color: UI_TEXT, fontWeight: "500" },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: UI_BORDER,
    marginVertical: 14,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryLabel: { fontSize: 15, color: UI_TEXT_SECONDARY },
  summaryValue: { fontSize: 17, fontWeight: "700", color: UI_TEXT },
  footerMeta: { marginTop: 10, fontSize: 11, color: UI_TEXT_TERTIARY },
  sectionHeaderRow: {
    marginTop: 22,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: UI_TEXT },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI_BORDER,
  },
  breakdownLeft: { flex: 1, flexDirection: "row", alignItems: "center", columnGap: 12, minWidth: 0 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  breakdownTitle: { fontSize: 16, fontWeight: "700", color: UI_TEXT, marginBottom: 6 },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E8E8ED",
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 3 },
  breakdownMeta: { fontSize: 12, color: UI_TEXT_SECONDARY, maxWidth: 100, textAlign: "right" },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  infoLabel: { fontSize: 15, color: UI_TEXT, flex: 1, paddingRight: 12 },
  infoValue: { fontSize: 16, fontWeight: "600", color: UI_TEXT_SECONDARY },
  insetDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: UI_BORDER,
    marginLeft: 0,
  },
  hourRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI_BORDER,
  },
  hourLabel: { fontSize: 13, fontWeight: "700", color: UI_TEXT_TERTIARY, width: 52 },
  hourTitle: { fontSize: 15, fontWeight: "500", color: UI_TEXT },
  donePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: UI_RADIUS_MD,
  },
});
