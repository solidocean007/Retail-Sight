// src/thunks/manualAccountsThunk.ts
import { AppThunk } from "../utils/store";
import {
  addCustomAccount,
  setLoading,
  setError,
  setCustomAccounts,
} from "../Slices/customAccountsSlice";
import { CompanyAccountType } from "../utils/types";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { selectUser } from "../Slices/userSlice";

// CREATE

function normalizeField(value: string | undefined): string {
  return value?.trim().toLowerCase() || "";
}

export const normalizeAccount = (raw: any, docId: string): CompanyAccountType => ({
  ...(raw as CompanyAccountType),
  accountNumber: docId,
  createdAt: raw.createdAt?.toDate?.().toISOString() ?? null,
  updatedAt: raw.updatedAt?.toDate?.().toISOString() ?? null,
});

export const createManualAccountThunk =
  (account: CompanyAccountType): AppThunk =>
  async (dispatch, getState) => {
    const state = getState();
    const user = selectUser(state);
    const companyId = user?.companyId;

    if (!companyId) {
      dispatch(setError("No companyId found for manual account save."));
      return;
    }

    const normalizedName = normalizeField(account.accountName);
    const normalizedStreet = normalizeField(account.streetAddress);
    const normalizedCity = normalizeField(account.city);
    const normalizedState = normalizeField(account.state);

    dispatch(setLoading(true));
    try {
      // 1️⃣ Try to find a matching account
      const q = query(
        collection(db, `companies/${companyId}/customAccounts`),
        where("accountName", "==", normalizedName),
        where("streetAddress", "==", normalizedStreet),
        where("city", "==", normalizedCity),
        where("state", "==", normalizedState)
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        console.log("Manual account already exists. Skipping Firestore write.");
        return;
      }

      // 2️⃣ Save new account
      const docRef = await addDoc(
        collection(db, `companies/${companyId}/customAccounts`),
        {
          ...account,
          accountName: normalizedName,
          streetAddress: normalizedStreet,
          city: normalizedCity,
          state: normalizedState,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      dispatch(
        addCustomAccount({
          ...account,
          accountName: normalizedName,
          streetAddress: normalizedStreet,
          city: normalizedCity,
          state: normalizedState,
          accountNumber: docRef.id, // Firestore ID becomes new accountNumber
        })
      );
    } catch (error: any) {
      console.error("Failed to save manual account:", error);
      dispatch(setError(error.message || "Failed to save manual account."));
    } finally {
      dispatch(setLoading(false));
    }
  };

// READ
export const fetchManualAccountsThunk =
  (): AppThunk => async (dispatch, getState) => {
    const user = selectUser(getState());
    const companyId = user?.companyId;

    if (!companyId) return;

    dispatch(setLoading(true));
    try {
      const snapshot = await getDocs(
        collection(db, `companies/${companyId}/customAccounts`)
      );
      console.log('fetchManualAccountsThunk - fetched docs:', snapshot.size);
      const accounts: CompanyAccountType[] = snapshot.docs.map((doc) =>
        normalizeAccount(doc.data(), doc.id)
      );
      console.log('fetchManualAccountsThunk - normalized accounts:', accounts);
      dispatch(setCustomAccounts(accounts));
    } catch (err: any) {
      dispatch(setError(err.message || "Failed to fetch manual accounts"));
    } finally {
      dispatch(setLoading(false));
    }
  };

// UPDATE
export const updateManualAccountThunk =
  (id: string, updates: Partial<CompanyAccountType>): AppThunk =>
  async (dispatch, getState) => {
    const user = selectUser(getState());
    const companyId = user?.companyId;
    if (!companyId) return;

    const ref = doc(db, `companies/${companyId}/customAccounts`, id);

    try {
      await updateDoc(ref, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      // Optionally: refetch all or patch local
      dispatch(fetchManualAccountsThunk());
    } catch (err: any) {
      dispatch(setError(err.message || "Failed to update manual account"));
    }
  };

// DELETE
export const deleteManualAccountThunk =
  (id: string): AppThunk =>
  async (dispatch, getState) => {
    const user = selectUser(getState());
    const companyId = user?.companyId;
    if (!companyId) return;

    const ref = doc(db, `companies/${companyId}/customAccounts`, id);

    try {
      await deleteDoc(ref);
      dispatch(fetchManualAccountsThunk());
    } catch (err: any) {
      dispatch(setError(err.message || "Failed to delete manual account"));
    }
  };
