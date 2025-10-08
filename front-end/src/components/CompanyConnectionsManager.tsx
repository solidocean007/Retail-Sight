// components/Connections/CompanyConnectionsManager.tsx
import React, { useState, useEffect, useMemo } from "react";
import { serverTimestamp, Timestamp } from "firebase/firestore";
import "./companyConnectionsManager.css";
import { db } from "../utils/firebase";
import { ConnectionRequest, UserType } from "../utils/types";
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
  const [emailInput, setEmailInput] = useState("");
  const [brandSelection, setBrandSelection] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const usersCompany = useSelector(selectCurrentCompany);
  // all available brands in the company
  const brandOptions = useBrandOptions();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [brandSearch, setBrandSearch] = useState("");

  useEffect(() => {
    if (!currentCompanyId) return;

    const loadCachedAndLiveConnections = async () => {
      try {
        // 1️⃣ Load cached
        const cached = await getCompanyConnectionsStore(currentCompanyId);
        if (cached?.connections) {
          dispatch(setCachedConnections(cached.connections));
        }

        // 2️⃣ Fetch live and update cache
        dispatch(fetchCompanyConnections(currentCompanyId));
      } catch (error) {
        console.error("Error loading cached connections:", error);
      }
    };

    loadCachedAndLiveConnections();
  }, [currentCompanyId, dispatch]);

  // open confirmation dialog
  const openConfirmation = () => {
    if (!emailInput.trim()) return alert("Enter a valid company email.");
    if (brandSelection.length === 0)
      return alert("Please select at least one brand to share.");
    setIsConfirmOpen(true);
  };

  // wrapped confirm logic
  const handleConfirmRequest = async () => {
    if (!user || !usersCompany || !currentCompanyId) return;
    setLoadingConfirm(true);
    await dispatch(
      createConnectionRequest({
        currentCompanyId,
        user,
        usersCompany,
        emailInput,
        brandSelection,
      })
    );
    setEmailInput("");
    setBrandSelection([]);
    setLoadingConfirm(false);
    setIsConfirmOpen(false);
  };

  useEffect(() => {
    if (!currentCompanyId) return;
    (async () => {
      try {
        const cached = await getCompanyConnectionsStore(currentCompanyId);
        if (cached?.connections) {
          dispatch(setCachedConnections(cached.connections));
        }
        dispatch(fetchCompanyConnections(currentCompanyId));
      } catch (error) {
        console.error("Error loading cached connections:", error);
      }
    })();
  }, [currentCompanyId, dispatch]);

  const filteredBrands = useMemo(
    () =>
      brandOptions.filter((b) =>
        b.toLowerCase().includes(brandSearch.toLowerCase().trim())
      ),
    [brandOptions, brandSearch]
  );

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

      {/* 🔹 Selected Brands */}
      {brandSelection.length > 0 && (
        <div className="selected-brands-bar">
          <h5>Selected Brands:</h5>
          <div className="selected-brand-list">
            {filteredBrands.map((brand) => (
              <span key={brand} className="selected-brand-chip">
                {brand}
              </span>
            ))}
          </div>
        </div>
      )}

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
          {brandOptions
            .filter((b) =>
              b.toLowerCase().includes(brandSearch.toLowerCase().trim())
            )
            .map((brand) => (
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
