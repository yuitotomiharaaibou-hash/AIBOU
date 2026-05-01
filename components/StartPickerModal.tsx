import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from "react-native";

const DUMMY_OPTIONS = ["選択肢1", "選択肢2", "選択肢3"];

type StartPickerModalProps = {
  visible: boolean;
  title: string;
  options?: string[];
  onSelect: (value: string) => void;
  onClose: () => void;
  /** 長いリスト（課外活動など）用。未指定時は従来どおり */
  listMaxHeight?: number;
};

export function StartPickerModal({
  visible,
  title,
  options = DUMMY_OPTIONS,
  onSelect,
  onClose,
  listMaxHeight,
}: StartPickerModalProps) {
  const scrollMax = listMaxHeight ?? 260;
  const cardMax = listMaxHeight ? Math.min(listMaxHeight + 80, 560) : 320;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFillObject, styles.backdrop]}
          onPress={onClose}
          accessibilityLabel="閉じる"
        />
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFillObject, styles.centerWrap]}>
          <View style={[styles.card, { maxHeight: cardMax }]}>
            <Text style={styles.cardTitle}>{title}</Text>
            <ScrollView
              style={[styles.scroll, { maxHeight: scrollMax }]}
              contentContainerStyle={{ paddingBottom: 4 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              {options.length === 0 ? (
                <Text style={styles.empty}>選択肢がありません</Text>
              ) : (
                options.map((option, index) => (
                  <Pressable
                    key={`${option}-${index}`}
                    onPress={() => {
                      onSelect(option);
                      onClose();
                    }}
                    style={styles.option}
                  >
                    <Text style={styles.optionText}>{option}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  centerWrap: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 8,
  },
  cardTitle: {
    marginBottom: 10,
    fontSize: 15,
    fontWeight: "700",
    color: "#222222",
    textAlign: "center",
  },
  scroll: {},
  empty: {
    textAlign: "center",
    fontSize: 14,
    color: "#717171",
    paddingVertical: 16,
  },
  option: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "#ffffff",
  },
  optionText: {
    fontSize: 15,
    color: "#222222",
    textAlign: "center",
  },
});
