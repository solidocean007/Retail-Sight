import dayjs from "dayjs";
import {
  FireStoreGalloGoalDocType,
  GalloProgramType,
} from "../../../utils/types";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../utils/firebase";

export const updateGalloGoalAccounts = async (
  goalId: string,
  accounts: FireStoreGalloGoalDocType["accounts"]
) => {
  const ref = doc(db, "galloGoals", goalId);

  await updateDoc(ref, {
    accounts,
    updatedAt: Date.now(),
  });
};

export const isProgramExpired = (program: GalloProgramType) => {
  if (!program.endDate) return false;
  return dayjs(program.endDate).isBefore(dayjs(), "day");
};
