import React, { useMemo, useState } from "react";
import "./connectionBuilder.css";
import { useSelector } from "react-redux";
import { selectUser } from "../../Slices/userSlice";
import { useCompanyBrandCatalog } from "../../hooks/useCompanyBrandCatalog";
import { useAppDispatch } from "../../utils/store";
import { showMessage } from "../../Slices/snackbarSlice";
import CustomConfirmation from "../CustomConfirmation";

type ConnectionBrandSelection = {
  brandId: string;
  brandName: string;
  productSupplier?: string;
};

interface ConnectionBuilderProps {
  email: string;
  lookup: any;
  onClose: () => void;
  onConfirm: (
    email: string,
    brandSelection: ConnectionBrandSelection[],
  ) => Promise<void>;
}

const getBrandDisplayName = (brand: any) =>
  String(
    brand.displayName ||
      brand.brandName ||
      brand.name ||
      brand.normalizedBrandName ||
      brand.brandId ||
      "",
  ).trim();

const ConnectionBuilder: React.FC<ConnectionBuilderProps> = ({
  email,
  lookup,
  onClose,
  onConfirm,
}) => {
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const companyId = user?.companyId;

  const { brands } = useCompanyBrandCatalog(companyId);

  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [brandSelection, setBrandSelection] = useState<
    ConnectionBrandSelection[]
  >([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [loadingConfirm, setLoadingConfirm] = useState(false);

  const supplierOptions = useMemo(() => {
    const set = new Set<string>();

    brands.forEach((brand: any) => {
      const supplier = String(brand.productSupplier || "").trim();
      if (supplier) set.add(supplier);
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [brands]);

  const currentBrands = useMemo(() => {
    return brands
      .filter((brand: any) => {
        if (brand.active === false) return false;
        if (!selectedSupplier) return true;

        return (
          String(brand.productSupplier || "")
            .trim()
            .toLowerCase() === selectedSupplier.trim().toLowerCase()
        );
      })
      .map((brand: any) => ({
        brandId: brand.brandId,
        brandName: getBrandDisplayName(brand),
        productSupplier: brand.productSupplier,
      }))
      .filter((brand) => brand.brandId && brand.brandName)
      .sort((a, b) => a.brandName.localeCompare(b.brandName));
  }, [brands, selectedSupplier]);

  const toggleBrand = (brand: ConnectionBrandSelection) => {
    setBrandSelection((prev) => {
      const exists = prev.some((b) => b.brandId === brand.brandId);

      return exists
        ? prev.filter((b) => b.brandId !== brand.brandId)
        : [...prev, brand];
    });
  };

  const isSelected = (brandId: string) =>
    brandSelection.some((brand) => brand.brandId === brandId);

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

    try {
      await onConfirm(email, brandSelection);
      setIsConfirmOpen(false);
    } finally {
      setLoadingConfirm(false);
    }
  };

  return (
    <div className="connection-builder">
      <h3>Step 2 — Select Shared Brands (Optional)</h3>

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

      {lookup.mode === "user-found" && (
        <div className="connection-target-card">
          <span className="connection-target-label">
            Connection request to{" "}
          </span>

          <strong className="connection-target-name">
            {lookup.companyName || "Selected Company"}
          </strong>

          {lookup.companyType && (
            <span className="connection-target-type">
              {" Type: "}
              {lookup.companyType}
            </span>
          )}

          <p>
            Choose any brands you’d like to propose sharing with this company.
          </p>
        </div>
      )}

      <p className="section-hint">
        Propose brands from your brand catalog to share with this company.
      </p>

      <div className="supplier-header-row">
        <label htmlFor="supplierSelect" className="supplier-label">
          Filter by supplier
        </label>
      </div>

      <div className="supplier-dropdown">
        <select
          id="supplierSelect"
          value={selectedSupplier}
          onChange={(e) => setSelectedSupplier(e.target.value)}
        >
          <option value="">All suppliers</option>
          {supplierOptions.map((supplier) => (
            <option key={supplier} value={supplier}>
              {supplier}
            </option>
          ))}
        </select>
      </div>

      <div className="brand-selector">
        <h4>
          {selectedSupplier
            ? `Brands from ${selectedSupplier}`
            : "Available Brands"}
        </h4>

        {!currentBrands.length ? (
          <p className="section-hint">
            No brands found. Rebuild the brand catalog from Product Manager.
          </p>
        ) : (
          <div className="brand-chip-grid">
            {currentBrands.map((brand) => (
              <button
                key={brand.brandId}
                type="button"
                className={`chip brand-chip ${
                  isSelected(brand.brandId) ? "selected" : ""
                }`}
                onClick={() => toggleBrand(brand)}
              >
                {brand.brandName}
              </button>
            ))}
          </div>
        )}
      </div>

      {brandSelection.length > 0 && (
        <div className="selected-brands-bar">
          <h5>Proposed Brands</h5>

          <div className="selected-brand-list">
            {brandSelection.map((brand) => (
              <span key={brand.brandId} className="chip selected-brand-chip">
                {brand.brandName}
                <button
                  type="button"
                  className="remove-brand-btn"
                  onClick={() =>
                    setBrandSelection((prev) =>
                      prev.filter((b) => b.brandId !== brand.brandId),
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

      <div className="modal-actions">
        <button
          type="button"
          className="clear-selection-btn"
          onClick={() => {
            setBrandSelection([]);
            setSelectedSupplier("");
          }}
          disabled={!brandSelection.length && !selectedSupplier}
        >
          Clear
        </button>

        <button
          type="button"
          className="button-primary"
          onClick={openConfirmation}
          disabled={loadingConfirm}
        >
          {loadingConfirm ? "Processing..." : "Send Request"}
        </button>

        <button type="button" className="button-secondary" onClick={onClose}>
          Close
        </button>
      </div>

      <CustomConfirmation
        isOpen={isConfirmOpen}
        loading={loadingConfirm}
        onConfirm={handleConfirm}
        onClose={() => setIsConfirmOpen(false)}
        title="Confirm Connection Request"
        message={`You're about to send a connection request to ${
          lookup.companyName || email
        }.${
          brandSelection.length > 0
            ? `\n\nIncluded: ${brandSelection.length} proposed brand(s).`
            : ""
        }`}
      />
    </div>
  );
};

export default ConnectionBuilder;
