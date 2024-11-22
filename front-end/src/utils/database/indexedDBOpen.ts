// indexedDBOpen.ts
const dbName = "myRetailAppDB";
const dbVersion = 24;
export function openDB(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);

    request.onerror = (event: Event) => {
      // Cast the event.target to an IDBRequest which has the error property
      const target = event.target as IDBRequest;
      if (target.error) {
        reject(`IndexedDB database error: ${target.error.message}`);
      } else {
        reject(`IndexedDB database error: Unknown error`);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
    
      if (!db.objectStoreNames.contains("posts")) {
        db.createObjectStore("posts", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("filteredPosts")) {
        db.createObjectStore("filteredPosts", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("users")) {
        db.createObjectStore("users", { keyPath: "uid" });
      }
      if (!db.objectStoreNames.contains("categories")) {
        db.createObjectStore("categories", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("channels")) {
        db.createObjectStore("channels", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("locations")) {
        db.createObjectStore("locations", { keyPath: "state" });
      }
      if (!db.objectStoreNames.contains("latestPosts")) {
        db.createObjectStore("latestPosts", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("hashtagPosts")) {
        db.createObjectStore("hashtagPosts", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("starTagPosts")) {
        db.createObjectStore("starTagPosts", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("userCreatedPosts")) {
        db.createObjectStore("userCreatedPosts", { keyPath: "id" });
      }
      if (db.objectStoreNames.contains("userCompanyEmployees")) {
        db.deleteObjectStore("userCompanyEmployees");
      }
      if (!db.objectStoreNames.contains("usersCompanyEmployees")) {
        db.createObjectStore("usersCompanyEmployees", { keyPath: "uid" });
      }
      if (!db.objectStoreNames.contains("localSchemaVersion")) {
        db.createObjectStore("localSchemaVersion", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("collections")) {
        const collectionsStore = db.createObjectStore("collections", {
          keyPath: "id",
        });
        collectionsStore.createIndex("byUserId", "ownerId", { unique: false });
      }
      if (!db.objectStoreNames.contains("lastSeenTimestamp")) {
        db.createObjectStore("lastSeenTimestamp");
      }
      if (!db.objectStoreNames.contains("userAccounts_v2")) {
        db.createObjectStore("userAccounts_v2", { keyPath: "accountNumber" });
      }
      if (!db.objectStoreNames.contains("goals")) {
        db.createObjectStore("goals", { keyPath: "goalId" });
      }
      if (!db.objectStoreNames.contains("allCompanyGoals")) {
        db.createObjectStore("allCompanyGoals", { keyPath: "goalId" });
      }
    };
    
  });
}
