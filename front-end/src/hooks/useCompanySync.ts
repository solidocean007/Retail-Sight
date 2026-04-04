import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../utils/firebase";
import { selectUser } from "../Slices/userSlice";
import { setCurrentCompany } from "../Slices/currentCompanySlice";
import { CompanyType } from "../utils/types";
import { normalizeFirestoreData } from "../utils/normalize";

export default function useCompanySync() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  useEffect(() => {
    if (!user?.companyId) return;

    const ref = doc(db, "companies", user.companyId);

    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;

      const data = {
        id: snap.id,
        ...(snap.data() as CompanyType),
      };
      const normalizedCompany = normalizeFirestoreData(data);
      dispatch(setCurrentCompany(normalizedCompany));
    });

    return () => unsub();
  }, [dispatch, user?.companyId]);
}
