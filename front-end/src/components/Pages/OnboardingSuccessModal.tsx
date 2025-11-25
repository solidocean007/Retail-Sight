import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "./onboardingSuccessModal.css";
import { useSelector } from "react-redux";
import { RootState } from "../../utils/store";

type Variant = "submitted" | "approved";

interface Props {
  open: boolean;
  variant?: Variant;
  onClose: () => void;
}

export default function OnboardingSuccessModal({
  open,
  variant = "submitted",
  onClose,
}: Props) {
  const isApproved = variant === "approved";
  const currentCompany = useSelector(
    (state: RootState) => state.user.currentUser
  )?.company;
  
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="onboarding-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={`onboarding-card ${isApproved ? "approved" : ""}`}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <button className="onboarding-close" onClick={onClose}>
              ✕
            </button>

            {isApproved ? (
              <>
                <h2 className="onboarding-title">{`🎉 Welcome to Displaygram ${currentCompany}!`}</h2>
                <p className="onboarding-sub">
                  Your account has been <strong>approved</strong> and activated.
                </p>
                <ul className="onboarding-steps">
                  <li>
                    👥 Add your teammates under{" "}
                    <strong>Dashboards → Users</strong>.
                  </li>
                  <li>
                    🏬 Upload your accounts list in Accounts to get started.
                  </li>
                  <li>🍻 Upload your products list in Products.</li>
                  <li>
                    📸 Start posting retail displays directly from your phone!
                  </li>
                </ul>
                <div className="onboarding-actions">
                  <Link to="/dashboard" className="button-primary">
                    Go to Dashboard
                  </Link>
                  {/* <Link to="/help" className="button-outline">
                    View Quick Start Guide
                  </Link> */}
                </div>
              </>
            ) : (
              <>
                <h2 className="onboarding-title">🎉 Request Submitted!</h2>
                <p className="onboarding-sub">
                  Thanks for requesting access to <strong>Displaygram</strong>.
                  We’re reviewing your company details now.
                </p>
                <ul className="onboarding-steps">
                  <li>✅ We’ll verify your company and user info.</li>
                  <li>
                    📬 Look for an email from{" "}
                    <strong>support@displaygram.com</strong>.
                  </li>
                  <li>
                    🚀 Once approved, you can log in and start sharing displays.
                  </li>
                </ul>
                <div className="onboarding-actions">
                  <Link to="/login" className="button-primary">
                    Go to Login
                  </Link>
                  <Link to="/help" className="button-outline">
                    Contact Support
                  </Link>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
