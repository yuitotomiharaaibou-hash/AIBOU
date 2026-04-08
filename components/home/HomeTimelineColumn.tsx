import { View, Text, ScrollView } from "react-native";
import { HomeTimelineSlot, SlotBlockType } from "./HomeTimelineSlot";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

/** 画像準拠: 0-23時・睡眠(0-6)・斜線ブロック・番号1-6・鉄英(18-19) */
function getSlotBlock(hour: number): { type: SlotBlockType; label?: string; number?: number } {
  if (hour >= 0 && hour <= 6) return { type: "sleep" };
  if (hour === 7 || hour === 8) return { type: "hatched", label: "朝" };
  if (hour === 9) return { type: "number", number: 1 };
  if (hour === 10) return { type: "number", number: 2 };
  if (hour === 11) return { type: "number", number: 3 };
  if (hour === 12) return { type: "number", number: 4 };
  if (hour === 13) return { type: "hatched", label: "昼" };
  if (hour === 14) return { type: "number", number: 5 };
  if (hour === 15) return { type: "number", number: 6 };
  if (hour === 16 || hour === 17) return { type: "hatched", label: "塾" };
  if (hour === 18 || hour === 19) return { type: "tekkou" };
  if (hour === 21 || hour === 22) return { type: "hatched", label: "夜" };
  return { type: "empty" };
}

type AssignedCube = { id: string; label: string; isLocked?: boolean };

type HomeTimelineColumnProps = {
  slotAssignments: Record<number, AssignedCube[]>;
  selectedCubeId: string | null;
  onSlotPress: (hour: number) => void;
};

export function HomeTimelineColumn({
  slotAssignments,
  selectedCubeId,
  onSlotPress,
}: HomeTimelineColumnProps) {
  return (
    <View className="flex-1 border-r border-slate-200 bg-white">
      <View className="border-b border-slate-200 bg-slate-50/80 px-2 py-2">
        <Text className="text-xs font-semibold text-slate-600">当人の予定</Text>
        {selectedCubeId !== null && (
          <Text className="mt-0.5 text-[10px] text-primary" style={{ color: "#2563EB" }}>
            配置する枠をタップ
          </Text>
        )}
      </View>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {HOURS.map((hour) => {
          const block = getSlotBlock(hour);
          const placedCubes = slotAssignments[hour] ?? [];
          return (
            <HomeTimelineSlot
              key={hour}
              hour={hour}
              blockType={block.type}
              blockLabel={block.label}
              blockNumber={block.number}
              placedCubes={placedCubes}
              isAssignMode={selectedCubeId !== null}
              onSlotPress={onSlotPress}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}
