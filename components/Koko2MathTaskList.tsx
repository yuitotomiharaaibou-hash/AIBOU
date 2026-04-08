import { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { CheckCircle2, Circle, ChevronDown, ChevronRight } from "lucide-react-native";
import { Task, useTasks } from "@/context/TasksContext";
import { MATH_HOMEWORK_TYPE_LABELS } from "@/lib/koko2LeafTasks";
import { filterTwoDigitLeafTasks, filterMathHomeworkWeek } from "@/lib/taskIdMatch";

function progress(tasks: Task[]) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  return { done, total };
}

function ProgressBar({ ratio }: { ratio: number }) {
  const pct = Math.round(ratio * 100);
  return (
    <View style={{ marginTop: 6, height: 6, borderRadius: 999, backgroundColor: "#e5e7eb", overflow: "hidden" }}>
      <View
        style={{
          height: "100%",
          width: `${pct}%`,
          borderRadius: 999,
          backgroundColor: "#d97706",
        }}
      />
    </View>
  );
}

function LeafRow({ task, onToggle }: { task: Task; onToggle: () => void }) {
  return (
    <Pressable
      onPress={onToggle}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderColor: "#f1f5f9",
      }}
    >
      {task.completed ? (
        <CheckCircle2 size={16} color="#10b981" />
      ) : (
        <Circle size={16} color="#94a3b8" />
      )}
      <Text
        style={{
          marginLeft: 8,
          flex: 1,
          fontSize: 11,
          color: task.completed ? "#9ca3af" : "#334155",
        }}
        numberOfLines={2}
      >
        {task.title}
      </Text>
    </Pressable>
  );
}

function CollapsibleRound({
  label,
  idPrefix,
  tasks,
  expanded,
  onToggleExpand,
  toggleTask,
}: {
  label: string;
  idPrefix: string;
  tasks: Task[];
  expanded: boolean;
  onToggleExpand: () => void;
  toggleTask: (id: string) => void;
}) {
  const subset = useMemo(
    () => filterTwoDigitLeafTasks(tasks, idPrefix),
    [tasks, idPrefix]
  );
  const { done, total } = progress(subset);
  const ratio = total > 0 ? done / total : 0;

  return (
    <View style={{ marginBottom: 8 }}>
      <Pressable
        onPress={onToggleExpand}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 10,
          paddingHorizontal: 10,
          borderRadius: 12,
          backgroundColor: "#ffffff",
          borderWidth: 1,
          borderColor: "#e5e7eb",
        }}
      >
        {expanded ? (
          <ChevronDown size={18} color="#64748b" />
        ) : (
          <ChevronRight size={18} color="#64748b" />
        )}
        <View style={{ marginLeft: 6, flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#0f172a" }}>{label}</Text>
          <Text style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            {done}/{total} 完了
          </Text>
          <ProgressBar ratio={ratio} />
        </View>
      </Pressable>
      {expanded && (
        <View
          style={{
            marginTop: 4,
            marginLeft: 8,
            borderLeftWidth: 2,
            borderColor: "#e2e8f0",
          }}
        >
          {subset.map((t) => (
            <LeafRow key={t.id} task={t} onToggle={() => toggleTask(t.id)} />
          ))}
        </View>
      )}
    </View>
  );
}

function MathHomeworkWeekBlock({
  weekNum,
  tasks,
  expanded,
  onToggleExpand,
  toggleTask,
}: {
  weekNum: number;
  tasks: Task[];
  expanded: boolean;
  onToggleExpand: () => void;
  toggleTask: (id: string) => void;
}) {
  const subset = useMemo(
    () => filterMathHomeworkWeek(tasks, weekNum),
    [tasks, weekNum]
  );
  const { done, total } = progress(subset);
  const ratio = total > 0 ? done / total : 0;

  return (
    <View style={{ marginBottom: 8 }}>
      <Pressable
        onPress={onToggleExpand}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 10,
          paddingHorizontal: 10,
          borderRadius: 12,
          backgroundColor: "#ffffff",
          borderWidth: 1,
          borderColor: "#e5e7eb",
        }}
      >
        {expanded ? <ChevronDown size={18} color="#64748b" /> : <ChevronRight size={18} color="#64748b" />}
        <View style={{ marginLeft: 6, flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#0f172a" }}>
            第{weekNum}週の宿題
          </Text>
          <Text style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
            {MATH_HOMEWORK_TYPE_LABELS.join("・")}
          </Text>
          <Text style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            {done}/{total} 完了
          </Text>
          <ProgressBar ratio={ratio} />
        </View>
      </Pressable>
      {expanded &&
        subset.map((t) => (
          <View key={t.id} style={{ marginLeft: 16 }}>
            <LeafRow task={t} onToggle={() => toggleTask(t.id)} />
          </View>
        ))}
    </View>
  );
}

type Koko2MathTaskListProps = {
  scrollable?: boolean;
};

export function Koko2MathTaskList({ scrollable = true }: Koko2MathTaskListProps) {
  const { tasks, toggleTask } = useTasks();
  const mathTasks = useMemo(
    () => tasks.filter((t) => t.subject === "math"),
    [tasks]
  );

  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setOpen((p) => ({ ...p, [key]: !p[key] }));

  const body = (
    <>
      <Text style={{ fontSize: 12, fontWeight: "600", color: "#475569", marginBottom: 8 }}>
        例題（第1〜22週・1セット＝3周）
      </Text>
      {[1, 2, 3].map((r) => (
        <CollapsibleRound
          key={`m-r${r}`}
          label={`数学 例題 ${r}周目（第1–22週）`}
          idPrefix={`M-R${r}-W`}
          tasks={mathTasks}
          expanded={!!open[`M-R${r}`]}
          onToggleExpand={() => toggle(`M-R${r}`)}
          toggleTask={toggleTask}
        />
      ))}

      <Text style={{ fontSize: 12, fontWeight: "600", color: "#475569", marginTop: 16, marginBottom: 8 }}>
        毎週の宿題（週ごと）
      </Text>
      {Array.from({ length: 22 }, (_, i) => i + 1).map((w) => (
        <MathHomeworkWeekBlock
          key={`mh-${w}`}
          weekNum={w}
          tasks={mathTasks}
          expanded={!!open[`MH-${w}`]}
          onToggleExpand={() => toggle(`MH-${w}`)}
          toggleTask={toggleTask}
        />
      ))}

      <Text style={{ fontSize: 11, color: "#94a3b8", marginTop: 16, lineHeight: 16 }}>
        完了はホーム・カレンダーと共通です。
      </Text>
    </>
  );

  if (scrollable) {
    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {body}
      </ScrollView>
    );
  }

  return <View>{body}</View>;
}
