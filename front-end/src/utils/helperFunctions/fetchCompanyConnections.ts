import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { normalizeFirestoreData } from "../normalize";

export const fetchCompanyConnections = async (companyId: string) => {
  const connectionsRef = collection(db, "companyConnections");
  const q = query(
    connectionsRef,
    where("fromCompanyId", "==", companyId),
    where("status", "==", "approved")
  );

  const snapshot = await getDocs(q);
  const connections = snapshot.docs.map((doc) => {
    const normalized = normalizeFirestoreData(doc.data());
    return { id: doc.id, ...normalized };
  });

  return connections; // ✅ All timestamps now ISO strings
};
