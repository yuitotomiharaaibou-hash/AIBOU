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
import { formatShortDate, isValidDateKey } from "@/lib/mainKoko2RouteSeries";

type Props = {
  visible: boolean;
  onClose: () => void;
  todayKey: string;
  effectiveEndKey: string;
  defaultEndKey: string;
  storedOverride: string | null;
  onSave: (dateKey: string | null) => void;
};

export function Koko2RouteHorizonModal({
  visible,
  onClose,
  todayKey,
  effectiveEndKey,
  defaultEndKey,
  storedOverride,
  onSave,
}: Props) {
  const [value, setValue] = useState(effectiveEndKey);

  useEffect(() => {
    if (!visible) return;
    setValue(storedOverride ?? effectiveEndKey);
  }, [visible, effectiveEndKey, storedOverride]);

  const apply = () => {
    const t = value.trim();
    if (!isValidDateKey(t)) {
      Alert.alert("日付を確認", "YYYY-MM-DD 形式で入力してください（例: 2026-08-15）。");
      return;
    }
    if (t.localeCompare(todayKey) < 0) {
      Alert.alert("日付を確認", "今日より前の日付は使えません。");
      return;
    }
    onSave(t);
    onClose();
  };

  const resetDefault = () => {
    onSave(null);
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
            <Text style={styles.head}>タスク読切（模試目安）</Text>
            <Text style={styles.hint}>
              今日は {formatShortDate(todayKey)}。ルートの終わり＝タスクリストで詰める区間の読切です。
            </Text>
            <Text style={styles.kicker}>YYYY-MM-DD</Text>
            <TextInput
              value={value}
              onChangeText={setValue}
              placeholder={defaultEndKey}
              placeholderTextColor={UI_TEXT_TERTIARY}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
              style={styles.input}
            />
            <Text style={styles.muted}>自動目安: {formatShortDate(defaultEndKey)}</Text>
            <View style={styles.actions}>
              <Pressable onPress={apply} style={styles.primaryBtn}>
                <Text style={styles.primaryText}>保存</Text>
              </Pressable>
              <Pressable onPress={resetDefault} style={styles.secondaryBtn}>
                <Text style={styles.secondaryText}>自動目安に戻す</Text>
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
    fontSize: 16,
    fontWeight: "700",
    color: UI_TEXT,
    backgroundColor: UI_SCREEN,
  },
  muted: {
    marginTop: 8,
    fontSize: 12,
    color: UI_TEXT_TERTIARY,
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
  secondaryBtn: {
    backgroundColor: `${PRIMARY}18`,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: "700",
    color: PRIMARY,
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
