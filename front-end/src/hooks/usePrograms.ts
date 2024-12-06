// usePrograms.ts
import { useState } from "react";
import { fetchPrograms } from "../apiService";
import { ProgramType } from "../utils/types";
import { Dayjs } from "dayjs";

const usePrograms = (apiKey: string, startDate: Dayjs | null) => {
  const [programs, setPrograms] = useState<ProgramType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPrograms = async () => {
    if (!apiKey || !startDate) {
      setError("Missing API key or start date");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const startDateUnix = startDate.unix().toString();
      const data = await fetchPrograms(apiKey, startDateUnix);
      setPrograms(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return { programs, getPrograms, loading, error };
};

export default usePrograms;

