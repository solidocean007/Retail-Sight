// src/hooks/useCustomAccountsSync.ts
import { useEffect } from "react";
import { useAppDispatch } from "../utils/store";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../utils/firebase";
import { CompanyAccountType } from "../utils/types";
import {
  setCustomAccounts,
  setLoading,
  setError,
} from "../Slices/customAccountsSlice";
import { useSelector } from "react-redux";
import { selectUser } from "../Slices/userSlice";
import {
  getCustomAccountsFromIndexedDB,
  saveCustomAccountsToIndexedDB,
} from "../utils/database/customAccountsStoreUtils";
import { normalizeAccount } from "../thunks/manulAccountsThunk";

export const useCustomAccountsSync = () => {
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const companyId = user?.companyId;

  useEffect(() => {
    if (!companyId) return;

    const loadFromIndexedDB = async () => {
      dispatch(setLoading(true));
      try {
        const cached = await getCustomAccountsFromIndexedDB();
        if (cached.length) dispatch(setCustomAccounts(cached));
      } catch (err: any) {
        console.error("Failed to load custom accounts from IndexedDB", err);
      }
    };

    loadFromIndexedDB();

    const unsub = onSnapshot(
      collection(db, `companies/${companyId}/customAccounts`),
      (snapshot) => {
        const docs: CompanyAccountType[] = snapshot.docs.map((doc) =>
          normalizeAccount(doc.data(), doc.id)
        );

        dispatch(setCustomAccounts(docs));
        saveCustomAccountsToIndexedDB(docs);
        dispatch(setLoading(false));
      },
      (error) => {
        console.error("Failed to sync custom accounts:", error);
        dispatch(setError(error.message || "Sync error"));
        dispatch(setLoading(false));
      }
    );

    return () => unsub();
  }, [companyId, dispatch]);
};
