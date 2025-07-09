import {
  CompanyGoalType,
  FireStoreGalloGoalDocType,
} from "../types";
import { openDB } from "./indexedDBOpen";

export const saveGoalsToIndexedDB = async (
  goals: FireStoreGalloGoalDocType[] | CompanyGoalType[],
  goalType:
    | "galloGoals"
    | "companyGoals"
    | "allGalloGoals"
    | "allCompanySpecificGoals",
): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(goalType, "readwrite");
  const store = transaction.objectStore(goalType);

  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => {
      // console.log(`${goalType} saved to IndexedDB successfully.`);
      resolve();
    };

    transaction.onerror = (event) => {
      console.error(
        `Error saving ${goalType} to IndexedDB:`,
        (event.target as IDBRequest).error,
      );
      reject((event.target as IDBRequest).error);
    };

    // Clear store before saving new goals (optional for `allGalloGoals` types)
    if (goalType.startsWith("all")) {
      store.clear().onsuccess = () => {
        goals.forEach((goal) => {
          store.put({
            ...goal,
            id: goal.goalDetails?.goalId || crypto.randomUUID(), // Property 'goalDetails' does not exist on type 'FireStoreGalloGoalDocType | CompanyGoalType'.
            // Property 'goalDetails' does not exist on type 'CompanyGoalType'.ts(2339)
          });
        });
      };
    } else {
      goals.forEach((goal) => {
        store.put({
          ...goal,
          id: goal.goalDetails?.goalId || crypto.randomUUID(), // Property 'goalDetails' does not exist on type 'CompanyGoalType | FireStoreGalloGoalDocType'.
  // Property 'goalDetails' does not exist on type 'CompanyGoalType'
        });
      });
    }
  });
};

export const saveSingleGalloGoalToIndexedDB = async (
  goal: FireStoreGalloGoalDocType
): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(["allGalloGoals"], "readwrite");
  const store = transaction.objectStore("allGalloGoals");

  return new Promise<void>((resolve, reject) => {
    if (!goal.goalDetails?.goalId) {
      console.error("Cannot save goal: Missing goalDetails.goalId", goal);
      reject(
        new Error("Invalid goal: Missing goalDetails.goalId")
      );
      return;
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) => {
      console.error(
        "Error saving single Gallo goal to IndexedDB:",
        (event.target as IDBRequest).error
      );
      reject((event.target as IDBRequest).error);
    };

    const goalWithKey = {
      ...goal,
      id: goal.goalDetails.goalId, // Use the existing goalId as key
    };

    console.log("Saving single Gallo goal:", goalWithKey);
    store.put(goalWithKey);
  });
};



export const saveAllGalloGoalsToIndexedDB = async (
  goals: FireStoreGalloGoalDocType[],
): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(["allGalloGoals"], "readwrite");
  const store = transaction.objectStore("allGalloGoals");

  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = (event) => {
      console.error(
        "Error saving all Gallo goals to IndexedDB:",
        (event.target as IDBRequest).error,
      );
      reject((event.target as IDBRequest).error);
    };

    // Clear store before saving updated data
    store.clear().onsuccess = () => {
      goals.forEach((goal) => {
        const goalWithKey = {
          ...goal,
          // goalId: goal.goalDetails.goalId, // Ensure key is explicitly included
          id: goal.goalDetails.goalId, // Ensure key is explicitly included
        };
        console.log("Saving goal:", goalWithKey);
        console.log(goalWithKey);
        store.put(goalWithKey);
      });
    };

    store.clear().onerror = (event) => {
      console.error(
        "Error clearing allGalloGoals store:",
        (event.target as IDBRequest).error,
      );
      reject((event.target as IDBRequest).error);
    };
  });
};

// Fetch goals from IndexedDB
export const getUsersGalloGoalsFromIndexedDB = async (): Promise<
  FireStoreGalloGoalDocType[]
> => {
  const db = await openDB();
  const transaction = db.transaction(["galloGoals"], "readonly");
  const store = transaction.objectStore("galloGoals");

  return new Promise<FireStoreGalloGoalDocType[]>((resolve, reject) => {
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = () => {
      const goals = getAllRequest.result || [];
      resolve(goals as FireStoreGalloGoalDocType[]);
    };

    getAllRequest.onerror = () => {
      console.error("Error fetching goals from IndexedDB");
      reject("Error fetching goals from IndexedDB");
    };
  });
};

// Fetch goals from IndexedDB
export const getAllGalloGoalsFromIndexedDB = async (): Promise<
  FireStoreGalloGoalDocType[]
> => {
  const db = await openDB();
  const transaction = db.transaction(["allGalloGoals"], "readonly");
  const store = transaction.objectStore("allGalloGoals");

  return new Promise<FireStoreGalloGoalDocType[]>((resolve, reject) => {
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = () => {
      const goals = getAllRequest.result as FireStoreGalloGoalDocType[];
      resolve(goals);
    };

    getAllRequest.onerror = () => {
      console.error("Error fetching all company goals from IndexedDB");
      reject("Error fetching all company goals from IndexedDB");
    };
  });
};

export const clearSomeGalloGoalsFromIndexedDB = async (
  goalIds: string[],
): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(["allGalloGoals"], "readwrite");
  const store = transaction.objectStore("allGalloGoals");

  return new Promise<void>((resolve, reject) => {
    const retainedGoals: FireStoreGalloGoalDocType[] = [];
    const request = store.getAll();

    request.onsuccess = () => {
      const allGoals = request.result as FireStoreGalloGoalDocType[];
      retainedGoals.push(
        ...allGoals.filter(
          (goal) => !goalIds.includes(goal.goalDetails.goalId),
        ),
      );

      // Clear all and repopulate retained goals
      store.clear().onsuccess = () => {
        retainedGoals.forEach((goal) => {
          store.put(goal);
        });
        resolve();
      };

      store.clear().onerror = (event) => {
        console.error(
          "Error clearing allGalloGoals store:",
          (event.target as IDBRequest).error,
        );
        reject((event.target as IDBRequest).error);
      };
    };

    request.onerror = (event) => {
      console.error(
        "Error retrieving goals for batch clear:",
        (event.target as IDBRequest).error,
      );
      reject((event.target as IDBRequest).error);
    };
  });
};

// Clear goals from IndexedDB
export const clearGoalsFromIndexedDB = async (
  goalType:
    | "galloGoals"
    | "companyGoals"
    | "allGalloGoals"
    | "allCompanySpecificGoals" = "galloGoals",
): Promise<void> => {
  // console.log(`Clearing goals from store: ${goalType}`);
  const db = await openDB();

  if (!db.objectStoreNames.contains(goalType)) {
    console.error(`Store ${goalType} does not exist in IndexedDB.`);
    return;
  }

  const transaction = db.transaction(goalType, "readwrite");
  const store = transaction.objectStore(goalType);

  try {
    await store.clear();
    // console.log(`Cleared all entries from ${goalType} in IndexedDB.`);
  } catch (error) {
    console.error(`Error clearing ${goalType} from IndexedDB:`, error);
    throw error; // Rethrow error for caller to handle
  }
};