import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import { PlanType, PlanName } from "./types";

export const getPlanDetails = async (planName: PlanName): Promise<PlanType> => {
  const fn = httpsCallable(functions, "getPlanDetails");
  const res = await fn({ planName });
  const data = res.data as any;

  return {
    name: data.name as PlanName, // ✅ Cast the name to your union
    price: data.price ?? 0,
    description: data.description ?? "",
    connectionLimit: data.connectionLimit ?? 0,
    userLimit: data.userLimit ?? 0,
    features: data.features ?? [],
  };
};

