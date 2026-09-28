import { getFunctions, httpsCallable } from "firebase/functions";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

import { RootState } from "../utils/store";
import { CompanyGoalWithIdType } from "../utils/types";

export type PartnerGoalSubmission = {
  postId: string;
  submittedAt?: unknown;
  account?: {
    accountName?: string;
    accountAddress?: string;
  };
  submittedBy?: {
    firstName?: string;
    lastName?: string;
  };
};

export type PartnerGoalOption = {
  id: string;
  companyId?: string;
  distributorCompanyId?: string;
  originCompanyName?: string;
  goalTitle: string;
  goalDescription: string;
  goalMetric: string;
  goalValueMin: number;
  goalStartDate: string;
  goalEndDate: string;
  createdAt?: string;
  perUserQuota?: number | null;
  submissionCount?: number;
  submittedPosts?: PartnerGoalSubmission[];
};

type PartnerGoalsResponse = {
  goals: PartnerGoalOption[];
};

export const useAvailableGoals = (
  isSupplier: boolean,
  companyId: string | undefined,
) => {
  const ownCompanyGoals = useSelector(
    (state: RootState) => state.companyGoals.goals,
  ) as CompanyGoalWithIdType[];

  const [partnerGoals, setPartnerGoals] = useState<PartnerGoalOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!isSupplier || !companyId) {
      setPartnerGoals([]);
      setError(null);
      return;
    }

    let cancelled = false;

    const loadPartnerGoals = async () => {
      setLoading(true);
      setError(null);

      try {
        const callable = httpsCallable<undefined, PartnerGoalsResponse>(
          getFunctions(),
          "getPartnerGoals",
        );
        const result = await callable();
        if (!cancelled) setPartnerGoals(result.data.goals ?? []);
      } catch (loadError) {
        console.error(
          "[useAvailableGoals] Failed to load partner goals:",
          loadError,
        );
        if (!cancelled) {
          setPartnerGoals([]);
          setError("Partner goals could not be loaded. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadPartnerGoals();

    return () => {
      cancelled = true;
    };
  }, [companyId, isSupplier, refreshToken]);

  const goals = useMemo(() => {
    if (!companyId) return [];
    if (isSupplier) return partnerGoals;
    return ownCompanyGoals.filter((goal) => goal.companyId === companyId);
  }, [companyId, isSupplier, ownCompanyGoals, partnerGoals]);

  return {
    goals,
    loading,
    error,
    reload: () => setRefreshToken((current) => current + 1),
  };
};
