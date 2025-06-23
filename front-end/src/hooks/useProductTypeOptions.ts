// hooks/useProductTypeOptions.ts
import { useSelector } from "react-redux";
import { useMemo } from "react";
import { selectAllProducts } from "../Slices/productsSlice";

export const useProductTypeOptions = (filterBrands?: string[]): string[] => {
  const products = useSelector(selectAllProducts);
  return useMemo(() => {
    let list = products;

    // if they passed in a brand filter, only include those
    if (filterBrands && filterBrands.length) {
      const brandSet = new Set(filterBrands);
      list = list.filter(p => p.brand && brandSet.has(p.brand));
    }

    // extract, dedupe, sort
    const types = list
      .map(p => p.productType)      // or whatever your field is called
      .filter((t): t is string => Boolean(t));
    return Array.from(new Set(types)).sort();
  }, [products, filterBrands?.join("|")]);
};

