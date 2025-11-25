import React, { useMemo, useState } from "react";
import "./connectionBuilder.css";
import { useSupplierBrands } from "../../hooks/useSupplierBrands";
import { useAppDispatch } from "../../utils/store";
import { showMessage } from "../../Slices/snackbarSlice";
import CustomConfirmation from "../CustomConfirmation";

interface ConnectionBuilderProps {
  email: string;
  lookup: any;
  onClose: () => void;
  onConfirm: (email: string, brandSelection: string[]) => Promise<void>;
}

const ConnectionBuilder: React.FC<ConnectionBuilderProps> = ({
  email,
  lookup,
  onClose,
  onConfirm,
}) => {
  const dispatch = useAppDispatch();
  const { supplierBrandList } = useSupplierBrands();

  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [manualBrand, setManualBrand] = useState("");
  const [brandSelection, setBrandSelection] = useState<string[]>([]);
  const [manualBrandMode, setManualBrandMode] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [loadingConfirm, setLoadingConfirm] = useState(false);

  const currentBrands = useMemo(() => {
    const supplier = supplierBrandList.find(
      (s) => s.supplier === selectedSupplier
    );
    return supplier ? supplier.brands : [];
  }, [supplierBrandList, selectedSupplier]);

  const handleAddManualBrand = () => {
    const newBrand = manualBrand.trim();
    if (!newBrand) return;
    if (!brandSelection.includes(newBrand)) {
      setBrandSelection((prev) => [...prev, newBrand]);
    }
    setManualBrand("");
  };

  const toggleBrand = (brand: string) => {
    const normalized = brand.trim().toLowerCase();

    setBrandSelection((prev) => {
      const exists = prev.some((b) => b.toLowerCase() === normalized);
      return exists
        ? prev.filter((b) => b.toLowerCase() !== normalized)
        : [...prev, brand];
    });
  };

  const openConfirmation = () => {
    const clean = email.trim().toLowerCase();

    if (!clean || !clean.includes("@")) {
      dispatch(showMessage("Invalid email format."));
      return;
    }

    setIsConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setLoadingConfirm(true);
    await onConfirm(email, brandSelection);
    setLoadingConfirm(false);
    setIsConfirmOpen(false);
  };

  return (
    <div className="connection-builder">
      <h3>Step 2 — Select Shared Brands (Optional)</h3>

      {/* INVITE HEADER */}
      {lookup.mode !== "user-found" && (
        <div className="flashy-invite-box">
          <div className="email-glow">📧</div>
          <div className="invite-email">{email}</div>
          <p>This user is not yet part of a company on Displaygram.</p>
          <p>
            You may send them an invitation and optionally propose brands to
            share once they join.
          </p>
        </div>
      )}

      {/* NORMAL HEADER */}
      {lookup.mode === "user-found" && (
        <p className="section-hint">
          The company administrator has been identified. Now choose any brands
          you’d like to propose sharing with them.
        </p>
      )}

      <p className="section-hint">
        Propose brands from your Product Manager to share right away with this
        company.
      </p>

      {/* NEW: SUPPLIER HEADER ROW */}
      <div className="supplier-header-row">
        <label htmlFor="supplierSelect" className="supplier-label">
          Choose a supplier to filter brands or
        </label>

        <button
          type="button"
          className="inline-text-btn"
          onClick={() => setManualBrandMode(!manualBrandMode)}
        >
          {manualBrandMode ? "Hide Custom Brand" : "Add a Custom Brand"}
        </button>
      </div>

      {/* DROPDOWN */}
      <div className="supplier-dropdown">
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

      {/* BRAND SELECTOR */}
      {selectedSupplier && (
        <div className="brand-selector">
          <h4>Brands from {selectedSupplier}</h4>
          <div className="brand-chip-grid">
            {currentBrands.map((brand) => (
              <button
  className={`chip brand-chip ${brandSelection.includes(brand) ? "selected" : ""}`}
  onClick={() => toggleBrand(brand)}
>

                {brand}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MANUAL BRAND INPUT */}
      {manualBrandMode && (
        <div className="manual-brand-entry">
          <p className="manual-brand-note">
            If the brand isn’t listed, you can add it manually.
          </p>
          <input
            type="text"
            placeholder="Enter brand name..."
            value={manualBrand}
            onChange={(e) => setManualBrand(e.target.value)}
            className="manual-brand-input"
          />
          <button
            className="add-brand-btn"
            onClick={handleAddManualBrand}
            disabled={!manualBrand.trim()}
          >
            Add
          </button>
        </div>
      )}

      {/* SELECTED BRANDS */}
      {brandSelection.length > 0 && (
        <div className="selected-brands-bar">
          <h5>Proposed Brands</h5>
          <div className="selected-brand-list">
            {brandSelection.map((brand) => (
              <span key={brand} className="chip selected-brand-chip">
                {brand}
                <button
                  className="remove-brand-btn"
                  onClick={() =>
                    setBrandSelection((prev) =>
                      prev.filter((b) => b !== brand)
                    )
                  }
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ACTION BUTTONS */}
      <div className="modal-actions">
        <button
          className="clear-selection-btn"
          onClick={() => {
            setBrandSelection([]);
            setSelectedSupplier("");
            setManualBrand("");
            setManualBrandMode(false);
          }}
          disabled={!brandSelection.length && !selectedSupplier}
        >
          Clear
        </button>

        <button
          className="button-primary"
          onClick={openConfirmation}
          disabled={loadingConfirm}
        >
          {loadingConfirm ? "Processing..." : "Send Request"}
        </button>

        <button className="button-secondary" onClick={onClose}>
          Close
        </button>
      </div>

      {/* CONFIRM MODAL */}
      <CustomConfirmation
        isOpen={isConfirmOpen}
        loading={loadingConfirm}
        onConfirm={handleConfirm}
        onClose={() => setIsConfirmOpen(false)}
        title="Confirm Connection Request"
        message={`You're about to send a connection request to ${email}.${
          brandSelection.length > 0
            ? `\n\nIncluded: ${brandSelection.length} proposed brand(s).`
            : ""
        }`}
      />
    </div>
  );
};

export default ConnectionBuilder;
