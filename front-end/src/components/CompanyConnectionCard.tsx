import React, { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import "./companyConnectionCard.css";
import { CompanyConnectionType } from "../utils/types";
import { useAppDispatch } from "../utils/store";
import { updateConnectionStatus } from "../Slices/companyConnectionSlice";


interface CompanyConnectionCardProps {
  connection: CompanyConnectionType;
  currentCompanyId?: string;
  isAdminView?: boolean; // show approve/reject buttons
}

const CompanyConnectionCard: React.FC<CompanyConnectionCardProps> = ({
  connection,
  currentCompanyId,
  isAdminView = false,
}) => {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(connection.status);

  const otherCompanyId =
    connection.toCompanyId === currentCompanyId
      ? connection.fromCompanyId
      : connection.toCompanyId;

  const handleUpdateStatus = async (newStatus: "approved" | "rejected") => {
    if (!connection.id || !currentCompanyId) return; // Property 'id' does not exist on type 'CompanyConnectionType'
    try {
      setLoading(true);
     dispatch(updateConnectionStatus({ id: connection.id!, status: newStatus, companyId: currentCompanyId }));

      setStatus(newStatus);
    } catch (err) {
      console.error("Error updating connection:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`connection-card status-${status}`}>
      <h4>Connection with {otherCompanyId}</h4>
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

      {isAdminView && status === "pending" && (
        <div className="connection-actions">
          <button
            className="btn-approve"
            onClick={() => handleUpdateStatus("approved")}
            disabled={loading}
          >
            {loading ? "..." : "Approve"}
          </button>
          <button
            className="btn-reject"
            onClick={() => handleUpdateStatus("rejected")}
            disabled={loading}
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
};

export default CompanyConnectionCard;
