import { PrivacyPolicyHelmet } from "../../utils/helmetConfigurations";
import "./PrivacyPolicy.css";

const PrivacyPolicy = () => {
  return (
    <>
      <PrivacyPolicyHelmet />

      {/* Optional nav bar */}
      <div className="policy-nav-bar">
        <button onClick={() => window.location.href = "/"}>← Back to Home</button>
      </div>

      <div className="privacy-policy-container">
        <iframe
          className="privacy-policy-iframe"
          src="https://app.termly.io/policy-viewer/policy.html?policyUUID=fadd92fc-463e-4120-a23e-a994c4128ea2"
          title="Privacy Policy"
        />
      </div>
    </>
  );
};

export default PrivacyPolicy;
