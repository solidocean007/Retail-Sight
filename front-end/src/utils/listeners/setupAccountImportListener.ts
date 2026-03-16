// front-end/src/utils/listeners/setupAccountImportListener.ts
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { AppDispatch } from "../store";
import { setPendingAccountImports } from "../../Slices/accountImportSlice";
import { normalizeFirestoreData } from "../normalize";

export const setupAccountImportListener =
  (companyId: string) => (dispatch: AppDispatch) => {
    const q = query(
      collection(db, "accountImports"),
      where("companyId", "==", companyId),
      where("status", "==", "pending")
    );

    return onSnapshot(q, (snap) => {
      const imports = snap.docs.map((d) => ({
        id: d.id,
        ...normalizeFirestoreData(d.data()),
      }));

      dispatch(setPendingAccountImports(imports));

      console.log("imports", imports);
    });
  };