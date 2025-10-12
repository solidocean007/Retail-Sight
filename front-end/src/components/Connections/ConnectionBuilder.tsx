import React, { useMemo, useState } from "react";
import "./companyConnectionsManager.css";
import { useSupplierBrands } from "../../hooks/useSupplierBrands";
import { useAppDispatch } from "../../utils/store";
import { showMessage } from "../../Slices/snackbarSlice";
import CustomConfirmation from "../CustomConfirmation";

interface ConnectionBuilderProps {
  onClose: () => void;
  onConfirm: (emailInput: string, brandSelection: string[]) => Promise<void>;
}

const ConnectionBuilder: React.FC<ConnectionBuilderProps> = ({
  onClose,
  onConfirm,
}) => {
  const dispatch = useAppDispatch();
  const { supplierBrandList } = useSupplierBrands();

  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [manualBrand, setManualBrand] = useState("");
  const [emailInput, setEmailInput] = useState("");
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
    setBrandSelection((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const openConfirmation = () => {
    if (!emailInput.trim()) {
      dispatch(showMessage("Please enter a valid company admin email."));
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setLoadingConfirm(true);
    await onConfirm(emailInput, brandSelection);
    setLoadingConfirm(false);
    setIsConfirmOpen(false);
  };

  return (
    <div className="connection-builder">
      <h3>Build a New Connection</h3>
      <p className="section-hint">
        Enter the company admin’s email address to begin a connection request.
        Once approved, you’ll be able to share goals and posts across companies.
      </p>

      <input
        type="email"
        value={emailInput}
        placeholder="Enter company admin email"
        onChange={(e) => setEmailInput(e.target.value)}
        className="connection-email-input"
      />

      <p className="section-hint">
        Optionally, propose brands from your Product Manager to share with this
        company.
      </p>

      {/* Supplier Dropdown */}
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

      {/* Manual Brand Input */}
      <div className="manual-brand-box">
         <button
        onClick={() => setManualBrandMode(!manualBrandMode)}
        className="toggle-manual-btn"
      >
        {manualBrandMode ? "Hide Manual Brand Input" : "Add a Custom Brand"}
      </button>
       {manualBrandMode && (
        <div className="manual-brand-entry">
          <p className="manual-brand-note">
            If the brand isn’t listed, you can add it manually. (Note: manually
            added brands must also be typed when creating posts.)
          </p>
          <input
            type="text"
            placeholder="Enter new brand name..."
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
      </div>
     

     

      {/* Selected Brands */}
      {brandSelection.length > 0 && (
        <div className="selected-brands-bar">
          <h5>Proposed Brands</h5>
          <div className="selected-brand-list">
            {brandSelection.map((brand) => (
              <span key={brand} className="selected-brand-chip">
                {brand}
                <button
                  className="remove-brand-btn"
                  onClick={() =>
                    setBrandSelection((prev) => prev.filter((b) => b !== brand))
                  }
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="modal-actions">
        <button
          className="clear-selection-btn"
          onClick={() => {
            setBrandSelection([]);
            setSelectedSupplier("");
            setManualBrand("");
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

      {/* Confirmation Modal */}
      <CustomConfirmation
        isOpen={isConfirmOpen}
        loading={loadingConfirm}
        onConfirm={handleConfirm}
        onClose={() => setIsConfirmOpen(false)}
        title="Confirm Connection Request"
        message={`You're about to send a connection request to ${emailInput}${
          brandSelection.length > 0
            ? `, including ${brandSelection.length} proposed brand(s)`
            : ""
        }. Continue?`}
      />
    </div>
  );
};

export default ConnectionBuilder;
