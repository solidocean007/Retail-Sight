import React, { useState, useEffect } from "react";
import "./companyConnectionsManager.css";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../../utils/store";
import { selectCurrentCompany } from "../../Slices/currentCompanySlice";
import { showMessage } from "../../Slices/snackbarSlice";
import CompanyConnectionList from "./CompanyConnectionList";
import { getCompanyConnectionsStore } from "../../utils/database/companyConnectionsDBUtils";
import {
  createConnectionRequest,
  fetchCompanyConnections,
  setCachedConnections,
} from "../../Slices/companyConnectionSlice";
import { CompanyConnectionType, UserType } from "../../utils/types";
import ConnectionBuilder from "./ConnectionBuilder";
import ConnectionEditModal from "./ConnectionEditModal";
import { Modal } from "@mui/material";
import { getPlanDetails } from "../../utils/getPlanDetails";
import { setPlan, setLoading } from "../../Slices/planSlice";

interface Props {
  currentCompanyId: string | undefined;
  user: UserType | null;
}

const CompanyConnectionsManager: React.FC<Props> = ({
  currentCompanyId,
  user,
}) => {
  const dispatch = useAppDispatch();
  const usersCompany = useSelector(selectCurrentCompany);
  const { connections } = useSelector(
    (state: RootState) => state.companyConnections
  );

  // ✅ Access plan data from Redux (cached + persisted)
  const { currentPlan, loading } = useSelector((s: RootState) => s.planSlice);

  const [selectedConnection, setSelectedConnection] =
    useState<CompanyConnectionType | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  // 🧮 Derive limits and usage
  const planLimit = currentPlan?.connectionLimit ?? 0;
  const extraConnections = usersCompany?.billing?.addons?.extraConnection ?? 0;
  const approvedConnections = connections.filter(
    (c) => c.status === "approved"
  ).length;

  const connectionLimitReached = // 'connectionLimitReached' is declared but its value is never read
    approvedConnections >= planLimit + extraConnections;

  const totalLimit = (planLimit || 0) + (extraConnections || 0);
  const progressPercent = totalLimit
    ? Math.min((approvedConnections / totalLimit) * 100, 100)
    : 0;

  // ✅ Load plan once (or refresh if plan name changed)
  useEffect(() => {
    const loadPlan = async () => {
      if (currentPlan?.name === usersCompany?.billing?.plan) return; // only reload if different
      if (!usersCompany?.billing?.plan) return;

      dispatch(setLoading(true));
      try {
        const plan = await getPlanDetails(usersCompany.billing.plan);
        dispatch(setPlan(plan));
      } catch (err) {
        console.error("Failed to fetch plan details:", err);
      } finally {
        dispatch(setLoading(false));
      }
    };
    loadPlan();
  }, [usersCompany?.billing?.plan]);

  // ✅ Load connections (cached + remote)
  useEffect(() => {
    if (!currentCompanyId) return;
    const loadConnections = async () => {
      try {
        const cached = await getCompanyConnectionsStore(currentCompanyId);
        if (cached?.connections)
          dispatch(setCachedConnections(cached.connections));
        await dispatch(fetchCompanyConnections(currentCompanyId));
      } catch (error) {
        console.error("Error loading cached connections:", error);
      }
    };
    loadConnections();
  }, [currentCompanyId, dispatch]);

  // 🧩 Handle connection creation
  const handleConfirmRequest = async (
    emailInput: string,
    brandSelection: string[]
  ) => {
    if (!user || !usersCompany || !currentCompanyId) return;
    try {
      await dispatch(
        createConnectionRequest({
          currentCompanyId,
          user,
          usersCompany,
          emailInput,
          brandSelection,
        })
      ).unwrap();

      dispatch(showMessage("Connection request sent successfully."));
      await dispatch(fetchCompanyConnections(currentCompanyId));
      setIsBuilderOpen(false);
    } catch (err: any) {
      if (err.code === "already-exists") {
        dispatch(showMessage("A connection request already exists."));
      } else if (err.code === "not-found") {
        dispatch(showMessage("No admin found with that email address."));
      } else {
        dispatch(showMessage(`Error: ${err.message || err}`));
      }
    }
  };

  const handleEdit = (connection: CompanyConnectionType) => {
    setSelectedConnection(connection);
    setIsEditOpen(true);
  };

  const handleModalClose = () => {
    setIsEditOpen(false);
    setSelectedConnection(null);
  };

  return (
    <div className="connections-dashboard">
      <div className="info-banner">
        <div
          className="info-banner-header"
          onClick={() => setShowInfo(!showInfo)}
        >
          <h2>Company Connections</h2>
          <p className="info-banner-summary">
            Build trusted partnerships with other companies to share brand
            activity and retail display posts.
          </p>
          <button className="toggle-info-btn">
            {showInfo ? "▲ Hide Details" : "▼ Learn More"}
          </button>
        </div>

        {showInfo && (
          <div className="info-banner-details">
            <ul className="info-points">
              <li>
                <span className="info-icon">🤝</span>
                <div className="info-text">
                  <strong>Collaborate:</strong> Connect with verified partner
                  companies to share your display and goal activity.
                </div>
              </li>
              <li>
                <span className="info-icon">🏷️</span>
                <div className="info-text">
                  <strong>Shared Brands:</strong> Activate once both companies
                  approve shared brands.
                </div>
              </li>
              <li>
                <span className="info-icon">📢</span>
                <div className="info-text">
                  <strong>Share Visibility:</strong> Network posts become
                  visible to approved partners.
                </div>
              </li>
              <li>
                <span className="info-icon">🌐</span>
                <div className="info-text">
                  <strong>Unified Feed:</strong> Expand visibility across the
                  Displaygram ecosystem.
                </div>
              </li>
            </ul>
            <p className="info-banner-footer">
              Tip: Manage shared brands directly from the list below.
            </p>
          </div>
        )}
      </div>

      <div className="connections-list-card">
        {!loading && (
          <div className="tier-status">
            <strong>
              Your Plan:{" "}
              {currentPlan?.name
                ? currentPlan.name.charAt(0).toUpperCase() +
                  currentPlan.name.slice(1)
                : "—"}
            </strong>
            <div className="tier-bar">
              <div
                className="tier-progress"
                style={{
                  width: `${Math.min(
                    (approvedConnections /
                      (planLimit + (extraConnections || 0))) *
                      100,
                    100
                  )}%`,
                }}
              ></div>
            </div>
            <small>
              {approvedConnections} of {planLimit + (extraConnections || 0)}{" "}
              connections used
            </small>
          </div>
        )}

        <h3>Existing Connections</h3>
        <p className="section-hint">
          Review current connections, pending requests, and shared brands.
        </p>

        <CompanyConnectionList
          connections={connections}
          currentCompanyId={currentCompanyId}
          isAdminView={user?.role === "admin" || user?.role === "super-admin"}
          onEdit={handleEdit}
        />
      </div>

      {/* 🧩 Builder Modal */}
      <Modal
        open={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        slotProps={{ backdrop: { className: "connection-builder-backdrop" } }}
      >
        <div className="connection-builder-modal">
          <ConnectionBuilder
            onClose={() => setIsBuilderOpen(false)}
            onConfirm={handleConfirmRequest}
          />
        </div>
      </Modal>

      {/* 🧩 Edit Modal */}
      {selectedConnection && (
        <Modal
          open={isEditOpen}
          onClose={handleModalClose}
          slotProps={{ backdrop: { className: "connection-builder-backdrop" } }}
        >
          <div className="connection-builder-modal">
            <ConnectionEditModal
              isOpen={isEditOpen}
              onClose={handleModalClose}
              connection={selectedConnection}
              currentCompanyId={currentCompanyId}
            />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CompanyConnectionsManager;
