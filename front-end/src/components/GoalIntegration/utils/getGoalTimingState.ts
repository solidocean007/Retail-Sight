import {
  FireStoreGalloGoalDocType,
  GoalTimingState,
} from "../../../utils/types";

function endOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function toMillisSafe(v?: any): number | null {
  if (!v) return null;

  if (typeof v?.toDate === "function") {
    return v.toDate().getTime(); // Firestore Timestamp
  }

  if (v instanceof Date) return v.getTime();

  if (typeof v === "string") {
    const ms = Date.parse(v);
    return Number.isNaN(ms) ? null : ms;
  }

  return null;
}

/**
 * Determines how a Gallo goal should be presented in the UI.
 *
 * scheduled → approved but NOT visible yet
 * upcoming  → visible but NOT actionable
 * current   → visible + actionable
 * archived  → finished or explicitly archived
 */
export function getGoalTimingState(
  goal: FireStoreGalloGoalDocType,
  now = Date.now(),
): GoalTimingState {
  const displayAt = toMillisSafe(goal.displayDate);
  const startAt = toMillisSafe(goal.programDetails?.programStartDate);
  const endAt = toMillisSafe(goal.programDetails?.programEndDate);

  // 1️⃣ Explicit lifecycle overrides everything
  if (goal.lifeCycleStatus === "archived") {
    return "archived";
  }

  if (goal.lifeCycleStatus === "disabled") {
    return "archived"; // treat disabled as non-active
  }

  // 2️⃣ Finished programs are archived
  if (endAt && endOfDay(endAt) < now) {
    return "archived";
  }

  // 3️⃣ Scheduled: approved but not yet visible
  if (displayAt && displayAt > now) {
    return "scheduled";
  }

  // 4️⃣ Upcoming: visible, but start date not reached
  if (startAt && startAt > now) {
    return "upcoming";
  }

  // 5️⃣ Current: visible + active
  return "current";
}
