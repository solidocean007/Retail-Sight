import { useMemo } from "react";
import { useSelector } from "react-redux";
import { selectCurrentCompany } from "../Slices/currentCompanySlice";
import { useCompanyBrandCatalog } from "./useCompanyBrandCatalog";

export const useBrandOptions = (companyId?: string | null): string[] => {
  const company = useSelector(selectCurrentCompany);
  const effectiveCompanyId = company?.id ?? companyId;
  const library = company?.customBrandLibrary ?? [];

  const { brandOptions } = useCompanyBrandCatalog(effectiveCompanyId);

  return useMemo(() => {
    return Array.from(new Set([...brandOptions, ...library]))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [brandOptions, library]);
};
