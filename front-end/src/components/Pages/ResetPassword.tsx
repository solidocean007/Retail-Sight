// components/Auth/ResetPassword.tsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  getAuth,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { useAppDispatch } from "../../utils/store";
import { showMessage } from "../../Slices/snackbarSlice";
import AccessPageShell from "./AccessPageShell";

const ResetPassword: React.FC = () => {
  const auth = getAuth();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { search } = useLocation();

  const [oobCode, setOobCode] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const code = params.get("oobCode");
    if (!code) {
      setError("Invalid or missing reset code.");
      setVerifying(false);
      return;
    }
    setOobCode(code);

    (async () => {
      try {
        await verifyPasswordResetCode(auth, code);
        setValid(true);
      } catch (e: any) {
        setError("Reset link is invalid or expired.");
      } finally {
        setVerifying(false);
      }
    })();
  }, [auth, search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode) return;

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      dispatch(showMessage("✅ Password has been reset. Please log in."));
      navigate("/login");
    } catch (e: any) {
      setError("Failed to reset password. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const shellProps = {
    storyEyebrow: "Account recovery",
    storyTitle: "A secure path back to your workspace.",
    storyDescription:
      "Reset links are verified before a new password can be saved to your Displaygram account.",
    highlights: [
      {
        label: "Verify the link",
        detail: "Firebase checks that the reset request is genuine and still active.",
      },
      {
        label: "Choose a new password",
        detail: "Use at least eight characters and avoid a password used elsewhere.",
      },
      {
        label: "Return securely",
        detail: "After the reset, sign in again with your work email.",
      },
    ],
    panelEyebrow: "Password reset",
  };

  if (verifying) {
    return (
      <AccessPageShell
        {...shellProps}
        panelTitle="Checking your reset link"
        panelDescription="This should only take a moment."
      >
        <div className="access-shell-status" role="status" aria-live="polite">
          <div className="access-shell-status-icon" aria-hidden="true">
            …
          </div>
          <p>Verifying that this password-reset link is valid and unused.</p>
        </div>
      </AccessPageShell>
    );
  }

  if (!valid) {
    return (
      <AccessPageShell
        {...shellProps}
        panelTitle="This reset link is not active"
        panelDescription="Reset links expire after use or after their security window closes."
      >
        <div className="access-shell-status">
          <div className="access-shell-status-icon" aria-hidden="true">
            !
          </div>
          <div className="access-shell-alert" role="alert">
            {error || "Invalid reset link."}
          </div>
          <p>Return to login, enter your email, and request a fresh link.</p>
          <Link to="/login" className="access-shell-primary">
            Return to login
          </Link>
        </div>
      </AccessPageShell>
    );
  }

  return (
    <AccessPageShell
      {...shellProps}
      panelTitle="Choose a new password"
      panelDescription="Create a password that is unique to your Displaygram account."
    >
      {error && (
        <div className="access-shell-alert" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="access-shell-form">
        <div className="access-shell-field">
          <label htmlFor="new-password">New password</label>
          <div className="access-shell-password">
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              className="access-shell-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              aria-invalid={!!error}
            />
            <button
              type="button"
              className="access-shell-password-toggle"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="access-shell-field">
          <label htmlFor="confirm-password">Confirm password</label>
          <div className="access-shell-password">
            <input
              id="confirm-password"
              type={showConfirm ? "text" : "password"}
              className="access-shell-input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              aria-invalid={!!error}
            />
            <button
              type="button"
              className="access-shell-password-toggle"
              onClick={() => setShowConfirm((current) => !current)}
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="access-shell-primary"
          disabled={submitting}
        >
          {submitting ? "Saving new password…" : "Save new password"}
        </button>
      </form>
    </AccessPageShell>
  );
};

export default ResetPassword;
