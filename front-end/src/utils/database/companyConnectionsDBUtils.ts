import { CompanyConnectionType } from "../../Slices/companyConnectionSlice";
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

  const data = await store.get(companyId);
  db.close();
  return data;
};

