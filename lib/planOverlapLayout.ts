import type { DayPlanItem } from "@/context/HomeScheduleContext";
import { planSpanFromLoose } from "@/lib/planTime";

export type PlanLaneInfo = { lane: number; laneCount: number };

function intervalsOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
  return a0 < b1 && b0 < a1;
}

type TimedItem = { id: string; plan: DayPlanItem; start: number; end: number };

/**
 * 時間が重なる予定を「列」に割り当て、ホームタイムラインで横並びにする。
 * 重なりの連結成分ごとに laneCount を求め、同一成分内で greedy にレーン割当。
 */
export function assignTimedPlanLanes(plans: DayPlanItem[]): Map<string, PlanLaneInfo> {
  const result = new Map<string, PlanLaneInfo>();
  const items: TimedItem[] = plans.map((p) => {
    const s = planSpanFromLoose(p);
    return { id: p.id, plan: p, start: s.startMin, end: s.endMinExclusive };
  });

  const visited = new Set<string>();
  for (const seed of items) {
    if (visited.has(seed.id)) continue;
    const comp: TimedItem[] = [];
    const stack = [seed];
    visited.add(seed.id);
    while (stack.length) {
      const u = stack.pop()!;
      comp.push(u);
      for (const v of items) {
        if (visited.has(v.id)) continue;
        if (intervalsOverlap(u.start, u.end, v.start, v.end)) {
          visited.add(v.id);
          stack.push(v);
        }
      }
    }

    comp.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
    const laneEnds: number[] = [];
    const laneById = new Map<string, number>();
    for (const it of comp) {
      let lane = laneEnds.findIndex((end) => end <= it.start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(it.end);
      } else {
        laneEnds[lane] = it.end;
      }
      laneById.set(it.id, lane);
    }
    const laneCount = Math.max(1, laneEnds.length);
    for (const it of comp) {
      result.set(it.id, { lane: laneById.get(it.id)!, laneCount });
    }
  }
  return result;
}
