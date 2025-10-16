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
import { Box, Modal } from "@mui/material";
import ConnectionEditModal from "./ConnectionEditModal";

interface Props {
  currentCompanyId: string | undefined;
  user: UserType | null;
}

const CompanyConnectionsManager: React.FC<Props> = ({
  currentCompanyId,
  user,
}) => {
  const dispatch = useAppDispatch();
  const { connections } = useSelector(
    (state: RootState) => state.companyConnections
  );
  const usersCompany = useSelector(selectCurrentCompany);
  const [selectedConnection, setSelectedConnection] =
    useState<CompanyConnectionType | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const connectionLimitReached = connections.length >= 3;

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

  // 🧩 Handle create request
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
                  companies to share your display and goal activity across
                  networks.
                </div>
              </li>
              <li>
                <span className="info-icon">📢</span>
                <div className="info-text">
                  <strong>Share Visibility:</strong> When you post a display
                  with <em>network visibility</em>, your connected partners see
                  it in their feed too. Note:  Displays with a company only visibility will not be seen by other companies.
                </div>
              </li>
              <li>
                <span className="info-icon">🔄</span>
                <div className="info-text">
                  <strong>Reciprocal Sharing:</strong> If a partner proposes to
                  share their brand and you accept, you’ll also see their
                  network posts.
                </div>
              </li>
              <li>
                <span className="info-icon">🏷️</span>
                <div className="info-text">
                  <strong>Shared Brands:</strong> Connections activate once both
                  companies approve the brands to share.
                </div>
              </li>
              <li>
                <span className="info-icon">🌐</span>
                <div className="info-text">
                  <strong>Unified Feed:</strong> Build your network presence and
                  expand visibility across the Displaygram ecosystem.
                </div>
              </li>
            </ul>

            <p className="info-banner-footer">
              Tip: You can manage shared brands directly from the connections
              below. Use <strong>Build New Connection</strong> to invite a new
              partner.
            </p>
          </div>
        )}
      </div>

      <div className="connections-list-card">
        <div className="tier-status">
          <strong>Your Plan: Free Tier</strong>
          <div className="tier-bar">
            <div className="tier-progress" style={{ width: "33%" }}></div>
          </div>
          <small>1 of 3 connections used</small>
          <div className="build-connection-launcher">
            <button
              className="button-primary"
              onClick={() => setIsBuilderOpen(true)}
              disabled={connectionLimitReached || isBuilderOpen}
            >
              Build New Connection
            </button>
            {connectionLimitReached && (
              <p className="limit-message">
                You’ve reached your connection limit for your current plan.
              </p>
            )}
          </div>
        </div>
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

      {/* 🧩 Modal */}
      <Modal
        open={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        slotProps={{
          backdrop: { className: "connection-builder-backdrop" },
        }}
      >
        <div className="connection-builder-modal">
          <ConnectionBuilder
            onClose={() => setIsBuilderOpen(false)}
            onConfirm={handleConfirmRequest}
          />
        </div>
      </Modal>
      {/* Connection editing modal (only one active at a time) */}
      {/* {selectedConnection && (
        <ConnectionEditModal
          isOpen={isEditOpen}
          onClose={handleModalClose}
          connection={selectedConnection}
          currentCompanyId={currentCompanyId}
        />
      )} */}

      {selectedConnection && (
        <Modal
          open={isEditOpen} // ✅ use isEditOpen, not isBuilderOpen
          onClose={handleModalClose}
          slotProps={{
            backdrop: { className: "connection-builder-backdrop" }, // ✅ can reuse same backdrop style
          }}
        >
          <div className="connection-builder-modal">
            {" "}
            {/* ✅ same container styling for consistent centering */}
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
