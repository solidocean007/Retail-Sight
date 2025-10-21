// components/billing/BillingDashboard.tsx
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../utils/firebase";
import CheckoutModal from "./CheckoutModal";
import "./billingDashboard.css";

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  braintreePlanId: string;
  features?: string[];
}

interface Props {
  currentCompanyId: string;
  currentPlanId?: string;
  companyName?: string;
  email?: string;
}

const BillingDashboard: React.FC<Props> = ({
  currentCompanyId,
  currentPlanId,
  companyName,
  email,
}) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const querySnap = await getDocs(collection(db, "plans"));
        const planList: Plan[] = querySnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Plan[];
        setPlans(planList);
      } catch (err) {
        console.error("Error loading plans:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  if (loading) {
    return <p className="loading-msg">Loading plans...</p>;
  }

  return (
    <div className="billing-container">
      <h2>Billing & Subscription</h2>
      <p>Manage your plan, payments, and upgrades</p>

      <div className="plans-grid">
        {plans.map((plan) => {
          const isCurrent = plan.braintreePlanId === currentPlanId;
          return (
            <div
              key={plan.id}
              className={`plan-card ${isCurrent ? "current" : ""}`}
            >
              <h3>{plan.name}</h3>
              <p className="price">
                {plan.price === 0 ? "Free" : `$${plan.price}/month`}
              </p>
              <p className="desc">{plan.description}</p>
              <ul className="feature-list">
                {plan.features?.map((f, i) => (
                  <li key={i}>✅ {f}</li>
                ))}
              </ul>

              {isCurrent ? (
                <button className="btn-current" disabled>
                  Current Plan
                </button>
              ) : (
                <button
                  className="btn-upgrade"
                  onClick={() => {
                    setSelectedPlan(plan);
                    setModalOpen(true);
                  }}
                >
                  {plan.price > 0 ? "Upgrade" : "Downgrade"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {selectedPlan && (
        <CheckoutModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          planId={selectedPlan.braintreePlanId}
          companyId={currentCompanyId}
          companyName={companyName}
          email={email}
        />
      )}
    </div>
  );
};

export default BillingDashboard;
