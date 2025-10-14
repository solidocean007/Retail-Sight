import React, { useEffect, useMemo, useState } from "react";
import "./companyConnectionCard.css";
// import {motion}
import { CompanyConnectionType, PendingBrandType } from "../../utils/types";
import EditIcon from "@mui/icons-material/Edit";
import HandshakeConnection from "./HandshakeConnection";

interface Props {
  key: string;
  connection: CompanyConnectionType;
  currentCompanyId: string | undefined;
  onEdit: (connection: CompanyConnectionType) => void;
  isAdminView?: boolean
}

const CompanyConnectionCard: React.FC<Props> = ({
  key,
  connection,
  currentCompanyId,
  onEdit,
  isAdminView,
}) => {

  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    if (connection.status === "approved") {
      const timer = setTimeout(() => setAnimationComplete(true), 1600);
      return () => clearTimeout(timer);
    } else {
      setAnimationComplete(false);
    }
  }, [connection.status]);

  const isFromUser = currentCompanyId === connection.requestFromCompanyId;

  const ourCompany = isFromUser
    ? connection.requestFromCompanyName
    : connection.requestToCompanyName;

  const theirCompany = isFromUser
    ? connection.requestToCompanyName
    : connection.requestFromCompanyName;

  const pendingBrands = connection.pendingBrands || [];
  const declinedBrands = connection.declinedBrands || [];

  const pendingFromUs = useMemo(
    () => pendingBrands.filter((b) => b.proposedBy === currentCompanyId),
    [pendingBrands, currentCompanyId]
  );

  const pendingFromThem = useMemo(
    () => pendingBrands.filter((b) => b.proposedBy !== currentCompanyId),
    [pendingBrands, currentCompanyId]
  );

  return (
    <div className={`connection-card ${connection.status}`} key={key}>
      <header className="connection-header">
        <div className="company-info">
          <h4 className="connection-title">
            {ourCompany}
            {connection.status === "approved" && (
              <HandshakeConnection animate={true} pulse={true} size={1.5} />
            )}

            {theirCompany}
          </h4>

          <p className="connection-status">
            Status:{" "}
            <span className={`status-label ${connection.status}`}>
              {connection.status}
            </span>
          </p>
        </div>

        <button
          className="app-btn small secondary"
          onClick={() => onEdit(connection)}
        >
          <EditIcon fontSize="small" /> Edit
        </button>
      </header>

      {/* Shared brands */}
      <section className="brands-section">
        <h5 className="section-title">Active Shared Brands</h5>
        {connection.sharedBrands?.length ? (
          <div className="brand-list">
            {connection.sharedBrands
              .filter((b) => b && b.trim() !== "")
              .map((brand) => (
                <span key={brand} className="brand-chip shared">
                  {brand}
                </span>
              ))}
          </div>
        ) : (
          <p className="empty-text">No active shared brands yet.</p>
        )}
      </section>

      {/* Pending section */}
      <section className="pending-section">
        <div className="pending-column">
          <h5>📤 Proposed by {ourCompany}</h5>
          {pendingFromUs.length ? (
            <div className="brand-list">
              {pendingFromUs.map((b: PendingBrandType, i) => (
                <span key={i} className="brand-chip pending">
                  {b.brand}
                </span>
              ))}
            </div>
          ) : (
            <p className="empty-text">No proposals from you.</p>
          )}
        </div>

        <div className="pending-column">
          <h5>📥 Proposed by {theirCompany}</h5>
          {pendingFromThem.length ? (
            <div className="brand-list">
              {pendingFromThem.map((b: PendingBrandType, i) => (
                <span key={i} className="brand-chip pending">
                  {b.brand}
                </span>
              ))}
            </div>
          ) : (
            <p className="empty-text">No pending proposals from them.</p>
          )}
        </div>
      </section>

      {/* Declined section */}
      {declinedBrands.length > 0 && (
        <section className="declined-section">
          <h5>❌ Declined Brands</h5>
          <div className="brand-list">
            {declinedBrands.map((b: PendingBrandType, i) => (
              <span key={i} className="brand-chip declined">
                {b.brand}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default CompanyConnectionCard;
