// indexedDBOpen.ts
const dbName = "myRetailAppDB";
const dbVersion = 17;
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
      // Create 'hashtagPosts' object store to store posts fetched based on hashtags
      if (!db.objectStoreNames.contains("hashtagPosts")) {
        db.createObjectStore("hashtagPosts", { keyPath: "id" });
      }
      // Create 'starTagPosts' object store to store posts fetched based on hashtags
      if (!db.objectStoreNames.contains("starTagPosts")) {
        db.createObjectStore("starTagPosts", { keyPath: "id" });
      }
      // Create 'user created posts' object store to store posts fetched based on hashtags
      if (!db.objectStoreNames.contains("userCreatedPosts")) {
        db.createObjectStore("userCreatedPosts", { keyPath: "id" });
      }
      // Delete the incorrect object store
      if (db.objectStoreNames.contains("userCompanyEmployees")) {
        db.deleteObjectStore("userCompanyEmployees");
      }
      if (!db.objectStoreNames.contains("usersCompanyEmployees")) {
        db.createObjectStore("usersCompanyEmployees", { keyPath: "uid" });
      }
      if (!db.objectStoreNames.contains("localSchemaVersion")) {
        db.createObjectStore("localSchemaVersion", { keyPath: "id" });
      }
      // Create or update 'collections' object store
      if (!db.objectStoreNames.contains("collections")) {
        const collectionsStore = db.createObjectStore("collections", {
          keyPath: "id",
        });
        collectionsStore.createIndex("byUserId", "ownerId", { unique: false });
        // Add more indexes as needed
      }
    };
  });
}
