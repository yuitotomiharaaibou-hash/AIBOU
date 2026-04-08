import { View, Text, Pressable } from "react-native";
import { ChevronDown } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";

const CARD_MIN_HEIGHT = 52;

type StartPickerCardProps = {
  label: string;
  value?: string;
  icon: LucideIcon;
  onPress: () => void;
};

export function StartPickerCard({
  label,
  value,
  icon: Icon,
  onPress,
}: StartPickerCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row items-center rounded-xl border border-gray-100 bg-white px-4 shadow-sm active:opacity-95"
      style={{ minHeight: CARD_MIN_HEIGHT }}
      accessibilityRole="button"
      accessibilityLabel={`${label}を選択`}
    >
      <View className="mr-3 rounded-lg bg-slate-50 p-2">
        <Icon size={20} color="#2563EB" />
      </View>
      <View className="flex-1 py-3">
        <Text className="text-xs text-gray-500">{label}</Text>
        <Text
          className={`mt-0.5 text-base ${value ? "text-gray-900" : "text-gray-400"}`}
          numberOfLines={1}
        >
          {value || "選択してください"}
        </Text>
      </View>
      <ChevronDown size={20} color="#94a3b8" />
    </Pressable>
  );
}
