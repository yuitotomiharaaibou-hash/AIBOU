import { View, Text, Pressable } from "react-native";
import { CUBE_LOCKED_BG, CUBE_LOCKED_TEXT } from "@/constants/theme";

const CUBE_SIZE = 72;

type HomeTaskCubeProps = {
  id: string;
  label: string;
  isLocked?: boolean;
  isSelected?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
};

/**
 * 正方形のタスク・キューブ。長押しで選択（時間枠へ移動モード）、タップで完了ロック。
 */
export function HomeTaskCube({
  label,
  isLocked = false,
  isSelected = false,
  onPress,
  onLongPress,
}: HomeTaskCubeProps) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      className="mb-2 items-center justify-center rounded-lg border active:opacity-90"
      style={{
        width: CUBE_SIZE,
        height: CUBE_SIZE,
        backgroundColor: isLocked ? CUBE_LOCKED_BG : "#FFFFFF",
        borderColor: isSelected ? "#2563EB" : isLocked ? CUBE_LOCKED_BG : "#E2E8F0",
        borderWidth: isSelected ? 3 : 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
        elevation: 2,
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isSelected || isLocked }}
    >
      <Text
        className="text-center text-xs font-medium px-1"
        style={{ color: isLocked ? CUBE_LOCKED_TEXT : "#334155" }}
        numberOfLines={2}
      >
        {label}
      </Text>
      {isLocked && (
        <Text
          className="mt-0.5 text-[9px]"
          style={{ color: "rgba(255,255,255,0.9)" }}
        >
          完了
        </Text>
      )}
      {isSelected && !isLocked && (
        <Text className="mt-0.5 text-[9px] text-primary" style={{ color: "#2563EB" }}>
          枠をタップで配置
        </Text>
      )}
    </Pressable>
  );
}
