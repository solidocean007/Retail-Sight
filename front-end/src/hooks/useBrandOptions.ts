// hooks/useBrandOptions.ts
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { selectCurrentCompany } from "../Slices/currentCompanySlice";
import { useCompanyBrandCatalog } from "./useCompanyBrandCatalog";

export const useBrandOptions = (): string[] => {
  const company = useSelector(selectCurrentCompany);
  const companyId = company?.id;
  const library = company?.customBrandLibrary ?? [];

  const { brandOptions } = useCompanyBrandCatalog(companyId);

  return useMemo(() => {
    return Array.from(new Set([...brandOptions, ...library]))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [brandOptions, library]);
};