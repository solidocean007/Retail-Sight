// export default LoginForm;
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../signUpLogIn.css";
import {
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
  EmailAuthProvider,
  linkWithCredential,
  AuthCredential,
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
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // NEW: hold a pending Google credential if this email already exists
  const [pendingLink, setPendingLink] = useState<{
    email: string;
    cred: AuthCredential;
  } | null>(null);
  const [showRedirectBanner, setShowRedirectBanner] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("postRedirect")) {
      setShowRedirectBanner(true);
    }
  }, []);

  const navigate = useNavigate();
  const { search } = useLocation();

  const redirectTo = useMemo(() => {
    const params = new URLSearchParams(search);
    return params.get("redirect") || defaultRedirect;
  }, [search, defaultRedirect]);

  const auth = getAuth();
  const google = new GoogleAuthProvider();
  google.setCustomParameters({ prompt: "select_account" });

  // ---- GOOGLE SIGN-IN (with linking + popup fallback) ----
  const handleGoogle = async () => {
    setSubmitting(true);
    setErr(null);
    try {
      const res = await signInWithPopup(auth, google);

      const storedRedirect = localStorage.getItem("postRedirect");
      if (storedRedirect) {
        localStorage.removeItem("postRedirect");
        navigate(storedRedirect);
        return;
      } else {
        navigate("/"); // or whatever your default is
      }

      // TODO: call your post-auth gating/merge here (create user doc, check company, etc.)
      navigate(redirectTo);
    } catch (e: any) {
      if (e.code === "auth/account-exists-with-different-credential") {
        const cred = GoogleAuthProvider.credentialFromError(e);
        const emailFromErr = (e.customData?.email || "").toLowerCase();
        if (cred && emailFromErr) {
          // Ask user to sign in with email/password; we’ll auto-link afterward
          setPendingLink({ email: emailFromErr, cred });
          setErr(
            "This email already has a password login. Please sign in with your password to link Google."
          );
        } else {
          setErr("We found an existing account for this email.");
        }
      } else if (e.code === "auth/popup-blocked") {
        try {
          await signInWithRedirect(auth, google);
        } catch (e2: any) {
          setErr(
            ERROR_MAP[e2.code] || "Google sign-in failed. Please try again."
          );
        }
      } else {
        setErr(ERROR_MAP[e.code] || "Google sign-in failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ---- EMAIL/PASSWORD SIGN-IN (with auto-link if pending) ----
  const handleEmailLogin = async (evt: React.FormEvent) => {
    evt.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await signInWithEmailAndPassword(auth, normalizedEmail, pw);

      const storedRedirect = localStorage.getItem("postRedirect");
      if (storedRedirect) {
        localStorage.removeItem("postRedirect");
        navigate(storedRedirect);
        return;
      } else {
        navigate("/"); // or whatever your default is
      }

      // If user started with Google and we staged a pending credential,
      // link now that they proved ownership with password.
      if (
        pendingLink &&
        auth.currentUser &&
        auth.currentUser.email?.toLowerCase() === pendingLink.email
      ) {
        await linkWithCredential(auth.currentUser, pendingLink.cred);
        setPendingLink(null);
        dispatch(showMessage("Google has been linked to your account."));
      }

      // TODO: call your post-auth gating/merge here
      navigate(redirectTo);
    } catch (e: any) {
      setErr(ERROR_MAP[e.code] || "Sign-in failed. Please try again.");
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

        {showRedirectBanner && (
          <div className="auth-banner">
            🔒 You must be signed in to view that post. Please log in to
            continue.
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
            <div className="auth-password-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                className="auth-input"
                placeholder="••••••••"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="auth-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
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

          <nav className="auth-links" aria-label="Account help">
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
            </Link>
          </footer>
        </form>
      </div>
    </main>
  );
};

export default LoginForm;
