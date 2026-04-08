import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { TaskCube } from "./TaskCube";

const DUMMY_TASKS = [
  "鉄壁 Sect.2",
  "数学 2問",
  "英語 単語",
  "古文 1題",
  "理科 実験レポート",
];

export function TaskInboxColumn() {
  const [lockedIds, setLockedIds] = useState<Set<number>>(new Set());

  const toggleLock = (index: number) => {
    setLockedIds((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleLongPress = (index: number) => {
    // スケルトン: 長押しで時間枠へ移動するUIは将来実装。ここではフィードバックのみ。
    // 必要なら HapticFeedback や「移動モード」状態を追加可能。
  };

  return (
    <View className="min-w-[140px] flex-1 border-l border-slate-200 bg-slate-50/50" style={{ maxWidth: 220 }}>
      <View className="border-b border-slate-200 bg-slate-50/80 px-3 py-2">
        <Text className="text-xs font-semibold text-slate-600">
          未割り当てタスク
        </Text>
        <Text className="mt-0.5 text-[10px] text-slate-500">
          長押しで時間枠へ移動
        </Text>
      </View>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        showsVerticalScrollIndicator={true}
      >
        {DUMMY_TASKS.map((label, index) => (
          <TaskCube
            key={index}
            label={label}
            isLocked={lockedIds.has(index)}
            onPress={() => toggleLock(index)}
            onLongPress={() => handleLongPress(index)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
