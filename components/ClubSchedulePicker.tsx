import { useMemo } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import {
  PRIMARY,
  PRIMARY_LIGHT,
  UI_BORDER,
  UI_RADIUS_MD,
  UI_RADIUS_XL,
  UI_SCREEN,
  UI_TEXT,
  UI_TEXT_SECONDARY,
  uiCardShadow,
} from "@/constants/theme";
import {
  EMPTY_RESOLVED,
  decodeClubScheduleResolved,
  encodeClubScheduleResolved,
  type ClubScheduleResolved,
} from "@/lib/clubScheduleProfile";

type Props = {
  value: string | undefined;
  school?: string;
  onChange: (encoded: string) => void;
  contentBottomPad?: number;
};

type Option =
  | { id: string; label: string; kind: "weekday"; day: 1 | 2 | 3 | 4 | 5; slot: "morning" | "evening" }
  | { id: string; label: string; kind: "weekend"; day: 6 | 0; slot: "am" | "pm" }
  | { id: string; label: string; kind: "mode"; mode: "irregular" | "none" };

const WEEKDAY_ROWS: Option[] = [
  { id: "mon", label: "月曜", kind: "weekday", day: 1, slot: "morning" },
  { id: "mon-pm", label: "月曜", kind: "weekday", day: 1, slot: "evening" },
  { id: "tue", label: "火曜", kind: "weekday", day: 2, slot: "morning" },
  { id: "tue-pm", label: "火曜", kind: "weekday", day: 2, slot: "evening" },
  { id: "wed", label: "水曜", kind: "weekday", day: 3, slot: "morning" },
  { id: "wed-pm", label: "水曜", kind: "weekday", day: 3, slot: "evening" },
  { id: "thu", label: "木曜", kind: "weekday", day: 4, slot: "morning" },
  { id: "thu-pm", label: "木曜", kind: "weekday", day: 4, slot: "evening" },
  { id: "fri", label: "金曜", kind: "weekday", day: 5, slot: "morning" },
  { id: "fri-pm", label: "金曜", kind: "weekday", day: 5, slot: "evening" },
];

const WEEKEND_OPTIONS: Option[] = [
  { id: "sat-am", label: "土曜 午前", kind: "weekend", day: 6, slot: "am" },
  { id: "sat-pm", label: "土曜 午後", kind: "weekend", day: 6, slot: "pm" },
  { id: "sun-am", label: "日曜 午前", kind: "weekend", day: 0, slot: "am" },
  { id: "sun-pm", label: "日曜 午後", kind: "weekend", day: 0, slot: "pm" },
];

const MODE_OPTIONS: Option[] = [
  { id: "irregular", label: "不定期", kind: "mode", mode: "irregular" },
  { id: "none", label: "活動なし", kind: "mode", mode: "none" },
];

function parseResolved(value: string | undefined): ClubScheduleResolved {
  const decoded = decodeClubScheduleResolved(value?.trim() || undefined);
  if (!decoded) return { ...EMPTY_RESOLVED, mode: "unset" };
  return decoded;
}

function toStandardBase(spec: ClubScheduleResolved): ClubScheduleResolved {
  return {
    ...spec,
    mode: "standard",
    times: { ...spec.times },
    morningWeekdays: [...spec.morningWeekdays],
    eveningWeekdays: [...spec.eveningWeekdays],
    otherWeekdays: [...spec.otherWeekdays],
    timeFirstCommitDone: { ...spec.timeFirstCommitDone },
    timeOverrides: { ...spec.timeOverrides },
  };
}

export function ClubSchedulePicker({ value, school: _school, onChange, contentBottomPad = 24 }: Props) {
  const spec = useMemo(() => parseResolved(value), [value]);

  const commit = (next: ClubScheduleResolved) => onChange(encodeClubScheduleResolved(next));

  const isOn = (opt: Option): boolean => {
    if (opt.kind === "mode") return spec.mode === opt.mode;
    if (spec.mode !== "standard") return false;
    if (opt.kind === "weekday") {
      return opt.slot === "morning"
        ? spec.morningWeekdays.includes(opt.day)
        : spec.eveningWeekdays.includes(opt.day);
    }
    return opt.slot === "am"
      ? (opt.day === 6 ? spec.satAm : spec.sunAm)
      : (opt.day === 6 ? spec.satPm : spec.sunPm);
  };

  const toggle = (opt: Option) => {
    if (opt.kind === "mode") {
      if (spec.mode === opt.mode) {
        commit(toStandardBase(spec));
      } else {
        commit({ ...toStandardBase(spec), mode: opt.mode });
      }
      return;
    }
    const next = toStandardBase(spec);
    if (opt.kind === "weekday") {
      const list = opt.slot === "morning" ? next.morningWeekdays : next.eveningWeekdays;
      const has = list.includes(opt.day);
      const updated = has ? list.filter((d) => d !== opt.day) : [...list, opt.day].sort((a, b) => a - b);
      if (opt.slot === "morning") next.morningWeekdays = updated;
      else next.eveningWeekdays = updated;
      commit(next);
      return;
    }
    if (opt.day === 6) {
      if (opt.slot === "am") next.satAm = !next.satAm;
      else next.satPm = !next.satPm;
    } else {
      if (opt.slot === "am") next.sunAm = !next.sunAm;
      else next.sunPm = !next.sunPm;
    }
    commit(next);
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: contentBottomPad + 8 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.hint}>
        複数選択できます。時間の詳細は次の「1週間の予定確認」で編集します。
      </Text>

      <View style={styles.qCard}>
        <View style={styles.grid2}>
          {[...WEEKDAY_ROWS, ...WEEKEND_OPTIONS, ...MODE_OPTIONS].map((opt) => (
            <Pressable
              key={opt.id}
              onPress={() => toggle(opt)}
              style={[styles.qOption, styles.gridItem, isOn(opt) && styles.qOptionSelected]}
            >
              <Text style={[styles.qOptionText, isOn(opt) && styles.qOptionTextSelected]}>
                {opt.kind === "weekday"
                  ? `${opt.label} ${opt.slot === "morning" ? "朝" : "放課後"}`
                  : opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: 14,
    lineHeight: 22,
    color: UI_TEXT_SECONDARY,
    marginBottom: 14,
  },
  qCard: {
    borderRadius: UI_RADIUS_XL,
    backgroundColor: UI_SCREEN,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: UI_BORDER,
    ...uiCardShadow,
  },
  grid2: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridItem: {
    width: "48.5%",
  },
  qOption: {
    borderRadius: UI_RADIUS_MD,
    borderWidth: 1,
    borderColor: UI_BORDER,
    backgroundColor: UI_SCREEN,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  qOptionSelected: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY_LIGHT,
  },
  qOptionText: {
    fontSize: 14,
    color: UI_TEXT,
    textAlign: "center",
    fontWeight: "600",
  },
  qOptionTextSelected: {
    color: PRIMARY,
    fontWeight: "700",
  },
});

