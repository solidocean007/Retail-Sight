import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

type ProductUploadMode = "add" | "update" | "replace";

type ProductInput = {
  companyProductId: string;
  productName: string;
  package: string;
  productType: string;
  brand?: string;
  brandFamily?: string;
  productSupplier?: string;
  supplierProductNumber?: string;
};

type ExistingBrandDoc = {
  id: string;
  brandId?: string;
  displayName?: string;
  brandName?: string;
  normalizedName?: string;
  normalizedBrandName?: string;
  aliases?: string[];
  productSupplier?: string;
  brandFamily?: string;
  productTypes?: string[];
  companyProductIds?: string[];
  supplierProductNumbers?: string[];
  supplierProductKeys?: string[];
  fallbackBrandKey?: string;
};

const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const cleanString = (value: unknown) => String(value || "").trim();

const getSupplierProductKey = (
  productSupplier?: string,
  supplierProductNumber?: string
) => {
  const supplier = normalizeText(productSupplier || "");
  const supplierProduct = normalizeText(supplierProductNumber || "");

  if (!supplier || !supplierProduct) return null;

  return `${supplier}__${supplierProduct}`;
};

const getFallbackBrandKey = (productSupplier?: string, brand?: string) => {
  const supplier = normalizeText(productSupplier || "");
  const normalizedBrand = normalizeText(brand || "");

  if (!supplier || !normalizedBrand) return null;

  return `${supplier}__${normalizedBrand}`;
};

const assertCanManageCompanyProducts = async (
  uid: string,
  companyId: string
) => {
  const userSnap = await db.collection("users").doc(uid).get();

  if (!userSnap.exists) {
    throw new HttpsError("permission-denied", "User profile not found.");
  }

  const user = userSnap.data() || {};
  const role = user.role;
  const userCompanyId = user.companyId;

  const allowedRoles = new Set(["admin", "super-admin", "developer"]);

  if (!allowedRoles.has(role)) {
    throw new HttpsError(
      "permission-denied",
      "You do not have permission to manage products."
    );
  }

  if (role !== "developer" && userCompanyId !== companyId) {
    throw new HttpsError(
      "permission-denied",
      "You cannot manage another company's products."
    );
  }
};

const validateProducts = (products: unknown): ProductInput[] => {
  if (!Array.isArray(products)) {
    throw new HttpsError("invalid-argument", "products must be an array.");
  }

  if (products.length === 0) {
    throw new HttpsError("invalid-argument", "No products provided.");
  }

  const cleaned = products
    .map((raw: any) => ({
      companyProductId: cleanString(raw.companyProductId),
      productName: cleanString(raw.productName),
      package: cleanString(raw.package),
      productType: cleanString(raw.productType),
      brand: cleanString(raw.brand),
      brandFamily: cleanString(raw.brandFamily),
      productSupplier: cleanString(raw.productSupplier),
      supplierProductNumber: cleanString(raw.supplierProductNumber),
    }))
    .filter((product) => product.companyProductId && product.productName);

  if (cleaned.length === 0) {
    throw new HttpsError("invalid-argument", "No valid products provided.");
  }

  return cleaned;
};

const buildExistingBrandLookups = (existingBrands: ExistingBrandDoc[]) => {
  const existingBySupplierProductKey = new Map<string, ExistingBrandDoc>();
  const existingByCompanyProductId = new Map<string, ExistingBrandDoc>();
  const existingByFallbackBrandKey = new Map<string, ExistingBrandDoc>();

  existingBrands.forEach((brand) => {
    (brand.supplierProductKeys || []).forEach((key) => {
      existingBySupplierProductKey.set(key, brand);
    });

    (brand.companyProductIds || []).forEach((id) => {
      existingByCompanyProductId.set(id, brand);
    });

    if (brand.fallbackBrandKey) {
      existingByFallbackBrandKey.set(brand.fallbackBrandKey, brand);
    }
  });

  return {
    existingBySupplierProductKey,
    existingByCompanyProductId,
    existingByFallbackBrandKey,
  };
};

export const uploadCompanyProducts = onCall(
  {
    region: "us-central1",
    timeoutSeconds: 300,
    memory: "1GiB",
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }

    const companyId = cleanString(request.data?.companyId);
    const mode = cleanString(request.data?.mode) as ProductUploadMode;
    const products = validateProducts(request.data?.products);

    if (!companyId) {
      throw new HttpsError("invalid-argument", "Missing companyId.");
    }

    if (!["add", "update", "replace"].includes(mode)) {
      throw new HttpsError("invalid-argument", "Invalid upload mode.");
    }

    await assertCanManageCompanyProducts(request.auth.uid, companyId);

    const productsRef = db
      .collection("products")
      .doc(companyId)
      .collection("items");

    const brandCatalogRef = db
      .collection("companies")
      .doc(companyId)
      .collection("brandCatalog");

    const existingProductsSnap = await productsRef.get();
    const existingProductIds = new Set(
      existingProductsSnap.docs.map((docSnap) => docSnap.id)
    );

    const existingBrandSnap = await brandCatalogRef.get();

    const existingBrands: ExistingBrandDoc[] = existingBrandSnap.docs.map(
      (docSnap) =>
        ({
          id: docSnap.id,
          ...docSnap.data(),
        }) as ExistingBrandDoc
    );

    const {
      existingBySupplierProductKey,
      existingByCompanyProductId,
      existingByFallbackBrandKey,
    } = buildExistingBrandLookups(existingBrands);

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const productsToProcess: ProductInput[] = [];

    for (const product of products) {
      const exists = existingProductIds.has(product.companyProductId);

      if (mode === "add" && exists) {
        skippedCount += 1;
        continue;
      }

      if (!exists) addedCount += 1;
      if (exists) updatedCount += 1;

      productsToProcess.push(product);
    }

    const brandUpdates = new Map<
      string,
      {
        refId: string;
        existing?: ExistingBrandDoc;
        displayName: string;
        normalizedName: string;
        productSupplier: string;
        brandFamily: string;
        productTypes: Set<string>;
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
        productTypes: Set<string>;
        companyProductIds: Set<string>;
        supplierProductNumbers: Set<string>;
        supplierProductKeys: Set<string>;
        aliases: Set<string>;
        fallbackBrandKey: string | null;
      }
    >();

    for (const product of productsToProcess) {
      if (!product.brand) continue;

      const supplierProductKey = getSupplierProductKey(
        product.productSupplier,
        product.supplierProductNumber
      );

      const fallbackBrandKey = getFallbackBrandKey(
        product.productSupplier,
        product.brand
      );

      const existing =
        (supplierProductKey &&
          existingBySupplierProductKey.get(supplierProductKey)) ||
        existingByCompanyProductId.get(product.companyProductId) ||
        (fallbackBrandKey &&
          existingByFallbackBrandKey.get(fallbackBrandKey)) ||
        null;

      const displayName = product.brand.trim();
      const normalizedName = normalizeText(product.brand);
      const productType = cleanString(product.productType);
      const productSupplier = product.productSupplier || "";
      const brandFamily = product.brandFamily || "";

      if (existing) {
        const target = brandUpdates.get(existing.id) || {
          refId: existing.id,
          existing,
          displayName,
          normalizedName,
          productSupplier,
          brandFamily,
          productTypes: new Set(existing.productTypes || []),
          companyProductIds: new Set(existing.companyProductIds || []),
          supplierProductNumbers: new Set(
            existing.supplierProductNumbers || []
          ),
          supplierProductKeys: new Set(existing.supplierProductKeys || []),
          aliases: new Set(existing.aliases || []),
          fallbackBrandKey: existing.fallbackBrandKey || fallbackBrandKey,
        };

        if (
          existing.displayName &&
          normalizeText(existing.displayName) !== normalizedName
        ) {
          target.aliases.add(existing.displayName);
        }

        target.displayName = displayName;
        target.normalizedName = normalizedName;
        target.productSupplier = productSupplier || target.productSupplier;
        target.brandFamily = brandFamily || target.brandFamily;
        target.companyProductIds.add(product.companyProductId);

        if (productType) {
          target.productTypes.add(productType);
        }

        if (product.supplierProductNumber) {
          target.supplierProductNumbers.add(product.supplierProductNumber);
        }

        if (supplierProductKey) {
          target.supplierProductKeys.add(supplierProductKey);
        }

        brandUpdates.set(existing.id, target);
        continue;
      }

      const newKey =
        fallbackBrandKey ||
        product.companyProductId ||
        brandCatalogRef.doc().id;

      const target = newBrands.get(newKey) || {
        displayName,
        normalizedName,
        productSupplier,
        brandFamily,
        productTypes: new Set<string>(),
        companyProductIds: new Set<string>(),
        supplierProductNumbers: new Set<string>(),
        supplierProductKeys: new Set<string>(),
        aliases: new Set<string>(),
        fallbackBrandKey,
      };

      target.companyProductIds.add(product.companyProductId);

      if (productType) {
        target.productTypes.add(productType);
      }

      if (product.supplierProductNumber) {
        target.supplierProductNumbers.add(product.supplierProductNumber);
      }

      if (supplierProductKey) {
        target.supplierProductKeys.add(supplierProductKey);
      }

      newBrands.set(newKey, target);
    }

    const writer = db.bulkWriter();

    writer.onWriteError((error) => {
      if (error.failedAttempts < 3) {
        return true;
      }

      console.error("[uploadCompanyProducts] BulkWriter failed:", error);
      return false;
    });

    for (const product of productsToProcess) {
      const productRef = productsRef.doc(product.companyProductId);
      const exists = existingProductIds.has(product.companyProductId);

      writer.set(
        productRef,
        {
          ...product,
          companyId,
          normalizedBrand: normalizeText(product.brand || ""),
          normalizedProductSupplier: normalizeText(
            product.productSupplier || ""
          ),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          ...(exists
            ? {}
            : { createdAt: admin.firestore.FieldValue.serverTimestamp() }),
        },
        { merge: mode !== "replace" }
      );
    }

    let brandUpdatedCount = 0;
    let brandCreatedCount = 0;
    let aliasCreatedCount = 0;

    brandUpdates.forEach((brand) => {
      const brandRef = brandCatalogRef.doc(brand.refId);

      const aliases = Array.from(brand.aliases).filter(
        (alias) => normalizeText(alias) !== brand.normalizedName
      );

      aliasCreatedCount += Math.max(
        0,
        aliases.length - (brand.existing?.aliases?.length || 0)
      );

      writer.set(
        brandRef,
        {
          brandId: brand.refId,
          companyId,

          displayName: brand.displayName,
          brandName: brand.displayName,

          normalizedName: brand.normalizedName,
          normalizedBrandName: brand.normalizedName,

          aliases,

          brandFamily: brand.brandFamily,
          productSupplier: brand.productSupplier,

          productTypes: Array.from(brand.productTypes).sort((a, b) =>
            a.localeCompare(b)
          ),

          companyProductIds: Array.from(brand.companyProductIds),
          supplierProductNumbers: Array.from(brand.supplierProductNumbers),
          supplierProductKeys: Array.from(brand.supplierProductKeys),
          fallbackBrandKey: brand.fallbackBrandKey,
          productCount: brand.companyProductIds.size,
          active: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      brandUpdatedCount += 1;
    });

    newBrands.forEach((brand) => {
      const brandRef = brandCatalogRef.doc();

      writer.set(brandRef, {
        brandId: brandRef.id,
        companyId,

        displayName: brand.displayName,
        brandName: brand.displayName,

        normalizedName: brand.normalizedName,
        normalizedBrandName: brand.normalizedName,

        aliases: [],

        brandFamily: brand.brandFamily,
        productSupplier: brand.productSupplier,

        productTypes: Array.from(brand.productTypes).sort((a, b) =>
          a.localeCompare(b)
        ),

        companyProductIds: Array.from(brand.companyProductIds),
        supplierProductNumbers: Array.from(brand.supplierProductNumbers),
        supplierProductKeys: Array.from(brand.supplierProductKeys),
        fallbackBrandKey: brand.fallbackBrandKey,
        productCount: brand.companyProductIds.size,
        active: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      brandCreatedCount += 1;
    });

    await writer.close();

    return {
      success: true,
      mode,
      addedCount,
      updatedCount,
      skippedCount,
      brandCreatedCount,
      brandUpdatedCount,
      aliasCreatedCount,
      totalReceived: products.length,
      totalProcessed: productsToProcess.length,
      message: "Products uploaded and brand catalog synced.",
    };
  }
);
