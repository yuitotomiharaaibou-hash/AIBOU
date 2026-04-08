import { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { CheckCircle2, Circle, ChevronDown, ChevronRight } from "lucide-react-native";
import { Task, useTasks } from "@/context/TasksContext";
import { HOMEWORK_TYPE_LABELS } from "@/lib/koko2LeafTasks";
import { filterTwoDigitLeafTasks, filterEnglishHomeworkWeek } from "@/lib/taskIdMatch";

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
          backgroundColor: "#2563eb",
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

function HomeworkWeekBlock({
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
    () => filterEnglishHomeworkWeek(tasks, weekNum),
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
            {HOMEWORK_TYPE_LABELS.join("・")}
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

type Koko2EnglishTaskListProps = {
  /** false のとき中身だけ（親の ScrollView 用） */
  scrollable?: boolean;
};

export function Koko2EnglishTaskList({ scrollable = true }: Koko2EnglishTaskListProps) {
  const { tasks, toggleTask } = useTasks();
  const englishTasks = useMemo(
    () => tasks.filter((t) => t.subject === "english"),
    [tasks]
  );

  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setOpen((p) => ({ ...p, [key]: !p[key] }));

  const body = (
    <>
      <Text style={{ fontSize: 12, fontWeight: "600", color: "#475569", marginBottom: 8 }}>
        鉄壁
      </Text>
      {[1, 2, 3].map((r) => (
        <CollapsibleRound
          key={`tp-r${r}`}
          label={`鉄壁 ${r}周目（§1–§50）`}
          idPrefix={`TP-R${r}-S`}
          tasks={englishTasks}
          expanded={!!open[`TP-R${r}`]}
          onToggleExpand={() => toggle(`TP-R${r}`)}
          toggleTask={toggleTask}
        />
      ))}

      <Text style={{ fontSize: 12, fontWeight: "600", color: "#475569", marginTop: 16, marginBottom: 8 }}>
        英文解釈（例文和訳）
      </Text>
      {[1, 2, 3].map((r) => (
        <CollapsibleRound
          key={`ek-r${r}`}
          label={`英文解釈 ${r}周目（§1–§43）`}
          idPrefix={`EK-R${r}-S`}
          tasks={englishTasks}
          expanded={!!open[`EK-R${r}`]}
          onToggleExpand={() => toggle(`EK-R${r}`)}
          toggleTask={toggleTask}
        />
      ))}

      <Text style={{ fontSize: 12, fontWeight: "600", color: "#475569", marginTop: 16, marginBottom: 8 }}>
        テーマ英作文
      </Text>
      {[1, 2, 3].map((r) => (
        <CollapsibleRound
          key={`ta-r${r}`}
          label={`テーマ英作文 ${r}周目（No.1–No.20）`}
          idPrefix={`TA-R${r}-N`}
          tasks={englishTasks}
          expanded={!!open[`TA-R${r}`]}
          onToggleExpand={() => toggle(`TA-R${r}`)}
          toggleTask={toggleTask}
        />
      ))}

      <Text style={{ fontSize: 12, fontWeight: "600", color: "#475569", marginTop: 16, marginBottom: 8 }}>
        英文法（前期）
      </Text>
      {[1, 2, 3].map((r) => (
        <CollapsibleRound
          key={`gb-r${r}`}
          label={`英文法 ${r}周目（第1–22週）`}
          idPrefix={`GB-R${r}-W`}
          tasks={englishTasks}
          expanded={!!open[`GB-R${r}`]}
          onToggleExpand={() => toggle(`GB-R${r}`)}
          toggleTask={toggleTask}
        />
      ))}

      <Text style={{ fontSize: 12, fontWeight: "600", color: "#475569", marginTop: 16, marginBottom: 8 }}>
        毎週の宿題（前期・週ごと）
      </Text>
      {Array.from({ length: 22 }, (_, i) => i + 1).map((w) => (
        <HomeworkWeekBlock
          key={`hw-${w}`}
          weekNum={w}
          tasks={englishTasks}
          expanded={!!open[`HW-${w}`]}
          onToggleExpand={() => toggle(`HW-${w}`)}
          toggleTask={toggleTask}
        />
      ))}

      <Text style={{ fontSize: 11, color: "#94a3b8", marginTop: 16, lineHeight: 16 }}>
        完了状態はホーム・カレンダーと共通です。リーフをタップで切り替えられます。
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
