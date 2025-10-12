import React, { useState, useMemo } from "react";
import { Modal } from "@mui/material";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../utils/firebase";
import { useSupplierBrands } from "../../hooks/useSupplierBrands";
import CustomConfirmation from "../CustomConfirmation";
import "./connectionEditModal.css";
import { useSelector } from "react-redux";
import { selectUser } from "../../Slices/userSlice";

interface ConnectionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  connection: any;
  currentCompanyId: string | undefined;
}

const ConnectionEditModal: React.FC<ConnectionEditModalProps> = ({
  isOpen,
  onClose,
  connection,
  currentCompanyId,
}) => {
  const usersCompany = useSelector(selectUser)?.company;
  const { supplierBrandList } = useSupplierBrands();
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [manualBrand, setManualBrand] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    connection?.sharedBrands || []
  );
  console.log(connection);
  const [confirmAction, setConfirmAction] = useState<{
    type: string;
    brand: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const currentBrands = useMemo(() => {
    const supplier = supplierBrandList.find(
      (s) => s.supplier === selectedSupplier
    );
    return supplier ? supplier.brands : [];
  }, [supplierBrandList, selectedSupplier]);

  if (!connection) return null;

  // --- Firestore Save ---
  const handleSave = async () => {
    if (!connection?.id || !currentCompanyId) return;
    try {
      setSaving(true);
      await updateDoc(doc(db, "companyConnections", connection.id), {
        sharedBrands: selectedBrands,
        updatedAt: serverTimestamp(),
      });
      onClose();
    } catch (err) {
      console.error("Error saving connection:", err);
    } finally {
      setSaving(false);
    }
  };

  // --- Toggle brand selection ---
  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  // --- Manual brand add ---
  const handleAddManualBrand = () => {
    const newBrand = manualBrand.trim();
    if (newBrand && !selectedBrands.includes(newBrand)) {
      setSelectedBrands((prev) => [...prev, newBrand]);
    }
    setManualBrand("");
  };

  // --- Handle confirm actions (approve/reject/remove) ---
  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, brand } = confirmAction;
    console.log(`Confirmed ${type} for brand ${brand}`);
    // TODO: Firestore writes per action type
    setConfirmAction(null);
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      slotProps={{
        backdrop: { className: "connection-edit-backdrop" },
      }}
    >
      <div className="connection-edit-modal">
        <header className="connection-header">
          <h2 className="modal-title">Edit Connection</h2>
          <p className="connection-intro">
            You’re managing collaboration between{" "}
            <strong>{connection.requestFromCompanyName}</strong> and{" "}
            <strong>{connection.requestToCompanyName}</strong>. Review current
            shared brands, respond to pending proposals, or suggest new brands
            to connect on below.
          </p>
        </header>

        {/* === Active Shared Brands === */}
        <section className="shared-brands-section">
          <h4 className="section-title">Active Shared Brands</h4>
          <div className="shared-brands-table">
            {/* Left column — Your company */}
            <div className="shared-column">
              <h5>
                Brands shared from{" "}
                <strong>{usersCompany?.name || "Your Company"}</strong> →
              </h5>
              {connection.sharedBrandsFrom?.filter((b: string) => b?.trim())
                .length ? (
                connection.sharedBrandsFrom
                  .filter((b: string) => b?.trim())
                  .map((brand: string) => (
                    <div key={brand} className="shared-row">
                      <span>{brand}</span>
                      <button
                        className="app-btn small danger"
                        onClick={() =>
                          setConfirmAction({ type: "removeFrom", brand })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))
              ) : (
                <p className="empty-text">
                  No brands currently shared from you.
                </p>
              )}
            </div>

            {/* Right column — Connected company */}
            <div className="shared-column">
              <h5>
                ← Brands shared from{" "}
                <strong>{connection.requestToCompanyName}</strong>
              </h5>
              {connection.sharedBrandsTo?.filter((b: string) => b?.trim())
                .length ? (
                connection.sharedBrandsTo
                  .filter((b: string) => b?.trim())
                  .map((brand: string) => (
                    <div key={brand} className="shared-row">
                      <span>{brand}</span>
                      <button
                        className="app-btn small danger"
                        onClick={() =>
                          setConfirmAction({ type: "removeTo", brand })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))
              ) : (
                <p className="empty-text">
                  {connection.requestToCompanyName} hasn’t shared any brands
                  yet.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* === Pending Brand Proposals === */}
        <section className="pending-brands-section">
          <h4 className="section-title">Pending Brand Proposals</h4>
          <div className="pending-brands-table">
            {/* Left = proposals you sent */}
            <div className="pending-column">
              <h5>
                Pending from <strong>{usersCompany || "You"}</strong>
              </h5>
              {connection.pendingFromBrands?.filter((b: string) => b?.trim())
                .length ? (
                connection.pendingFromBrands
                  .filter((b: string) => b?.trim())
                  .map((brand: string) => (
                    <div key={brand} className="pending-row">
                      <span>{brand}</span>
                      <button
                        className="app-btn small secondary"
                        onClick={() =>
                          setConfirmAction({ type: "cancelPendingFrom", brand })
                        }
                      >
                        Cancel
                      </button>
                    </div>
                  ))
              ) : (
                <p className="empty-text">No pending proposals from you.</p>
              )}
            </div>

            {/* Right = proposals from them */}
            <div className="pending-column">
              <h5>
                Pending from <strong>{connection.requestToCompanyName}</strong>
              </h5>
              {connection.pendingToBrands?.filter((b: string) => b?.trim())
                .length ? (
                connection.pendingToBrands
                  .filter((b: string) => b?.trim())
                  .map((brand: string) => (
                    <div key={brand} className="pending-row">
                      <span>{brand}</span>
                      <div className="pending-actions">
                        <button
                          className="app-btn small success"
                          onClick={() =>
                            setConfirmAction({ type: "approve", brand })
                          }
                        >
                          Accept
                        </button>
                        <button
                          className="app-btn small danger"
                          onClick={() =>
                            setConfirmAction({ type: "reject", brand })
                          }
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
              ) : (
                <p className="empty-text">
                  No pending brand proposals from{" "}
                  {connection.requestToCompanyName}.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* === Propose New Brands === */}
        <section className="brand-proposal-section">
          <h4 className="section-title">Propose New Brands to Share</h4>
          <p className="section-description">
            Choose a supplier from your network to view their brands, or
            manually add one below to propose a new shared brand. Once
            submitted, the other company can approve or reject your proposal.
          </p>

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
              className="app-btn primary small"
              onClick={handleAddManualBrand}
              disabled={!manualBrand.trim()}
            >
              Add
            </button>
          </div>
        </section>

        {/* === Footer === */}
        <footer className="modal-actions">
          <button className="app-btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="app-btn primary" onClick={handleSave}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </footer>

        <CustomConfirmation
          isOpen={!!confirmAction}
          title="Confirm Action"
          message={`Are you sure you want to ${
            confirmAction?.type === "reject"
              ? "reject"
              : confirmAction?.type === "approve"
              ? "approve"
              : confirmAction?.type?.includes("remove")
              ? "remove"
              : "cancel"
          } '${confirmAction?.brand}'?`}
          onConfirm={handleConfirmAction}
          onClose={() => setConfirmAction(null)}
        />
      </div>
    </Modal>
  );
};

export default ConnectionEditModal;
