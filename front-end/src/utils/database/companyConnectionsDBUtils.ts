import { CompanyConnectionType } from "../types";
import { openDB } from "./indexedDBOpen";

export const setCompanyConnectionsStore = async (
  companyId: string,
  connections: CompanyConnectionType[]
) => {
  const db = await openDB();
  const tx = db.transaction("companyConnectionsStore", "readwrite");
  const store = tx.objectStore("companyConnectionsStore");

  const connection = {
    companyId,
    connections,
    updatedAt: new Date().toISOString(),
  };

  await new Promise<void>((resolve, reject) => {
    const req = store.put(connection);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const getCompanyConnectionsStore = async (companyId: string) => {
  const db = await openDB();
  const tx = db.transaction("companyConnectionsStore", "readonly");
  const store = tx.objectStore("companyConnectionsStore");

  const data = await new Promise<any>((resolve, reject) => {
    const req = store.get(companyId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  db.close();
  return data; // this will be your { companyId, connections, updatedAt }
};


export const updateCompanyConnectionInStore = async (
  companyId: string,
  updatedConnection: CompanyConnectionType
) => {
  const db = await openDB();
  const tx = db.transaction("companyConnectionsStore", "readwrite");
  const store = tx.objectStore("companyConnectionsStore");

  const existing = await new Promise<any>((resolve, reject) => {
    const req = store.get(companyId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  let updatedData;

  if (!existing) {
    updatedData = {
      companyId,
      connections: [updatedConnection],
      updatedAt: new Date().toISOString(),
    };
  } else {
    const connections = existing.connections.map((c: CompanyConnectionType) =>
      c.id === updatedConnection.id ? updatedConnection : c
    );
    updatedData = {
      ...existing,
      connections,
      updatedAt: new Date().toISOString(),
    };
  }

  // ✅ Put and wait for onsuccess / onerror
  await new Promise<void>((resolve, reject) => {
    const req = store.put(updatedData);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  db.close();
};

export const addConnectionToStore = async (
  companyId: string,
  newConnection: CompanyConnectionType
) => {
  const db = await openDB();
  const tx = db.transaction("companyConnectionsStore", "readwrite");
  const store = tx.objectStore("companyConnectionsStore");

  const existing = await new Promise<any>((resolve, reject) => {
    const req = store.get(companyId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const updated = existing
    ? { ...existing, connections: [...existing.connections, newConnection] }
    : { companyId, connections: [newConnection] };

  await new Promise<void>((resolve, reject) => {
    const req = store.put({ ...updated, updatedAt: new Date().toISOString() });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  db.close();
};
