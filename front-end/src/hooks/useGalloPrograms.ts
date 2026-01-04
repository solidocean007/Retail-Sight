// hooks/useGalloPrograms.ts
import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { GalloProgramType } from "../utils/types";

export type GalloProgramUI = GalloProgramType & {
  hasGoals: boolean;
};

export function useGalloPrograms(companyId?: string) {
  const [programs, setPrograms] = useState<GalloProgramUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;

    setLoading(true);

    // 1️⃣ listen to programs
    const programsRef = collection(
      db,
      "companies",
      companyId,
      "galloPrograms"
    );

    const unsubscribePrograms = onSnapshot(
      programsRef,
      async (programSnap) => {
        try {
          const programDocs = programSnap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as GalloProgramType),
          }));

          // 2️⃣ fetch goals once (not per program)
          const goalsQuery = query(
            collection(db, "galloGoals"),
            where("companyId", "==", companyId)
          );

          const goalsSnap = await new Promise<any>((resolve, reject) => {
            const unsub = onSnapshot(
              goalsQuery,
              (snap) => {
                unsub();
                resolve(snap);
              },
              reject
            );
          });

          const programIdsWithGoals = new Set<string>(
            goalsSnap.docs
              .map((d: any) => d.data()?.programDetails?.programId)
              .filter(Boolean)
          );

          // 3️⃣ enrich programs
          const enriched: GalloProgramUI[] = programDocs.map((p) => ({
            ...p,
            hasGoals: programIdsWithGoals.has(p.programId),
          }));

          setPrograms(enriched);
          setError(null);
        } catch (err: any) {
          console.error("useGalloPrograms error", err);
          setError(err.message ?? "Failed to load programs");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error("program listener error", err);
        setError("Failed to load programs");
        setLoading(false);
      }
    );

    return () => unsubscribePrograms();
  }, [companyId]);

  return {
    programs,
    loading,
    error,
  };
}
