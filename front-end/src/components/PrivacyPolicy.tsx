import { useEffect, useState } from "react";
import "./PrivacyPolicy.css";
import { PrivacyPolicyHelmet } from "../utils/helmetConfigurations";
import BackNavBar from "./BackNavBar";

const PrivacyPolicy = () => {
  const [loading, setLoading] = useState(true);

  // detect when Termly iframe appears
  useEffect(() => {
    const interval = setInterval(() => {
      const iframe = document.querySelector('iframe[src*="termly.io"]');
      if (iframe) {
        setLoading(false);
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <PrivacyPolicyHelmet />
      <div className="terms-container">
        <BackNavBar />
        {loading && (
          <div className="termly-loader">
            <div className="spinner"></div>
            <p>Loading policy...</p>
          </div>
        )}
        <div className="policy-frame-wrapper">
          <iframe
            src="https://app.termly.io/policy-viewer/policy.html?policyUUID=fadd92fc-463e-4120-a23e-a994c4128ea2"
            title="Displaygram Privacy Policy"
            loading="lazy"
            className="policy-iframe"
            
          ></iframe>
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicy;
