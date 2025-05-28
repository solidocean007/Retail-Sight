import * as XLSX from "xlsx";
import { ProductType, ProductTypeWithId } from "../../../utils/types";

type ProductUpdateFields = Partial<ProductType>;

const parseProductsFromFile = (
  file: File,
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
            supplierProductNumber: row.supplierProductNumber?.trim() || undefined,
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

        const products: ProductType[] = rows.map((row) => ({
          companyProductId: row.companyProductId?.trim() || "",
          productName: row.productName?.trim() || "",
          package: row.package?.trim() || "",
          productType: row.productType?.trim() || "",
          brand: row.brand?.trim() || "",
          brandFamily: row.brandFamily?.trim() || "",
          productSupplier: row.productSupplier?.trim() || "",
          supplierProductNumber: row.supplierProductNumber?.trim() || "",
        }));

        resolve(products.filter((p) => p.productName)); // Ensure valid entries
      } catch (err) {
        reject(err);
      }
    };

    reader.readAsArrayBuffer(file);
  });
};


export const getProductsForUpdate = async (
  file: File,
  existingProducts: ProductTypeWithId[],
): Promise<ProductTypeWithId[]> => {
  const raw = await parseProductsFromFile(file);
  const map = new Map(existingProducts.map((p) => [p.companyProductId, p]));
  const updates: ProductTypeWithId[] = [];

  for (const [productId, fields] of Object.entries(raw)) {
    const existing = map.get(productId);
    if (!existing) continue;

    updates.push({
      ...existing,
      ...Object.fromEntries(
        Object.entries(fields).filter(([, v]) => v !== undefined),
      ),
    });
  }

  return updates;
};

