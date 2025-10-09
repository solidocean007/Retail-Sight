import React, { useState, useMemo } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../utils/firebase";
import { useBrandOptions } from "../hooks/useBrandOptions";
import "./connectionEditModal.css";

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
  const brandOptions = useBrandOptions();
  const [brandSearch, setBrandSearch] = useState("");
  const [manualBrand, setManualBrand] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    connection?.sharedBrands || []
  );
  const [saving, setSaving] = useState(false);

  const filteredBrands = useMemo(
    () =>
      brandOptions.filter((b) =>
        b.toLowerCase().includes(brandSearch.toLowerCase().trim())
      ),
    [brandOptions, brandSearch]
  );

  if (!isOpen || !connection) return null;

  const handleSave = async () => {
    if (!connection?.id || !currentCompanyId) {
      console.warn("❌ Missing connection.id or currentCompanyId", {
        connection,
        currentCompanyId,
      });
      return;
    }

    console.log("💾 Saving connection update:", {
      id: connection.id,
      selectedBrands,
    });

    try {
      setSaving(true);

      await updateDoc(doc(db, "companyConnections", connection.id), {
        sharedBrands: selectedBrands,
        updatedAt: serverTimestamp(),
      });

      console.log("✅ Successfully updated sharedBrands in Firestore");
      onClose(); // close modal after save
    } catch (err) {
      console.error("🔥 Error updating connection:", err);
      alert("Error saving connection. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) => {
      const next = prev.includes(brand)
        ? prev.filter((b) => b !== brand)
        : [...prev, brand];

      console.log("🧩 Brand toggled:", brand, "→ New list:", next);
      return next;
    });
  };

  const handleAddManualBrand = () => {
    const newBrand = manualBrand.trim();
    if (!newBrand) return;
    if (!selectedBrands.includes(newBrand)) {
      setSelectedBrands((prev) => [...prev, newBrand]);
    }
    setManualBrand("");
  };

  return (
    <div className="connection-edit-backdrop">
      <div className="connection-edit-modal">
        <h3>Edit Connection</h3>
        <p>
          Connection between{" "}
          <strong>{connection.requestFromCompanyName}</strong> and{" "}
          <strong>{connection.requestToCompanyName}</strong>
        </p>

        {/* 🔍 Brand Selector */}
        <div className="brand-selector-header">
          <h4>Select brands to share:</h4>
          <input
            type="text"
            placeholder="Search brands..."
            value={brandSearch}
            onChange={(e) => setBrandSearch(e.target.value)}
            className="brand-search-input"
          />
        </div>

        <div className="brand-chip-grid">
          {filteredBrands.map((brand) => (
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

        {/* 🧩 Selected Brands */}
        {selectedBrands.length > 0 && (
          <div className="selected-brands-bar">
            <h5>Selected Brands:</h5>
            <div className="selected-brand-list">
              {selectedBrands.map((b) => (
                <span key={b} className="selected-brand-chip">
                  {b}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ✏️ Manual Brand Entry */}
        <div className="manual-brand-entry">
          <input
            type="text"
            placeholder="Add a brand manually..."
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

        {/* 💾 Actions */}
        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="save-btn" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConnectionEditModal;
