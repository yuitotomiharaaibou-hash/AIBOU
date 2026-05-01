import { useMemo } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import type { ReactNode } from "react";
import type { DayPlanItem } from "@/context/HomeScheduleContext";
import type { Task } from "@/context/TasksContext";
import { planSpanFromLoose, formatPlanRangeLabel } from "@/lib/planTime";
import { planDisplayAllDay } from "@/lib/planDisplay";
import { planTitleShortDisplay } from "@/lib/planTitleDisplay";
import { assignTimedPlanLanes } from "@/lib/planOverlapLayout";

const ROW_HEIGHT = 44;
const HOURS = Array.from({ length: 24 }, (_, h) => h);

export type HomeDayScheduleBodyProps = {
  pageWidth: number;
  /** 親で onLayout した高さ。未指定だと Web で縦スクロールが潰れやすい */
  paneHeight?: number;
  /** 今日のタイムライン上の「いま」の位置（0〜1440 分）。今日以外は null */
  timelineNowMin: number | null;
  plans: DayPlanItem[];
  dayTasks: Task[];
  onPlanPress: (plan: DayPlanItem) => void;
  onEmptyHourPress: (hour: number) => void;
  renderTaskRow: (task: Task) => ReactNode;
};

export function HomeDayScheduleBody({
  pageWidth,
  paneHeight,
  timelineNowMin,
  plans,
  dayTasks,
  onPlanPress,
  onEmptyHourPress,
  renderTaskRow,
}: HomeDayScheduleBodyProps) {
  const ppm = ROW_HEIGHT / 60;
  const totalH = 24 * ROW_HEIGHT;
  const h = paneHeight && paneHeight > 0 ? paneHeight : undefined;
  const scrollStyle = h != null ? { width: pageWidth, height: h } : { width: pageWidth, flex: 1 as const };
  const allDayPlans = useMemo(() => plans.filter((p) => planDisplayAllDay(p)), [plans]);
  const timedPlans = useMemo(() => plans.filter((p) => !planDisplayAllDay(p)), [plans]);
  const timedPlanLanes = useMemo(() => assignTimedPlanLanes(timedPlans), [timedPlans]);

  return (
    <ScrollView
      style={scrollStyle}
      contentContainerStyle={{ paddingBottom: 24, minHeight: totalH }}
      showsVerticalScrollIndicator
    >
      <View style={{ flexDirection: "row", minHeight: totalH }}>
        <View style={{ width: 28 }}>
          {HOURS.map((hour) => (
            <View
              key={`lab-${hour}`}
              style={{
                height: ROW_HEIGHT,
                alignItems: "flex-end",
                justifyContent: "flex-start",
                paddingRight: 4,
                paddingTop: 2,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: "600", color: "#9ca3af" }}>{hour}</Text>
            </View>
          ))}
        </View>

        <View
          style={{
            flex: 1,
            height: totalH,
            position: "relative",
            borderRightWidth: 1,
            borderColor: "#e5e7eb",
            backgroundColor: "#f8fafc",
          }}
        >
          {HOURS.map((hour) => (
            <View
              key={`grid-${hour}`}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: hour * ROW_HEIGHT,
                height: ROW_HEIGHT,
                borderBottomWidth: 1,
                borderColor: "#e5e7eb",
              }}
            />
          ))}
          {HOURS.map((hour) => (
            <Pressable
              key={`empty-${hour}`}
              onPress={() => onEmptyHourPress(hour)}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: hour * ROW_HEIGHT,
                height: ROW_HEIGHT,
                zIndex: 1,
              }}
            />
          ))}
          {timelineNowMin != null ? (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: Math.min(totalH, Math.max(0, timelineNowMin * ppm)),
                height: 2,
                backgroundColor: "#fbbf24",
                zIndex: 5,
              }}
            />
          ) : null}
          {allDayPlans.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => onPlanPress(p)}
              style={{
                position: "absolute",
                left: 4,
                right: 4,
                top: 0,
                height: totalH,
                zIndex: 2,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#1e3a8a",
                backgroundColor: "#1e40af",
                paddingHorizontal: 6,
                paddingVertical: 6,
                justifyContent: "flex-start",
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#f8fafc" }} numberOfLines={3}>
                {planTitleShortDisplay(p.title)}
              </Text>
              <Text style={{ fontSize: 9, fontWeight: "600", color: "#e0e7ff", marginTop: 4 }} numberOfLines={1}>
                終日
              </Text>
            </Pressable>
          ))}
          {timedPlans.map((p) => {
            const span = planSpanFromLoose(p);
            const top = span.startMin * ppm;
            const hPx = Math.max((span.endMinExclusive - span.startMin) * ppm, 22);
            const { lane, laneCount } = timedPlanLanes.get(p.id) ?? { lane: 0, laneCount: 1 };
            const colPct = 100 / laneCount;
            const leftPct = lane * colPct;
            return (
              <Pressable
                key={p.id}
                onPress={() => onPlanPress(p)}
                style={{
                  position: "absolute",
                  left: `${leftPct}%`,
                  width: `${colPct}%`,
                  top,
                  height: hPx,
                  zIndex: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#c7d2fe",
                  backgroundColor: "#eef2ff",
                  paddingHorizontal: 4,
                  paddingVertical: 4,
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#3730a3" }} numberOfLines={2}>
                  {planTitleShortDisplay(p.title)}
                </Text>
                <Text style={{ fontSize: 9, fontWeight: "600", color: "#4f46e5", marginTop: 2 }} numberOfLines={1}>
                  {formatPlanRangeLabel(span)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flex: 1 }}>
          {HOURS.map((hour) => {
            const tasksAtHour = dayTasks.filter((t) => t.hour === hour);
            return (
              <View
                key={`tasks-${hour}`}
                style={{
                  height: ROW_HEIGHT,
                  borderBottomWidth: 1,
                  borderColor: "#e5e7eb",
                  backgroundColor: "#ffffff",
                  paddingHorizontal: 6,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  columnGap: 8,
                }}
              >
                {tasksAtHour.map((task) => (
                  <View key={task.id} style={{ flexShrink: 0 }}>
                    {renderTaskRow(task)}
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}
