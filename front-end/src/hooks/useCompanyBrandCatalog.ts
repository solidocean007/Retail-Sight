// hooks/useCompanyBrandCatalog.ts
import { useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  selectBrandCatalogErrorForCompany,
  selectBrandCatalogForCompany,
  selectBrandCatalogLoadingForCompany,
} from "../Slices/brandCatalogSlice";

const normalize = (value?: string | null) =>
  String(value || "").trim().toLowerCase();

const getDisplayName = (brand: any) =>
  String(
    brand.displayName ||
      brand.brandName ||
      brand.name ||
      brand.normalizedBrandName ||
      brand.brandId ||
      "",
  ).trim();

export function useCompanyBrandCatalog(companyId?: string | null) {
  const brands = useSelector(selectBrandCatalogForCompany(companyId));
  const loading = useSelector(selectBrandCatalogLoadingForCompany(companyId));
  const error = useSelector(selectBrandCatalogErrorForCompany(companyId));

  /**
   * What the UI should show in dropdowns.
   * Never show brandId unless there is truly no usable display name.
   */
  const brandOptions = useMemo(() => {
    const map = new Map<string, string>();

    brands.forEach((brand) => {
      const displayName = getDisplayName(brand);
      if (!displayName) return;

      const key = normalize(displayName);
      if (!map.has(key)) {
        map.set(key, displayName);
      }
    });

    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [brands]);

  const brandById = useMemo(() => {
    const map = new Map<string, (typeof brands)[number]>();

    brands.forEach((brand) => {
      if (!brand.brandId) return;
      map.set(brand.brandId, brand);
    });

    return map;
  }, [brands]);

  /**
   * Search terms that should resolve to the durable brandId.
   * Supports displayName, brandName, normalizedBrandName, doc id/brandId, and aliases.
   */
  const brandIdBySearchTerm = useMemo(() => {
    const map = new Map<string, string>();

    brands.forEach((brand) => {
      if (!brand.brandId) return;

      const terms = [
        brand.brandId,
        brand.brandName,
        (brand as any).displayName,
        (brand as any).name,
        brand.normalizedBrandName,
        ...(brand.aliases ?? []),
      ];

      terms.forEach((term) => {
        const key = normalize(term);
        if (key) map.set(key, brand.brandId);
      });
    });

    return map;
  }, [brands]);

  const getBrandIdByName = useCallback(
    (brandName: string) => {
      return brandIdBySearchTerm.get(normalize(brandName)) ?? null;
    },
    [brandIdBySearchTerm],
  );

  const getBrandById = useCallback(
    (brandId: string) => brandById.get(brandId) ?? null,
    [brandById],
  );

  const getBrandDisplayNameById = useCallback(
    (brandId: string) => {
      const brand = brandById.get(brandId);
      return brand ? getDisplayName(brand) : null;
    },
    [brandById],
  );

  const getProductTypesForBrandNames = useCallback(
    (brandNames: string[]) => {
      const selectedIds = brandNames
        .map((brandName) => getBrandIdByName(brandName))
        .filter((brandId): brandId is string => Boolean(brandId));

      return Array.from(
        new Set(
          selectedIds.flatMap((brandId) => {
            const brand = brandById.get(brandId);
            return brand?.productTypes ?? [];
          }),
        ),
      ).sort((a, b) => a.localeCompare(b));
    },
    [brandById, getBrandIdByName],
  );

  const getSearchTextForBrandOption = useCallback(
    (option: string) => {
      const brandId = getBrandIdByName(option);
      const brand = brandId ? brandById.get(brandId) : null;

      if (!brand) return option;

      return [
        getDisplayName(brand),
        brand.brandName,
        (brand as any).displayName,
        (brand as any).name,
        brand.normalizedBrandName,
        ...(brand.aliases ?? []),
      ]
        .filter(Boolean)
        .join(" ");
    },
    [brandById, getBrandIdByName],
  );

  return {
    brands,
    brandOptions,
    loading,
    error,
    getBrandIdByName,
    getBrandById,
    getBrandDisplayNameById,
    getProductTypesForBrandNames,
    getSearchTextForBrandOption,
  };
}