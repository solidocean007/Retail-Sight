// src/components/ProductsManagement/utils/syncCompanyBrandCatalogCallable.ts
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../../../utils/firebase";

export interface SyncCompanyBrandCatalogPayload {
  companyId: string;
  reset?: boolean;
}

export interface SyncCompanyBrandCatalogResult {
  success: boolean;
  productCount: number;
  brandCreatedCount: number;
  deletedOldBrandCount: number;
  reset: boolean;
  message?: string;
}

const functions = getFunctions(app, "us-central1");

export const syncCompanyBrandCatalogCallable = async (
  payload: SyncCompanyBrandCatalogPayload,
): Promise<SyncCompanyBrandCatalogResult> => {
  if (!payload.companyId) {
    throw new Error("Missing companyId.");
  }

  const callable = httpsCallable<
    SyncCompanyBrandCatalogPayload,
    SyncCompanyBrandCatalogResult
  >(functions, "syncCompanyBrandCatalog");

  const result = await callable(payload);

  return result.data;
};