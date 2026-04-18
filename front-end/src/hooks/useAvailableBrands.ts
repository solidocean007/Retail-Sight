// hooks/useAvailableBrands.ts
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../utils/store";
import {
  selectCurrentCompany,
  selectIsSupplier,
} from "../Slices/currentCompanySlice";
import { selectAllProducts } from "../Slices/productsSlice";
import { CompanyConnectionType } from "../utils/types";

export const useAvailableBrands = () => {
  const company = useSelector(selectCurrentCompany);
  const isSupplier = useSelector(selectIsSupplier);

  const connections = useSelector(
    (s: RootState) => s.companyConnections.connections || [],
  );

  const products = useSelector(selectAllProducts);
  const library = company?.customBrandLibrary ?? [];

  return useMemo(() => {
    const set = new Set<string>();

    // ✅ SUPPLIER = only connected approved brands
    if (isSupplier) {
      connections.forEach((conn: CompanyConnectionType) => {
        if (conn.status !== "approved") return;

        for (const brand of conn.sharedBrandNames || []) {
          const clean = brand?.trim();
          if (clean) set.add(clean);
        }
      });

      return Array.from(set).sort();
    }

    // ✅ DISTRIBUTOR = local brands
    products.forEach((p) => {
      const b = p.brand?.trim();
      if (b) set.add(b);
    });

    library.forEach((b: string) => {
      const clean = b?.trim();
      if (clean) set.add(clean);
    });

    return Array.from(set).sort();
  }, [products, library, connections, isSupplier]);
};