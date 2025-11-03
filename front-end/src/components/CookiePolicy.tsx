import { useEffect, useState } from "react";
import "./PrivacyPolicy.css";
import { PrivacyPolicyHelmet } from "../utils/helmetConfigurations";
import BackNavBar from "./BackNavBar";

const CookiePolicy = () => {
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
            src="https://app.termly.io/policy-viewer/policy.html?policyUUID=bb69ae1b-a805-48ac-8add-25d1df769733"
            title="Displaygram Cookie Policy"
            loading="lazy"
            className="policy-iframe"
          ></iframe>
        </div>
        <div className="footer-consent-link">
          <a href="#" className="termly-display-preferences">
            Cookie Preferences
          </a>
        </div>
      </div>
    </>
  );
};

export default CookiePolicy;
