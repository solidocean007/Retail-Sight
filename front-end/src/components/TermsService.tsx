import React, { useEffect, useState } from "react";
import { TermsOfServiceHelmet } from "../utils/helmetConfigurations";
import "./termsService.css";
import BackNavBar from "./BackNavBar";

const TermsOfService = () => {
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
      <TermsOfServiceHelmet />
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
            src="https://app.termly.io/policy-viewer/policy.html?policyUUID=a2269205-236d-4785-a75a-6075814f68f8"
            title="Displaygram Terms Of Service"
            loading="lazy"
            className="policy-iframe"
          ></iframe>
        </div>
      </div>
    </>
  );
};

export default TermsOfService;

// https://app.termly.io/policy-viewer/policy.html?policyUUID=a2269205-236d-4785-a75a-6075814f68f8
