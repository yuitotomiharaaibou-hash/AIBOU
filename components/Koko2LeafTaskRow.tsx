import { View, Text, Pressable } from "react-native";
import { CheckCircle2, Circle } from "lucide-react-native";
import type { Task } from "@/context/TasksContext";
import { taskTitleWithSegment } from "@/lib/taskSegmentLabel";

type Props = {
  task: Task;
  accentColor: string;
  onToggleComplete: () => void;
  onPressBody: () => void;
};

export function Koko2LeafTaskRow({ task, accentColor: _accentColor, onToggleComplete, onPressBody }: Props) {
  void _accentColor;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderColor: "#f1f5f9",
      }}
    >
      <Pressable
        onPress={onToggleComplete}
        hitSlop={10}
        accessibilityLabel={task.completed ? "完了を取り消す" : "タスクを完了にする"}
        style={{ paddingVertical: 4, paddingRight: 4 }}
      >
        {task.completed ? (
          <CheckCircle2 size={18} color="#10b981" />
        ) : (
          <Circle size={18} color="#94a3b8" />
        )}
      </Pressable>
      <Pressable
        onPress={onPressBody}
        style={{ flex: 1, justifyContent: "center", minWidth: 0, paddingVertical: 6, paddingLeft: 6 }}
        accessibilityLabel="タスクの詳細を開く"
      >
        <Text
          style={{
            fontSize: 12,
            color: task.completed ? "#9ca3af" : "#334155",
            textDecorationLine: task.completed ? "line-through" : "none",
          }}
          numberOfLines={2}
        >
          {taskTitleWithSegment(task.title, task)}
        </Text>
      </Pressable>
    </View>
  );
}
