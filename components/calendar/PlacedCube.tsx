import { View, Text } from "react-native";
import { PRIMARY, CUBE_LOCKED_BG, CUBE_LOCKED_TEXT } from "@/constants/theme";

type PlacedCubeProps = {
  label: string;
  isLocked?: boolean;
};

/**
 * タイムラインの枠内に配置されたタスク・キューブ（左列で横並び表示用）
 */
export function PlacedCube({ label, isLocked = false }: PlacedCubeProps) {
  return (
    <View
      className="rounded-lg border px-2 py-1.5"
      style={{
        backgroundColor: isLocked ? CUBE_LOCKED_BG : "#FFFFFF",
        borderColor: isLocked ? CUBE_LOCKED_BG : "#E2E8F0",
        maxWidth: 120,
      }}
    >
      <Text
        className="text-xs font-medium"
        style={{ color: isLocked ? CUBE_LOCKED_TEXT : "#334155" }}
        numberOfLines={2}
      >
        {label}
      </Text>
    </View>
  );
}
