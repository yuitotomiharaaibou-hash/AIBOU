import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { useProfile } from "@/context/ProfileContext";
import {
  inferHomeScheduleLevels,
  inferDailyPlanItems,
  type InferredPlanItem,
  type ScheduleLevel,
} from "@/lib/homeScheduleInference";

export type DayPlanItem = InferredPlanItem & {
  id: string;
  date: string;
};

type HomeScheduleContextValue = {
  /** 表示用の濃淡（タップ上書き込み済み） */
  getLevel: (dateKey: string, hour: number) => ScheduleLevel;
  cycleLevel: (dateKey: string, hour: number) => void;
  getPlans: (dateKey: string) => DayPlanItem[];
  ensureDayPlans: (dateKey: string) => void;
  addPlan: (dateKey: string, input: Omit<DayPlanItem, "id" | "date">) => void;
  updatePlan: (
    dateKey: string,
    planId: string,
    patch: Partial<Omit<DayPlanItem, "id" | "date">>
  ) => void;
  deletePlan: (dateKey: string, planId: string) => void;
};

const HomeScheduleContext = createContext<HomeScheduleContextValue | undefined>(
  undefined
);

export function HomeScheduleProvider({ children }: { children: ReactNode }) {
  const { profile } = useProfile();
  /** ユーザーがタップした上書き（未設定のマスは推測値を使う） */
  const [overrides, setOverrides] = useState<
    Record<string, Partial<Record<number, ScheduleLevel>>>
  >({});
  const [plansByDate, setPlansByDate] = useState<Record<string, DayPlanItem[]>>({});

  const getBase = useCallback(
    (dateKey: string) => {
      const [y, m, d] = dateKey.split("-").map((v) => parseInt(v, 10));
      const date = new Date(y, m - 1, d);
      return inferHomeScheduleLevels(date, profile);
    },
    [profile]
  );

  const getLevel = useCallback(
    (dateKey: string, hour: number): ScheduleLevel => {
      const o = overrides[dateKey]?.[hour];
      if (o !== undefined) return o;
      return getBase(dateKey)[hour] ?? 0;
    },
    [overrides, getBase]
  );

  const cycleLevel = useCallback((dateKey: string, hour: number) => {
    setOverrides((prev) => {
      const base = inferHomeScheduleLevels(
        (() => {
          const [y, m, d] = dateKey.split("-").map((v) => parseInt(v, 10));
          return new Date(y, m - 1, d);
        })(),
        profile
      );
      const dayOverride = { ...(prev[dateKey] || {}) };
      const current =
        dayOverride[hour] !== undefined ? dayOverride[hour]! : base[hour] ?? 0;
      const next = ((current + 1) % 3) as ScheduleLevel;
      return {
        ...prev,
        [dateKey]: { ...dayOverride, [hour]: next },
      };
    });
  }, [profile]);

  const ensureDayPlans = useCallback(
    (dateKey: string) => {
      setPlansByDate((prev) => {
        if (prev[dateKey]) return prev;
        const [y, m, d] = dateKey.split("-").map((v) => parseInt(v, 10));
        const inferred = inferDailyPlanItems(new Date(y, m - 1, d), profile).map(
          (p, idx) => ({
            ...p,
            id: `${dateKey}-plan-${idx + 1}`,
            date: dateKey,
          })
        );
        return { ...prev, [dateKey]: inferred };
      });
    },
    [profile]
  );

  const getPlans = useCallback(
    (dateKey: string) => {
      const existing = plansByDate[dateKey];
      if (existing) return existing;
      const [y, m, d] = dateKey.split("-").map((v) => parseInt(v, 10));
      return inferDailyPlanItems(new Date(y, m - 1, d), profile).map((p, idx) => ({
        ...p,
        id: `${dateKey}-plan-${idx + 1}`,
        date: dateKey,
      }));
    },
    [plansByDate, profile]
  );

  const addPlan = useCallback(
    (dateKey: string, input: Omit<DayPlanItem, "id" | "date">) => {
      setPlansByDate((prev) => {
        const next = prev[dateKey] ?? getPlans(dateKey);
        const item: DayPlanItem = {
          id: `${dateKey}-plan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          date: dateKey,
          title: input.title,
          startHour: input.startHour,
          endHour: input.endHour,
        };
        return { ...prev, [dateKey]: [...next, item] };
      });
    },
    [getPlans]
  );

  const updatePlan = useCallback(
    (
      dateKey: string,
      planId: string,
      patch: Partial<Omit<DayPlanItem, "id" | "date">>
    ) => {
      setPlansByDate((prev) => {
        const next = prev[dateKey] ?? getPlans(dateKey);
        return {
          ...prev,
          [dateKey]: next.map((p) => (p.id === planId ? { ...p, ...patch } : p)),
        };
      });
    },
    [getPlans]
  );

  const deletePlan = useCallback((dateKey: string, planId: string) => {
    setPlansByDate((prev) => {
      const next = prev[dateKey] ?? [];
      return { ...prev, [dateKey]: next.filter((p) => p.id !== planId) };
    });
  }, []);

  const value = useMemo(
    () => ({
      getLevel,
      cycleLevel,
      getPlans,
      ensureDayPlans,
      addPlan,
      updatePlan,
      deletePlan,
    }),
    [getLevel, cycleLevel, getPlans, ensureDayPlans, addPlan, updatePlan, deletePlan]
  );

  return (
    <HomeScheduleContext.Provider value={value}>
      {children}
    </HomeScheduleContext.Provider>
  );
}

export function useHomeSchedule(): HomeScheduleContextValue {
  const ctx = useContext(HomeScheduleContext);
  if (!ctx) {
    throw new Error("useHomeSchedule must be used within HomeScheduleProvider");
  }
  return ctx;
}
