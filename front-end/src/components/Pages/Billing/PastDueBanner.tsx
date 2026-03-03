import { Link } from "react-router-dom";
import { useBillingState } from "../../../hooks/useBillingState";
import "./pastDueBanner.css";

const PastDueBanner = () => {
  const { isPastDue, isInGrace, graceDaysRemaining } = useBillingState();

  if (!isPastDue) return null;

  return (
    <section className="past-due-banner">
      <div className="past-due-header">
        <h3 className="past-due-title">Payment Issue Detected</h3>
        <span className="status-pill status-pending">
          Past Due
        </span>
      </div>

      <p className="past-due-message">
        {isInGrace ? (
          <>
            Your payment failed. You have{" "}
            <strong>{graceDaysRemaining} days</strong> to update
            your payment method before your plan is moved to Free.
          </>
        ) : (
          <>
            Your grace period has expired. Your account will
            be moved to the Free plan.
          </>
        )}
      </p>

      <div className="past-due-actions">
        <Link to="/billing" className="button-primary">
          Update Payment Method
        </Link>
      </div>
    </section>
  );
};

export default PastDueBanner;
