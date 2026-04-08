import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { BACKGROUND } from "@/constants/theme";
import { X, Save } from "lucide-react-native";
import { useEffect, useState } from "react";
import { useRules } from "@/context/RulesContext";

export default function RulesScreen() {
  const router = useRouter();
  const { rules, setRules } = useRules();
  const [englishDraft, setEnglishDraft] = useState(rules.english);
  const [mathDraft, setMathDraft] = useState(rules.math);
  const [enabledDraft, setEnabledDraft] = useState(rules.enabled);

  // ルールが変わったときにドラフトを同期（画面再訪時など）
  useEffect(() => {
    setEnglishDraft(rules.english);
    setMathDraft(rules.math);
    setEnabledDraft(rules.enabled);
  }, [rules.english, rules.math, rules.enabled]);

  const handleSave = () => {
    setRules({
      english: englishDraft,
      math: mathDraft,
      enabled: enabledDraft,
    });
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: BACKGROUND }}
      edges={["top"]}
    >
      {/* 右上の閉じるボタン（元いた画面に戻る） */}
      <View
        style={{
          position: "absolute",
          top: 12,
          right: 16,
          zIndex: 20,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            backgroundColor: "#ffffff",
            borderWidth: 1,
            borderColor: "#e5e7eb",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowOffset: { width: 0, height: 1 },
            shadowRadius: 3,
            elevation: 2,
          }}
        >
          <X size={18} color="#64748b" />
        </Pressable>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: "#0f172a",
            marginBottom: 8,
          }}
        >
          目標点とタスクをつなぐルール
        </Text>
        {/* スコアとタスクの連動 ON/OFF トグル */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: "#4b5563",
            }}
          >
            スコアとタスクを連動させる
          </Text>
          <Pressable
            onPress={() => setEnabledDraft((prev) => !prev)}
            style={{
              width: 56,
              height: 28,
              borderRadius: 999,
              padding: 2,
              backgroundColor: enabledDraft ? "#22c55e" : "#e5e7eb",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 999,
                backgroundColor: "#ffffff",
                alignSelf: enabledDraft ? "flex-end" : "flex-start",
                shadowColor: "#000",
                shadowOpacity: 0.18,
                shadowOffset: { width: 0, height: 1 },
                shadowRadius: 2,
                elevation: 2,
              }}
            />
          </Pressable>
        </View>
        <Text
          style={{
            fontSize: 12,
            color: "#6b7280",
            marginBottom: 12,
            lineHeight: 18,
          }}
        >
          ここでは「スコア（模試の点数）」から「やるタスク」をどう逆算するかのルールを編集できます。
          保存ボタンを押したときだけ、編集内容が反映されます。
        </Text>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              borderRadius: 16,
              backgroundColor: "#ffffff",
              padding: 12,
              borderWidth: 1,
              borderColor: "#e5e7eb",
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#0f172a",
                marginBottom: 4,
              }}
            >
              英語のルール
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: "#64748b",
                marginBottom: 8,
              }}
            >
              例: 合計点が 60 点未満なら「単語タスク A/B を追加」、80 点以上なら「長文タスク C を追加」など。
            </Text>
            <TextInput
              multiline
              style={{
                minHeight: 80,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#e5e7eb",
                paddingHorizontal: 10,
                paddingVertical: 8,
                fontSize: 12,
                textAlignVertical: "top",
              }}
              value={englishDraft}
              onChangeText={setEnglishDraft}
            />
          </View>

          <View
            style={{
              borderRadius: 16,
              backgroundColor: "#ffffff",
              padding: 12,
              borderWidth: 1,
              borderColor: "#e5e7eb",
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#0f172a",
                marginBottom: 4,
              }}
            >
              数学のルール
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: "#64748b",
                marginBottom: 8,
              }}
            >
              例: 第1問の得点が低ければ「基礎問題のタスクE」、第3問が低ければ「応用問題タスクF」など。
            </Text>
            <TextInput
              multiline
              style={{
                minHeight: 80,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#e5e7eb",
                paddingHorizontal: 10,
                paddingVertical: 8,
                fontSize: 12,
                textAlignVertical: "top",
              }}
              value={mathDraft}
              onChangeText={setMathDraft}
            />
          </View>
        </ScrollView>
      </View>

      {/* 右下フローティング: ルールの保存ボタン */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          bottom: 24,
          right: 16,
          alignItems: "flex-end",
        }}
      >
        <Pressable
          pointerEvents="auto"
          onPress={handleSave}
          style={{
            width: 52,
            height: 52,
            borderRadius: 999,
            backgroundColor: "#2563eb",
            borderWidth: 1,
            borderColor: "#1d4ed8",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOpacity: 0.16,
            shadowOffset: { width: 0, height: 3 },
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          <Save size={22} color="#ffffff" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

