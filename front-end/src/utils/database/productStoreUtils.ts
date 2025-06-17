import { openDB } from "./indexedDBOpen";

import { ProductType } from "../types";

// Save all products to IndexedDB
export async function saveAllCompanyProductsToIndexedDB(
  products: ProductType[],
): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(["companyProducts"], "readwrite");
  const store = transaction.objectStore("companyProducts");

  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    products.forEach((product) => {
      if (!product.companyProductId) {
        console.warn("Missing product ID:", product);
        return;
      }
      const request = store.put(product);
      request.onerror = () => reject(request.error);
    });
  });
}

// Get all products from IndexedDB
export async function getAllCompanyProductsFromIndexedDB(): Promise<ProductType[]> {
  const db = await openDB();
  const transaction = db.transaction(["companyProducts"], "readonly");
  const store = transaction.objectStore("companyProducts");
  const getAllRequest = store.getAll();

  return new Promise((resolve, reject) => {
    getAllRequest.onsuccess = () => resolve(getAllRequest.result as ProductType[]);
    getAllRequest.onerror = () => reject(getAllRequest.error);
  });
}

// Clear all products from IndexedDB
export async function clearCompanyProductsFromIndexedDB(): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(["companyProducts"], "readwrite");
  const store = transaction.objectStore("companyProducts");

  return new Promise<void>((resolve, reject) => {
    const clearRequest = store.clear();
    clearRequest.onsuccess = () => resolve();
    clearRequest.onerror = () => {
      console.error("Failed to clear companyProducts:", clearRequest.error);
      reject(clearRequest.error);
    };
  });
}

export async function clearIndexedDBStore(storeName: string): Promise<void> {
  const db = await openDB();
  if (!db.objectStoreNames.contains(storeName)) {
    console.warn(`Store "${storeName}" does not exist in IndexedDB.`);
    return;
  }

  const tx = db.transaction([storeName], "readwrite");
  const store = tx.objectStore(storeName);
  return new Promise((resolve, reject) => {
    const clearRequest = store.clear();
    clearRequest.onsuccess = () => resolve();
    clearRequest.onerror = () => reject(clearRequest.error);
  });
}