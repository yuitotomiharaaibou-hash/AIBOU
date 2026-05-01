import { simpleStorageGet, simpleStorageSet } from "@/lib/simpleStorage";

const ROUTE_END_KEY = "aibou.koko2RouteEndOverride.v1";
const MOCK_TARGETS_KEY = "aibou.koko2MockTargets.v1";

export type Koko2MockTargets = { english: number; math: number };

export const DEFAULT_KOKO2_MOCK_TARGETS: Koko2MockTargets = { english: 60, math: 60 };

function clampTarget(n: number): number {
  if (Number.isNaN(n)) return 60;
  return Math.min(120, Math.max(0, Math.round(n)));
}

export async function loadKoko2RouteEndOverride(): Promise<string | null> {
  const raw = await simpleStorageGet(ROUTE_END_KEY);
  const s = raw?.trim();
  return s && s.length > 0 ? s : null;
}

export async function saveKoko2RouteEndOverride(dateKey: string | null): Promise<void> {
  if (dateKey == null || dateKey === "") {
    await simpleStorageSet(ROUTE_END_KEY, "");
    return;
  }
  await simpleStorageSet(ROUTE_END_KEY, dateKey);
}

export async function loadKoko2MockTargets(): Promise<Koko2MockTargets> {
  const raw = await simpleStorageGet(MOCK_TARGETS_KEY);
  if (!raw) return { ...DEFAULT_KOKO2_MOCK_TARGETS };
  try {
    const p = JSON.parse(raw) as Partial<Koko2MockTargets>;
    return {
      english: clampTarget(Number(p.english ?? DEFAULT_KOKO2_MOCK_TARGETS.english)),
      math: clampTarget(Number(p.math ?? DEFAULT_KOKO2_MOCK_TARGETS.math)),
    };
  } catch {
    return { ...DEFAULT_KOKO2_MOCK_TARGETS };
  }
}

export async function saveKoko2MockTargets(t: Koko2MockTargets): Promise<void> {
  await simpleStorageSet(
    MOCK_TARGETS_KEY,
    JSON.stringify({
      english: clampTarget(t.english),
      math: clampTarget(t.math),
    })
  );
}
