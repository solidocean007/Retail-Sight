import { getFilterHash } from "../../components/FilterSideBar/utils/filterUtils";
import { PostQueryFilters, PostWithID } from "../types";
import { openDB } from "./indexedDBOpen";

export async function storeFilteredSet(
  filters: PostQueryFilters,
  posts: PostWithID[]
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("filteredSets", "readwrite");
  const store = tx.objectStore("filteredSets");

  const id = getFilterHash(filters);
  const record = {
    id,
    filters,
    posts,
    fetchedAt: new Date().toISOString(),
  };

  await new Promise<void>((resolve, reject) => {
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getFilteredSet(
  filters: PostQueryFilters
): Promise<PostWithID[] | null> {
  const db = await openDB();
  const tx = db.transaction("filteredSets", "readonly");
  const store = tx.objectStore("filteredSets");

  const id = getFilterHash(filters);

  return await new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result?.posts ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function getFetchDate(
  filters: PostQueryFilters
): Promise<Date | null> {
  const db = await openDB();
  const tx = db.transaction("filteredSets", "readonly");
  const store = tx.objectStore("filteredSets");

  const id = getFilterHash(filters);

  return await new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => {
      const result = req.result;
      resolve(result?.fetchedAt ? new Date(result.fetchedAt) : null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function purgeDeletedPostFromFilteredSets(postId: string) {
  const db = await openDB();
  const tx = db.transaction("filteredSets", "readwrite");
  const store = tx.objectStore("filteredSets");

  const keysReq = store.getAllKeys();

  await new Promise<void>((resolve, reject) => {
    keysReq.onsuccess = async () => {
      const allKeys = keysReq.result;
      for (const key of allKeys) {
        const getReq = store.get(key);
        getReq.onsuccess = () => {
          const record = getReq.result;
          if (!record || !Array.isArray(record.posts)) return;

          const filtered = record.posts.filter((p: PostWithID) => p.id !== postId);
          if (filtered.length !== record.posts.length) {
            if (filtered.length === 0) {
              store.delete(key);
            } else {
              store.put({ ...record, posts: filtered }, key);
            }
          }
        };
      }
      resolve();
    };
    keysReq.onerror = () => reject(keysReq.error);
  });
}



