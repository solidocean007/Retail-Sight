// accountStoreUtils.ts
import {
  CompanyAccountType,
} from "../types";
import { openDB } from "./indexedDBOpen";

export const saveAllCompanyAccountsToIndexedDB = async (
  accounts: CompanyAccountType[],
): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(["allUsersCompanyAccounts"], "readwrite");
  const store = transaction.objectStore("allUsersCompanyAccounts");

  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => {
      // console.log("All company accounts saved to IndexedDB successfully.");
      resolve();
    };

    transaction.onerror = (event) => {
      console.error(
        "Transaction error while saving all company accounts:",
        (event.target as IDBRequest).error,
      );
      reject((event.target as IDBRequest).error);
    };

    accounts.forEach((account, index) => {
      if (!account.accountNumber) {
        console.error("Missing accountNumber for account:", account);
      } else {
        const request = store.put(account);
        request.onsuccess = () => {
          // Optional: console.log(`Account ${index} saved`);
        };
        request.onerror = () => {
          console.error(`Error saving account ${index}:`, request.error);
          reject(request.error);
        };
      }
    });
  });
};

export const getAllCompanyAccountsFromIndexedDB = async (): Promise<
  CompanyAccountType[]
> => {
  const db = await openDB();
  const transaction = db.transaction(["allUsersCompanyAccounts"], "readonly");
  const store = transaction.objectStore("allUsersCompanyAccounts");
  const getAllRequest = store.getAll();

  return new Promise((resolve, reject) => {
    getAllRequest.onsuccess = () => {
      resolve(getAllRequest.result as CompanyAccountType[]);
    };
    getAllRequest.onerror = () => {
      reject("Error retrieving all company accounts from IndexedDB");
    };
  });
};

export async function saveUserAccountsToIndexedDB(
  accounts: CompanyAccountType[],
): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(["userAccounts_v2"], "readwrite");
  const store = transaction.objectStore("userAccounts_v2");

  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => {
      // console.log(
      //   "Transaction complete: Accounts added to IndexedDB successfully.",
      // );
      resolve();
    };

    transaction.onerror = (event) => {
      console.error("Transaction error:", (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };

    accounts.forEach((account, index) => {
      if (!account.accountNumber) {
        console.error("Missing accountNumber for account:", account);
      } else {
        const request = store.put(account); // Ensure account has `accountNumber` as the key
        request.onsuccess = () => {
          // console.log(`Account ${index} added to IndexedDB successfully:`, account);
        };
        request.onerror = () => {
          console.error(
            `Error adding account ${index} to IndexedDB:`,
            request.error,
          );
          reject(request.error);
        };
      }
    });
  });
}

export async function getUserAccountsFromIndexedDB(): Promise<any[]> {
  const db = await openDB();
  const transaction = db.transaction(["userAccounts_v2"], "readonly");
  const store = transaction.objectStore("userAccounts_v2");
  const getAllRequest = store.getAll();

  return new Promise((resolve, reject) => {
    getAllRequest.onsuccess = () => {
      resolve(getAllRequest.result);
    };
    getAllRequest.onerror = () => {
      reject("Error getting user accounts from IndexedDB");
    };
  });
}

export const deleteAccountFromIndexedDB = async (accountNumber: string) => {
  const db = await openDB();
  const transaction = db.transaction("userAccounts", "readwrite");
  const store = transaction.objectStore("userAccounts");

  return new Promise<void>((resolve, reject) => {
    const request = store.delete(accountNumber);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      console.error("Error deleting account from IndexedDB:", request.error);
      reject(request.error);
    };
  });
};