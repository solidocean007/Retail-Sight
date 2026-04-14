// hooks/useAvailableBrands.ts
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../utils/store";
import {
  selectCurrentCompany,
  selectIsSupplier,
} from "../Slices/currentCompanySlice";
import { selectAllProducts } from "../Slices/productsSlice";
import { CompanyConnectionType, SharedBrandType } from "../utils/types";

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

    // ✅ 1. Local product brands
    products.forEach((p) => {
      const b = p.brand?.trim();
      if (b) set.add(b);
    });

    // ✅ 2. Custom library brands
    library.forEach((b: string) => {
      const clean = b?.trim();
      if (clean) set.add(clean);
    });

    // ✅ 3. Supplier: add shared brands from connections
    if (isSupplier) {
      connections.forEach((conn: CompanyConnectionType) => {
        if (conn.status !== "approved") return;

        conn.sharedBrands?.forEach((sharedBrand: SharedBrandType) => {
          const clean = sharedBrand.brand?.trim();
          if (clean) set.add(clean);
        });
      });
    }

    return Array.from(set).sort();
  }, [products, library, connections, isSupplier]);
};
