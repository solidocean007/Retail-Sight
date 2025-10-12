import { useSelector } from "react-redux";
import { selectAllProducts } from "../Slices/productsSlice"; // adjust path if needed
import { useMemo } from "react";

/**
 * Returns suppliers and their unique brands — all sorted alphabetically.
 */
export function useSupplierBrands() {
  const products = useSelector(selectAllProducts);

  const supplierBrandsMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const p of products || []) {
      const supplier = p.productSupplier?.trim();
      const brand = p.brand?.trim();
      if (!supplier || !brand) continue;

      if (!map[supplier]) map[supplier] = new Set();
      map[supplier].add(brand);
    }
    return map;
  }, [products]);

  // 🔹 Sort suppliers and brands alphabetically
  const suppliers = Object.keys(supplierBrandsMap).sort((a, b) =>
    a.localeCompare(b)
  );

  const supplierBrandList = suppliers.map((supplier) => ({
    supplier,
    brands: Array.from(supplierBrandsMap[supplier]).sort((a, b) =>
      a.localeCompare(b)
    ),
  }));

  return { supplierBrandsMap, supplierBrandList, suppliers };
}
