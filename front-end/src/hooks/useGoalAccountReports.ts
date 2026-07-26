// src/hooks/useGoalAccountReports.ts
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../utils/firebase";
import { GoalAccountReport } from "../types/goalReports";

/**
 * Live reports for one goal.
 *
 * Realtime on purpose: a rep's chip should reflect an admin's acknowledgment
 * without a refresh, and an admin watching a goal should see reports arrive as
 * reps file them.
 *
 * Subscribed at the goal level, never per account row — a rep with 100
 * accounts must not open 100 listeners.
 */
export const useGoalAccountReports = (
  goalId: string | undefined,
  enabled = true,
) => {
  const [reports, setReports] = useState<GoalAccountReport[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!goalId || !enabled) {
      setReports([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(
      query(collection(db, "goalAccountReports"), where("goalId", "==", goalId)),
      (snap) => {
        setReports(
          snap.docs.map((d) => ({
            ...(d.data() as GoalAccountReport),
            id: d.id,
          })),
        );
        setLoading(false);
      },
      (err) => {
        console.error("goalAccountReports listener failed:", err);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [goalId, enabled]);

  return { reports, loading };
};
