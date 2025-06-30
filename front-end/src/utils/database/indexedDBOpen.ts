const dbName = "myRetailAppDB";
const dbVersion = 31;

// db.createObjectStore("filteredSets", { keyPath: "id" });
// Each record: { id: string, filters: PostQueryFilters, posts: PostWithID[], fetchedAt: string }


const objectStores: {
  name: string;
  options: IDBObjectStoreParameters;
  index?: { name: string; keyPath: string; options?: IDBIndexParameters };
  replaceIfExists?: boolean;
}[] = [
  { name: "posts", options: { keyPath: "id" } },
  { name: "filteredPosts", options: { keyPath: "id" } },
  { name: "filteredSets", options: { keyPath: "id" } },
  { name: "users", options: { keyPath: "uid" } },
  { name: "categories", options: { keyPath: "id" } },
  { name: "channels", options: { keyPath: "id" } },
  { name: "locations", options: { keyPath: "state" } },
  { name: "latestPosts", options: { keyPath: "id" } },
  { name: "hashtagPosts", options: { keyPath: "id" } },
  { name: "starTagPosts", options: { keyPath: "id" } },
  { name: "userCreatedPosts", options: { keyPath: "id" } },
  { name: "userCompanyEmployees", options: { keyPath: "uid" }, replaceIfExists: true },
  { name: "localSchemaVersion", options: { keyPath: "id" } },
  {
    name: "collections",
    options: { keyPath: "id" },
    index: { name: "byUserId", keyPath: "ownerId" },
  },
  { name: "lastSeenTimestamp", options: {} },
  { name: "userAccounts_v2", options: { keyPath: "accountNumber" } },
  { name: "allUsersCompanyAccounts", options: { keyPath: "accountNumber" } },
  { name: "galloGoals", options: { keyPath: "id" } },
  { name: "companyGoals", options: { keyPath: "id" } },
  { name: "allGalloGoals", options: { keyPath: "id" } },
  { name: "allCompanySpecificGoals", options: { keyPath: "id" } },
  { name: "companyProducts", options: { keyPath: "companyProductId" } }, // ✅ NEW
];

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);

    request.onerror = (event: Event) => {
      const target = event.target as IDBRequest;
      reject(`IndexedDB error: ${target?.error?.message || "Unknown error"}`);
    };

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      for (const store of objectStores) {
        const { name, options, replaceIfExists, index } = store;

        if (db.objectStoreNames.contains(name)) {
          if (replaceIfExists) db.deleteObjectStore(name);
          else continue;
        }

        const objectStore = db.createObjectStore(name, options);

        if (index) {
          objectStore.createIndex(index.name, index.keyPath, index.options);
        }
      }
    };
  });
}

