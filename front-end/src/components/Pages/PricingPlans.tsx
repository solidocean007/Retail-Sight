import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./pricingPlans.css";

const PricingPlans: React.FC = () => {
  const navigate = useNavigate();

  const plans = [
    {
      id: "free",
      name: "Free Tier",
      price: "$0 / month",
      tagline: "For small teams getting started",
      features: [
        "👥 Up to 5 users",
        "🤝 2 active company connections",
      
      ],
      button: "Start Free",
    },
    {
      id: "team",
      name: "Team Plan",
      price: "$25 / month",
      tagline: "For growing companies building partnerships",
      features: [
        "👥 Up to 10 users (add more for $2 each)",
        "🤝 3 active company connections",
      ],
      button: "Team",
      badge: "Best Value",
    },
    {
      id: "network",
      name: "Network Plan",
      price: "$59 / month",
      tagline: "For regional or multi-branch organizations",
      features: [
        "👥 Up to 40 users (add more for $1 each)",
        "🤝 10 active company connections",
        "🧩 Third party Goal importing",
       
      ],
      button: "Network",
    },
    {
      id: "enterprise",
      name: "Enterprise Plan",
      price: "Custom (starts at $99 / month)",
      tagline: "For multi-division or complex networks",
      features: [
        "👥 Custom user & connection limits",
        "🧭 Dedicated onboarding + support",
      ],
      button: "Contact Sales",
    },
  ];

  const handleSelect = (planId: string) => {
    if (planId === "free") navigate("/request-access");
    else navigate(`/checkout?plan=${planId}`);
  };

  return (
    <div className="pricing-container">
      <section className="pricing-hero">
        <h1>Plans that Grow with Your Team</h1>
        <p>
          Whether you're a local distributor or a national supplier, Displaygram
          helps your company connect, share wins, and build trusted partnerships
          — faster.
        </p>
      </section>

      <section className="pricing-grid">
        {plans.map((plan, idx) => (
          <div
            key={plan.id}
            className={`plan-card ${
              plan.badge ? "featured" : ""
            } fade-in delay-${idx}`}
          >
            <div className="plan-header">
              {plan.badge && <div className="plan-badge">{plan.badge}</div>}
              <h2>{plan.name}</h2>
              <p className="tagline">{plan.tagline}</p>
              <div className="plan-price">{plan.price}</div>
            </div>

            <ul className="plan-features">
              {plan.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>

            <button
              className={`plan-button ${
                plan.badge ? "accent" : "primary"
              }`}
              onClick={() => handleSelect(plan.id)}
            >
              {plan.button}
            </button>
          </div>
        ))}
      </section>

      {/* <section className="trusted-section">
        <p>Built for beverage distributors and suppliers nationwide</p>
        <div className="trusted-logos">
          <img src="/logos/healy.png" alt="Healy Wholesale" />
          <img src="/logos/newbelgium.png" alt="New Belgium" />
          <img src="/logos/gallo.png" alt="Gallo" />
        </div>
      </section> */}

      <section className="pricing-footer">
        <h3>All Plans Include</h3>
        <ul>
          <li>📸 Create and share display posts</li>
          <li>🏷️ Manage and approve shared brands</li>
          <li>🔄 Real-time sync + offline support</li>
          <li>🔄 Real-time sync + offline support</li>
          <li>  📸 Shared brand workflow</li>
          <li> 🔐 Role-based access for Admins & Sales Reps</li>
        <li>"🔄 Real-time syncing across devices"</li>
          <li>🔐 Secure Firestore + Firebase Auth</li>
        </ul>
        <p className="billing-note">
          Billed monthly • No long-term contracts • Upgrade or cancel anytime
        </p>
        <Link to="/" className="back-home-link">
          ← Back to Home
        </Link>
      </section>
    </div>
  );
};

export default PricingPlans;
