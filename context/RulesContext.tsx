import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  ReactNode,
} from "react";

export type RulesState = {
  english: string;
  math: string;
  enabled: boolean; // スコアとタスクを連動させるかどうか
};

type RulesContextValue = {
  rules: RulesState;
  setRules: (next: RulesState) => void;
};

const RulesContext = createContext<RulesContextValue | undefined>(undefined);

const INITIAL_RULES: RulesState = {
  english:
    "・合計点 < 60: タスクA(英単語)、タスクB(英熟語)\n" +
    "・60 ≦ 合計点 < 80: タスクC(英文法)\n" +
    "・合計点 ≧ 80: タスクD(長文) を優先",
  math:
    "・第1問 < 10点: タスクE(計算の基礎)\n" +
    "・第3問 < 10点: タスクF(図形/関数の演習)\n" +
    "・合計点 ≧ 70: 過去問タスクGを追加",
  enabled: true,
};

export function RulesProvider({ children }: { children: ReactNode }) {
  const [rules, setRulesState] = useState<RulesState>(INITIAL_RULES);

  const setRules = useCallback((next: RulesState) => {
    setRulesState(next);
  }, []);

  const value = useMemo(
    () => ({
      rules,
      setRules,
    }),
    [rules, setRules]
  );

  return (
    <RulesContext.Provider value={value}>{children}</RulesContext.Provider>
  );
}

export function useRules(): RulesContextValue {
  const ctx = useContext(RulesContext);
  if (!ctx) {
    throw new Error("useRules must be used within RulesProvider");
  }
  return ctx;
}

