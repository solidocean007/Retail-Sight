import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export const fetchCompanyConnections = async (companyId: string) => {
  const connectionsRef = collection(db, "companyConnections");
  const q = query(
    connectionsRef,
    where("fromCompanyId", "==", companyId),
    where("status", "==", "approved")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};
