// hooks/useProductTypeOptions.ts
import { useSelector } from "react-redux";
import { useMemo } from "react";
import { selectAllProducts } from "../Slices/productsSlice";
import { selectCurrentCompany } from "../Slices/currentCompanySlice";

export const useProductTypeOptions = (filterBrands?: string[]): string[] => {
  const products = useSelector(selectAllProducts);
  const company = useSelector(selectCurrentCompany);
  const customProductTypeLibrary = company?.customProductTypeLibrary;
  const normalizedFilterKey = (filterBrands ?? [])
    .map((brand) => brand.trim().toLowerCase())
    .sort()
    .join("\u0000");

  return useMemo(() => {
    let list = products;
    const library = customProductTypeLibrary ?? [];

    // Product and AI/catalog brand casing is not guaranteed to match.
    if (normalizedFilterKey) {
      const brandSet = new Set(normalizedFilterKey.split("\u0000"));
      list = list.filter(
        (product) =>
          product.brand &&
          brandSet.has(product.brand.trim().toLowerCase()),
      );
    }

    // The company library remains available when a legacy brand record has
    // not yet been backfilled with productTypes.
    const types = list
      .map((product) => product.productType?.trim())
      .filter((type): type is string => Boolean(type));
    return Array.from(
      new Set([...types, ...library.map((type) => type.trim())].filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));
  }, [products, normalizedFilterKey, customProductTypeLibrary]);
};
