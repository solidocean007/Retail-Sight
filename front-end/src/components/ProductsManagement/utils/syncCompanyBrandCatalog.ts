// components/ProductsManagement/utils/syncCompanyBrandCatalog.ts

import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../../utils/firebase";
import { ProductType } from "../../../utils/types";

const normalizeText = (value: string = "") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getSupplierProductKey = (productSupplier?: string, supplierProductNumber?: string) => {
  const supplier = normalizeText(productSupplier);
  const supplierProduct = normalizeText(supplierProductNumber);

  if (!supplier || !supplierProduct) return null;

  return `${supplier}__${supplierProduct}`;
};

const getFallbackBrandKey = (productSupplier?: string, brand?: string) => {
  const supplier = normalizeText(productSupplier);
  const normalizedBrand = normalizeText(brand);

  if (!supplier || !normalizedBrand) return null;

  return `${supplier}__${normalizedBrand}`;
};

type ExistingBrandDoc = {
  id: string;
  brandId?: string;
  displayName?: string;
  normalizedName?: string;
  aliases?: string[];
  productSupplier?: string;
  companyProductIds?: string[];
  supplierProductNumbers?: string[];
  supplierProductKeys?: string[];
  fallbackBrandKey?: string;
};

export const syncCompanyBrandCatalog = async (
  companyId: string,
  products: ProductType[],
) => {
  const brandCatalogRef = collection(
    db,
    "companies",
    companyId,
    "brandCatalog",
  );

  const existingSnap = await getDocs(brandCatalogRef);

  const existingBrands: ExistingBrandDoc[] = existingSnap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));

  const existingBySupplierProductKey = new Map<string, ExistingBrandDoc>();
  const existingByCompanyProductId = new Map<string, ExistingBrandDoc>();
  const existingByFallbackBrandKey = new Map<string, ExistingBrandDoc>();

  existingBrands.forEach((brand) => {
    brand.supplierProductKeys?.forEach((key) => {
      existingBySupplierProductKey.set(key, brand);
    });

    brand.companyProductIds?.forEach((id) => {
      existingByCompanyProductId.set(id, brand);
    });

    if (brand.fallbackBrandKey) {
      existingByFallbackBrandKey.set(brand.fallbackBrandKey, brand);
    }
  });

  const updatesByBrandDocId = new Map<
    string,
    {
      refId: string;
      current?: ExistingBrandDoc;
      displayName: string;
      normalizedName: string;
      productSupplier: string;
      brandFamily: string;
      companyProductIds: Set<string>;
      supplierProductNumbers: Set<string>;
      supplierProductKeys: Set<string>;
      aliases: Set<string>;
      fallbackBrandKey: string | null;
    }
  >();

  const newBrands = new Map<
    string,
    {
      displayName: string;
      normalizedName: string;
      productSupplier: string;
      brandFamily: string;
      companyProductIds: Set<string>;
      supplierProductNumbers: Set<string>;
      supplierProductKeys: Set<string>;
      aliases: Set<string>;
      fallbackBrandKey: string | null;
    }
  >();

  products.forEach((product) => {
    if (!product.brand) return;

    const supplierProductKey = getSupplierProductKey(
      product.productSupplier,
      product.supplierProductNumber,
    );

    const fallbackBrandKey = getFallbackBrandKey(
      product.productSupplier,
      product.brand,
    );

    const existing =
      (supplierProductKey && existingBySupplierProductKey.get(supplierProductKey)) ||
      existingByCompanyProductId.get(product.companyProductId) ||
      (fallbackBrandKey && existingByFallbackBrandKey.get(fallbackBrandKey)) ||
      null;

    const displayName = product.brand.trim();
    const normalizedName = normalizeText(product.brand);
    const productSupplier = product.productSupplier || "";
    const brandFamily = product.brandFamily || "";

    if (existing) {
      const current = updatesByBrandDocId.get(existing.id);

      const target =
        current ||
        {
          refId: existing.id,
          current: existing,
          displayName,
          normalizedName,
          productSupplier,
          brandFamily,
          companyProductIds: new Set(existing.companyProductIds || []),
          supplierProductNumbers: new Set(existing.supplierProductNumbers || []),
          supplierProductKeys: new Set(existing.supplierProductKeys || []),
          aliases: new Set(existing.aliases || []),
          fallbackBrandKey,
        };

      if (
        existing.displayName &&
        normalizeText(existing.displayName) !== normalizedName
      ) {
        target.aliases.add(existing.displayName);
      }

      target.displayName = displayName;
      target.normalizedName = normalizedName;
      target.companyProductIds.add(product.companyProductId);

      if (product.supplierProductNumber) {
        target.supplierProductNumbers.add(product.supplierProductNumber);
      }

      if (supplierProductKey) {
        target.supplierProductKeys.add(supplierProductKey);
      }

      updatesByBrandDocId.set(existing.id, target);
      return;
    }

    const newKey =
      supplierProductKey ||
      product.companyProductId ||
      fallbackBrandKey ||
      crypto.randomUUID();

    const target =
      newBrands.get(newKey) ||
      {
        displayName,
        normalizedName,
        productSupplier,
        brandFamily,
        companyProductIds: new Set<string>(),
        supplierProductNumbers: new Set<string>(),
        supplierProductKeys: new Set<string>(),
        aliases: new Set<string>(),
        fallbackBrandKey,
      };

    target.companyProductIds.add(product.companyProductId);

    if (product.supplierProductNumber) {
      target.supplierProductNumbers.add(product.supplierProductNumber);
    }

    if (supplierProductKey) {
      target.supplierProductKeys.add(supplierProductKey);
    }

    newBrands.set(newKey, target);
  });

  const batch = writeBatch(db);

  updatesByBrandDocId.forEach((brand) => {
    const brandRef = doc(db, "companies", companyId, "brandCatalog", brand.refId);

    batch.set(
      brandRef,
      {
        brandId: brand.refId,
        companyId,

        displayName: brand.displayName,
        normalizedName: brand.normalizedName,
        aliases: Array.from(brand.aliases).filter(
          (alias) => normalizeText(alias) !== brand.normalizedName,
        ),

        brandFamily: brand.brandFamily,
        productSupplier: brand.productSupplier,

        companyProductIds: Array.from(brand.companyProductIds),
        supplierProductNumbers: Array.from(brand.supplierProductNumbers),
        supplierProductKeys: Array.from(brand.supplierProductKeys),
        fallbackBrandKey: brand.fallbackBrandKey,

        productCount: brand.companyProductIds.size,
        active: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });

  newBrands.forEach((brand) => {
    const brandRef = doc(brandCatalogRef);

    batch.set(brandRef, {
      brandId: brandRef.id,
      companyId,

      displayName: brand.displayName,
      normalizedName: brand.normalizedName,
      aliases: [],

      brandFamily: brand.brandFamily,
      productSupplier: brand.productSupplier,

      companyProductIds: Array.from(brand.companyProductIds),
      supplierProductNumbers: Array.from(brand.supplierProductNumbers),
      supplierProductKeys: Array.from(brand.supplierProductKeys),
      fallbackBrandKey: brand.fallbackBrandKey,

      productCount: brand.companyProductIds.size,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
};