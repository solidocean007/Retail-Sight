import { CompanyAccountType, UserType } from "../types";
import { openDB } from "./indexedDBOpen";

const NETWORK_ACCOUNT_FACETS_STORE = "networkAccountFacets";
const NETWORK_USERS_STORE = "networkUsers";

export type NetworkAccountFacet = {
  accountName?: string;
  accountNumber?: string;
  accountType?: string;
  chain?: string;
  chainType?: string;
  city?: string;
  state?: string;
  originCompanyId: string;
  originCompanyName: string;
};

export type NetworkAccountFacetsRecord = {
  companyId: string;
  companyName: string;
  accountsId?: string;
  facets: NetworkAccountFacet[];
  fetchedAt: string;
};

export type NetworkUsersRecord = {
  companyId: string;
  companyName: string;
  users: UserType[];
  fetchedAt: string;
};

export const isCacheFresh = (
  fetchedAt?: string | null,
  maxAgeMs = 1000 * 60 * 60 * 12
): boolean => {
  if (!fetchedAt) return false;
  return Date.now() - new Date(fetchedAt).getTime() < maxAgeMs;
};

const runStoreRequest = async <T>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  // async work happens before the Promise executor — an async executor
  // swallows rejections thrown after the first await
  const db = await openDB();
  const tx = db.transaction(storeName, mode);
  const store = tx.objectStore(storeName);
  const request = action(store);

  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getNetworkAccountFacetsRecord = async (
  companyId: string
): Promise<NetworkAccountFacetsRecord | undefined> => {
  return runStoreRequest<NetworkAccountFacetsRecord | undefined>(
    NETWORK_ACCOUNT_FACETS_STORE,
    "readonly",
    (store) => store.get(companyId)
  );
};

export const saveNetworkAccountFacetsRecord = async (
  record: NetworkAccountFacetsRecord
): Promise<IDBValidKey> => {
  return runStoreRequest<IDBValidKey>(
    NETWORK_ACCOUNT_FACETS_STORE,
    "readwrite",
    (store) => store.put(record)
  );
};

export const getNetworkUsersRecord = async (
  companyId: string
): Promise<NetworkUsersRecord | undefined> => {
  return runStoreRequest<NetworkUsersRecord | undefined>(
    NETWORK_USERS_STORE,
    "readonly",
    (store) => store.get(companyId)
  );
};

export const saveNetworkUsersRecord = async (
  record: NetworkUsersRecord
): Promise<IDBValidKey> => {
  return runStoreRequest<IDBValidKey>(
    NETWORK_USERS_STORE,
    "readwrite",
    (store) => store.put(record)
  );
};

export const toNetworkAccountFacets = (
  accounts: CompanyAccountType[],
  originCompanyId: string,
  originCompanyName: string
): NetworkAccountFacet[] => {
  return accounts.map((account) => ({
    accountName: account.accountName,
    accountNumber: account.accountNumber,
    accountType: account.typeOfAccount,
    chain: account.chain,
    chainType: account.chainType,
    city: account.city,
    state: account.state,
    originCompanyId,
    originCompanyName,
  }));
};