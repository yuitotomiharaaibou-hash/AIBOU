import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { CalendarClock, ListTodo, Target } from "lucide-react-native";
import { PRIMARY, UI_BORDER, UI_RADIUS_LG, UI_SURFACE, UI_TEXT, UI_TEXT_SECONDARY } from "@/constants/theme";

export type RoutePlusMenuAction = "task" | "horizon" | "goal";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (action: RoutePlusMenuAction) => void;
};

const ROWS: { action: RoutePlusMenuAction; label: string; sub: string; Icon: typeof ListTodo }[] = [
  { action: "task", label: "予定・タスクを追加", sub: "クイック作成", Icon: ListTodo },
  { action: "horizon", label: "タスク読切を変更", sub: "模試目安の日付（ルートの終わり）", Icon: CalendarClock },
  { action: "goal", label: "この科目の模試目標点", sub: "点数の目安を設定", Icon: Target },
];

export function RoutePlusMenuModal({ visible, onClose, onSelect }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="閉じる" />
        <View style={styles.sheet}>
          <Text style={styles.title}>追加・設定</Text>
          {ROWS.map(({ action, label, sub, Icon }) => (
            <Pressable
              key={action}
              onPress={() => {
                onClose();
                onSelect(action);
              }}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.92 }]}
            >
              <View style={styles.iconCircle}>
                <Icon size={22} color={PRIMARY} strokeWidth={2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowLabel}>{label}</Text>
                <Text style={styles.rowSub}>{sub}</Text>
              </View>
            </Pressable>
          ))}
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>キャンセル</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.45)",
  },
  sheet: {
    backgroundColor: UI_SURFACE,
    borderTopLeftRadius: UI_RADIUS_LG,
    borderTopRightRadius: UI_RADIUS_LG,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: UI_TEXT,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    columnGap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI_BORDER,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${PRIMARY}14`,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: UI_TEXT,
  },
  rowSub: {
    marginTop: 3,
    fontSize: 12,
    color: UI_TEXT_SECONDARY,
    lineHeight: 16,
  },
  cancelBtn: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
  },
});
