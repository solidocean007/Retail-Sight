// components/AppLoadingScreen.tsx
import React, { useEffect, useState } from "react";
import "./appLoadingScreen.css";
// import logo from "../assets/displaygram-logo.png"; // ⬅ Replace with your actual path after adding to project

type Props = {
  show: boolean;
  message?: string;
  /** Show recovery actions immediately (e.g. profile load already failed). */
  errored?: boolean;
  /** Short diagnostic code the user can screenshot and send you. */
  errorDetail?: string | null;
  onRetry?: () => void;
  onSignOut?: () => void;
};

/** After this long, assume something is wrong and offer a way out. */
const STUCK_AFTER_MS = 12000;

export default function AppLoadingScreen({
  show,
  message = "Loading…",
  errored = false,
  errorDetail = null,
  onRetry,
  onSignOut,
}: Props) {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (!show) {
      setStuck(false);
      return;
    }

    const timer = setTimeout(() => setStuck(true), STUCK_AFTER_MS);
    return () => clearTimeout(timer);
  }, [show]);

  if (!show) return null;

  const showActions = (stuck || errored) && (onRetry || onSignOut);

  return (
    <div className="app-loading-container fade-in">
      <div className="app-loading-card">
        {/* <img src={logo} alt="Displaygram" className="loading-logo-img" /> */}

        <div className="loading-message">{message}</div>

        <div className="loading-dots">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </div>

        {showActions && (
          <div className="loading-recovery">
            <p className="loading-recovery-text">
              This is taking longer than expected.
            </p>

            {errorDetail && (
              <p className="loading-error-code">
                {errorDetail}
                <br />
                <span>Screenshot this and send it to support.</span>
              </p>
            )}

            <div className="loading-recovery-actions">
              {onRetry && (
                <button
                  type="button"
                  className="loading-recovery-btn primary"
                  onClick={onRetry}
                >
                  Try Again
                </button>
              )}

              {onSignOut && (
                <button
                  type="button"
                  className="loading-recovery-btn"
                  onClick={onSignOut}
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
