// utils/database/brandCatalogStoreUtils.ts
import { openDB } from "./indexedDBOpen";
import { BrandCatalogItem } from "../types";

const STORE_NAME = "companyBrandCatalog";
const COMPANY_INDEX = "byCompanyId";

export async function saveCompanyBrandCatalogToIndexedDB(
  companyId: string,
  brands: BrandCatalogItem[],
): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction([STORE_NAME], "readwrite");
  const store = transaction.objectStore(STORE_NAME);

  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    const index = store.index(COMPANY_INDEX);
    const range = IDBKeyRange.only(companyId);
    const cursorRequest = index.openCursor(range);

    cursorRequest.onerror = () => reject(cursorRequest.error);

    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;

      if (cursor) {
        cursor.delete();
        cursor.continue();
        return;
      }

      brands.forEach((brand) => {
        if (!brand.brandId) return;

        store.put({
          ...brand,
          companyId,
          cachedAt: Date.now(),
        });
      });
    };
  });
}

export async function getCompanyBrandCatalogFromIndexedDB(
  companyId: string,
): Promise<BrandCatalogItem[]> {
  const db = await openDB();
  const transaction = db.transaction([STORE_NAME], "readonly");
  const store = transaction.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const index = store.index(COMPANY_INDEX);
    const request = index.getAll(companyId);

    request.onsuccess = () => {
      const brands = (request.result ?? []) as BrandCatalogItem[];

      resolve(
        brands.sort((a, b) =>
          (a.brandName || "").localeCompare(b.brandName || ""),
        ),
      );
    };

    request.onerror = () => reject(request.error);
  });
}

export async function clearCompanyBrandCatalogFromIndexedDB(
  companyId?: string,
): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction([STORE_NAME], "readwrite");
  const store = transaction.objectStore(STORE_NAME);

  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    if (!companyId) {
      store.clear();
      return;
    }

    const index = store.index(COMPANY_INDEX);
    const request = index.openCursor(IDBKeyRange.only(companyId));

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const cursor = request.result;

      if (!cursor) return;

      cursor.delete();
      cursor.continue();
    };
  });
}