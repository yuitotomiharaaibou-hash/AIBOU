import { View, Text, ScrollView } from "react-native";
import { TimelineSlot } from "./TimelineSlot";
import { PlacedCube } from "./PlacedCube";

const SLOT_MIN_HEIGHT = 56;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

/** 固定予定のダミー（7-8, 12-13, 16-17, 20-22 など） */
const FIXED_SLOTS: Record<number, string> = {
  7: "朝の支度",
  12: "昼休み",
  16: "塾",
  20: "自習",
  21: "",
  22: "",
};

export function TimelineColumn() {
  return (
    <View className="flex-1 border-r border-slate-200 bg-white">
      <View className="border-b border-slate-200 bg-slate-50/80 px-2 py-2">
        <Text className="text-xs font-semibold text-slate-600">今日の予定</Text>
      </View>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {HOURS.map((hour) => {
          const fixedLabel = FIXED_SLOTS[hour];
          const isFixed = fixedLabel !== undefined;
          const showDummyCubes =
            hour === 9 || hour === 10 || hour === 14;
          return (
            <TimelineSlot
              key={hour}
              hour={hour}
              isFixed={isFixed}
              fixedLabel={fixedLabel || undefined}
            >
              {showDummyCubes && hour === 9 && (
                <>
                  <PlacedCube label="鉄壁 Sect.1" isLocked />
                  <PlacedCube label="数学 1問" />
                </>
              )}
              {showDummyCubes && hour === 10 && (
                <PlacedCube label="英語 長文" isLocked />
              )}
              {showDummyCubes && hour === 14 && (
                <>
                  <PlacedCube label="復習" />
                  <PlacedCube label="問題集 p.10" />
                </>
              )}
            </TimelineSlot>
          );
        })}
      </ScrollView>
    </View>
  );
}
