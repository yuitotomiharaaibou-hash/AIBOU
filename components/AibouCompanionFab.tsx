import { Pressable, Text, View, StyleSheet } from "react-native";
import { AibouMascot } from "@/components/AibouMascot";

type Props = {
  onPress: () => void;
  bottom: number;
  /** 未回答の確認質問など */
  badgeCount?: number;
  accessibilityLabel?: string;
};

const SIZE = 64;
const MASCOT = Math.round(SIZE * 0.62);

/**
 * ホーム等・タブ寄りに置く相棒（修正フロー開始）ボタン。＋はこの上に配置。AibouMascot を使用。
 */
export function AibouCompanionFab({
  onPress,
  bottom,
  badgeCount = 0,
  accessibilityLabel = "相棒と計画を見直す",
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      style={[styles.wrap, { bottom }]}
    >
      <View style={styles.fill}>
        <View style={styles.inner}>
          <AibouMascot size={MASCOT} tone="onBrand" />
        </View>
      </View>
      {badgeCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeCount > 9 ? "9+" : badgeCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: 18,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: "hidden",
    zIndex: 70,
    shadowColor: "#1e40af",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.9)",
  },
  fill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
  },
  inner: {
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#dc2626",
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  badgeText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "800",
  },
});
