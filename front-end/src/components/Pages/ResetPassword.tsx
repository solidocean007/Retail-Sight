// components/Auth/ResetPassword.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  getAuth,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { useAppDispatch } from "../../utils/store";
import { showMessage } from "../../Slices/snackbarSlice";

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

  if (verifying) return <div className="auth-page">Verifying reset link…</div>;

  if (!valid) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Password Reset</h1>
          <p>{error || "Invalid reset link."}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>Choose a New Password</h1>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <label>New Password</label>
          <input
            type="password"
            className="auth-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <label>Confirm Password</label>
          <input
            type="password"
            className="auth-input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? "Resetting…" : "Reset Password"}
          </button>
        </form>
      </div>
    </main>
  );
};

export default ResetPassword;
