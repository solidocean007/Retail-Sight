// useEnrichedAccounts.ts
import { useState } from "react";
import { GalloAccountType, ProgramType, GoalType, EnrichedGalloAccountType } from "../utils/types";
import { fetchCompanyAccounts, fetchGalloAccounts } from "../apiService";
import { enrichAccounts } from "../utils/helperFunctions/enrichAccounts";

const useEnrichedAccounts = (apiKey: string, companyId: string | undefined) => {
  const [enrichedAccounts, setEnrichedAccounts] = useState<EnrichedGalloAccountType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = async (program: ProgramType, goal: GoalType) => {
    if (!companyId) {
      setError("Company ID is required to fetch accounts");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const galloAccounts = await fetchGalloAccounts(apiKey, program.marketId, goal.goalId);
      const companyAccounts = await fetchCompanyAccounts(companyId, galloAccounts.map(acc => acc.distributorAcctId));
      const enriched = enrichAccounts(galloAccounts, companyAccounts);
      setEnrichedAccounts(enriched);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return { enrichedAccounts, fetchAccounts, loading, error };
};

export default useEnrichedAccounts;


