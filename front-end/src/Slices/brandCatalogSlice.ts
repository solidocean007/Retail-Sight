// Slices/brandCatalogSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { BrandCatalogItem } from "../utils/types";
import { RootState } from "../utils/store";

interface BrandCatalogState {
  byCompanyId: Record<string, BrandCatalogItem[]>;
  loadingByCompanyId: Record<string, boolean>;
  errorByCompanyId: Record<string, string | null>;
  syncedAtByCompanyId: Record<string, string | null>;
}

const initialState: BrandCatalogState = {
  byCompanyId: {},
  loadingByCompanyId: {},
  errorByCompanyId: {},
  syncedAtByCompanyId: {},
};

const normalizeBrandName = (value?: string | null) =>
  String(value || "")
    .trim()
    .toLowerCase();

const sortBrands = (brands: BrandCatalogItem[]) =>
  [...brands].sort((a, b) =>
    (a.brandName || "").localeCompare(b.brandName || ""),
  );

const brandCatalogSlice = createSlice({
  name: "brandCatalog",
  initialState,
  reducers: {
    setBrandCatalogLoading: (
      state,
      action: PayloadAction<{ companyId: string; loading: boolean }>,
    ) => {
      state.loadingByCompanyId[action.payload.companyId] =
        action.payload.loading;
    },

    setCompanyBrandCatalog: (
      state,
      action: PayloadAction<{
        companyId: string;
        brands: BrandCatalogItem[];
        syncedAt?: string | null;
      }>,
    ) => {
      const { companyId, brands, syncedAt } = action.payload;

      state.byCompanyId[companyId] = sortBrands(brands);
      state.loadingByCompanyId[companyId] = false;
      state.errorByCompanyId[companyId] = null;
      state.syncedAtByCompanyId[companyId] =
        syncedAt === undefined ? new Date().toISOString() : syncedAt;
    },

    setBrandCatalogError: (
      state,
      action: PayloadAction<{ companyId: string; error: string | null }>,
    ) => {
      state.errorByCompanyId[action.payload.companyId] = action.payload.error;
      state.loadingByCompanyId[action.payload.companyId] = false;
    },

    clearCompanyBrandCatalog: (
      state,
      action: PayloadAction<{ companyId: string }>,
    ) => {
      const { companyId } = action.payload;

      delete state.byCompanyId[companyId];
      delete state.loadingByCompanyId[companyId];
      delete state.errorByCompanyId[companyId];
      delete state.syncedAtByCompanyId[companyId];
    },

    clearAllBrandCatalogs: () => initialState,
  },
});

export const {
  setBrandCatalogLoading,
  setCompanyBrandCatalog,
  setBrandCatalogError,
  clearCompanyBrandCatalog,
  clearAllBrandCatalogs,
} = brandCatalogSlice.actions;

export const selectBrandCatalogForCompany =
  (companyId?: string | null) =>
  (state: RootState): BrandCatalogItem[] => {
    if (!companyId) return [];
    return state.brandCatalog.byCompanyId[companyId] ?? [];
  };

export const selectBrandCatalogLoadingForCompany =
  (companyId?: string | null) =>
  (state: RootState): boolean => {
    if (!companyId) return false;
    return Boolean(state.brandCatalog.loadingByCompanyId[companyId]);
  };

export const selectBrandCatalogErrorForCompany =
  (companyId?: string | null) =>
  (state: RootState): string | null => {
    if (!companyId) return null;
    return state.brandCatalog.errorByCompanyId[companyId] ?? null;
  };

export const selectBrandOptionsForCompany =
  (companyId?: string | null) =>
  (state: RootState): string[] => {
    if (!companyId) return [];

    return (state.brandCatalog.byCompanyId[companyId] ?? [])
      .map((brand) => brand.brandName?.trim())
      .filter((brand): brand is string => Boolean(brand));
  };

export const selectBrandById =
  (companyId: string | null | undefined, brandId: string | null | undefined) =>
  (state: RootState): BrandCatalogItem | null => {
    if (!companyId || !brandId) return null;

    return (
      (state.brandCatalog.byCompanyId[companyId] ?? []).find(
        (brand) => brand.brandId === brandId,
      ) ?? null
    );
  };

export const selectBrandByName =
  (
    companyId: string | null | undefined,
    brandName: string | null | undefined,
  ) =>
  (state: RootState): BrandCatalogItem | null => {
    if (!companyId || !brandName) return null;

    const normalized = normalizeBrandName(brandName);

    return (
      (state.brandCatalog.byCompanyId[companyId] ?? []).find((brand) => {
        const direct = normalizeBrandName(brand.brandName) === normalized;
        const normalizedMatch =
          normalizeBrandName(brand.normalizedBrandName) === normalized;
        const aliasMatch = brand.aliases?.some(
          (alias) => normalizeBrandName(alias) === normalized,
        );

        return direct || normalizedMatch || aliasMatch;
      }) ?? null
    );
  };

export default brandCatalogSlice.reducer;
