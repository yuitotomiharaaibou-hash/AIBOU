/** 複数コマにまたがるタスクの進捗（例: （2/7）） */
export function taskSegmentSuffix(task: {
  segmentIndex?: number;
  segmentTotal?: number;
}): string {
  const n = task.segmentTotal;
  const i = task.segmentIndex;
  if (typeof n === "number" && n >= 2 && typeof i === "number" && i >= 1 && i <= n) {
    return `（${i}/${n}）`;
  }
  return "";
}

export function taskTitleWithSegment(
  title: string,
  task: { segmentIndex?: number; segmentTotal?: number }
): string {
  const s = taskSegmentSuffix(task);
  return s ? `${title}${s}` : title;
}
