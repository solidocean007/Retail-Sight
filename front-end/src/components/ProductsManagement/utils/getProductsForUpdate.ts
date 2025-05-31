import * as XLSX from "xlsx";
import { ProductType } from "../../../utils/types";

type ProductUpdateFields = Partial<ProductType>;

const parseProductsFromFile = (
  file: File
): Promise<Record<string, ProductUpdateFields>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
          defval: "",
          header: 0,
        });

        const map = new Map<string, ProductUpdateFields>();

        rows.forEach((row) => {
          const companyProductId = String(row.companyProductId).trim();
          if (!companyProductId) return;

          const update: ProductUpdateFields = {
            productName: row.productName?.trim() || undefined,
            package: row.package?.trim() || undefined,
            productType: row.productType?.trim() || undefined,
            brand: row.brand?.trim() || undefined,
            brandFamily: row.brandFamily?.trim() || undefined,
            productSupplier: row.productSupplier?.trim() || undefined,
            supplierProductNumber:
              row.supplierProductNumber?.trim() || undefined,
          };

          map.set(companyProductId, update);
        });

        resolve(Object.fromEntries(map));
      } catch (err) {
        reject(err);
      }
    };

    reader.readAsArrayBuffer(file);
  });
};

export const getProductsForAdd = async (file: File): Promise<ProductType[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
          defval: "",
          header: 0,
        });

        const requiredHeaders = [
          "companyProductId",
          "productName",
          "package",
          "productType",
          "brand",
          "brandFamily",
          "productSupplier",
          "supplierProductNumber",
        ];

        const firstRow = rows[0];
        const rowKeys = Object.keys(firstRow || {});

        const missing = requiredHeaders.filter((key) => !rowKeys.includes(key));

        if (missing.length > 0) {
          return reject(
            new Error(
              `Missing column headers: ${missing.join(
                ", "
              )}. Make sure your file uses the correct template.`
            )
          );
        }

        const products: ProductType[] = rows.map((row) => ({
          // .trim() is causing a problem.  why?  this row in the file is formatted with a select drop down by the way
          companyProductId: String(row.companyProductId || "").trim(),
          productName: String(row.productName || "").trim(),
          package: String(row.package || "").trim(),
          productType: String(row.productType || "").trim(),
          brand: String(row.brand || "").trim(),
          brandFamily: String(row.brandFamily || "").trim(),
          productSupplier: String(row.productSupplier || "").trim(),
          supplierProductNumber: String(row.supplierProductNumber || "").trim(),
        }));

        resolve(products.filter((p) => p.productName));
      } catch (err) {
        reject(err);
      }
    };

    reader.readAsArrayBuffer(file);
  });
};

export const getProductsForUpdate = async (
  file: File,
  existingProducts: ProductType[]
): Promise<ProductType[]> => {
  const raw = await parseProductsFromFile(file);

  // ✅ Check headers in the first row
  const requiredHeaders = [
    "companyProductId",
    "productName",
    "package",
    "productType",
    "brand",
    "brandFamily",
    "productSupplier",
    "supplierProductNumber",
  ];

  const firstEntry = Object.values(raw)[0];
  if (!firstEntry) {
    throw new Error("No rows found in uploaded file.");
  }

  const headersInFile = Object.keys(firstEntry);
  const missingHeaders = requiredHeaders.filter(
    (h) => !headersInFile.includes(h)
  );

  if (missingHeaders.length > 0) {
    throw new Error(
      `Missing column headers: ${missingHeaders.join(
        ", "
      )}. Please use the correct upload template.`
    );
  }

  // ✅ Proceed to create update list
  const productMap = new Map(
    existingProducts.map((p) => [p.companyProductId, p])
  );

  const updates: ProductType[] = [];

  for (const [productId, fields] of Object.entries(raw)) {
    const existing = productMap.get(productId);
    if (!existing) continue;

    updates.push({
      ...existing,
      ...Object.fromEntries(
        Object.entries(fields).filter(([, v]) => v !== undefined)
      ),
    });
  }

  return updates;
};
