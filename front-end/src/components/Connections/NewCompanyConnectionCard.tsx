import React, { useEffect, useMemo, useState } from "react";
import "./companyConnectionCard.css";
import { CompanyConnectionType, PendingBrandType } from "../../utils/types";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import HandshakeConnection from "./HandshakeConnection";
import { db } from "../../utils/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useSupplierBrands } from "../../hooks/useSupplierBrands";
import { useAppDispatch } from "../../utils/store";

interface Props {
  connection: CompanyConnectionType;
  currentCompanyId: string | undefined;
  isAdminView?: boolean;
}

const NewCompanyConnectionCard: React.FC<Props> = ({
  connection,
  currentCompanyId,
  isAdminView,
}) => {
  const dispatch = useAppDispatch();
  const { supplierBrandList } = useSupplierBrands();
  const [animationComplete, setAnimationComplete] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [brandSelection, setBrandSelection] = useState<string[]>([]);
  const [sharedBrands, setSharedBrands] = useState<string[]>(
    connection.sharedBrands || []
  );
  const [manualBrand, setManualBrand] = useState("");
  const [saving, setSaving] = useState(false);

  const currentBrands = useMemo(() => {
    const supplier = supplierBrandList.find(
      (s) => s.supplier === selectedSupplier
    );
    return supplier ? supplier.brands : [];
  }, [supplierBrandList, selectedSupplier]);

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

  // --- Add or remove brands inline ---
  const handleAddBrand = () => {
    const newBrand = manualBrand.trim();
    if (!newBrand) return;
    if (!sharedBrands.includes(newBrand)) {
      setSharedBrands((prev) => [...prev, newBrand]);
    }
    setManualBrand("");
  };

  const handleRemoveBrand = (brand: string) => {
    setSharedBrands((prev) => prev.filter((b) => b !== brand));
  };

  const handleAddManualBrand = () => {
    const newBrand = manualBrand.trim();
    if (!newBrand) return;
    if (!brandSelection.includes(newBrand)) {
      setBrandSelection((prev) => [...prev, newBrand]);
    }
    setManualBrand("");
  };

  const toggleBrand = (brand: string) => {
    setBrandSelection((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const handleSave = async () => {
    if (!connection.id) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "companyConnections", connection.id), {
        sharedBrands,
        // you might later include pendingBrands update using brandSelection
        updatedAt: serverTimestamp(),
      });
      setBrandSelection([]); // clear draft selection
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating connection:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSharedBrands(connection.sharedBrands || []);
    setBrandSelection([]);
    setManualBrand("");
    setIsEditing(false);
  };

  return (
    <div className={`connection-card ${connection.status}`}>
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

        {!isEditing ? (
          <button
            className="app-btn small secondary"
            onClick={() => setIsEditing(true)}
            disabled={!isAdminView}
          >
            <EditIcon fontSize="small" /> Edit
          </button>
        ) : (
          <div className="connection-actions">
            <button
              className="app-btn small success"
              onClick={handleSave}
              disabled={saving}
            >
              <SaveIcon fontSize="small" /> {saving ? "Saving..." : "Save"}
            </button>
            <button
              className="app-btn small danger"
              onClick={handleCancel}
              disabled={saving}
            >
              <CancelIcon fontSize="small" /> Cancel
            </button>
          </div>
        )}
      </header>

      {/* Supplier Dropdown */}
      {isEditing && (
        <div className="supplier-dropdown">
          <label htmlFor="supplierSelect">Select a Supplier:</label>
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
      )}

      {/* Brand Selector */}
      {selectedSupplier && (
        <div className="brand-selector">
          <h4>Brands from {selectedSupplier}</h4>
          <div className="brand-chip-grid">
            {currentBrands.map((brand) => (
              <button
                key={brand}
                className={`brand-chip ${
                  brandSelection.includes(brand) ? "selected" : ""
                }`}
                onClick={() => toggleBrand(brand)}
              >
                {brand}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Shared brands */}
      <section className="brands-section">
        <h5 className="section-title">Active Shared Brands</h5>
        {sharedBrands.length ? (
          <div className="brand-list">
            {sharedBrands.map((brand) => (
              <span key={brand} className="brand-chip shared">
                {brand}
                {isEditing && (
                  <button
                    className="remove-brand-btn"
                    onClick={() => handleRemoveBrand(brand)}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        ) : (
          <p className="empty-text">No active shared brands yet.</p>
        )}

        {/* Manual Add Input (visible in edit mode) */}
        {isEditing && (
          <div className="manual-brand-entry">
            <p className="manual-brand-note">
              If the brand isn’t listed, you can add it manually.
            </p>
            <input
              type="text"
              placeholder="Add a brand..."
              value={manualBrand}
              onChange={(e) => setManualBrand(e.target.value)}
              className="manual-brand-input"
            />
            <button
              className="button-primary"
              onClick={handleAddBrand}
              disabled={!manualBrand.trim()}
            >
              Add
            </button>
          </div>
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

          {/* 🆕 Draft Proposals Preview */}
          {isEditing && brandSelection.length > 0 && (
            <div className="draft-pending">
              <h6>Draft Proposals (will be sent on Save)</h6>
              <div className="brand-list">
                {brandSelection.map((b) => (
                  <span key={b} className="brand-chip draft">
                    {b}
                  </span>
                ))}
              </div>
            </div>
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

export default NewCompanyConnectionCard;
