// userDataIndexedDB.ts
import { UserType } from "../types";
import { openDB } from "./indexedDBOpen";

const USER_DATA_STORE = 'users'; // Name of the IndexedDB store for user data
const USER_DATA_KEY = 'currentUser'; // Assuming you use a single key for storing current user data
const USERS_COMPANY_USERS = 'userCompanyEmployees'

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

export const updateUserRoleInIndexedDB = async (userId: string, newRole: string) => {
  const db = await openDB();
  const transaction = db.transaction([USERS_COMPANY_USERS], 'readwrite');
  const store = transaction.objectStore(USERS_COMPANY_USERS);

  // First, get the user by their ID
  const userRequest = store.get(userId);

  return new Promise<void>((resolve, reject) => {
    userRequest.onsuccess = () => {
      const user = userRequest.result;
      if (user) {
        // Update the user's role
        user.role = newRole;

        // Put the updated user back into the store
        const updateRequest = store.put(user);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        reject(new Error('User not found'));
      }
    };

    userRequest.onerror = () => {
      reject(userRequest.error);
    };

    // Optional: handle transaction errors
    transaction.onerror = () => reject(transaction.error);
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

export const saveCompanyUsersToIndexedDB = async (companyUsers: UserType[]) => {
  const db = await openDB(); // Assuming openDB is a function that opens the IndexedDB connection
  const transaction = db.transaction(['usersCompanyEmployees'], 'readwrite');
  const store = transaction.objectStore('usersCompanyEmployees');

  return new Promise<void>((resolve, reject) => {
    companyUsers.forEach((user) => {
      const request = store.put(user); // Ensure that user has a property that matches the key path
      request.onerror = () => {
        console.error('Error putting user into IndexedDB:', request.error);
        reject(request.error);
      };
    });

    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      console.error('Transaction error in IndexedDB:', transaction.error);
      reject(transaction.error);
    };
  });
};

export const getCompanyUsersFromIndexedDB = async (): Promise<UserType[]> => {
  const db = await openDB();
  const transaction = db.transaction([USERS_COMPANY_USERS], 'readonly');
  const store = transaction.objectStore('usersCompanyEmployees');
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as UserType[]);
    request.onerror = () => reject(request.error);
  });
};