import { View } from "react-native";

/**
 * スタート画面用マスコット（うさぎ風キャラクター）
 * 仕様書: 2段の円 + 耳のループ + 目・口
 */
export function StartMascot() {
  return (
    <View className="items-center justify-center py-6">
      {/* 耳 */}
      <View className="mb-1 flex-row gap-6">
        <View className="h-5 w-4 rounded-full border-2 border-amber-800 bg-amber-100" />
        <View className="h-5 w-4 rounded-full border-2 border-amber-800 bg-amber-100" />
      </View>
      {/* 頭 */}
      <View className="relative mb-0.5">
        <View className="h-14 w-16 rounded-full border-2 border-amber-800 bg-amber-50">
          {/* 目 */}
          <View className="absolute left-3 top-4 h-2 w-2 rounded-full bg-amber-900" />
          <View className="absolute right-3 top-4 h-2 w-2 rounded-full bg-amber-900" />
          {/* 口 */}
          <View className="absolute bottom-4 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-amber-800" />
        </View>
      </View>
      {/* 体（下の円） */}
      <View className="h-12 w-20 rounded-full border-2 border-amber-800 bg-amber-50" />
    </View>
  );
}
