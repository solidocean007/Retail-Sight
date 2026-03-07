import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./pricingPlans.css";

const PricingPlans: React.FC = () => {
  const navigate = useNavigate();

  const plans = [
    {
      id: "free",
      name: "Free",
      price: "$0 / month",
      tagline: "For evaluation and very small teams",
      features: [
        "👥 Up to 5 users",
        "🤝 Up to 2 company connections",
        "📸 Create & share posts",
        "🏷️ Brand approvals",
        "🔐 Role-based permissions",
      ],
      button: "Start Free",
    },
    {
      id: "starter",
      name: "Starter",
      price: "$19 / month",
      tagline: "For small distributors or supplier pilots",
      features: [
        "👥 Up to 25 users",
        "🤝 Up to 5 company connections",
        "📊 Gallo Axis goal integration",
        "📸 Create & share posts",
        "🏷️ Brand approvals",
      ],
      button: "Choose Starter",
    },
    {
      id: "team",
      name: "Team",
      price: "$39 / month",
      tagline: "For growing distributor teams",
      features: [
        "👥 Up to 50 users",
        "🤝 Up to 10 company connections",
        "📊 Gallo Axis goal integration",
        "📸 Create & share posts",
        "🏷️ Brand approvals",
      ],
      button: "Choose Team",
      badge: "Most Popular",
    },
    {
      id: "pro",
      name: "Pro",
      price: "$99 / month",
      tagline: "For regional organizations",
      features: [
        "👥 Up to 150 users",
        "🤝 Up to 25 company connections",
        "📊 Gallo Axis goal integration",
        "📤 CSV export",
        "📸 Create & share posts",
      ],
      button: "Choose Pro",
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "$199 / month",
      tagline: "For large organizations",
      features: [
        "👥 Up to 300 users",
        "🤝 Up to 40 company connections",
        "📊 Gallo Axis goal integration",
        "📤 CSV export",
        "📸 Create & share posts",
        "Priority onboarding support",
      ],
      button: "Contact Sales",
    },
  ];

  const handleSelect = (planId: string) => {
    if (planId === "enterprise") {
      navigate("/contact-us");
      return;
    }

    navigate(`/request-access?plan=${planId}`);
  };

  return (
    <div className="pricing-container">
      <Link to="/" className="back-home-link">
        ← Back to Home
      </Link>
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
              className={`plan-button ${plan.badge ? "accent" : "primary"}`}
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
          <li> 📸 Shared brand workflow</li>
          <li> 🔐 Role-based access for Admins & Sales Reps</li>
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
