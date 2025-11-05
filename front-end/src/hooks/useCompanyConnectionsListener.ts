import { useEffect } from "react";
import {
  collection,
  onSnapshot,
  or,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { RootState, useAppDispatch } from "../utils/store";
import { CompanyConnectionType } from "../utils/types";
import { setCachedConnections } from "../Slices/companyConnectionSlice";
import { useSelector } from "react-redux";
import { setCompanyConnectionsStore } from "../utils/database/companyConnectionsDBUtils";

function normalizeTimestamps(obj: any) {
  const result: any = { ...obj };
  Object.keys(result).forEach((key) => {
    if (result[key] instanceof Timestamp) {
      result[key] = result[key].toDate().toISOString();
    }
  });
  return result;
}

export const useCompanyConnectionsListener = () => {
  const user = useSelector((state: RootState) => state.user.currentUser);
  const dispatch = useAppDispatch();
  const companyId = user?.companyId;
  useEffect(() => {
    if (!companyId) return;

    const q = query(
      collection(db, "companyConnections"),
      or(
        where("requestFromCompanyId", "==", companyId),
        where("requestToCompanyId", "==", companyId)
      )
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const connections = snapshot.docs.map((doc) =>
        normalizeTimestamps({
          id: doc.id,
          ...doc.data(),
        })
      ) as CompanyConnectionType[];

      // ✅ Update Redux state so UI reacts in real time
      dispatch(setCachedConnections(connections));
      // ✅ update cache in background (non-blocking)
      setCompanyConnectionsStore(companyId, connections).catch((e) =>
        console.warn("Failed to update IndexedDB cache:", e)
      );
    });

    return () => unsubscribe();
  }, [companyId, dispatch]);
};
