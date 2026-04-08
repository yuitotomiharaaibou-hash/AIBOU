import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { simpleStorageGet, simpleStorageSet } from "@/lib/simpleStorage";
import type { PlannerHypothesis } from "@/lib/plannerHypothesis";

const STORAGE_KEY = "aibou.judgmentRules.v1";

export type JudgmentRuleItem = {
  id: string;
  summary: string;
  detail: string;
  status: "pending" | "active";
  proposedBy: "aibou" | "user";
  createdAt: string;
};

type JudgmentRulesContextValue = {
  items: JudgmentRuleItem[];
  ready: boolean;
  ingestPlannerHypothesis: (h: PlannerHypothesis) => void;
  addUserRule: (summary: string, detail: string) => void;
  approve: (id: string) => void;
  reject: (id: string) => void;
  updateRule: (
    id: string,
    patch: Partial<Pick<JudgmentRuleItem, "summary" | "detail">>
  ) => void;
  deleteRule: (id: string) => void;
  approveAllPending: () => void;
  approvePendingByIds: (ids: string[]) => void;
};

const JudgmentRulesContext = createContext<
  JudgmentRulesContextValue | undefined
>(undefined);

function shorten(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function newId(): string {
  return `jr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function JudgmentRulesProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<JudgmentRuleItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = await simpleStorageGet(STORAGE_KEY);
      if (cancelled) return;
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as JudgmentRuleItem[];
          if (Array.isArray(parsed)) setItems(parsed);
        } catch {
          setItems([]);
        }
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: JudgmentRuleItem[]) => {
    void simpleStorageSet(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const ingestPlannerHypothesis = useCallback(
    (h: PlannerHypothesis) => {
      const candidates: string[] = [h.headline, ...h.insights];
      setItems((prev) => {
        const existing = new Set(
          prev.map((p) => p.detail.trim()).filter(Boolean)
        );
        const now = new Date().toISOString();
        let changed = false;
        const next = [...prev];
        for (const c of candidates) {
          const detail = c.trim();
          if (!detail || existing.has(detail)) continue;
          existing.add(detail);
          next.push({
            id: newId(),
            summary: shorten(detail, 42),
            detail,
            status: "pending",
            proposedBy: "aibou",
            createdAt: now,
          });
          changed = true;
        }
        if (changed) persist(next);
        return changed ? next : prev;
      });
    },
    [persist]
  );

  const addUserRule = useCallback(
    (summary: string, detail: string) => {
      const s = summary.trim();
      const d = detail.trim();
      if (!s || !d) return;
      setItems((prev) => {
        const next: JudgmentRuleItem[] = [
          {
            id: newId(),
            summary: s,
            detail: d,
            status: "active",
            proposedBy: "user",
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ];
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const approve = useCallback(
    (id: string) => {
      setItems((prev) => {
        const next = prev.map((p) =>
          p.id === id && p.status === "pending" ? { ...p, status: "active" as const } : p
        );
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const reject = useCallback(
    (id: string) => {
      setItems((prev) => {
        const next = prev.filter((p) => !(p.id === id && p.status === "pending"));
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const updateRule = useCallback(
    (id: string, patch: Partial<Pick<JudgmentRuleItem, "summary" | "detail">>) => {
      setItems((prev) => {
        const next = prev.map((p) => {
          if (p.id !== id) return p;
          return {
            ...p,
            summary: patch.summary?.trim() ? patch.summary.trim() : p.summary,
            detail: patch.detail?.trim() ? patch.detail.trim() : p.detail,
          };
        });
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const deleteRule = useCallback(
    (id: string) => {
      setItems((prev) => {
        const next = prev.filter((p) => p.id !== id);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const approveAllPending = useCallback(() => {
    setItems((prev) => {
      const next = prev.map((p) =>
        p.status === "pending" ? { ...p, status: "active" as const } : p
      );
      persist(next);
      return next;
    });
  }, [persist]);

  const approvePendingByIds = useCallback(
    (ids: string[]) => {
      const idSet = new Set(ids);
      if (idSet.size === 0) return;
      setItems((prev) => {
        const next = prev.map((p) =>
          p.status === "pending" && idSet.has(p.id)
            ? { ...p, status: "active" as const }
            : p
        );
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const value = useMemo(
    () => ({
      items,
      ready,
      ingestPlannerHypothesis,
      addUserRule,
      approve,
      reject,
      updateRule,
      deleteRule,
      approveAllPending,
      approvePendingByIds,
    }),
    [
      items,
      ready,
      ingestPlannerHypothesis,
      addUserRule,
      approve,
      reject,
      updateRule,
      deleteRule,
      approveAllPending,
      approvePendingByIds,
    ]
  );

  return (
    <JudgmentRulesContext.Provider value={value}>
      {children}
    </JudgmentRulesContext.Provider>
  );
}

export function useJudgmentRules(): JudgmentRulesContextValue {
  const ctx = useContext(JudgmentRulesContext);
  if (!ctx) {
    throw new Error("useJudgmentRules must be used within JudgmentRulesProvider");
  }
  return ctx;
}
