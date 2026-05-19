import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  startImpersonation,
  startViewAsCompany,
  stopImpersonation,
} from "../../Slices/impersonationSlice";
import { RootState, useAppDispatch } from "../../utils/store";

const DeveloperViewAsPanel = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const companies = useSelector(
  (state: RootState) => state.allCompanies.plain || []
);
  const [companyId, setCompanyId] = useState("");

  const handleStart = () => {
    if (!companyId) return;
    dispatch(startViewAsCompany(companyId));
    navigate("/dashboard");
  };

  return (
    <section className="dev-panel">
      <h2>View As Company</h2>

      <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
        <option value="">Select company...</option>
        {companies.map(
          (
            company: any, // Property 'map' does not exist on type 'CompaniesState'
          ) => (
            <option key={company.id} value={company.id}>
              {company.companyName} — {company.companyType}
            </option>
          ),
        )}
      </select>

      <button
        className="btn-primary"
        onClick={handleStart}
        disabled={!companyId}
      >
        Start View-As
      </button>

      <button
        className="btn-outline"
        onClick={() => dispatch(stopImpersonation())}
      >
        Stop View-As
      </button>
    </section>
  );
};

export default DeveloperViewAsPanel;
