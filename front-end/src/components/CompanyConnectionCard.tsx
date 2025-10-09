import React, { useState } from "react";
import { useAppDispatch } from "../utils/store";
import { updateConnectionStatus } from "../Slices/companyConnectionSlice";
import { CompanyConnectionType } from "../utils/types";
import ConnectionEditModal from "./ConnectionEditModal";
import "./companyConnectionCard.css";

interface CompanyConnectionCardProps {
  connection: CompanyConnectionType;
  currentCompanyId?: string;
  isAdminView?: boolean;
}

const CompanyConnectionCard: React.FC<CompanyConnectionCardProps> = ({
  connection,
  currentCompanyId,
  isAdminView = false,
}) => {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(connection.status);

  // 🧩 Edit modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] =
    useState<CompanyConnectionType | null>(null);

  const otherCompanyId =
    connection.requestToCompanyId === currentCompanyId
      ? connection.requestFromCompanyId
      : connection.requestToCompanyId;

  const otherCompanyName =
    connection.requestToCompanyId === currentCompanyId
      ? connection.requestFromCompanyName
      : connection.requestToCompanyName;

  const handleUpdateStatus = async (newStatus: "approved" | "rejected") => {
    if (!connection.id || !currentCompanyId) return;
    try {
      setLoading(true);
      await dispatch(
        updateConnectionStatus({
          id: connection.id,
          status: newStatus,
          companyId: currentCompanyId,
        })
      );
      setStatus(newStatus);
    } catch (err) {
      console.error("Error updating connection:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id?: string) => {
    if (!id || !currentCompanyId) return;
    try {
      setLoading(true);
      await dispatch(
        updateConnectionStatus({
          id,
          status: "cancelled",
          companyId: currentCompanyId,
        })
      );
      setStatus("cancelled");
    } catch (err) {
      console.error("Error cancelling connection:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🧩 Opens edit modal
  const openEditModal = (conn: CompanyConnectionType) => {
    setSelectedConnection(conn);
    setIsEditOpen(true);
  };

  return (
    <div className={`connection-card status-${status}`}>
      <h4>Connection with {otherCompanyName || "Unknown Company"}</h4>
      <p>Status: {status}</p>

      {connection.sharedBrands?.length ? (
        <p>
          Shared Brands:{" "}
          <span className="shared-brands">
            {connection.sharedBrands.join(", ")}
          </span>
        </p>
      ) : (
        <p>No shared brands</p>
      )}

      {isAdminView && (
        <div className="connection-actions">
          {status === "pending" ? (
            connection.requestFromCompanyId === currentCompanyId ? (
              <button
                className="cancel-btn"
                disabled={loading}
                onClick={() => handleCancel(connection.id)}
              >
                Cancel
              </button>
            ) : (
              <>
                <button
                  className="approve-btn"
                  disabled={loading}
                  onClick={() => handleUpdateStatus("approved")}
                >
                  Approve
                </button>
                <button
                  className="reject-btn"
                  disabled={loading}
                  onClick={() => handleUpdateStatus("rejected")}
                >
                  Reject
                </button>
              </>
            )
          ) : null}

          <button
            className="edit-btn"
            onClick={() => openEditModal(connection)}
          >
            Edit
          </button>
        </div>
      )}

      {/* 🧩 Edit modal */}
      {selectedConnection && (
        <ConnectionEditModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          connection={selectedConnection}
          currentCompanyId={currentCompanyId}
        />
      )}
    </div>
  );
};

export default CompanyConnectionCard;
