import { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { ChevronDown, ChevronRight } from "lucide-react-native";
import { Task, useTasks } from "@/context/TasksContext";
import { HOMEWORK_TYPE_LABELS } from "@/lib/koko2LeafTasks";
import { filterTwoDigitLeafTasks, filterEnglishHomeworkWeek } from "@/lib/taskIdMatch";
import { Koko2LeafTaskRow } from "@/components/Koko2LeafTaskRow";
import { Koko2TaskDetailModal, type Koko2TaskDetailTarget } from "@/components/Koko2TaskDetailModal";

const LEAF_ACCENT = "#2563eb";

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

function CollapsibleRound({
  label,
  idPrefix,
  tasks,
  expanded,
  onToggleExpand,
  toggleTask,
  onOpenEdit,
  onOpenGroup,
}: {
  label: string;
  idPrefix: string;
  tasks: Task[];
  expanded: boolean;
  onToggleExpand: () => void;
  toggleTask: (id: string) => void;
  onOpenEdit: (task: Task) => void;
  onOpenGroup: (subset: Task[]) => void;
}) {
  const subset = useMemo(
    () => filterTwoDigitLeafTasks(tasks, idPrefix),
    [tasks, idPrefix]
  );
  const { done, total } = progress(subset);
  const ratio = total > 0 ? done / total : 0;

  return (
    <View style={{ marginBottom: 8 }}>
      <View
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
        <Pressable onPress={onToggleExpand} hitSlop={8} accessibilityLabel={expanded ? "折りたたむ" : "展開する"}>
          {expanded ? (
            <ChevronDown size={18} color="#64748b" />
          ) : (
            <ChevronRight size={18} color="#64748b" />
          )}
        </Pressable>
        <Pressable style={{ marginLeft: 6, flex: 1, minWidth: 0 }} onPress={() => onOpenGroup(subset)}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#0f172a" }}>{label}</Text>
          <Text style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            {done}/{total} 完了 · タップで一括編集
          </Text>
          <ProgressBar ratio={ratio} />
        </Pressable>
      </View>
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
            <Koko2LeafTaskRow
              key={t.id}
              task={t}
              accentColor={LEAF_ACCENT}
              onToggleComplete={() => toggleTask(t.id)}
              onPressBody={() => onOpenEdit(t)}
            />
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
  onOpenEdit,
  onOpenGroup,
}: {
  weekNum: number;
  tasks: Task[];
  expanded: boolean;
  onToggleExpand: () => void;
  toggleTask: (id: string) => void;
  onOpenEdit: (task: Task) => void;
  onOpenGroup: (subset: Task[]) => void;
}) {
  const subset = useMemo(
    () => filterEnglishHomeworkWeek(tasks, weekNum),
    [tasks, weekNum]
  );
  const { done, total } = progress(subset);
  const ratio = total > 0 ? done / total : 0;

  return (
    <View style={{ marginBottom: 8 }}>
      <View
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
        <Pressable onPress={onToggleExpand} hitSlop={8} accessibilityLabel={expanded ? "折りたたむ" : "展開する"}>
          {expanded ? <ChevronDown size={18} color="#64748b" /> : <ChevronRight size={18} color="#64748b" />}
        </Pressable>
        <Pressable style={{ marginLeft: 6, flex: 1, minWidth: 0 }} onPress={() => onOpenGroup(subset)}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#0f172a" }}>
            第{weekNum}週の宿題
          </Text>
          <Text style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
            {HOMEWORK_TYPE_LABELS.join("・")}
          </Text>
          <Text style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            {done}/{total} 完了 · タップで一括編集
          </Text>
          <ProgressBar ratio={ratio} />
        </Pressable>
      </View>
      {expanded &&
        subset.map((t) => (
          <View key={t.id} style={{ marginLeft: 16 }}>
            <Koko2LeafTaskRow
              task={t}
              accentColor={LEAF_ACCENT}
              onToggleComplete={() => toggleTask(t.id)}
              onPressBody={() => onOpenEdit(t)}
            />
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
  const { tasks, toggleTask, updateTask } = useTasks();
  const englishTasks = useMemo(
    () => tasks.filter((t) => t.subject === "english"),
    [tasks]
  );

  const tpMajor = useMemo(
    () => englishTasks.filter((t) => /^TP-R[123]-S\d{2}$/.test(t.id)),
    [englishTasks]
  );
  const ekMajor = useMemo(
    () => englishTasks.filter((t) => /^EK-R[123]-S\d{2}$/.test(t.id)),
    [englishTasks]
  );
  const taMajor = useMemo(
    () => englishTasks.filter((t) => /^TA-R[123]-N\d{2}$/.test(t.id)),
    [englishTasks]
  );
  const gbMajor = useMemo(
    () => englishTasks.filter((t) => /^GB-R[123]-W\d{2}$/.test(t.id)),
    [englishTasks]
  );
  const hwMajor = useMemo(
    () => englishTasks.filter((t) => /^HW-W\d{2}-K[1-5]$/.test(t.id)),
    [englishTasks]
  );

  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [detailTarget, setDetailTarget] = useState<Koko2TaskDetailTarget | null>(null);
  const toggle = (key: string) => setOpen((p) => ({ ...p, [key]: !p[key] }));

  const body = (
    <>
      <Pressable onPress={() => setDetailTarget({ kind: "group", tasks: tpMajor, label: "鉄壁（全体）" })}>
        <Text style={{ fontSize: 12, fontWeight: "600", color: "#475569", marginBottom: 8 }}>
          鉄壁 · タップで大項目一括編集
        </Text>
      </Pressable>
      {[1, 2, 3].map((r) => (
        <CollapsibleRound
          key={`tp-r${r}`}
          label={`鉄壁 ${r}周目（§1–§50）`}
          idPrefix={`TP-R${r}-S`}
          tasks={englishTasks}
          expanded={!!open[`TP-R${r}`]}
          onToggleExpand={() => toggle(`TP-R${r}`)}
          toggleTask={toggleTask}
          onOpenEdit={(t) => setDetailTarget({ kind: "single", task: t })}
          onOpenGroup={(subset) =>
            setDetailTarget({ kind: "group", tasks: subset, label: `鉄壁 ${r}周目` })
          }
        />
      ))}

      <Pressable onPress={() => setDetailTarget({ kind: "group", tasks: ekMajor, label: "英文解釈（全体）" })}>
        <Text style={{ fontSize: 12, fontWeight: "600", color: "#475569", marginTop: 16, marginBottom: 8 }}>
          英文解釈（例文和訳）· タップで大項目一括編集
        </Text>
      </Pressable>
      {[1, 2, 3].map((r) => (
        <CollapsibleRound
          key={`ek-r${r}`}
          label={`英文解釈 ${r}周目（§1–§43）`}
          idPrefix={`EK-R${r}-S`}
          tasks={englishTasks}
          expanded={!!open[`EK-R${r}`]}
          onToggleExpand={() => toggle(`EK-R${r}`)}
          toggleTask={toggleTask}
          onOpenEdit={(t) => setDetailTarget({ kind: "single", task: t })}
          onOpenGroup={(subset) =>
            setDetailTarget({ kind: "group", tasks: subset, label: `英文解釈 ${r}周目` })
          }
        />
      ))}

      <Pressable onPress={() => setDetailTarget({ kind: "group", tasks: taMajor, label: "テーマ英作文（全体）" })}>
        <Text style={{ fontSize: 12, fontWeight: "600", color: "#475569", marginTop: 16, marginBottom: 8 }}>
          テーマ英作文 · タップで大項目一括編集
        </Text>
      </Pressable>
      {[1, 2, 3].map((r) => (
        <CollapsibleRound
          key={`ta-r${r}`}
          label={`テーマ英作文 ${r}周目（No.1–No.20）`}
          idPrefix={`TA-R${r}-N`}
          tasks={englishTasks}
          expanded={!!open[`TA-R${r}`]}
          onToggleExpand={() => toggle(`TA-R${r}`)}
          toggleTask={toggleTask}
          onOpenEdit={(t) => setDetailTarget({ kind: "single", task: t })}
          onOpenGroup={(subset) =>
            setDetailTarget({ kind: "group", tasks: subset, label: `テーマ英作文 ${r}周目` })
          }
        />
      ))}

      <Pressable onPress={() => setDetailTarget({ kind: "group", tasks: gbMajor, label: "英文法（全体）" })}>
        <Text style={{ fontSize: 12, fontWeight: "600", color: "#475569", marginTop: 16, marginBottom: 8 }}>
          英文法（前期）· タップで大項目一括編集
        </Text>
      </Pressable>
      {[1, 2, 3].map((r) => (
        <CollapsibleRound
          key={`gb-r${r}`}
          label={`英文法 ${r}周目（第1–22週）`}
          idPrefix={`GB-R${r}-W`}
          tasks={englishTasks}
          expanded={!!open[`GB-R${r}`]}
          onToggleExpand={() => toggle(`GB-R${r}`)}
          toggleTask={toggleTask}
          onOpenEdit={(t) => setDetailTarget({ kind: "single", task: t })}
          onOpenGroup={(subset) =>
            setDetailTarget({ kind: "group", tasks: subset, label: `英文法 ${r}周目` })
          }
        />
      ))}

      <Pressable onPress={() => setDetailTarget({ kind: "group", tasks: hwMajor, label: "毎週の宿題（前期・全体）" })}>
        <Text style={{ fontSize: 12, fontWeight: "600", color: "#475569", marginTop: 16, marginBottom: 8 }}>
          毎週の宿題（前期・週ごと）· タップで大項目一括編集
        </Text>
      </Pressable>
      {Array.from({ length: 22 }, (_, i) => i + 1).map((w) => (
        <HomeworkWeekBlock
          key={`hw-${w}`}
          weekNum={w}
          tasks={englishTasks}
          expanded={!!open[`HW-${w}`]}
          onToggleExpand={() => toggle(`HW-${w}`)}
          toggleTask={toggleTask}
          onOpenEdit={(t) => setDetailTarget({ kind: "single", task: t })}
          onOpenGroup={(subset) =>
            setDetailTarget({ kind: "group", tasks: subset, label: `第${w}週の宿題` })
          }
        />
      ))}

      <Text style={{ fontSize: 11, color: "#94a3b8", marginTop: 16, lineHeight: 16 }}>
        左の丸で完了。タスク名のみ表示。タスクをタップすると詳細（名称・重要度・開始日・終了日・備考）。見出しをタップするとそのまとまりを一括編集できます。
      </Text>
    </>
  );

  const wrapped = (
    <>
      {body}
      <Koko2TaskDetailModal
        target={detailTarget}
        onClose={() => setDetailTarget(null)}
        updateTask={updateTask}
      />
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
        {wrapped}
      </ScrollView>
    );
  }

  return <View>{wrapped}</View>;
}
