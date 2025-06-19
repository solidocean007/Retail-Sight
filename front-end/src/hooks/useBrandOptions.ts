// hooks/useBrandOptions.ts
import { useSelector } from "react-redux";
import { useMemo } from "react";
import { selectAllProducts } from "../Slices/productsSlice";

export const useBrandOptions = (): string[] => {
  const products = useSelector(selectAllProducts);
  return useMemo(() => {
    const brands = products
      .map((p) => p.brand)
      .filter((b): b is string => Boolean(b));
    return Array.from(new Set(brands)).sort();
  }, [products]);
};
