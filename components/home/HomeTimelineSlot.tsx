import { View, Text, Pressable } from "react-native";
import { FIXED_SCHEDULE_BG } from "@/constants/theme";
import { PlacedCube } from "../calendar/PlacedCube";

const SLOT_MIN_HEIGHT = 56;

export type SlotBlockType = "empty" | "sleep" | "hatched" | "number" | "tekkou";

type HomeTimelineSlotProps = {
  hour: number;
  blockType: SlotBlockType;
  blockLabel?: string;
  blockNumber?: number;
  placedCubes: { id: string; label: string; isLocked?: boolean }[];
  isAssignMode: boolean;
  onSlotPress: (hour: number) => void;
};

export function HomeTimelineSlot({
  hour,
  blockType,
  blockLabel,
  blockNumber,
  placedCubes,
  isAssignMode,
  onSlotPress,
}: HomeTimelineSlotProps) {
  const isHatched = blockType === "hatched";
  const isSleep = blockType === "sleep";
  const showNumber = blockType === "number" && blockNumber != null;

  return (
    <Pressable
      onPress={() => isAssignMode && onSlotPress(hour)}
      className="min-h-[56px] flex-row border-b border-slate-100 active:opacity-90"
      style={{ minHeight: SLOT_MIN_HEIGHT }}
      disabled={!isAssignMode}
    >
      <View className="w-10 items-end justify-center pr-2 pt-1">
        <Text className="text-xs font-medium text-slate-500">{hour}</Text>
      </View>
      <View className="flex-1 flex-row flex-wrap items-start gap-1.5 overflow-hidden rounded-r py-1 pr-1">
        {/* 中央の縦破線（左: 固定予定 / 右: タスクキューブ） */}
        <View
          className="absolute inset-y-0"
          style={{
            left: "50%",
            borderLeftWidth: 1,
            borderStyle: "dashed",
            borderColor: "#e2e8f0",
          }}
        />
        {(isHatched || isSleep) && (
          <View
            className="absolute inset-0 rounded opacity-50"
            style={{
              backgroundColor: FIXED_SCHEDULE_BG,
              borderLeftWidth: isSleep ? 0 : 2,
              borderLeftColor: isSleep ? "transparent" : "#94a3b8",
            }}
          />
        )}
        {isSleep && (
          <View className="absolute left-1 top-1.5">
            <Text className="text-[10px] font-medium text-slate-600">睡眠</Text>
          </View>
        )}
        {isHatched && blockLabel && (
          <View className="absolute left-1 top-1.5">
            <Text className="text-[10px] font-medium text-slate-500">
              {blockLabel}
            </Text>
          </View>
        )}
        {showNumber && (
          <View className="absolute left-1 top-1.5">
            <Text className="text-[10px] font-bold text-slate-600">
              {blockNumber}
            </Text>
          </View>
        )}
        {blockType === "tekkou" && (
          <>
            <View
              className="absolute inset-0 rounded opacity-40"
              style={{ backgroundColor: FIXED_SCHEDULE_BG }}
            />
            <View className="absolute left-1 top-1.5">
              <Text className="text-[10px] font-medium text-slate-600">鉄英</Text>
            </View>
          </>
        )}
        <View className="min-h-[44px] flex-1 flex-row flex-wrap items-center gap-1.5 justify-end">
          {placedCubes.map((cube) => (
            <PlacedCube
              key={cube.id}
              label={cube.label}
              isLocked={cube.isLocked}
            />
          ))}
          {isAssignMode && (
            <View className="rounded border border-dashed border-slate-300 px-2 py-1">
              <Text className="text-[10px] text-slate-400">ここに配置</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}
