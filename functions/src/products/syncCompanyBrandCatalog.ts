// functions/src/products/syncCompanyBrandCatalog.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

type ProductInput = {
  companyProductId?: string;
  productName?: string;
  package?: string;
  productType?: string;
  brand?: string;
  brandFamily?: string;
  productSupplier?: string;
  supplierProductNumber?: string;
};

const cleanString = (value: unknown) => String(value || "").trim();

const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

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

export const syncCompanyBrandCatalog = onCall(
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
    const reset = Boolean(request.data?.reset ?? false);

    if (!companyId) {
      throw new HttpsError("invalid-argument", "Missing companyId.");
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

    const productsSnap = await productsRef.get();

    if (productsSnap.empty) {
      return {
        success: true,
        productCount: 0,
        brandCreatedCount: 0,
        deletedOldBrandCount: 0,
        message: "No products found for this company.",
      };
    }

    const brandMap = new Map<
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
        fallbackBrandKey: string;
      }
    >();

    productsSnap.docs.forEach((docSnap) => {
      const data = docSnap.data() as ProductInput;

      const companyProductId = cleanString(data.companyProductId || docSnap.id);
      const brand = cleanString(data.brand);
      const productSupplier = cleanString(data.productSupplier);

      if (!companyProductId || !brand) return;

      const fallbackBrandKey =
        getFallbackBrandKey(productSupplier, brand) ||
        `unknown_supplier__${normalizeText(brand)}`;

      const existing = brandMap.get(fallbackBrandKey) || {
        displayName: brand,
        normalizedName: normalizeText(brand),
        productSupplier,
        brandFamily: cleanString(data.brandFamily),
        productTypes: new Set<string>(),
        companyProductIds: new Set<string>(),
        supplierProductNumbers: new Set<string>(),
        supplierProductKeys: new Set<string>(),
        fallbackBrandKey,
      };

      existing.companyProductIds.add(companyProductId);
      const productType = cleanString(data.productType);

      if (productType) {
        existing.productTypes.add(productType);
      }

      const supplierProductNumber = cleanString(data.supplierProductNumber);

      if (supplierProductNumber) {
        existing.supplierProductNumbers.add(supplierProductNumber);
      }

      const supplierProductKey = getSupplierProductKey(
        productSupplier,
        supplierProductNumber
      );

      if (supplierProductKey) {
        existing.supplierProductKeys.add(supplierProductKey);
      }

      brandMap.set(fallbackBrandKey, existing);
    });

    const writer = db.bulkWriter();

    writer.onWriteError((error) => {
      if (error.failedAttempts < 3) return true;

      console.error("[syncCompanyBrandCatalog] BulkWriter failed:", error);
      return false;
    });

    let deletedOldBrandCount = 0;

    if (reset) {
      const existingBrandSnap = await brandCatalogRef.get();

      existingBrandSnap.docs.forEach((docSnap) => {
        writer.delete(docSnap.ref);
        deletedOldBrandCount += 1;
      });
    }

    let brandCreatedCount = 0;

    brandMap.forEach((brand) => {
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
      productCount: productsSnap.size,
      brandCreatedCount,
      deletedOldBrandCount,
      reset,
      message: reset
        ? "Brand catalog rebuilt from saved products."
        : "Brand catalog synced from saved products.",
    };
  }
);
