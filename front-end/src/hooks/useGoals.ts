// useGoals.ts
import { useState } from "react";
import { GoalType, ProgramType } from "../utils/types";
import { fetchGoals } from "../apiService";

const useGoals = (apiKey: string) => {
  const [goals, setGoals] = useState<GoalType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getGoals = async (program: ProgramType) => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchGoals(apiKey, program);
      setGoals(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return { goals, getGoals, loading, error };
};

export default useGoals;

