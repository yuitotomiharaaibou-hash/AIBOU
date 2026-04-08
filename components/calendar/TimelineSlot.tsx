import { View, Text } from "react-native";
import { BACKGROUND, FIXED_SCHEDULE_BG } from "@/constants/theme";

const SLOT_MIN_HEIGHT = 56;

/** 1時間枠の固定予定（学校・塾など）のダミー定義 */
export type FixedBlock = {
  label?: string;
  isFixed?: boolean;
};

type TimelineSlotProps = {
  hour: number;
  isFixed?: boolean;
  fixedLabel?: string;
  children?: React.ReactNode;
};

export function TimelineSlot({
  hour,
  isFixed = false,
  fixedLabel,
  children,
}: TimelineSlotProps) {
  return (
    <View
      className="min-h-[56px] flex-row border-b border-slate-100"
      style={{ minHeight: SLOT_MIN_HEIGHT }}
    >
      <View className="w-10 items-end justify-center pr-2 pt-1">
        <Text className="text-xs font-medium text-slate-500">{hour}</Text>
      </View>
      <View className="flex-1 flex-row flex-wrap items-start gap-1 overflow-hidden rounded-r py-1 pr-1">
        {isFixed && (
          <View
            className="absolute inset-0 rounded opacity-50"
            style={{ backgroundColor: FIXED_SCHEDULE_BG }}
          />
        )}
        {isFixed && fixedLabel && (
          <View className="absolute left-1 top-1.5">
            <Text className="text-[10px] font-medium text-slate-500">
              {fixedLabel}
            </Text>
          </View>
        )}
        <View className="min-h-[44px] flex-1 flex-row flex-wrap items-center gap-1.5">
          {children}
        </View>
      </View>
    </View>
  );
}
