// hooks/useCompanyBrandCatalogSync.ts
import { useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../utils/firebase";
import { useAppDispatch } from "../utils/store";
import { BrandCatalogItem } from "../utils/types";
import {
  setBrandCatalogError,
  setBrandCatalogLoading,
  setCompanyBrandCatalog,
} from "../Slices/brandCatalogSlice";
import {
  getCompanyBrandCatalogFromIndexedDB,
  saveCompanyBrandCatalogToIndexedDB,
} from "../utils/database/indexedDBUtils";

const normalizeString = (value: unknown) => String(value || "").trim();

const cleanStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => normalizeString(item))
    .filter(Boolean);
};

const normalizeBrandDoc = (
  companyId: string,
  docId: string,
  data: any,
): BrandCatalogItem => {
  const brandId = normalizeString(data.brandId || docId);

  const brandName = normalizeString(
    data.displayName ||
      data.brandName ||
      data.name ||
      data.label ||
      brandId,
  );

  const normalizedBrandName =
    normalizeString(data.normalizedBrandName || brandName).toLowerCase();

  return {
    ...data,
    brandId,
    brandName,
    displayName: brandName, // optional if your type allows it
    normalizedBrandName,
    companyId: normalizeString(data.companyId || companyId),
    companyName: data.companyName || undefined,
    aliases: cleanStringArray(data.aliases),
    productTypes: cleanStringArray(data.productTypes),
    productCount:
      typeof data.productCount === "number" ? data.productCount : undefined,
  };
};

export function useCompanyBrandCatalogSync(
  companyId: string | null | undefined,
  shouldStartSync: boolean,
) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!shouldStartSync || !companyId) return;

    let cancelled = false;

    const loadCachedFirst = async () => {
      try {
        const cached = await getCompanyBrandCatalogFromIndexedDB(companyId);

        if (!cancelled && cached.length > 0) {
          dispatch(
            setCompanyBrandCatalog({
              companyId,
              brands: cached,
              syncedAt: null,
            }),
          );
        }
      } catch (err) {
        console.warn("[brandCatalog] Failed to load cache:", err);
      }
    };

    loadCachedFirst();

    dispatch(setBrandCatalogLoading({ companyId, loading: true }));

    const ref = collection(db, "companies", companyId, "brandCatalog");

    const unsubscribe = onSnapshot(
      ref,
      async (snapshot) => {
        const brands = snapshot.docs.map((docSnap) =>
          normalizeBrandDoc(companyId, docSnap.id, docSnap.data()),
        );

        if (cancelled) return;

        dispatch(
          setCompanyBrandCatalog({
            companyId,
            brands,
            syncedAt: new Date().toISOString(),
          }),
        );

        try {
          await saveCompanyBrandCatalogToIndexedDB(companyId, brands);
        } catch (err) {
          console.warn("[brandCatalog] Failed to save cache:", err);
        }
      },
      (error) => {
        console.error("[brandCatalog] Listener failed:", error);

        dispatch(
          setBrandCatalogError({
            companyId,
            error: error.message || "Failed to sync brand catalog",
          }),
        );
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [companyId, shouldStartSync, dispatch]);
}