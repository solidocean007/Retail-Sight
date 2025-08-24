// /utils/hooks/useIntegrations.ts
import { useSelector } from "react-redux";
import { RootState } from "../utils/store";
import { IntegrationsMap, ProviderKey } from "../utils/types";


export function useIntegrations() {
  const currentCompany = useSelector((s: RootState) => s.currentCompany.data);
  const loading = !currentCompany;
  const raw = (currentCompany?.integrations ??
               {}) as IntegrationsMap;

  // normalize: missing provider => disabled
  const byProvider: IntegrationsMap = raw;
  const enabledSet = new Set<ProviderKey>(
    (Object.keys(byProvider) as ProviderKey[]).filter(k => !!byProvider[k]?.enabled)
  );

  return {
    loading,
    byProvider,
    enabledSet,
    isEnabled: (p: ProviderKey) => enabledSet.has(p),
  };
}

// Optional convenience wrapper if you want a single‑provider hook
export const useIntegrationEnabled = (p: ProviderKey) => {
  const { loading, isEnabled } = useIntegrations();
  return { loading, enabled: isEnabled(p) };
};
