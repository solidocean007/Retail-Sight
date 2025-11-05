import React from "react";
import { useNavigate } from "react-router-dom";
import "./upgradePromptBanner.css";

interface UpgradePromptBannerProps {
  message?: string;
  highlight?: string;
  show?: boolean;
}

const UpgradePromptBanner: React.FC<UpgradePromptBannerProps> = ({
  message = "You’re approaching your company’s plan limits.",
  highlight = "Consider upgrading to unlock more features and connections.",
  show = true,
}) => {
  const navigate = useNavigate();

  if (!show) return null;

  return (
    <div className="upgrade-prompt-banner">
      <div className="banner-content">
        <span className="banner-icon">🚀</span>
        <div className="banner-text">
          <p>
            {message} <strong>{highlight}</strong>
          </p>
        </div>
      </div>
      <button
        className="banner-btn"
        onClick={() => navigate("/dashboard/billing")}
      >
        Go to Billing
      </button>
    </div>
  );
};

export default UpgradePromptBanner;
