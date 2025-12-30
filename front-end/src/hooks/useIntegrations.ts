// /utils/hooks/useIntegrations.ts
import { useSelector } from "react-redux";
import { RootState } from "../utils/store";
import { IntegrationsMap, ProviderKey } from "../utils/types";

export function useIntegrations() {
  const currentCompany = useSelector((s: RootState) => s.currentCompany.data);
  const loading = !currentCompany;

  const raw = (currentCompany?.integrations ?? {}) as IntegrationsMap;

  const enabledSet = new Set<ProviderKey>(
    (Object.keys(raw) as ProviderKey[]).filter(
      (k) => raw[k]?.enabled === true
    )
  );

  return {
    loading,
    byProvider: raw,
    enabledSet,
    isEnabled: (p: ProviderKey) => enabledSet.has(p),
    getEnv: (p: ProviderKey) => raw[p]?.env ?? "prod",
  };
}
