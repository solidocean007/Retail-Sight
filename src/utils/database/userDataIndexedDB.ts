import { UserType } from "../types";
import { openDB } from "./indexedDBOpen";

const USER_DATA_STORE = 'users'; // Name of the IndexedDB store for user data
const USER_DATA_KEY = 'currentUser'; // Assuming you use a single key for storing current user data

export const saveUserDataToIndexedDB = async (userData: UserType) => {
  const db = await openDB();
  const transaction = db.transaction([USER_DATA_STORE], 'readwrite');
  const store = transaction.objectStore(USER_DATA_STORE);
  const request = store.put(userData, USER_DATA_KEY); // Use put if you want to update existing entries, add if not
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getUserDataFromIndexedDB = async (): Promise<UserType | null> => {
  const db = await openDB();
  const transaction = db.transaction([USER_DATA_STORE], 'readonly');
  const store = transaction.objectStore(USER_DATA_STORE);
  const request = store.get(USER_DATA_KEY);
  
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result as UserType);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

export const clearUserDataFromIndexedDB = async () => {
  const db = await openDB();
  const transaction = db.transaction([USER_DATA_STORE], 'readwrite');
  const store = transaction.objectStore(USER_DATA_STORE);
  const request = store.delete(USER_DATA_KEY);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};