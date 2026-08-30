// export default LoginForm;
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AccessPageShell from "./AccessPageShell";
import {
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
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
  const navigate = useNavigate();
  const { search } = useLocation();

  useEffect(() => {
    if (localStorage.getItem("postRedirect")) {
      setShowRedirectBanner(true);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const emailParam = params.get("email");
    if (emailParam) setEmail(emailParam);
  }, [search]);

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
      await signInWithPopup(auth, google);

      // Handle stored redirect early and exit
      const storedRedirect = localStorage.getItem("postRedirect");
      if (storedRedirect) {
        localStorage.removeItem("postRedirect");
        navigate(storedRedirect);
        return;
      }

      // If you have any post-auth linking/merging, run it here
      // (e.g. create user doc, assign company, etc.)

      // ✅ Navigate once at the end
      navigate(redirectTo);
    } catch (e: any) {
      if (e.code === "auth/account-exists-with-different-credential") {
        const cred = GoogleAuthProvider.credentialFromError(e);
        const emailFromErr = (e.customData?.email || "").toLowerCase();
        if (cred && emailFromErr) {
          setPendingLink({ email: emailFromErr, cred });
          setErr(
            "This email already has a password login. Please sign in with your password to link Google.",
          );
        } else {
          setErr("We found an existing account for this email.");
        }
      } else if (e.code === "auth/popup-blocked") {
        try {
          await signInWithRedirect(auth, google);
        } catch (e2: any) {
          setErr(
            ERROR_MAP[e2.code] || "Google sign-in failed. Please try again.",
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

      // Handle stored redirect early and exit
      const storedRedirect = localStorage.getItem("postRedirect");
      if (storedRedirect) {
        localStorage.removeItem("postRedirect");
        navigate(storedRedirect);
        return;
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

      // ✅ Navigate last
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
            "This email isn’t registered. Check for typos or request access.",
          ),
        );
        return;
      }

      // ✅ If the account is Google-only, don’t “send” a reset that won’t help
      const methods = await fetchSignInMethodsForEmail(
        getAuth(),
        normalizedEmail,
      );
      const hasPassword = methods.includes("password");
      if (!hasPassword) {
        dispatch(
          showMessage(
            "This account signs in with Google. Use “Continue with Google” instead.",
          ),
        );
        return;
      }

      await sendPasswordResetEmail(getAuth(), normalizedEmail);
      dispatch(
        showMessage(
          "Reset email sent. Check your inbox and spam folder. Search for 'support'.",
        ),
      );
      setSubmittedReset(true);
    } catch (error: any) {
      console.error("Password Reset Error:", error.code, error.message);
      if (error.code === "auth/invalid-email") {
        dispatch(showMessage("Please enter a valid email address."));
      } else if (error.code === "auth/user-not-found") {
        dispatch(showMessage("No account found for this email."));
      } else if (error.code === "auth/operation-not-allowed") {
        dispatch(
          showMessage("Email/Password sign-in is disabled for this project."),
        );
      } else {
        dispatch(
          showMessage("Unable to send reset email. Please try again later."),
        );
      }
    }
  };

  return (
    <AccessPageShell
      storyEyebrow="Your workspace"
      storyTitle="The market view your team built together."
      storyDescription="Return to the displays, goals, and field activity your team uses to stay aligned."
      highlights={[
        {
          label: "Pick up where you left off",
          detail: "Your company workspace, reporting, and saved activity are ready.",
        },
        {
          label: "Use your approved account",
          detail: "Sign in with the work email connected to your Displaygram company.",
        },
        {
          label: "New company?",
          detail: "Request a workspace and our team will verify the organization first.",
        },
      ]}
      panelEyebrow="Welcome back"
      panelTitle="Log in to Displaygram"
      panelDescription="Use your approved work account to continue."
    >
      {err && (
        <div
          id="form-error"
          className="access-shell-alert"
          role="alert"
          aria-live="assertive"
        >
          {err}
        </div>
      )}

      {submittedReset && (
        <div className="access-shell-banner" role="status">
          Reset email sent. Check your inbox and spam folder for a message from
          Displaygram.
        </div>
      )}

      {showRedirectBanner && (
        <div className="access-shell-banner" role="status">
          Sign in to continue to the shared Displaygram post.
        </div>
      )}

      <form
        className="access-shell-form"
        onSubmit={handleEmailLogin}
        aria-describedby={err ? "form-error" : undefined}
        aria-busy={submitting ? "true" : "false"}
        noValidate
      >
        <fieldset className="access-shell-fieldset">
          <legend className="sr-only">Sign in with email</legend>

          <div className="access-shell-field">
            <label htmlFor="email">Work email</label>
            <input
              id="email"
              name="email"
              type="email"
              className="access-shell-input"
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
          </div>

          <div className="access-shell-field">
            <label htmlFor="password">Password</label>
            <div className="access-shell-password">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                className="access-shell-input"
                placeholder="Enter your password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="access-shell-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
        </fieldset>

        <div className="access-shell-actions">
          <button
            type="submit"
            className="access-shell-primary"
            disabled={submitting}
            aria-disabled={submitting ? "true" : "false"}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>

          {enableGoogle && (
            <button
              type="button"
              className="access-shell-google"
              onClick={handleGoogle}
              disabled={submitting}
              aria-disabled={submitting ? "true" : "false"}
            >
              Continue with Google
            </button>
          )}
        </div>

        <button
          type="button"
          className="access-shell-text-button"
          onClick={handleResetPassword}
        >
          {submittedReset
            ? "Resend password reset email"
            : "Forgot your password?"}
        </button>

        <footer className="access-shell-footer" aria-label="New user options">
          <p>Need a Displaygram workspace for your company?</p>
          <button
            type="button"
            className="access-shell-secondary"
            onClick={async () => {
              const normalizedEmail = email.trim().toLowerCase();

              if (!normalizedEmail) {
                navigate("/request-access");
                return;
              }

              try {
                const exists = await checkUserExists(normalizedEmail);

                if (exists) {
                  dispatch(
                    showMessage(
                      "This email already has an account. Sign in or use forgot password.",
                    ),
                  );
                  return;
                }

                navigate(
                  `/request-access?email=${encodeURIComponent(normalizedEmail)}`,
                );
              } catch (error) {
                console.error("Request access check failed:", error);
                dispatch(
                  showMessage("Unable to check this email. Please try again."),
                );
              }
            }}
          >
            Request company access
          </button>
        </footer>
      </form>
    </AccessPageShell>
  );
};

export default LoginForm;
