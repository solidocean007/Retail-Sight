// hooks/useAvailableGoals.ts
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useSelector } from "react-redux";
import { db } from "../utils/firebase";
import { RootState } from "../utils/store";
import { CompanyGoalWithIdType } from "../utils/types";

type GoalOption = CompanyGoalWithIdType & {
  originCompanyName?: string;
};

export const useAvailableGoals = (
  isSupplier: boolean,
  companyId: string | undefined
) => {
  const ownCompanyGoals = useSelector(
    (state: RootState) => state.companyGoals.goals
  ) as CompanyGoalWithIdType[];

  const connections = useSelector(
    (state: RootState) => state.companyConnections.connections || []
  );

  const [supplierGoals, setSupplierGoals] = useState<GoalOption[]>([]);
  const [loading, setLoading] = useState(false);

  const connectedCompanyMap = useMemo(() => {
    const map = new Map<string, string>();

    if (!companyId) return map;

    connections.forEach((conn: any) => {
      if (conn.status !== "approved") return;

      const isFrom = conn.requestFromCompanyId === companyId;
      const isTo = conn.requestToCompanyId === companyId;

      if (!isFrom && !isTo) return;

      const otherCompanyId = isFrom
        ? conn.requestToCompanyId
        : conn.requestFromCompanyId;

      const otherCompanyName = isFrom
        ? conn.requestToCompanyName
        : conn.requestFromCompanyName;

      if (!otherCompanyId || otherCompanyId === companyId) return;

      map.set(otherCompanyId, otherCompanyName || "Connected Company");
    });

    return map;
  }, [connections, companyId]);

  useEffect(() => {
    if (!isSupplier || !companyId) {
      setSupplierGoals([]);
      return;
    }

    let cancelled = false;

    const loadSupplierGoals = async () => {
      setLoading(true);

      try {
        const q = query(
          collection(db, "companyGoals"),
          where("supplierIdForGoal", "==", companyId)
        );

        const snap = await getDocs(q);

        const goals = snap.docs
          .map((docSnap) => {
            const data = docSnap.data() as CompanyGoalWithIdType;

            return {
              ...data,
              id: docSnap.id,
              originCompanyName: connectedCompanyMap.get(data.companyId),
            };
          })
          .filter((goal) => {
            if (!goal.companyId) return false;

            // only show goals from approved connected companies
            return connectedCompanyMap.has(goal.companyId);
          })
          .sort((a, b) =>
            (a.goalTitle || "").localeCompare(b.goalTitle || "")
          );

        if (!cancelled) setSupplierGoals(goals);
      } catch (err) {
        console.error("[useAvailableGoals] Failed to load supplier goals:", err);
        if (!cancelled) setSupplierGoals([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadSupplierGoals();

    return () => {
      cancelled = true;
    };
  }, [isSupplier, companyId, connectedCompanyMap]);

  const goals = useMemo(() => {
    if (!companyId) return [];

    if (isSupplier) {
      return supplierGoals;
    }

    return ownCompanyGoals.filter((g) => g.companyId === companyId);
  }, [ownCompanyGoals, supplierGoals, isSupplier, companyId]);

  return {
    goals,
    loading,
  };
};