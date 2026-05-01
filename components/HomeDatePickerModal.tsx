import { useEffect, useState } from "react";
import { Modal, View, Text, Pressable, TextInput, StyleSheet } from "react-native";
import { getTodayKey } from "@/context/TasksContext";

export type HomeDatePickerModalProps = {
  visible: boolean;
  onClose: () => void;
  selectedKey: string;
  onConfirm: (dateKey: string) => void;
};

function isValidYmd(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.trim())) return false;
  const [y, m, d] = s.split("-").map((v) => parseInt(v, 10));
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function HomeDatePickerModal({
  visible,
  onClose,
  selectedKey,
  onConfirm,
}: HomeDatePickerModalProps) {
  const [draft, setDraft] = useState(selectedKey);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setDraft(selectedKey);
    setError(null);
  }, [visible, selectedKey]);

  const apply = () => {
    const key = draft.trim();
    if (!isValidYmd(key)) {
      setError("YYYY-MM-DD の形式で入力してください");
      return;
    }
    onConfirm(key);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "center", padding: 20, backgroundColor: "rgba(15,23,42,0.45)" }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="閉じる" />
        <View
          style={{
            alignSelf: "center",
            width: "100%",
            maxWidth: 360,
            borderRadius: 14,
            backgroundColor: "#ffffff",
            padding: 16,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#0f172a" }}>日付を選ぶ</Text>
          <Text style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>YYYY-MM-DD</Text>
          <TextInput
            value={draft}
            onChangeText={(t) => {
              setDraft(t);
              setError(null);
            }}
            placeholder="2026-04-04"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              marginTop: 10,
              borderWidth: 1,
              borderColor: "#e2e8f0",
              borderRadius: 10,
              padding: 12,
              fontSize: 16,
              fontWeight: "600",
              color: "#0f172a",
            }}
          />
          {error ? <Text style={{ marginTop: 8, fontSize: 12, color: "#b91c1c" }}>{error}</Text> : null}
          <View style={{ marginTop: 14, flexDirection: "row", justifyContent: "flex-end", columnGap: 10 }}>
            <Pressable
              onPress={() => {
                setDraft(getTodayKey());
                setError(null);
              }}
              style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#f1f5f9" }}
            >
              <Text style={{ fontWeight: "700", color: "#475569" }}>今日</Text>
            </Pressable>
            <Pressable onPress={onClose} style={{ paddingVertical: 10, paddingHorizontal: 12 }}>
              <Text style={{ fontWeight: "600", color: "#64748b" }}>キャンセル</Text>
            </Pressable>
            <Pressable onPress={apply} style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: "#2563eb" }}>
              <Text style={{ fontWeight: "800", color: "#ffffff" }}>表示</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
