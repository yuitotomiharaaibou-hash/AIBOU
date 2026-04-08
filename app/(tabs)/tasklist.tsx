import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView } from "react-native";
import { BACKGROUND } from "@/constants/theme";
import { Koko2EnglishTaskList } from "@/components/Koko2EnglishTaskList";
import { Koko2MathTaskList } from "@/components/Koko2MathTaskList";

export default function TaskListScreen() {
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: BACKGROUND }}
      edges={["top"]}
    >
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16, minHeight: 0 }}>
        <Text
          style={{
            marginBottom: 4,
            fontSize: 18,
            fontWeight: "600",
            color: "#0f172a",
          }}
        >
          タスクリスト
        </Text>
        <Text
          style={{
            marginBottom: 12,
            fontSize: 11,
            color: "#64748b",
            lineHeight: 16,
          }}
        >
          高二・第一回（夏）英語・数学｜カテゴリ別の進捗。行をタップで中身を表示します。
        </Text>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              columnGap: 10,
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  marginBottom: 8,
                  fontSize: 12,
                  fontWeight: "600",
                  color: "#2563eb",
                }}
              >
                英語
              </Text>
              <Koko2EnglishTaskList scrollable={false} />
            </View>
            <View style={{ width: 1, alignSelf: "stretch", backgroundColor: "#e5e7eb" }} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  marginBottom: 8,
                  fontSize: 12,
                  fontWeight: "600",
                  color: "#d97706",
                }}
              >
                数学
              </Text>
              <Koko2MathTaskList scrollable={false} />
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
