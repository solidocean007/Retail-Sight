import React, { useState, useEffect, useMemo } from "react";
import { serverTimestamp, Timestamp } from "firebase/firestore";
import "./companyConnectionsManager.css";
import { db } from "../utils/firebase";
import { UserType } from "../utils/types";
import { useBrandOptions } from "../hooks/useBrandOptions";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../utils/store";
import { selectCurrentCompany } from "../Slices/currentCompanySlice";
import CustomConfirmation from "./CustomConfirmation";
import CompanyConnectionList from "./CompanyConnectionList";
import { getCompanyConnectionsStore } from "../utils/database/companyConnectionsDBUtils";
import {
  createConnectionRequest,
  fetchCompanyConnections,
  setCachedConnections,
} from "../Slices/companyConnectionSlice";
import { showMessage } from "../Slices/snackbarSlice";

interface Props {
  currentCompanyId: string | undefined;
  user: UserType | null;
}

const CompanyConnectionsManager: React.FC<Props> = ({
  currentCompanyId,
  user,
}) => {
  const dispatch = useAppDispatch();
  const { connections } = useSelector(
    (state: RootState) => state.companyConnections
  );
  const usersCompany = useSelector(selectCurrentCompany);
  const brandOptions = useBrandOptions();

  const [emailInput, setEmailInput] = useState("");
  const [brandSelection, setBrandSelection] = useState<string[]>([]);
  const [manualBrand, setManualBrand] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [loadingConfirm, setLoadingConfirm] = useState(false);

  // 🔹 Load cached + live connections
  useEffect(() => {
    if (!currentCompanyId) return;
    const loadCachedAndLiveConnections = async () => {
      try {
        const cached = await getCompanyConnectionsStore(currentCompanyId);
        if (cached?.connections) {
          dispatch(setCachedConnections(cached.connections));
        }
        await dispatch(fetchCompanyConnections(currentCompanyId));
      } catch (error) {
        console.error("Error loading cached connections:", error);
      }
    };
    loadCachedAndLiveConnections();
  }, [currentCompanyId, dispatch]);

  // 🔹 Filter brands
  const filteredBrands = useMemo(
    () =>
      brandOptions.filter((b) =>
        b.toLowerCase().includes(brandSearch.toLowerCase().trim())
      ),
    [brandOptions, brandSearch]
  );

  // 🔹 Manual brand entry
  const handleAddManualBrand = () => {
    const newBrand = manualBrand.trim();
    if (!newBrand) return;
    if (!brandSelection.includes(newBrand)) {
      setBrandSelection((prev) => [...prev, newBrand]);
    }
    setManualBrand("");
  };

  // 🔹 Open confirm dialog
  const openConfirmation = () => {
    if (!emailInput.trim()) {
      dispatch(showMessage("Enter a valid company email."));
      return;
    }
    setIsConfirmOpen(true);
  };

  // 🔹 Confirm + send request
  const handleConfirmRequest = async () => {
    if (!user || !usersCompany || !currentCompanyId) return;
    setLoadingConfirm(true);

    try {
      await dispatch(
        createConnectionRequest({
          currentCompanyId,
          user,
          usersCompany,
          emailInput,
          brandSelection,
        })
      ).unwrap();

      dispatch(showMessage("Connection request sent successfully."));
      await dispatch(fetchCompanyConnections(currentCompanyId)); // 🔄 refresh UI
    } catch (err: any) {
      if (err.code === "already-exists") {
        dispatch(showMessage("You already have a pending connection."));
      } else if (err.code === "not-found") {
        dispatch(showMessage("No admin found with that email."));
      } else {
        dispatch(showMessage(`Error: ${err.message || err}`));
      }
    } finally {
      setEmailInput("");
      setBrandSelection([]);
      setManualBrand("");
      setLoadingConfirm(false);
      setIsConfirmOpen(false);
    }
  };

  return (
    <div className="connections-dashboard">
      <h2>Company Connections</h2>

      {/* 🔸 Request New Connection */}
      <div className="new-request-section">
        <input
          type="email"
          value={emailInput}
          placeholder="Enter other company’s admin email"
          onChange={(e) => setEmailInput(e.target.value)}
          className="connection-email-input"
        />
        <button
          className="connection-request-btn"
          onClick={openConfirmation}
          disabled={loadingConfirm}
        >
          {loadingConfirm ? "Processing..." : "Request Connection"}
        </button>
      </div>

      {/* 🔹 Brand Selector */}
      <div className="brand-selector">
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
                brandSelection.includes(brand) ? "selected" : ""
              }`}
              onClick={() =>
                setBrandSelection((prev) =>
                  prev.includes(brand)
                    ? prev.filter((b) => b !== brand)
                    : [...prev, brand]
                )
              }
            >
              {brand}
            </button>
          ))}
        </div>
      </div>

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

      {/* 🔹 Selected Brands */}
      {brandSelection.length > 0 && (
        <div className="selected-brands-bar">
          <h5>Selected Brands:</h5>
          <div className="selected-brand-list">
            {brandSelection.map((brand) => (
              <span key={brand} className="selected-brand-chip">
                {brand}
                <button
                  className="remove-brand-btn"
                  onClick={() =>
                    setBrandSelection((prev) => prev.filter((b) => b !== brand))
                  }
                  aria-label={`Remove ${brand}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 🔹 Connections List */}
      <div className="connections-list">
        <CompanyConnectionList
          connections={connections}
          currentCompanyId={currentCompanyId}
          statusFilter={statusFilter}
          isAdminView={user?.role === "admin" || user?.role === "super-admin"}
        />
      </div>

      {/* 🔹 Confirmation Modal */}
      <CustomConfirmation
        isOpen={isConfirmOpen}
        loading={loadingConfirm}
        onConfirm={handleConfirmRequest}
        onClose={() => setIsConfirmOpen(false)}
        title="Confirm Connection Request"
        message={`You are requesting a connection with ${emailInput} and will share ${brandSelection.length} brand(s).`}
      />
    </div>
  );
};

export default CompanyConnectionsManager;
