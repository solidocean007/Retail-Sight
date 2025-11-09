// hooks/useBrandOptions.ts
import { useSelector } from "react-redux";
import { useMemo } from "react";
import { selectAllProducts } from "../Slices/productsSlice";
import { selectCurrentCompany } from "../Slices/currentCompanySlice";

export const useBrandOptions = (): string[] => {
  const products = useSelector(selectAllProducts);
  const company = useSelector(selectCurrentCompany);
  const library = company?.customBrandLibrary ?? [];

  console.log("🪵 useBrandOptions — company:", company);
  console.log("🪵 useBrandOptions — customBrandLibrary:", library);

  return useMemo(() => {
    // extract and clean product brands
    const brands = products
      .map((p) => p.brand?.trim())
      .filter((b): b is string => Boolean(b));

    // merge and dedupe
    const all = Array.from(new Set([...brands, ...library])).sort();

    return all;
  }, [products, library]); // ✅ include library so it re-runs when company doc updates
};

