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
import { UserType } from "../../utils/types";
import ConnectionBuilder from "./ConnectionBuilder";
import { Box, Modal } from "@mui/material";

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

  return (
    <div className="connections-dashboard">
      <div className="info-banner">
        <h2>Company Connections</h2>
        <p>
          Manage and build partnerships with other companies to share retail
          display activity. Connections allow cross-company sharing of posts and
          goals.
        </p>
        <div className="tier-status">
          <strong>Your Plan: Free Tier</strong>
          <div className="tier-bar">
            <div className="tier-progress" style={{ width: "33%" }}></div>
          </div>
          <small>1 of 3 connections used</small>
        </div>
      </div>

      <div className="connections-list-card">
        <h3>Existing Connections</h3>
        <p className="section-hint">
          Review current connections, pending requests, and shared brands.
        </p>

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

        <CompanyConnectionList
          connections={connections}
          currentCompanyId={currentCompanyId}
          isAdminView={user?.role === "admin" || user?.role === "super-admin"}
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
    </div>
  );
};

export default CompanyConnectionsManager;
