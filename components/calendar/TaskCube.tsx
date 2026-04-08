import { View, Text, Pressable } from "react-native";
import { PRIMARY, CUBE_LOCKED_BG, CUBE_LOCKED_TEXT } from "@/constants/theme";

type TaskCubeProps = {
  label: string;
  isLocked?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
};

/**
 * 右列インボックス用タスク・キューブ。
 * タップ → 完了（固定）で色変化・ロック表現。
 * 長押し → 時間枠へ移動（スケルトンではフィードバックのみ想定）。
 */
export function TaskCube({
  label,
  isLocked = false,
  onPress,
  onLongPress,
}: TaskCubeProps) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      className="mb-2 rounded-xl border px-3 py-2.5 active:opacity-90"
      style={{
        backgroundColor: isLocked ? CUBE_LOCKED_BG : "#FFFFFF",
        borderColor: isLocked ? CUBE_LOCKED_BG : "#E2E8F0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isLocked }}
    >
      <Text
        className="text-sm font-medium"
        style={{ color: isLocked ? CUBE_LOCKED_TEXT : "#334155" }}
        numberOfLines={2}
      >
        {label}
      </Text>
      {isLocked && (
        <Text
          className="mt-1 text-[10px]"
          style={{ color: "rgba(255,255,255,0.9)" }}
        >
          完了
        </Text>
      )}
    </Pressable>
  );
}
