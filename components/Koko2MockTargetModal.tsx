import { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import {
  PRIMARY,
  UI_BORDER,
  UI_RADIUS_LG,
  UI_SCREEN,
  UI_SURFACE,
  UI_TEXT,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY,
} from "@/constants/theme";
type Props = {
  visible: boolean;
  onClose: () => void;
  subjectLabel: string;
  currentTarget: number;
  currentScore: number;
  onSave: (target: number) => void;
};

export function Koko2MockTargetModal({
  visible,
  onClose,
  subjectLabel,
  currentTarget,
  currentScore,
  onSave,
}: Props) {
  const [raw, setRaw] = useState(String(currentTarget));

  useEffect(() => {
    if (!visible) return;
    setRaw(String(currentTarget));
  }, [visible, currentTarget]);

  const apply = () => {
    const n = Math.min(120, Math.max(0, parseInt(raw.replace(/\D/g, "") || "0", 10)));
    if (Number.isNaN(n)) {
      Alert.alert("入力を確認", "0〜120 の数字で入力してください。");
      return;
    }
    onSave(n);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.centerWrap}>
          <Pressable style={styles.backdrop} onPress={onClose} />
          <View style={styles.card}>
            <Text style={styles.head}>{subjectLabel}の模試目標点</Text>
            <Text style={styles.hint}>
              ルート画面の「あと約◯点」に使います。登録点（現在 {currentScore} 点）とは別に、目安のゴール点を置けます。
            </Text>
            <Text style={styles.kicker}>目標点（0–120）</Text>
            <TextInput
              value={raw}
              onChangeText={setRaw}
              keyboardType="numeric"
              placeholder="60"
              placeholderTextColor={UI_TEXT_TERTIARY}
              style={styles.input}
            />
            <View style={styles.actions}>
              <Pressable onPress={apply} style={styles.primaryBtn}>
                <Text style={styles.primaryText}>保存</Text>
              </Pressable>
              <Pressable onPress={onClose} style={styles.ghostBtn}>
                <Text style={styles.ghostText}>キャンセル</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centerWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.45)",
  },
  card: {
    backgroundColor: UI_SURFACE,
    borderRadius: UI_RADIUS_LG,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER,
  },
  head: {
    fontSize: 17,
    fontWeight: "800",
    color: UI_TEXT,
  },
  hint: {
    marginTop: 8,
    fontSize: 13,
    color: UI_TEXT_SECONDARY,
    lineHeight: 19,
  },
  kicker: {
    marginTop: 14,
    fontSize: 11,
    fontWeight: "700",
    color: UI_TEXT_TERTIARY,
  },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: UI_BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 22,
    fontWeight: "800",
    color: UI_TEXT,
    backgroundColor: UI_SCREEN,
  },
  actions: {
    marginTop: 18,
    rowGap: 10,
  },
  primaryBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  ghostBtn: {
    paddingVertical: 10,
    alignItems: "center",
  },
  ghostText: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
  },
});
