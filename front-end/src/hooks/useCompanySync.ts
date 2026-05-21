import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../utils/firebase";
import { setCurrentCompany } from "../Slices/currentCompanySlice";
import { CompanyType } from "../utils/types";
import { normalizeFirestoreData } from "../utils/normalize";
import { selectEffectiveCompanyId } from "../Slices/impersonationSlice";

export default function useCompanySync(shouldStartSync = true) {
  const dispatch = useDispatch();

  const companyId = useSelector(selectEffectiveCompanyId);

  useEffect(() => {
    if (!companyId || !shouldStartSync) return;

    const ref = doc(db, "companies", companyId);

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
  }, [dispatch, companyId, shouldStartSync]);
}