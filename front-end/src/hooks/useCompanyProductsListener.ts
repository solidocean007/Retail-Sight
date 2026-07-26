// hooks/useCompanyProductsListener.ts
import { useEffect } from "react";
import {
  collection,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { useAppDispatch } from "../utils/store";
import { setAllProducts } from "../Slices/productsSlice";
import { ProductType } from "../utils/types";
import { saveAllCompanyProductsToIndexedDB } from "../utils/database/indexedDBUtils";
import { normalizeFirestoreData } from "../utils/normalize";

/**
 * useCompanyProductsListener
 * ----------------------------------------------------------
 * Real-time listener for company products.
 * Keeps Redux + IndexedDB synced across devices instantly.
 */
export function useCompanyProductsListener(companyId: string | null, shouldStartSync = true) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!companyId || !shouldStartSync) return;

    const productsRef = collection(db, "products", companyId, "items");

    const unsubscribe = onSnapshot(productsRef, async (snapshot: QuerySnapshot<DocumentData>) => {
      const allProducts: ProductType[] = [];
      snapshot.forEach((docSnap) => {
        // Firestore Timestamps aren't serializable and must not reach Redux —
        // they break time-travel debugging and cause subtle equality bugs.
        // normalizeFirestoreData converts them to ISO strings.
        allProducts.push(
          normalizeFirestoreData(docSnap.data()) as ProductType,
        );
      });

      // 💾 Update IndexedDB cache
      try {
        await saveAllCompanyProductsToIndexedDB(allProducts);
      } catch (err) {
        console.warn("Failed to cache products:", err);
      }

      // 🔄 Update Redux
      dispatch(setAllProducts(allProducts));
    });

    return () => unsubscribe();
    // shouldStartSync starts false (appReady not yet true) — without it here,
    // the listener is never attached for the rest of the session.
  }, [companyId, dispatch, shouldStartSync]);
}
