import React, { useState, useMemo } from "react";
import {
  CompanyConnectionType,
  PendingBrandType,
  UserType,
} from "../../utils/types";
import { db } from "../../utils/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useSupplierBrands } from "../../hooks/useSupplierBrands";
import CustomConfirmation from "../CustomConfirmation";
import { getProposerCompanyId } from "../../utils/connectionHelper";

// Format pending brand entry showing who proposed it
const renderPendingBrand = (p: PendingBrandType) => {
  const proposer =
    typeof p.proposedBy === "string"
      ? p.proposedBy
      : p.proposedBy?.firstName ||
        p.proposedBy?.email ||
        "Unknown user";

  return `${p.brand} — proposed by ${proposer}`;
};


interface ConnectionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  connection: CompanyConnectionType;
  currentCompanyId: string | undefined;
}

const ConnectionEditModal: React.FC<ConnectionEditModalProps> = ({
  isOpen,
  onClose,
  connection,
  currentCompanyId,
}) => {
  const { supplierBrandList } = useSupplierBrands();
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [manualBrand, setManualBrand] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    connection.sharedBrands || []
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;
  const ourCompanyId = currentCompanyId!;
  const theirCompanyId =
    connection.requestFromCompanyId === ourCompanyId
      ? connection.requestToCompanyId
      : connection.requestFromCompanyId;

  const ourCompanyName =
    connection.requestFromCompanyId === ourCompanyId
      ? connection.requestFromCompanyName
      : connection.requestToCompanyName;

  const theirCompanyName =
    connection.requestFromCompanyId === ourCompanyId
      ? connection.requestToCompanyName
      : connection.requestFromCompanyName;

  // derive pending/declined groups
  const pendingFromUs =
  connection.pendingBrands?.filter((b) => {
    const proposer = b.proposedBy;
    if (typeof proposer === "string") {
      return proposer === ourCompanyId;
    }
    return proposer.companyId === ourCompanyId;
  }) || [];

const pendingFromThem =
  connection.pendingBrands?.filter((b) => {
    const proposer = b.proposedBy;
    if (typeof proposer === "string") {
      return proposer !== ourCompanyId;
    }
    return proposer.companyId !== ourCompanyId;
  }) || [];


  const declinedBrands = connection.declinedBrands || [];

  const currentBrands = useMemo(() => {
    const supplier = supplierBrandList.find(
      (s) => s.supplier === selectedSupplier
    );
    return supplier ? supplier.brands : [];
  }, [supplierBrandList, selectedSupplier]);

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const handleAddManualBrand = () => {
    const newBrand = manualBrand.trim();
    if (!newBrand) return;
    if (!selectedBrands.includes(newBrand)) {
      setSelectedBrands((prev) => [...prev, newBrand]);
    }
    setManualBrand("");
  };

  const handleSave = async () => {
    if (!connection.id) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "companyConnections", connection.id), {
        sharedBrands: selectedBrands,
        updatedAt: serverTimestamp(),
      });
      onClose();
    } catch (err) {
      console.error("Error saving connection:", err);
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  // TODO: implement real actions later
  const onApprovePendingBrand = (connectionId: string, pendingBrand: PendingBrandType) => {
    console.log("Approve pending brand:", pendingBrand, "for", connectionId);
  };

  const onRejectPendingBrand = (connectionId: string, pendingBrand: PendingBrandType) => {
    console.log("Reject pending brand:", pendingBrand, "for", connectionId);
  };

  return (
    <div className="connection-edit-modal">
      <header className="connection-header">
        <h2 className="modal-title">
          Edit Connection — {ourCompanyName} ↔ {theirCompanyName}
        </h2>
        <p className="connection-intro">
          Review and manage shared brands with {theirCompanyName}. You can
          accept proposals, propose new brands, or remove existing ones.
        </p>
      </header>

      {/* === ACTIVE SHARED BRANDS === */}
      <section className="brands-section">
        <h4 className="section-title">Active Shared Brands</h4>
        {selectedBrands.length ? (
          <div className="brand-list">
            {selectedBrands.map((brand) => (
              <span key={brand} className="brand-chip shared">
                {brand}
              </span>
            ))}
          </div>
        ) : (
          <p className="empty-text">No active shared brands yet.</p>
        )}
      </section>
      {connection.pendingBrands && connection.pendingBrands.length > 0 && (
        <div className="pending-brands-section">
          <h4>Pending Brand Requests</h4>

          <ul className="pending-brands-list">
            {connection.pendingBrands.map((p, idx) => (
              <li key={idx} className="pending-brand-item">
                <span>{renderPendingBrand(p)}</span>

                {/* 
            You will wire these up later.
            The UI is ready now.
          */}
                <div className="pending-brand-actions">
                  <button
                    className="approve-btn"
                    onClick={() => onApprovePendingBrand(connection.id, p)}
                  >
                    Approve
                  </button>

                  <button
                    className="reject-btn"
                    onClick={() => onRejectPendingBrand(connection.id, p)}
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* === PENDING PROPOSALS === */}
      <section className="pending-section">
        <div className="pending-column">
          <h5>📤 Proposed by {ourCompanyName}</h5>
          {pendingFromUs.length ? (
            <div className="brand-list">
              {pendingFromUs.map((b: PendingBrandType) => (
                <span key={b.brand} className="brand-chip pending">
                  {b.brand}
                </span>
              ))}
            </div>
          ) : (
            <p className="empty-text">No proposals from you.</p>
          )}
        </div>

        <div className="pending-column">
          <h5>📥 Proposed by {theirCompanyName}</h5>
          {pendingFromThem.length ? (
            <div className="brand-list">
              {pendingFromThem.map((b: PendingBrandType) => (
                <span key={b.brand} className="brand-chip pending">
                  {b.brand}
                </span>
              ))}
            </div>
          ) : (
            <p className="empty-text">No pending proposals from them.</p>
          )}
        </div>
      </section>

      {/* === DECLINED BRANDS === */}
      {declinedBrands.length > 0 && (
        <section className="declined-section">
          <h5>❌ Declined Brands</h5>
          <div className="brand-list">
            {declinedBrands.map((b: PendingBrandType) => (
              <span key={b.brand} className="brand-chip declined">
                {b.brand}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* === PROPOSE NEW BRANDS === */}
      <section className="brand-proposal-section">
        <h4 className="section-title">Propose New Brands</h4>

        <div className="supplier-selector centered">
          <label htmlFor="supplierSelect" className="supplier-label">
            Select a Supplier
          </label>
          <select
            id="supplierSelect"
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
          >
            <option value="">-- Choose a supplier --</option>
            {supplierBrandList.map((s) => (
              <option key={s.supplier} value={s.supplier}>
                {s.supplier}
              </option>
            ))}
          </select>
        </div>

        {selectedSupplier && (
          <div className="brand-selector">
            <h5>Brands from {selectedSupplier}</h5>
            <div className="brand-chip-grid">
              {currentBrands.map((brand) => (
                <button
                  key={brand}
                  className={`brand-chip ${
                    selectedBrands.includes(brand) ? "selected" : ""
                  }`}
                  onClick={() => toggleBrand(brand)}
                >
                  {brand}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="manual-brand-entry">
          <input
            type="text"
            placeholder="Add a brand manually..."
            value={manualBrand}
            onChange={(e) => setManualBrand(e.target.value)}
            className="manual-brand-input"
          />
          <button
            className="button-primary"
            onClick={handleAddManualBrand}
            disabled={!manualBrand.trim()}
          >
            Add
          </button>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="modal-actions">
        <button className="button-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="button-primary"
          disabled={saving}
          onClick={() => setConfirmOpen(true)}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </footer>

      <CustomConfirmation
        isOpen={confirmOpen}
        title="Confirm Changes"
        message="Save updates to this connection?"
        onConfirm={handleSave}
        onClose={() => setConfirmOpen(false)}
        loading={saving}
      />
    </div>
  );
};

export default ConnectionEditModal;
