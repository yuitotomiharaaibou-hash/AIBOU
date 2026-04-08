import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from "react";

export type SubjectId = "english" | "math";

export type SubjectScore = {
  total: number;
  questions: number[]; // 各大問の点数
};

type ScoreContextValue = {
  scores: Record<SubjectId, SubjectScore>;
  setTotal: (subject: SubjectId, total: number) => void;
  setQuestionScore: (subject: SubjectId, index: number, value: number) => void;
};

const ScoreContext = createContext<ScoreContextValue | undefined>(undefined);

const QUESTION_COUNT = 6;

function distributeEven(total: number): number[] {
  const base = Math.floor(total / QUESTION_COUNT);
  const remainder = total - base * QUESTION_COUNT;
  const arr = Array.from({ length: QUESTION_COUNT }, () => base);
  for (let i = 0; i < remainder; i++) {
    arr[i] += 1;
  }
  return arr;
}

const INITIAL_SCORES: Record<SubjectId, SubjectScore> = {
  english: { total: 60, questions: distributeEven(60) },
  math: { total: 60, questions: distributeEven(60) },
};

export function ScoreProvider({ children }: { children: ReactNode }) {
  const [scores, setScores] =
    useState<Record<SubjectId, SubjectScore>>(INITIAL_SCORES);

  const setTotal = useCallback((subject: SubjectId, total: number) => {
    if (Number.isNaN(total)) total = 0;
    // 0〜120点、5点刻みに正規化
    let normalized = Math.max(0, Math.min(120, total));
    normalized = Math.round(normalized / 5) * 5;
    setScores((prev) => ({
      ...prev,
      [subject]: {
        total: normalized,
        questions: distributeEven(normalized),
      },
    }));
  }, []);

  const setQuestionScore = useCallback(
    (subject: SubjectId, index: number, value: number) => {
      if (Number.isNaN(value) || value < 0) value = 0;
      setScores((prev) => {
        const current = prev[subject];
        const questions = [...current.questions];
        questions[index] = value;
        const total = questions.reduce((sum, v) => sum + v, 0);
        return {
          ...prev,
          [subject]: { total, questions },
        };
      });
    },
    []
  );

  const value = useMemo(
    () => ({
      scores,
      setTotal,
      setQuestionScore,
    }),
    [scores, setTotal, setQuestionScore]
  );

  return (
    <ScoreContext.Provider value={value}>{children}</ScoreContext.Provider>
  );
}

export function useScores(): ScoreContextValue {
  const ctx = useContext(ScoreContext);
  if (!ctx) {
    throw new Error("useScores must be used within ScoreProvider");
  }
  return ctx;
}

