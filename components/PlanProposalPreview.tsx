import { useMemo } from "react";
import { View, Text, ScrollView } from "react-native";
import { ArrowRight } from "lucide-react-native";
import type { Task, ReplanLog } from "@/context/TasksContext";

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function shortDate(key: string): string {
  const [y, m, d] = key.split("-").map((v) => parseInt(v, 10));
  const dt = new Date(y, m - 1, d);
  return `${m}/${d}(${DAY_LABELS[dt.getDay()]})`;
}

type Props = {
  logs: ReplanLog[];
  tasks: Task[];
  maxRows?: number;
};

export function PlanProposalPreview({ logs, tasks, maxRows = 12 }: Props) {
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  if (logs.length === 0) {
    return (
      <Text style={{ fontSize: 11, color: "#64748b" }}>変更はありません。</Text>
    );
  }

  const rows = logs.slice(0, maxRows);

  return (
    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
      {rows.map((log) => {
        const t = byId.get(log.taskId);
        const title = t?.title ?? log.taskId;
        const snippet = title.length > 14 ? `${title.slice(0, 14)}…` : title;
        const subj = t?.subject === "math" ? "数" : "英";
        const subjBg = t?.subject === "math" ? "#fff7ed" : "#eff6ff";
        const subjFg = t?.subject === "math" ? "#c2410c" : "#1d4ed8";

        return (
          <View
            key={log.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 8,
              paddingHorizontal: 8,
              marginBottom: 6,
              borderRadius: 10,
              backgroundColor: "#f8fafc",
              borderWidth: 1,
              borderColor: "#e2e8f0",
              columnGap: 6,
            }}
          >
            <View
              style={{
                minWidth: 22,
                height: 22,
                borderRadius: 6,
                backgroundColor: subjBg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: "800", color: subjFg }}>{subj}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#0f172a" }} numberOfLines={1}>
                {snippet}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, flexWrap: "wrap", gap: 4 }}>
                <Text style={{ fontSize: 10, color: "#64748b" }}>
                  {shortDate(log.fromDate)} {String(log.fromHour).padStart(2, "0")}:00
                </Text>
                <ArrowRight size={14} color="#94a3b8" />
                <Text style={{ fontSize: 10, color: "#2563eb", fontWeight: "700" }}>
                  {shortDate(log.toDate)} {String(log.toHour).padStart(2, "0")}:00
                </Text>
              </View>
            </View>
          </View>
        );
      })}
      {logs.length > maxRows && (
        <Text style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>ほか {logs.length - maxRows} 件</Text>
      )}
    </ScrollView>
  );
}
