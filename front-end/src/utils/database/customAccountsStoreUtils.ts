// src/utils/database/customAccountsStoreUtils.ts
import { CompanyAccountType } from "../types";
import { openDB } from "./indexedDBOpen";

const STORE_NAME = "customAccounts";

export const saveCustomAccountsToIndexedDB = async (
  accounts: CompanyAccountType[]
): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction([STORE_NAME], "readwrite");
  const store = transaction.objectStore(STORE_NAME);

  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) => {
      console.error("Transaction error saving custom accounts:", (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };

    accounts.forEach((account, index) => {
      if (!account.accountNumber) {
        console.error("Missing accountNumber for custom account:", account);
        return;
      }

      const request = store.put(account);
      request.onerror = () => {
        console.error(`Failed to save custom account [${index}]:`, request.error);
        reject(request.error);
      };
    });
  });
};

export const getCustomAccountsFromIndexedDB = async (): Promise<CompanyAccountType[]> => {
  const db = await openDB();
  const transaction = db.transaction([STORE_NAME], "readonly");
  const store = transaction.objectStore(STORE_NAME);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result as CompanyAccountType[]);
    };
    request.onerror = () => {
      console.error("Failed to retrieve custom accounts from IndexedDB:", request.error);
      reject(request.error);
    };
  });
};