import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../../utils/firebase";
import {
  CreatePlaybookForecastInput,
  PlaybookForecast,
  PlaybookForecastSummary,
} from "../../types/library";

export const addPlaybookForecast = async (
  input: CreatePlaybookForecastInput,
): Promise<string> => {
  const ref = await addDoc(collection(db, "playbookForecasts"), {
    ...input,
    status: input.status ?? "planned",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    serverCreatedAt: serverTimestamp(),
    serverUpdatedAt: serverTimestamp(),
  });

  return ref.id;
};

export const fetchPlaybookForecasts = async (
  playbookId: string,
  companyId: string,
): Promise<PlaybookForecast[]> => {
  const q = query(
    collection(db, "playbookForecasts"),
    where("playbookId", "==", playbookId),
    where("companyId", "==", companyId),
  );

  const snap = await getDocs(q);

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<PlaybookForecast, "id">),
  }));
};

export const buildPlaybookForecastSummary = (
  playbookId: string,
  forecasts: PlaybookForecast[],
): PlaybookForecastSummary => {
  const matching = forecasts.filter((f) => f.playbookId === playbookId);

  const participatingUsers = new Set(matching.map((f) => f.userId));
  const accountNumbers = new Set(matching.map((f) => f.accountNumber));

  return {
    playbookId,

    totalAccounts: accountNumbers.size,
    totalEstimatedCases: matching.reduce(
      (sum, f) => sum + (Number(f.estimatedCases) || 0),
      0,
    ),
    totalEstimatedUnits: matching.reduce(
      (sum, f) => sum + (Number(f.estimatedUnits) || 0),
      0,
    ),

    plannedCount: matching.filter((f) => f.status === "planned").length,
    pitchedCount: matching.filter((f) => f.status === "pitched").length,
    approvedCount: matching.filter((f) => f.status === "approved").length,
    executedCount: matching.filter((f) => f.status === "executed").length,
    missedCount: matching.filter((f) => f.status === "missed").length,

    participatingUserCount: participatingUsers.size,
  };
};