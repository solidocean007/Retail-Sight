import { TermsOfServiceHelmet } from "../../utils/helmetConfigurations";
import "./termsService.css";

const TermsService = () => {
  return (
    <>
      <TermsOfServiceHelmet />

      {/* Optional navigation bar */}
      <div className="policy-nav-bar">
        <button onClick={() => (window.location.href = "/")}>← Back to Home</button>
      </div>

      <div className="policy-container">
        <iframe
          className="policy-iframe"
          src="https://app.termly.io/policy-viewer/policy.html?policyUUID=a2269205-236d-4785-a75a-6075814f68f8"
          title="Terms of Service"
        />
      </div>
    </>
  );
};

export default TermsService;
