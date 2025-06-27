// src/utils/hooks/useIsDirty.ts
import { useMemo } from "react";
import { PostWithID } from "../utils/types";

interface DirtyCheckParams {
  description: string;
  totalCaseCount: number;
  brands: string[];
  companyGoalId: string | null;
  productType: string[];
  postUserUid: string;
}

/**
 * Returns true if any of the “edited” fields differ from the original post.
 */
export function useIsDirty(
  original: Pick<
    PostWithID,
    "description" | "totalCaseCount" | "brands" | "companyGoalId" | "productType" | "postUserUid"
  >,
  edited: DirtyCheckParams
) {
  return useMemo(() => {
    // 1) Description changed?
    if (edited.description !== original.description) return true;

    // 2) Case count changed?
    if (edited.totalCaseCount !== original.totalCaseCount) return true;

    // 3) Brands changed?
    const origBrands = original.brands ?? [];
    const aBrands = [...edited.brands].sort();
    const bBrands = [...origBrands].sort();
    if (aBrands.length !== bBrands.length || aBrands.some((v, i) => v !== bBrands[i]))
      return true;

    // 4) Company goal changed?
    const origGoal = original.companyGoalId ?? null;
    if (edited.companyGoalId !== origGoal) return true;

    // 5) ProductType changed?
    const origTypes = original.productType ?? [];
    const aTypes = [...edited.productType].sort();
    const bTypes = [...origTypes].sort();
    if (aTypes.length !== bTypes.length || aTypes.some((v, i) => v !== bTypes[i]))
      return true;

     // ---- NEW: postUser changed? ----
    if (edited.postUserUid !== original.postUserUid) return true;

    // nothing changed
    return false;
  }, [
    // original deps
    original.description,
    original.totalCaseCount,
    JSON.stringify(original.brands ?? []),
    original.companyGoalId,
    JSON.stringify(original.productType ?? []),
     original.postUserUid,  

    // edited deps
    edited.description,
    edited.totalCaseCount,
    JSON.stringify(edited.brands),
    edited.companyGoalId,
    JSON.stringify(edited.productType),
    edited.postUserUid,
  ]);
}
