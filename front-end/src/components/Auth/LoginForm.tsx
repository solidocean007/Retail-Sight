import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../signUpLogIn.css";
import {
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from "firebase/auth";
import { useAppDispatch } from "../../utils/store";
import { showMessage } from "../../Slices/snackbarSlice";
import { checkUserExists } from "../../utils/validation/checkUserExists";

interface LoginFormProps {
  defaultRedirect?: string;
  enableGoogle?: boolean;
}

const ERROR_MAP: Record<string, string> = {
  "auth/invalid-email": "That email looks invalid.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/user-not-found": "We couldn't find that account.",
  "auth/wrong-password": "Incorrect password.",
  "auth/popup-closed-by-user": "Google sign-in was canceled.",
};

const LoginForm: React.FC<LoginFormProps> = ({
  defaultRedirect = "/user-home-page",
  enableGoogle = true,
}) => {
  const dispatch = useAppDispatch();
  const [submittedReset, setSubmittedReset] = useState(false);

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();
  const { search } = useLocation();

  const redirectTo = useMemo(() => {
    const params = new URLSearchParams(search);
    return params.get("redirect") || defaultRedirect;
  }, [search, defaultRedirect]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email.trim(), pw);
      navigate(redirectTo);
    } catch (e: any) {
      setErr(ERROR_MAP[e.code] || "Sign-in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    setErr(null);
    try {
      const auth = getAuth();
      await signInWithPopup(auth, new GoogleAuthProvider());
      navigate(redirectTo);
    } catch (e: any) {
      setErr(ERROR_MAP[e.code] || "Google sign-in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      dispatch(showMessage("Please enter your email."));
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const exists = await checkUserExists(normalizedEmail);
      if (!exists) {
        dispatch(
          showMessage(
            "This email is not registered. Please check for typos or sign up."
          )
        );
        return;
      }

      await sendPasswordResetEmail(getAuth(), normalizedEmail);
      dispatch(showMessage("Password reset email sent! Check your inbox."));
      setSubmittedReset(true);
    } catch (error: any) {
      if (error.code === "auth/invalid-email") {
        dispatch(showMessage("Please enter a valid email address."));
      } else {
        dispatch(
          showMessage("Unable to send reset email. Please try again later.")
        );
      }
      console.error("Password Reset Error:", error);
    }
  };

  return (
    <main className="auth-page" role="main" aria-labelledby="login-title">
      <div className="auth-card">
        <header className="auth-header">
          <p className="auth-welcome">Welcome back</p>
          <h1 id="login-title" className="auth-title">
            Log in to <span>Displaygram</span>
          </h1>
        </header>

        {/* Live region for errors and async status */}
        {err && (
          <div
            id="form-error"
            className="auth-alert"
            role="alert"
            aria-live="assertive"
          >
            {err}
          </div>
        )}
        {submittedReset && (
          <div className="auth-banner">
            ✅ Password reset email sent. Check your inbox and follow the link
            to set a new password.
          </div>
        )}

        <form
          className="auth-form"
          onSubmit={handleEmailLogin}
          aria-describedby={err ? "form-error" : undefined}
          aria-busy={submitting ? "true" : "false"}
          noValidate
        >
          <fieldset>
            <legend className="sr-only">Sign in with email</legend>

            <label className="auth-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="auth-input"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="email"
              required
              aria-invalid={!!err}
              aria-describedby={err ? "form-error" : undefined}
              autoFocus
            />

            <label className="auth-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="auth-input"
              placeholder="••••••••"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="current-password"
              required
              aria-invalid={!!err}
              aria-describedby={err ? "form-error" : undefined}
            />
          </fieldset>

          <div className="auth-actions">
            <button
              type="submit"
              className="btn auth-submit"
              disabled={submitting}
              aria-disabled={submitting ? "true" : "false"}
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>

            {enableGoogle && (
              <button
                type="button"
                className="btn btn-google"
                onClick={handleGoogle}
                disabled={submitting}
                aria-disabled={submitting ? "true" : "false"}
                aria-label="Continue with Google"
              >
                Continue with Google
              </button>
            )}
          </div>

          <nav
            className="auth-links"
            aria-label="Account help"
            onClick={handleResetPassword}
          >
            <button
              type="button"
              className="auth-link reset-password-link"
              onClick={handleResetPassword}
            >
              Forgot password?
            </button>
          </nav>

          <div className="auth-divider" role="separator" aria-hidden="true">
            <span>or</span>
          </div>

          <footer className="auth-footnote" aria-label="New user options">
            <span>New here?</span>{" "}
            <Link to="/request-access" className="auth-link">
              Request access
            </Link>{" "}
            {/* <span>or</span>{" "}
            <Link to="/use-invite" className="auth-link">
              use an invite link
            </Link> */}
          </footer>
        </form>
      </div>
    </main>
  );
};

export default LoginForm;
