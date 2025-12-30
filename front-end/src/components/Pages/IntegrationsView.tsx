// components/Integrations/IntegrationsView.tsx
import React, { useEffect, useState } from "react";
import "./integrationsView.css";
import { useSelector } from "react-redux";
import { selectUser } from "../../Slices/userSlice";
import { useIntegrations } from "../../hooks/useIntegrations";
import GalloIntegrationSettings from "../GoalIntegration/GalloIntegration/GalloIntegrationSettings";
import { getFunctions, httpsCallable } from "firebase/functions";
import { KeyStatusType } from "../GoalIntegration/GalloIntegration/GalloGoalImporter";

const IntegrationsView: React.FC = () => {
  const user = useSelector(selectUser);
  const companyId = user?.companyId;
  const { byProvider, loading } = useIntegrations();
  const galloEnabled = byProvider?.gallo?.enabled === true;
  const functions = getFunctions();

  const canManageIntegrations =
    user?.role === "admin" ||
    user?.role === "super-admin" ||
    user?.role === "developer";

  // 🔐 Gallo integration state (owned here)
  const [keyStatus, setKeyStatus] = useState<KeyStatusType | null>(null);

  // Fetch key status once
  useEffect(() => {
    if (!canManageIntegrations || galloEnabled) return;

    const fetchStatus = async () => {
      try {
        const fn = httpsCallable<{ integration: string }, KeyStatusType>(
          functions,
          "getExternalApiKeyStatus"
        );

        const res = await fn({ integration: "galloAxis" });
        setKeyStatus(res.data);
      } catch (err) {
        console.error("Failed to load Gallo key status", err);
      }
    };

    fetchStatus();
  }, [canManageIntegrations, galloEnabled, functions]);

  if (loading) return null;

  if (!canManageIntegrations) {
    return (
      <section className="integrations-view">
        <p className="integrations-denied">
          You do not have permission to manage integrations.
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="integrations-view">
        <p>Loading integrations…</p>
      </section>
    );
  }

  if (!companyId) {
    return (
      <section className="integrations-view">
        <p className="integrations-denied">Company context not loaded.</p>
      </section>
    );
  }

  return (
    <section className="integrations-view">
      <header className="integrations-header">
        <h2>Integrations</h2>
        <p className="integrations-subtitle">
          Manage external systems connected to your company.
        </p>
      </header>

      <div className="integrations-list">
        {/* ================= Gallo Axis ================= */}
        {galloEnabled ? (
          <div className="integration-panel">
            <div className="integration-panel-header">
              <h3>Gallo Axis</h3>
              <span className="integration-badge">External</span>
            </div>

            <p className="integration-description">
              Configure Gallo Axis credentials and select the active
              environment.
              <br />
              Program and goal imports are handled separately under Goal
              Manager.
            </p>

            <GalloIntegrationSettings
              companyId={companyId} // Type 'string | undefined' is not assignable to type 'string'
              keyStatus={keyStatus}
              setKeyStatus={setKeyStatus}
            />
          </div>
        ) : (
          <div className="integration-panel disabled">
            <h3>Gallo Axis</h3>
            <p className="integration-description">
              This integration is not enabled for your company.
              <br />
              Contact Displaygram support to request access.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default IntegrationsView;
