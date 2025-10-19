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
import CustomConfirmation from "../CustomConfirmation";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

interface Props {
  key: string;
  connection: CompanyConnectionType;
  currentCompanyId: string | undefined;
  isAdminView?: boolean;
}

const CompanyConnectionCard: React.FC<Props> = ({
  key,
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBrand, setConfirmBrand] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    "accept" | "reject" | "cancel" | "removeShared" | null
  >(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  // fade out visual feedback

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
  const handleAddManualBrand = () => {
    const newBrand = manualBrand.trim();
    if (!newBrand) return;
    // Instead of adding to sharedBrands, treat it like supplier proposals
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
      const newPending = [
        ...(connection.pendingBrands || []),
        ...brandSelection.map((b) => ({
          brand: b,
          proposedBy: currentCompanyId,
          proposedAt: new Date().toISOString(), // ✅ use client time for each
        })),
      ];

      await updateDoc(doc(db, "companyConnections", connection.id), {
        pendingBrands: newPending,
        updatedAt: serverTimestamp(), // ✅ allowed (not inside array)
      });

      setBrandSelection([]);
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating connection:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedSupplier("");
    setSharedBrands(connection.sharedBrands || []);
    setBrandSelection([]);
    setManualBrand("");
    setIsEditing(false);
  };

  const openConfirm = (
    action: "accept" | "reject" | "cancel" | "removeShared",
    brand: string
  ) => {
    setConfirmBrand(brand);
    setConfirmAction(action);
    setConfirmOpen(true);
  };

const handleConfirm = async () => {
  if (!connection.id || !confirmBrand || !confirmAction) return;
  setConfirmLoading(true);

  try {
    // Only fade after confirmation — one unified call
    const fadingEl = document.querySelector(`[data-brand='${confirmBrand}']`);
    if (fadingEl) fadingEl.classList.add("fade-out");
    await new Promise((res) => setTimeout(res, 300)); // consistent fade duration

    // Common update skeleton
    const updatedPending = (connection.pendingBrands || []).filter(
      (b) => b.brand !== confirmBrand
    );

    const updateData: any = {
      pendingBrands: updatedPending,
      updatedAt: serverTimestamp(),
    };

    if (confirmAction === "accept") {
      updateData.sharedBrands = [
        ...(connection.sharedBrands || []),
        confirmBrand,
      ];
    } else if (confirmAction === "reject") {
      updateData.declinedBrands = [
        ...(connection.declinedBrands || []),
        confirmBrand,
      ];
    } else if (confirmAction === "removeShared") {
      // remove from sharedBrands only
      const updatedShared = (connection.sharedBrands || []).filter(
        (b) => b !== confirmBrand
      );
      await updateDoc(doc(db, "companyConnections", connection.id), {
        sharedBrands: updatedShared,
        updatedAt: serverTimestamp(),
      });
      setSharedBrands(updatedShared);
      setConfirmOpen(false);
      return; // ✅ done early
    }

    // Apply pending updates (for accept / reject / cancel)
    await updateDoc(doc(db, "companyConnections", connection.id), updateData);

    // update local state for visual sync
    setSharedBrands(updateData.sharedBrands || sharedBrands);
    setConfirmOpen(false);
  } catch (err) {
    console.error("Error updating brand decision:", err);
  } finally {
    setConfirmLoading(false);
  }
};


  return (
    <div key={key} className={`connection-card ${connection.status}`}>
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
                    onClick={() => openConfirm("removeShared", brand)}
                    title="Remove shared brand"
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
      </section>

      {/* Pending section */}
      {(pendingFromUs.length > 0 || pendingFromThem.length > 0) && (
        <section className="pending-section">
          {/* Proposed by us */}
          {pendingFromUs.length > 0 && (
            <div className="pending-column">
              <h5>📤 Proposed by 1 {ourCompany}</h5>
              <div className="brand-list">
                {pendingFromUs.map((b: PendingBrandType, i) => (
                  <div
                    key={i}
                    className="pending-brand-row"
                    data-brand={b.brand}
                  >
                    <span className="brand-chip pending">{b.brand}</span>
                    {isAdminView && (
                      <button
                        className="icon-btn cancel-btn"
                        onClick={() => openConfirm("cancel", b.brand)}
                        title="Withdraw proposal"
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Proposed by them */}
          {pendingFromThem.length > 0 && (
            <div className="pending-column">
              <h5>📥 Proposed by {theirCompany}</h5>
              <div className="brand-list">
                {pendingFromThem.map((b: PendingBrandType, i) => (
                  <div key={i} className="pending-brand-row">
                    <span className="brand-chip pending">{b.brand}</span>
                    {isAdminView && (
                      <div className="pending-actions">
                        <button
                          className="accept-btn"
                          onClick={() => openConfirm("accept", b.brand)}
                        >
                          Accept
                        </button>
                        <button
                          className="reject-btn"
                          onClick={() => openConfirm("reject", b.brand)}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Supplier Dropdown */}
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
      {isEditing && (
        <div className="edit-zone">
          <p className="edit-zone-text">
            <strong>Propose new brands to share</strong> with this connected
            company. You can select brands from your supplier catalog or
            manually type in a brand name that isn’t listed.
          </p>
          <p className="edit-zone-text">
            When you click <strong>Save</strong>, all selected or manually added
            brands will appear as <em>pending proposals</em> until the other
            company accepts them.
          </p>

          <div className="supplier-dropdown">
            <p className="supplier-intro">
              <strong>Select a supplier</strong> from your company’s product
              manager list to view their available brands.
            </p>

            <label htmlFor="supplierSelect">Supplier:</label>
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
              <h4 className="section-title">Brands from {selectedSupplier}</h4>
              <p className="edit-zone-text">
                Click a brand below to mark it for sharing. Selected brands turn
                blue and will appear under <em>Draft Proposals</em> until you
                save.
              </p>

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

          <div className="manual-brand-entry">
            <p className="manual-brand-note">
              Can’t find a brand in your supplier list? Add it manually below.
              These will also appear as pending proposals until confirmed.
            </p>
            <div className="manual-brand-input-box">
              <input
                type="text"
                placeholder="Enter a new brand name..."
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
          </div>
        </div>
      )}
      <CustomConfirmation
        isOpen={confirmOpen}
        title={
          confirmAction === "removeShared"
            ? "Remove Shared Brand"
            : confirmAction === "accept"
            ? "Accept Brand Proposal"
            : confirmAction === "reject"
            ? "Reject Brand Proposal"
            : "Cancel Proposal"
        }
        message={
          confirmAction === "accept"
            ? `Are you sure you want to accept ${confirmBrand} as a shared brand with ${theirCompany}?`
            : confirmAction === "reject"
            ? `Reject ${confirmBrand} from being shared? This action cannot be undone.`
            : confirmAction === "cancel"
            ? `Withdraw your proposal to share ${confirmBrand}?`
            : `Remove ${confirmBrand} from your shared brands? This will stop mutual visibility for this brand.`
        }
        loading={confirmLoading}
        onConfirm={handleConfirm}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
};

export default CompanyConnectionCard;
