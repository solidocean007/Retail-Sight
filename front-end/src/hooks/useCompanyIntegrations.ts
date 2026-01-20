// utils/hooks/useCompanyIntegrations.ts
import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { ProviderKey } from "../utils/types";
import { db } from "../utils/firebase";

type IntegrationDoc = {
  enabled: boolean;
  env?: "prod" | "sandbox";
};

export function useCompanyIntegrations(companyId?: string | null) {
  const [byProvider, setByProvider] = useState<
    Partial<Record<ProviderKey, IntegrationDoc>>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;

    const ref = collection(db, "companies", companyId, "integrations");

    const unsub = onSnapshot(ref, (snap) => {
      const next: any = {};
      snap.forEach((doc) => {
        next[doc.id] = doc.data();
      });
      setByProvider(next);
      setLoading(false);
    });

    return unsub;
  }, [companyId]);

  return {
    loading,
    byProvider,
    isEnabled: (p: ProviderKey) => byProvider[p]?.enabled === true,
    getEnv: (p: ProviderKey) => byProvider[p]?.env ?? "prod",
  };
}
