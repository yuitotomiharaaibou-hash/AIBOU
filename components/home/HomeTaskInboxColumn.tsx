import { View, Text, ScrollView } from "react-native";
import { HomeTaskCube } from "./HomeTaskCube";

export type InboxTask = { id: string; label: string; isLocked?: boolean };

type HomeTaskInboxColumnProps = {
  tasks: InboxTask[];
  selectedCubeId: string | null;
  onCubePress: (id: string) => void;
  onCubeLongPress: (id: string) => void;
};

export function HomeTaskInboxColumn({
  tasks,
  selectedCubeId,
  onCubePress,
  onCubeLongPress,
}: HomeTaskInboxColumnProps) {
  return (
    <View className="min-w-[140px] flex-1 border-l border-slate-200 bg-slate-50/50" style={{ maxWidth: 200 }}>
      <View className="border-b border-slate-200 bg-slate-50/80 px-3 py-2">
        <Text className="text-[11px] font-medium text-slate-500">直感的に</Text>
        <Text className="text-xs font-semibold text-slate-700">その日のやる事</Text>
        <Text className="mt-0.5 text-[10px] text-slate-500">やる穴を編集</Text>
      </View>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 10, paddingBottom: 16 }}
        showsVerticalScrollIndicator={true}
      >
        <View className="flex-row flex-wrap gap-2">
          {tasks.map((task) => (
            <HomeTaskCube
              key={task.id}
              id={task.id}
              label={task.label}
              isLocked={task.isLocked}
              isSelected={selectedCubeId === task.id}
              onPress={() => onCubePress(task.id)}
              onLongPress={() => onCubeLongPress(task.id)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
