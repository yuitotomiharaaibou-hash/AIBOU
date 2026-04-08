import { useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, Pressable, Modal } from "react-native";
import { BACKGROUND } from "@/constants/theme";
import { useTasks, makeDateKey } from "@/context/TasksContext";
import { useRouter } from "expo-router";

type DayCell = {
  date: number;
  isCurrentMonth: boolean;
};

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function buildMonth(year: number, month0: number): DayCell[] {
  const first = new Date(year, month0, 1);
  const firstWeekday = first.getDay(); // 0 (Sun) - 6 (Sat)
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();

  const cells: DayCell[] = [];

  // 前月の埋め草
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ date: 0, isCurrentMonth: false });
  }

  // 当月
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: d, isCurrentMonth: true });
  }

  // 6行×7列に満たない分を後ろに埋める
  while (cells.length < 42) {
    cells.push({ date: 0, isCurrentMonth: false });
  }

  return cells;
}

export default function CalendarScreen() {
  const router = useRouter();
  const baseToday = new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  const viewDate = new Date(
    baseToday.getFullYear(),
    baseToday.getMonth() + monthOffset,
    1
  );
  const year = viewDate.getFullYear();
  const month0 = viewDate.getMonth();
  const cells = buildMonth(year, month0);
  const { tasks } = useTasks();
  const [yearMonthPickerVisible, setYearMonthPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(year);
  const [pickerMonth0, setPickerMonth0] = useState(month0);

  // 7日ごとに 1 週間の配列に分割（スマホでもきちんと 7 列に並べる）
  const weeks: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const openYearMonthPicker = () => {
    setPickerYear(year);
    setPickerMonth0(month0);
    setYearMonthPickerVisible(true);
  };

  const applyYearMonthPicker = () => {
    const yearDiff = pickerYear - baseToday.getFullYear();
    const monthDiff = pickerMonth0 - baseToday.getMonth();
    setMonthOffset(yearDiff * 12 + monthDiff);
    setYearMonthPickerVisible(false);
  };

  const handleDayPress = (cell: DayCell) => {
    if (!cell.isCurrentMonth || cell.date <= 0) return;
    const key = makeDateKey(year, month0, cell.date);
    router.push(`/day/${key}`);
  };

  const tasksByDate = useMemo(() => {
    const map: Record<string, typeof tasks> = {};
    for (const t of tasks) {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    }
    return map;
  }, [tasks]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: BACKGROUND }}
      edges={["top"]}
    >
      <View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 16 }}>
        {/* ヘッダー: 年月 */}
        <Pressable
          onPress={openYearMonthPicker}
          style={{ marginBottom: 8, alignSelf: "flex-start" }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: "#0f172a",
            }}
          >
            {year}年 {month0 + 1}月
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: "#6b7280",
              marginTop: 2,
            }}
          >
            タップして年月を変更
          </Text>
        </Pressable>

        {/* 曜日ヘッダー */}
        <View style={{ flexDirection: "row", marginBottom: 4 }}>
          {DAY_LABELS.map((label) => (
            <View
              key={label}
              style={{ flex: 1, alignItems: "center", paddingVertical: 4 }}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#64748b" }}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        {/* カレンダーグリッド */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{ borderWidth: 1, borderColor: "#e2e8f0" }}
          >
            {weeks.map((week, rowIndex) => (
              <View
                key={rowIndex}
                style={{ flexDirection: "row" }}
              >
                {week.map((cell, colIndex) => {
                  const isSunday = colIndex === 0;
                  const isSaturday = colIndex === 6;
                  const dateKey =
                    cell.isCurrentMonth && cell.date > 0
                      ? makeDateKey(year, month0, cell.date)
                      : "";
                  const cellTasks = dateKey ? tasksByDate[dateKey] ?? [] : [];
                  const shown = cellTasks.slice(0, 4);
                  const rest = cellTasks.length - shown.length;

                  return (
                    <Pressable
                      key={colIndex}
                      onPress={() => handleDayPress(cell)}
                      style={{
                        height: 80,
                        flex: 1,
                        borderBottomWidth: 1,
                        borderRightWidth: colIndex === 6 ? 0 : 1,
                        borderColor: "#e2e8f0",
                        padding: 4,
                        backgroundColor: "#ffffff",
                      }}
                    >
                      {cell.isCurrentMonth && (
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "600",
                              color: isSunday
                                ? "#fb7185"
                                : isSaturday
                                ? "#0ea5e9"
                                : "#334155",
                            }}
                          >
                            {cell.date}
                          </Text>
                          <View
                            style={{
                              marginTop: 4,
                              flex: 1,
                              flexDirection: "column",
                              rowGap: 4,
                            }}
                          >
                            {shown.map((t) => (
                              <View
                                key={t.id}
                                style={{
                                  borderRadius: 6,
                                  backgroundColor: t.completed
                                    ? "#64748b"
                                    : "#e0f2fe",
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                  minHeight: 16,
                                  justifyContent: "center",
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 9,
                                    color: t.completed ? "#ffffff" : "#0369a1",
                                  }}
                                  numberOfLines={1}
                                >
                                  {t.title}
                                </Text>
                              </View>
                            ))}
                            {rest > 0 && (
                              <Text style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                                +{rest}
                              </Text>
                            )}
                          </View>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>

        <Text style={{ marginTop: 10, fontSize: 11, color: "#64748b" }}>
          日付をタップすると、その日の「予定」と「タスク」の詳細を開けます。
        </Text>
      </View>

      {/* 年月ピッカー */}
      <Modal
        visible={yearMonthPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setYearMonthPickerVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(15,23,42,0.35)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: "80%",
              maxWidth: 360,
              borderRadius: 16,
              backgroundColor: "#ffffff",
              padding: 16,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: "#0f172a",
                marginBottom: 12,
              }}
            >
              年月を選択
            </Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    marginBottom: 4,
                  }}
                >
                  年
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Pressable
                    onPress={() => setPickerYear((y) => y - 1)}
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>-</Text>
                  </Pressable>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#111827",
                      minWidth: 64,
                      textAlign: "center",
                    }}
                  >
                    {pickerYear}
                  </Text>
                  <Pressable
                    onPress={() => setPickerYear((y) => y + 1)}
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>+</Text>
                  </Pressable>
                </View>
              </View>

              <View style={{ alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    marginBottom: 4,
                  }}
                >
                  月
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Pressable
                    onPress={() =>
                      setPickerMonth0((m0) => (m0 + 11) % 12)
                    }
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>-</Text>
                  </Pressable>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#111827",
                      minWidth: 40,
                      textAlign: "center",
                    }}
                  >
                    {pickerMonth0 + 1}
                  </Text>
                  <Pressable
                    onPress={() =>
                      setPickerMonth0((m0) => (m0 + 1) % 12)
                    }
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>+</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                columnGap: 12,
              }}
            >
              <Pressable
                onPress={() => setYearMonthPickerVisible(false)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: "#6b7280",
                  }}
                >
                  キャンセル
                </Text>
              </Pressable>
              <Pressable
                onPress={applyYearMonthPicker}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: "#2563eb",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: "#ffffff",
                  }}
                >
                  決定
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
