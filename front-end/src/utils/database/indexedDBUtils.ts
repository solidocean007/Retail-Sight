// indexedDBUtils.ts
export * from './postStoreUtils';
export * from './accountStoreUtils';
export * from './filterSetsUtils';
export * from './goalsStoreUtils';
export * from './collectionStoreUtils';
export * from './productStoreUtils';
import { openDB } from "./indexedDBOpen";

// store locations in indexedDB
export async function storeLocationsInIndexedDB(locations: {
  [key: string]: string[];
}): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(["locations"], "readwrite");
  const store = transaction.objectStore("locations");

  return new Promise<void>((resolve, reject) => {
    // Clear existing locations before storing new ones
    const clearRequest = store.clear();
    clearRequest.onerror = (event) => {
      reject((event.target as IDBRequest).error);
    };

    clearRequest.onsuccess = () => {
      // Handle the successful completion of the transaction
      transaction.oncomplete = () => {
        resolve();
      };

      // Handle any errors that occur during the transaction
      transaction.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };

      // Perform the 'put' operations for each location
      for (const state in locations) {
        // Assuming that 'state' is the keyPath defined for your 'locations' object store
        // and the 'locations[state]' array is the value you want to store.
        // The key is already part of the value being stored, so you don't need to specify it again.
        const locationEntry = {
          state: state, // This is your key path
          cities: locations[state], // This is your value
        };

        // No need to pass the key as the second parameter since it's an inline key.
        const request = store.put(locationEntry);

        request.onerror = () => {
          reject(request.error);
        };
      }
    };
  });
}

// get locations from indexedDB
export async function getLocationsFromIndexedDB(): Promise<{
  [key: string]: string[];
} | null> {
  const db = await openDB();
  const transaction = db.transaction(["locations"], "readonly");
  const store = transaction.objectStore("locations");
  const getAllRequest = store.getAll();

  return new Promise((resolve, reject) => {
    getAllRequest.onsuccess = () => {
      const allLocations = getAllRequest.result;

      if (!Array.isArray(allLocations) || allLocations.length === 0) {
        resolve(null); // Resolve with null if no data is found
        return;
      }

      const locations = allLocations.reduce((acc, location) => {
        // Assuming your keyPath is "state"
        const state = location.state;
        if (state && Array.isArray(location.cities)) {
          acc[state] = location.cities;
        } else {
        }
        return acc;
      }, {});

      resolve(locations);
    };
    getAllRequest.onerror = () => {
      console.error(
        "Error fetching locations from IndexedDB:",
        getAllRequest.error,
      );
      reject(getAllRequest.error);
    };
  });
}

export async function getLastSeenTimestamp(): Promise<string | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("lastSeenTimestamp", "readonly");
    const store = transaction.objectStore("lastSeenTimestamp");
    const request = store.get("timestamp");

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

export async function setLastSeenTimestamp(timestamp: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("lastSeenTimestamp", "readwrite");
    const store = transaction.objectStore("lastSeenTimestamp");
    const request = store.put(timestamp, "timestamp");

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve();
    };
  });
}

export async function closeAndDeleteIndexedDB(): Promise<void> {
  try {
    const db = await openDB();
    db.close(); // Close the connection before attempting to delete

    return new Promise<void>((resolve, reject) => {
      const dbRequest = indexedDB.deleteDatabase("myRetailAppDB");

      // Timeout in case deletion gets blocked or hangs
      const timeout = setTimeout(() => {
        console.warn("Timeout: Deletion is taking too long.");
        resolve(); // Force resolve after timeout to prevent app hang
      }, 5000); // 5 seconds

      dbRequest.onsuccess = () => {
        clearTimeout(timeout);
        resolve();
      };

      dbRequest.onerror = (event) => {
        clearTimeout(timeout);
        const error = (event.target as IDBRequest).error;
        console.error("Error deleting IndexedDB database:", error);
        reject(error);
      };

      dbRequest.onblocked = () => {
        clearTimeout(timeout);
        console.warn("Deletion blocked. Close all tabs with this site open.");
        reject(new Error("Deletion blocked. Please close other tabs."));
      };
    });
  } catch (error) {
    console.error("Failed to open or delete the database:", error);
    throw new Error("Failed to delete the IndexedDB database.");
  }
}






