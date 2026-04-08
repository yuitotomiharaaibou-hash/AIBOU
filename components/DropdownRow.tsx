import { View, Text, Pressable } from "react-native";
import { ChevronDown } from "lucide-react-native";

type DropdownRowProps = {
  label: string;
  value?: string;
  placeholder?: string;
  onPress?: () => void;
};

/**
 * プルダウンで選択できる行（仕様書: 左ラベル + 右に楕円形フィールドと▽）
 */
export function DropdownRow({
  label,
  value,
  placeholder = "選択",
  onPress,
}: DropdownRowProps) {
  const displayText = value || placeholder;
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row items-center justify-between"
      accessibilityRole="button"
      accessibilityLabel={`${label}を選択`}
    >
      <Text className="text-base text-gray-800">{label}</Text>
      <View className="flex-row items-center rounded-full border border-gray-300 bg-white px-4 py-2.5 min-w-[140px]">
        <Text
          className={`flex-1 text-sm ${value ? "text-gray-900" : "text-gray-500"}`}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        <View className="ml-1">
          <ChevronDown size={18} color="#64748b" />
        </View>
      </View>
    </Pressable>
  );
}
