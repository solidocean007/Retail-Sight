// hooks/useBrandOptions.ts
import { useSelector } from "react-redux";
import { useMemo } from "react";
import { selectAllProducts } from "../Slices/productsSlice";
import { selectCurrentCompany } from "../Slices/currentCompanySlice";

export const useBrandOptions = (): string[] => {
  const products = useSelector(selectAllProducts);
  const company = useSelector(selectCurrentCompany);
  const library = company?.customBrandLibrary ?? [];
  return useMemo(() => {
    const brands = products
      .map((p) => p.brand)
      .filter((b): b is string => Boolean(b));
    return Array.from(new Set([...brands, ...library])).sort();
  }, [products, library]);
};
