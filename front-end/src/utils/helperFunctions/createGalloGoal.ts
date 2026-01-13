import { doc, getDoc, setDoc } from "@firebase/firestore";
import {
  EnrichedGalloAccountType,
  FireStoreGalloGoalDocType,
  GalloGoalType,
  GalloProgramType,
} from "../types";
import { db } from "../firebase";

export const createGalloGoal = async (
  goalEnv: "prod" | "dev",
  selectedGoal: GalloGoalType | null,
  selectedProgram: GalloProgramType | null,
  allAccounts: EnrichedGalloAccountType[],
  selectedAccounts: EnrichedGalloAccountType[],

  companyId: string
): Promise<FireStoreGalloGoalDocType> => {
  if (!selectedGoal || !selectedProgram) {
    throw new Error("Selected goal or program is missing.");
  }

  const goalDocRef = doc(db, "galloGoals", selectedGoal.goalId);

  // 📝 Fetch existing goal (if it exists)
  const snapshot = await getDoc(goalDocRef);

  const selectedIds = new Set(
    selectedAccounts.map((a) => String(a.distributorAcctId))
  );

  let mergedAccounts: FireStoreGalloGoalDocType["accounts"] = allAccounts.map(
  (account) => ({
    distributorAcctId: account.distributorAcctId,
    accountName: account.accountName ?? "N/A",
    accountAddress: account.accountAddress ?? "N/A",
    salesRouteNums: Array.isArray(account.salesRouteNums)
      ? account.salesRouteNums
      : [],
    oppId: account.oppId,
    marketId: account.marketId ?? "N/A",
    status: selectedIds.has(String(account.distributorAcctId))
      ? "active"
      : "inactive",
  })
);


  if (snapshot.exists()) {
    const existingGoal = snapshot.data() as FireStoreGalloGoalDocType;

    mergedAccounts = [
      ...existingGoal.accounts,
      ...mergedAccounts.filter(
        (newAcc) =>
          !existingGoal.accounts.some(
            (existingAcc) =>
              existingAcc.distributorAcctId === newAcc.distributorAcctId
          )
      ),
    ];
  } else {
    console.log("🆕 No existing goal. Creating a new one.");
  }

  const savedGoal: FireStoreGalloGoalDocType = {
    lifeCycleStatus: "active",
    companyId: companyId,
    programDetails: {
      programId: selectedProgram.programId,
      programTitle: selectedProgram.programTitle,
      programDescription: (selectedProgram as any).programDesc ?? "",
      programStartDate: selectedProgram.startDate,
      programEndDate: selectedProgram.endDate,
    },
    goalDetails: {
      goalEnv: goalEnv,
      goalId: selectedGoal.goalId,
      goal: selectedGoal.goal,
      goalMetric: selectedGoal.goalMetric,
      goalValueMin: selectedGoal.goalValueMin,
    },
    accounts: mergedAccounts, // Types of property 'status' are incompatible.
    // Type 'string' is not assignable to type '"active" | "inactive" | "disabled"'.
  };

  console.log("📝 Prepared goal to save:", savedGoal);

  if (snapshot.exists()) {
    const existing = snapshot.data() as FireStoreGalloGoalDocType;

    const isExistingProd = existing.goalDetails.goalEnv === "prod";
    const isIncomingDev = goalEnv === "dev";

    if (isExistingProd && isIncomingDev) {
      // 🚫 do NOT update lifecycleStatus or env
      savedGoal.lifeCycleStatus = existing.lifeCycleStatus;
      savedGoal.goalDetails.goalEnv = "prod";
    }
  }

  // 🔥 Actually write merged goal to Firestore
  try {
    await setDoc(goalDocRef, savedGoal, { merge: true });
    console.log("✅ Goal created/updated successfully!");
    return savedGoal;
  } catch (err) {
    console.error("❌ Error saving goal to Firestore:", err);
    throw err;
  }
};
