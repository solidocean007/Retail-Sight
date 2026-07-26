import { doc, getDoc, setDoc } from "@firebase/firestore";
import {
  EnrichedGalloAccountType,
  FireStoreGalloGoalDocType,
  GalloGoalType,
  GalloProgramType,
} from "../types";
import { db } from "../firebase";
import { Timestamp } from "firebase/firestore";

function dateStringToTimestamp(date?: string | null) {
  if (!date) return null;
  const ms = Date.parse(date);
  return Number.isNaN(ms) ? null : Timestamp.fromMillis(ms);
}

export const createGalloGoal = async (
  goalEnv: "prod" | "dev",
  selectedGoal: GalloGoalType | null,
  selectedProgram: GalloProgramType | null,
  allAccounts: EnrichedGalloAccountType[],
  selectedAccounts: EnrichedGalloAccountType[],

  companyId: string,

  /**
   * The admin doing the import. Recorded as the goal's owner so report
   * notifications have somewhere to go — Gallo goals aren't in `companyGoals`,
   * so without this they resolve to nobody and only surface in the 5pm digest.
   */
  createdBy?: { uid: string; firstName?: string; lastName?: string },
): Promise<FireStoreGalloGoalDocType> => {
  if (!selectedGoal || !selectedProgram) {
    throw new Error("Selected goal or program is missing.");
  }

  const goalDocRef = doc(db, "galloGoals", selectedGoal.goalId);

  // 📝 Fetch existing goal (if it exists)
  const snapshot = await getDoc(goalDocRef);

  const selectedIds = new Set(
    selectedAccounts.map((a) => String(a.distributorAcctId)),
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
    }),
  );

  if (snapshot.exists()) {
    const existingGoal = snapshot.data() as FireStoreGalloGoalDocType;

    mergedAccounts = [
      ...existingGoal.accounts,
      ...mergedAccounts.filter(
        (newAcc) =>
          !existingGoal.accounts.some(
            (existingAcc) =>
              existingAcc.distributorAcctId === newAcc.distributorAcctId,
          ),
      ),
    ];
  } else {
    console.log("🆕 No existing goal. Creating a new one.");
  }

  const displayDateTs = dateStringToTimestamp(selectedProgram.displayDate);

  const savedGoal: FireStoreGalloGoalDocType = {
    lifeCycleStatus: "active",
    displayDate: displayDateTs,
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
    accounts: mergedAccounts,
  };

  // First importer owns the goal. A later re-import (adding accounts to an
  // existing program) doesn't reassign ownership — otherwise the person who
  // gets the feedback notifications would silently change hands.
  const existingCreator = snapshot.exists()
    ? (snapshot.data() as FireStoreGalloGoalDocType).createdByUserId
    : undefined;

  if (existingCreator) {
    savedGoal.createdByUserId = existingCreator;
  } else if (createdBy?.uid) {
    savedGoal.createdByUserId = createdBy.uid;
    savedGoal.createdByFirstName = createdBy.firstName ?? "";
    savedGoal.createdByLastName = createdBy.lastName ?? "";
  }

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
