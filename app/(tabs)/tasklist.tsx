import { useState } from "react";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Plus } from "lucide-react-native";
import { getTodayKey, useTasks } from "@/context/TasksContext";
import { QuickCreateModal } from "@/components/QuickCreateModal";
import { useRouter } from "expo-router";
import { AibouCompanionFab } from "@/components/AibouCompanionFab";
import { getCompanionFabBottom, getPlusFabBottom } from "@/lib/companionFabLayout";
import { BACKGROUND, UI_BORDER, UI_TEXT_SECONDARY } from "@/constants/theme";
import { Koko2EnglishTaskList } from "@/components/Koko2EnglishTaskList";
import { Koko2MathTaskList } from "@/components/Koko2MathTaskList";

const ENG_BLUE = "#2563eb";
const MATH_AMBER = "#d97706";

type SubjectTab = "english" | "math";

export default function TaskListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pendingAiQuestions } = useTasks();
  const plusFabBottom = getPlusFabBottom(insets.bottom);
  const companionFabBottom = getCompanionFabBottom(insets.bottom);
  const [subjectTab, setSubjectTab] = useState<SubjectTab>("english");
  const [fabOpen, setFabOpen] = useState(false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BACKGROUND, position: "relative" }} edges={["top"]}>
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
        <View
          style={{
            paddingBottom: 10,
            flexDirection: "row",
            alignItems: "center",
            columnGap: 8,
          }}
        >
          <Pressable
            onPress={() => setSubjectTab("english")}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: subjectTab === "english" ? ENG_BLUE : UI_BORDER,
              backgroundColor: subjectTab === "english" ? "#dbeafe" : "#fff",
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "800", color: subjectTab === "english" ? ENG_BLUE : UI_TEXT_SECONDARY }}>
              英語
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setSubjectTab("math")}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: subjectTab === "math" ? MATH_AMBER : UI_BORDER,
              backgroundColor: subjectTab === "math" ? "#fef3c7" : "#fff",
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "800", color: subjectTab === "math" ? MATH_AMBER : UI_TEXT_SECONDARY }}>
              数学
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {subjectTab === "english" ? (
            <View style={{ minWidth: 0 }}>
              <Text style={{ marginBottom: 8, fontSize: 13, fontWeight: "700", color: ENG_BLUE }}>英語</Text>
              <Koko2EnglishTaskList scrollable={false} />
            </View>
          ) : (
            <View style={{ minWidth: 0 }}>
              <Text style={{ marginBottom: 8, fontSize: 13, fontWeight: "700", color: MATH_AMBER }}>数学</Text>
              <Koko2MathTaskList scrollable={false} />
            </View>
          )}
        </ScrollView>
      </View>

      <Pressable
        onPress={() => setFabOpen(true)}
        accessibilityLabel="予定またはタスクを追加"
        style={{
          position: "absolute",
          right: 20,
          bottom: plusFabBottom,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: "#2563eb",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 6,
        }}
      >
        <Plus size={28} color="#ffffff" strokeWidth={2.5} />
      </Pressable>
      <AibouCompanionFab
        bottom={companionFabBottom}
        badgeCount={pendingAiQuestions.length}
        onPress={() => router.push("/replan-companion")}
      />
      <QuickCreateModal visible={fabOpen} onClose={() => setFabOpen(false)} defaultDateKey={getTodayKey()} initialTab="task" />
    </SafeAreaView>
  );
}
