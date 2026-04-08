import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import type { ProfileState } from "@/context/ProfileContext";
import { buildAllKoko2LeafTasks } from "@/lib/koko2LeafTasks";
import {
  distributeKoko2TasksForProfile,
  profileScheduleSignature,
} from "@/lib/koko2TaskDistribution";
import { pseudoAibouReplan } from "@/lib/pseudoAibouPlanner";
import {
  applySuccessTemplate,
  createDefaultPreference,
  getSuccessTemplateByHints,
  learnFromEvent,
  type PlannerProfileHints,
  type PlannerPreference,
} from "@/lib/plannerPreference";
import { simpleStorageGet, simpleStorageSet } from "@/lib/simpleStorage";
import {
  buildTomorrowPlanProposal,
  getTomorrowKey,
  hearingForAuto,
  type TomorrowHearing,
} from "@/lib/tomorrowPlan";

export type Subject = "english" | "math";

export type Task = {
  id: string; // タスクA〜JなどのID
  subject: Subject;
  title: string;
  date: string; // YYYY-MM-DD
  hour: number; // 0-23
  completed: boolean;
  pinned?: boolean;
};

export type ReplanLog = {
  id: string;
  taskId: string;
  fromDate: string;
  toDate: string;
  fromHour: number;
  toHour: number;
  reason: string;
  createdAt: string;
};

/** 手動提案のプレビュー（承認までタスクは未反映） */
export type PendingPlanProposal = {
  referenceDate: string;
  nextTasks: Task[];
  logs: ReplanLog[];
};

export type TasksContextValue = {
  tasks: Task[];
  replanLogs: ReplanLog[];
  pendingProposal: PendingPlanProposal | null;
  proposalNotice: string | null;
  plannerPreference: PlannerPreference;
  toggleTask: (id: string) => void;
  updateTaskSchedule: (id: string, date: string, hour: number) => void;
  updateTask: (id: string, patch: Partial<Omit<Task, "id">>) => void;
  addTask: (input: Omit<Task, "id" | "completed"> & { id?: string }) => void;
  deleteTask: (id: string) => void;
  togglePin: (id: string) => void;
  setPlannerUser: (userId: string) => void;
  applySuccessTemplateFromProfile: (hints: PlannerProfileHints) => void;
  proposeTomorrowPlan: (hearing: TomorrowHearing) => void;
  tryAutoTomorrowPlan: (input: {
    todayKey: string;
    tomorrowKey: string;
    todayBusySlotCount: number;
    hourNow: number;
    enabled: boolean;
  }) => void;
  approvePendingPlan: () => void;
  rejectPendingPlan: () => void;
  autoReplanIfNeeded: (referenceDate?: string) => void;
  /** KOKO2 全タスクを維持したまま、プロフィールの空き枠に合わせて日付・時刻を再配分 */
  applyKoko2TaskDistribution: (profile: Partial<ProfileState>, force?: boolean) => void;
};

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

export function makeDateKey(year: number, month0: number, day: number): string {
  const mm = String(month0 + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export function getTodayKey(): string {
  const d = new Date();
  return makeDateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

const INITIAL_TASKS: Task[] = buildAllKoko2LeafTasks();

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [replanLogs, setReplanLogs] = useState<ReplanLog[]>([]);
  const [pendingProposal, setPendingProposal] = useState<PendingPlanProposal | null>(null);
  const [proposalNotice, setProposalNotice] = useState<string | null>(null);
  const [plannerUserId, setPlannerUserId] = useState("default");
  const [plannerPreference, setPlannerPreference] = useState<PlannerPreference>(
    createDefaultPreference()
  );
  const regenerateSessionRef = useRef(0);
  const plannerPrefRef = useRef(plannerPreference);
  plannerPrefRef.current = plannerPreference;
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const pendingProposalRef = useRef<PendingPlanProposal | null>(null);
  pendingProposalRef.current = pendingProposal;
  const lastKoko2DistSigRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const raw = await simpleStorageGet(`aibou.pref.${plannerUserId}`);
      if (!mounted) return;
      if (!raw) {
        setPlannerPreference(createDefaultPreference());
        return;
      }
      try {
        const parsed = JSON.parse(raw) as PlannerPreference;
        setPlannerPreference(parsed);
      } catch {
        setPlannerPreference(createDefaultPreference());
      }
    })();
    return () => {
      mounted = false;
    };
  }, [plannerUserId]);

  useEffect(() => {
    simpleStorageSet(`aibou.pref.${plannerUserId}`, JSON.stringify(plannerPreference));
  }, [plannerPreference, plannerUserId]);

  const toggleTask = useCallback((id: string) => {
    let completedTask: Task | null = null;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t, completed: !t.completed };
        if (next.completed) completedTask = next;
        return next;
      })
    );
    if (completedTask) {
      setPlannerPreference((prev) =>
        learnFromEvent(prev, {
          kind: "complete",
          hour: completedTask!.hour,
          subject: completedTask!.subject,
        })
      );
    }
  }, []);

  const updateTaskSchedule = useCallback(
    (id: string, date: string, hour: number) => {
      let moved: { fromHour: number; toHour: number; subject: Subject } | null = null;
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          moved = { fromHour: t.hour, toHour: hour, subject: t.subject };
          return { ...t, date, hour };
        })
      );
      if (moved) {
        setPlannerPreference((prev) =>
          learnFromEvent(prev, {
            kind: "manual-move",
            fromHour: moved!.fromHour,
            toHour: moved!.toHour,
            subject: moved!.subject,
          })
        );
      }
    },
    []
  );

  const updateTask = useCallback((id: string, patch: Partial<Omit<Task, "id">>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const addTask = useCallback(
    (input: Omit<Task, "id" | "completed"> & { id?: string }) => {
      setTasks((prev) => {
        const safeId =
          input.id ??
          `USR-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        const task: Task = {
          id: safeId,
          subject: input.subject,
          title: input.title,
          date: input.date,
          hour: input.hour,
          completed: false,
          pinned: false,
        };
        return [task, ...prev];
      });
    },
    []
  );

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const togglePin = useCallback((id: string) => {
    let pinned: Task | null = null;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t, pinned: !t.pinned };
        if (next.pinned) pinned = next;
        return next;
      })
    );
    if (pinned) {
      setPlannerPreference((prev) =>
        learnFromEvent(prev, {
          kind: "pin",
          hour: pinned!.hour,
          subject: pinned!.subject,
        })
      );
    }
  }, []);

  const setPlannerUser = useCallback((userId: string) => {
    const normalized = (userId || "").trim() || "default";
    setPlannerUserId(normalized);
  }, []);

  const applySuccessTemplateFromProfile = useCallback((hints: PlannerProfileHints) => {
    const t = getSuccessTemplateByHints(hints);
    if (!t) return;
    const appliedKey = `aibou.pref.templateApplied.${plannerUserId}.${t.id}`;
    (async () => {
      const done = await simpleStorageGet(appliedKey);
      if (done === "1") return;
      setPlannerPreference((prev) => applySuccessTemplate(prev, t, 0.35));
      await simpleStorageSet(appliedKey, "1");
    })();
  }, [plannerUserId]);

  const proposeTomorrowPlan = useCallback((hearing: TomorrowHearing) => {
    setProposalNotice(null);
    const today = getTodayKey();
    const tomorrow = getTomorrowKey();
    const out = buildTomorrowPlanProposal({
      tasks: tasksRef.current,
      todayKey: today,
      tomorrowKey: tomorrow,
      preference: plannerPrefRef.current,
      hearing,
      reason: "tomorrow-manual",
    });
    if (out.logs.length === 0) {
      setPendingProposal(null);
      setProposalNotice("明日に移せる未完了タスクがありません");
      setTimeout(() => setProposalNotice(null), 3200);
      return;
    }
    setPendingProposal({
      referenceDate: today,
      nextTasks: out.tasks,
      logs: out.logs,
    });
  }, []);

  const tryAutoTomorrowPlan = useCallback(
    (input: {
      todayKey: string;
      tomorrowKey: string;
      todayBusySlotCount: number;
      hourNow: number;
      enabled: boolean;
    }) => {
      if (!input.enabled || input.hourNow < 5) return;
      void (async () => {
        const last = await simpleStorageGet("aibou.tomorrow.autoLast");
        if (last === input.tomorrowKey) return;
        const hearing = hearingForAuto(input.todayBusySlotCount, plannerPrefRef.current);
        const out = buildTomorrowPlanProposal({
          tasks: tasksRef.current,
          todayKey: input.todayKey,
          tomorrowKey: input.tomorrowKey,
          preference: plannerPrefRef.current,
          hearing,
          reason: "tomorrow-auto",
        });
        await simpleStorageSet("aibou.tomorrow.autoLast", input.tomorrowKey);
        if (out.logs.length === 0) return;
        setTasks(out.tasks);
        setReplanLogs((logs) => [...out.logs, ...logs].slice(0, 300));
        regenerateSessionRef.current = 0;
      })();
    },
    []
  );

  const approvePendingPlan = useCallback(() => {
    const p = pendingProposalRef.current;
    if (!p) return;
    setProposalNotice(null);
    setPendingProposal(null);
    setTasks(p.nextTasks);
    setReplanLogs((logs) => [...p.logs, ...logs].slice(0, 300));
    regenerateSessionRef.current = 0;
    setPlannerPreference((prev) => {
      const learned = learnFromEvent(prev, { kind: "accept-plan" });
      plannerPrefRef.current = learned;
      return learned;
    });
  }, []);

  const rejectPendingPlan = useCallback(() => {
    if (!pendingProposalRef.current) return;
    setProposalNotice(null);
    setPendingProposal(null);
    regenerateSessionRef.current += 1;
    setPlannerPreference((prev) => {
      const learned = learnFromEvent(prev, {
        kind: "regenerate",
        countInSession: regenerateSessionRef.current,
      });
      plannerPrefRef.current = learned;
      return learned;
    });
  }, []);

  const autoReplanIfNeeded = useCallback((referenceDate?: string) => {
    const ref = referenceDate ?? getTodayKey();
    regenerateSessionRef.current = 0;
    setTasks((prev) => {
      const hasOverdue = prev.some((t) => !t.completed && !t.pinned && t.date < ref);
      if (!hasOverdue) return prev;
      const out = pseudoAibouReplan({
        tasks: prev,
        referenceDate: ref,
        mode: "auto",
        preference: plannerPrefRef.current,
      });
      if (out.logs.length > 0) {
        setPendingProposal(null);
        setReplanLogs((logs) => [...out.logs, ...logs].slice(0, 300));
      }
      return out.tasks;
    });
  }, []);

  const applyKoko2TaskDistribution = useCallback(
    (profile: Partial<ProfileState>, force = false) => {
      const sig = profileScheduleSignature(profile);
      if (!force && lastKoko2DistSigRef.current === sig) return;
      lastKoko2DistSigRef.current = sig;
      const base = buildAllKoko2LeafTasks();
      setTasks((prev) => {
        const distributed = distributeKoko2TasksForProfile(base, profile, {
          anchorDate: new Date(),
        });
        const prevById = new Map(prev.map((t) => [t.id, t]));
        return distributed.map((t) => {
          const old = prevById.get(t.id);
          if (!old) return t;
          return { ...t, completed: old.completed, pinned: old.pinned };
        });
      });
    },
    []
  );

  const value = useMemo(
    () => ({
      tasks,
      replanLogs,
      pendingProposal,
      proposalNotice,
      plannerPreference,
      toggleTask,
      updateTaskSchedule,
      updateTask,
      addTask,
      deleteTask,
      togglePin,
      setPlannerUser,
      applySuccessTemplateFromProfile,
      proposeTomorrowPlan,
      tryAutoTomorrowPlan,
      approvePendingPlan,
      rejectPendingPlan,
      autoReplanIfNeeded,
      applyKoko2TaskDistribution,
    }),
    [
      tasks,
      replanLogs,
      pendingProposal,
      proposalNotice,
      plannerPreference,
      toggleTask,
      updateTaskSchedule,
      updateTask,
      addTask,
      deleteTask,
      togglePin,
      setPlannerUser,
      applySuccessTemplateFromProfile,
      proposeTomorrowPlan,
      tryAutoTomorrowPlan,
      approvePendingPlan,
      rejectPendingPlan,
      autoReplanIfNeeded,
      applyKoko2TaskDistribution,
    ]
  );

  return (
    <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
  );
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) {
    throw new Error("useTasks must be used within TasksProvider");
  }
  return ctx;
}

