// src/hooks/useGoalAccountReports.ts
import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { useSelector } from "react-redux";
import { selectUser } from "../Slices/userSlice";
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
  const currentUser = useSelector(selectUser);
  const [reports, setReports] = useState<GoalAccountReport[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!goalId || !enabled || !currentUser?.uid) {
      setReports([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const canReviewCompanyReports = [
      "admin",
      "super-admin",
      "developer",
    ].includes(currentUser.role ?? "");
    const constraints: QueryConstraint[] = [where("goalId", "==", goalId)];

    // Firestore rules now keep candid feedback scoped to the author, their
    // direct supervisor, and company admins. Personal goal cards only need
    // the signed-in rep's report, so constrain that query at the source.
    if (!canReviewCompanyReports) {
      constraints.push(where("userId", "==", currentUser.uid));
    }

    const unsubscribe = onSnapshot(
      query(collection(db, "goalAccountReports"), ...constraints),
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
  }, [currentUser?.role, currentUser?.uid, enabled, goalId]);

  return { reports, loading };
};
