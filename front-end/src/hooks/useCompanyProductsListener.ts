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
import {
  addProduct,
  updateProduct,
  deleteProduct,
  setAllProducts,
} from "../Slices/productsSlice";
import { ProductType } from "../utils/types";
import { saveAllCompanyProductsToIndexedDB } from "../utils/database/indexedDBUtils";

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
        allProducts.push(docSnap.data() as ProductType);
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
  }, [companyId, dispatch]);
}
