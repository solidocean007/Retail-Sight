// src/components/ProductsManagement/utils/uploadCompanyProductsCallable.ts

import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../../../utils/firebase";
import { ProductType } from "../../../utils/types";

export type ProductUploadMode = "add" | "update" | "replace";

export interface UploadCompanyProductsPayload {
  companyId: string;
  mode: ProductUploadMode;
  products: ProductType[];
}

export interface UploadCompanyProductsResult {
  success: boolean;
  mode: ProductUploadMode;
  addedCount: number;
  updatedCount: number;
  skippedCount: number;
  brandCreatedCount: number;
  brandUpdatedCount: number;
  aliasCreatedCount: number;
  totalReceived: number;
  totalProcessed: number;
  message?: string;
}

const functions = getFunctions(app, "us-central1");

const cleanProduct = (product: ProductType): ProductType => ({
  companyProductId: String(product.companyProductId || "").trim(),
  productName: String(product.productName || "").trim(),
  package: String(product.package || "").trim(),
  productType: String(product.productType || "").trim(),
  brand: String(product.brand || "").trim(),
  brandFamily: String(product.brandFamily || "").trim(),
  productSupplier: String(product.productSupplier || "").trim(),
  supplierProductNumber: String(product.supplierProductNumber || "").trim(),
});

export const uploadCompanyProductsCallable = async (
  payload: UploadCompanyProductsPayload,
): Promise<UploadCompanyProductsResult> => {
  if (!payload.companyId) {
    throw new Error("Missing companyId.");
  }

  const cleanedProducts = payload.products
    .map(cleanProduct)
    .filter((p) => p.companyProductId && p.productName);

  if (!cleanedProducts.length) {
    throw new Error("No valid products found.");
  }

  const uploadCompanyProducts = httpsCallable<
    UploadCompanyProductsPayload,
    UploadCompanyProductsResult
  >(functions, "uploadCompanyProducts");

  const result = await uploadCompanyProducts({
    companyId: payload.companyId,
    mode: payload.mode,
    products: cleanedProducts,
  });

  return result.data;
};
