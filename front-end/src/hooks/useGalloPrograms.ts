// hooks/useGalloPrograms.ts
import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import {
  FirestoreGalloProgramType,
  DisplayGalloProgram,
} from "../utils/types";

export function useGalloPrograms(companyId?: string) {
  const [programs, setPrograms] = useState<DisplayGalloProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;

    setLoading(true);

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
          // 1️⃣ read programs WITH Firestore fields intact
          const programDocs: FirestoreGalloProgramType[] =
            programSnap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as FirestoreGalloProgramType),
            }));

          // 2️⃣ fetch goals once
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

          // 3️⃣ normalize for UI
          const displayPrograms: DisplayGalloProgram[] = programDocs.map(
            (p) => ({
              ...p,
              hasGoals: programIdsWithGoals.has(p.programId),
              updatedAtMs: p.updatedAt.toMillis(),
            })
          );

          setPrograms(displayPrograms);
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
