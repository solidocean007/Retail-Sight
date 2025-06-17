import { getFilterHash } from "../../components/FilterSideBar/utils/filterUtils";
import { PostQueryFilters, PostWithID } from "../types";
import { openDB } from "./indexedDBOpen";

/**
 * Stores a filtered post set in IndexedDB under a unique filter hash.
 */
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

  return new Promise<void>((resolve, reject) => {
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieves a cached filtered post set by filters.
 */
export async function getFilteredSet(
  filters: PostQueryFilters
): Promise<PostWithID[] | null> {
  const db = await openDB();
  const tx = db.transaction("filteredSets", "readonly");
  const store = tx.objectStore("filteredSets");

  const id = getFilterHash(filters);

  return new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => {
      const result = req.result;
      resolve(result?.posts ?? null);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Gets the fetchedAt timestamp for a cached filter result.
 */
export async function getFetchDate(
  filters: PostQueryFilters
): Promise<Date | null> {
  const db = await openDB();
  const tx = db.transaction("filteredSets", "readonly");
  const store = tx.objectStore("filteredSets");

  const id = getFilterHash(filters);

  return new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => {
      const result = req.result;
      resolve(result?.fetchedAt ? new Date(result.fetchedAt) : null);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Determines if the cache should be refreshed based on the newest post date.
 */
export async function shouldRefetch(
  filters: PostQueryFilters,
  newestRawIso: string | null
): Promise<boolean> {
  if (!newestRawIso) return true;

  const fetchedAt = await getFetchDate(filters);
  if (!fetchedAt) return true;

  const newestRawDate = new Date(newestRawIso);
  return newestRawDate > fetchedAt;
}
