import React, { useState } from "react";
import { useSelector } from "react-redux";
import "./billingDashboard.css";
import CheckoutModal from "./CheckoutModal";
import { RootState } from "../../../utils/store";

const BillingDashboard: React.FC = () => {
  const company = useSelector((state: RootState) => state.currentCompany.data);
  const user = useSelector((state: RootState) => state.user);
  const [openModal, setOpenModal] = useState(false);

  if (!company) return <p className="loading-text">Loading company data...</p>;

  const { plan, billing } = company;
  const statusColor =
    billing?.paymentStatus === "active"
      ? "status-active"
      : billing?.paymentStatus === "past_due"
      ? "status-past-due"
      : "status-canceled";

  return (
    <div className="billing-container">
      <header className="billing-header">
        <h1>Billing & Subscription</h1>
        <p>Manage your plan, payments, and renewal preferences</p>
      </header>

      <section className="billing-card">
        <div className="billing-plan">
          <h2>{plan ? plan.toUpperCase() : "No Plan"}</h2>
          <span className={`status-badge ${statusColor}`}>
            {billing?.paymentStatus || "unknown"}
          </span>
        </div>

        <div className="billing-details">
          <p>
            <strong>Renewal Date:</strong>{" "}
            {billing?.renewalDate
              ? new Date(
                  billing.renewalDate.seconds * 1000
                ).toLocaleDateString()
              : "Not set"}
          </p>
          <p>
            <strong>Last Payment:</strong>{" "}
            {billing?.lastPaymentDate
              ? new Date(
                  billing.lastPaymentDate.seconds * 1000
                ).toLocaleDateString()
              : "Not available"}
          </p>
        </div>

        <div className="billing-actions">
          <button
            className="btn-upgrade"
            onClick={() => alert("Launch checkout modal")}
          >
            Upgrade Plan
          </button>
          <button
            className="btn-cancel"
            onClick={() => alert("Cancel subscription")}
          >
            Cancel Subscription
          </button>
        </div>
      </section>

      <section className="billing-history">
        <h3>Billing History</h3>
        <p className="coming-soon">Transaction history and invoices coming soon.</p>
      </section>
       <CheckoutModal
      open={openModal}
      onClose={() => setOpenModal(false)}
      planId="team"
      companyId={company.id}
      customerId={company.billing?.braintreeCustomerId}
      companyName={company.companyName}
      email={user?.email}
    />
    </div>
  );
};

export default BillingDashboard;
