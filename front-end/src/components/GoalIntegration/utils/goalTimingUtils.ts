// utils/goalTimingUtils.ts
export function toMillisSafe(v?: any): number | null {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate().getTime();
  if (v instanceof Date) return v.getTime();
  if (typeof v === "string") {
    const ms = Date.parse(v);
    return Number.isNaN(ms) ? null : ms;
  }
  return null;
}

export function daysFromNow(targetMs: number): number {
  const diff = targetMs - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
