import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../utils/firebase";
import { showMessage } from "../../Slices/snackbarSlice";
import { useAppDispatch } from "../../utils/store";
import { IconButton } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { getFunctions, httpsCallable } from "firebase/functions";
import "./companyOnboardingAcceptForm.css";
import { BusinessType } from "../../utils/types";

export default function CompanyOnboardingAcceptForm() {
  const { companyId, inviteId } = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");
  const [verifyPassword, setVerifyPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [verifyPasswordError, setVerifyPasswordError] = useState<string | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [companyType, setCompanyType] = useState<BusinessType>("supplier");
  const functions = getFunctions();
  const markAccessRequestComplete = httpsCallable(
    functions,
    "markAccessRequestComplete",
  );

  useEffect(() => {
    if (!inviteId) return;

    (async () => {
      try {
        const inviteSnap = await getDoc(doc(db, "pendingInvites", inviteId!));

        if (!inviteSnap.exists()) {
          setError("Invite not found or already used.");
          return;
        }

        const inviteData = inviteSnap.data();

        if (inviteData.status === "accepted") {
          setError("This invite has already been accepted.");
          return;
        }

        setInvite(inviteData);

        // Prefill names from the access request
        const qSnap = await getDocs(
          query(
            collection(db, "accessRequests"),
            where("inviteId", "==", inviteId),
            limit(1),
          ),
        );

        if (!qSnap.empty) {
          const req = qSnap.docs[0].data();
          if (req.firstName) setFirstName(req.firstName);
          if (req.lastName) setLastName(req.lastName);
        }
      } catch (err) {
        console.error("Failed to load invite or access request:", err);
        setError("Failed to load invite.");
      } finally {
        setLoading(false);
      }
    })();
  }, [inviteId]);

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordError(
      value.length < 8 ? "Password must be at least 8 characters." : null,
    );
    if (verifyPassword && value !== verifyPassword) {
      setVerifyPasswordError("Passwords do not match.");
    } else {
      setVerifyPasswordError(null);
    }
  };

  const handleVerifyPasswordChange = (value: string) => {
    setVerifyPassword(value);
    setVerifyPasswordError(
      password && value !== password ? "Passwords do not match." : null,
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invite) return;

    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required.");
      return;
    }

    if (!companyName.trim()) {
      setError("Company name is required.");
      return;
    }

    if (passwordError || verifyPasswordError) return;

    setSubmitting(true);
    setError(null);

    try {
      const auth = getAuth();

      try {
        await createUserWithEmailAndPassword(auth, invite.email, password);
      } catch (err: any) {
        if (err.code === "auth/email-already-in-use") {
          await signInWithEmailAndPassword(auth, invite.email, password);
        } else {
          throw err;
        }
      }

      const acceptInvite = httpsCallable(functions, "acceptCompanyInvite");

      await acceptInvite({
        inviteId,
        fromCompanyId: invite.fromCompanyId,
        firstName,
        lastName,
        companyName,
        companyType,
      });

      await markAccessRequestComplete({
        companyId: invite.fromCompanyId,
        inviteId,
        inviteeEmail: invite.email,
      });

      dispatch(showMessage("✅ Company activated! Redirecting..."));
      setTimeout(() => navigate("/user-home-page"), 800);
    } catch (err: any) {
      if (err.code === "auth/wrong-password") {
        setError(
          "An account already exists for this email. Please reset your password from the login page.",
        );
        dispatch(
          showMessage(
            "Existing account detected. Please reset your password before accepting the invite.",
          ),
        );
        navigate(`/login?email=${encodeURIComponent(invite.email)}`);
        return;
      }

      if (err.code === "auth/email-already-in-use") {
        setError(
          "An account already exists for this email. Please log in instead.",
        );
        navigate(`/login?email=${encodeURIComponent(invite.email)}`);
        return;
      }

      setError(err.message || "Failed to accept invite.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="company-onboarding-accept-page">
        <section className="company-onboarding-accept-status-card">
          Loading company setup…
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="company-onboarding-accept-page">
        <section className="company-onboarding-accept-status-card company-onboarding-accept-status-card--error">
          {error}
        </section>
      </main>
    );
  }

  if (!invite) return null;

  return (
    <main
      className="company-onboarding-accept-page"
      aria-labelledby="company-onboarding-accept-title"
    >
      <section className="company-onboarding-accept-card">
        <header className="company-onboarding-accept-header">
          <img
            src="/displaygram-logo-long-BLUE.svg"
            alt="Displaygram"
            className="company-onboarding-accept-logo"
          />

          <p className="company-onboarding-accept-eyebrow">
            Company setup approved
          </p>

          <h1
            id="company-onboarding-accept-title"
            className="company-onboarding-accept-title"
          >
            Activate your company account
          </h1>

          <p className="company-onboarding-accept-subtitle">
            You’re being registered as the company admin on Displaygram.
          </p>
        </header>

        <aside className="company-onboarding-accept-plan-card">
          <h2>Free plan</h2>
          <p>
            Includes up to <strong>5 users</strong> and{" "}
            <strong>2 connections</strong>.
          </p>
        </aside>

        <form
          onSubmit={handleSubmit}
          className="company-onboarding-accept-form"
          noValidate
        >
          <div className="company-onboarding-accept-readonly-field">
            <label>Email</label>
            <div className="company-onboarding-accept-readonly-value">
              {invite.email}
            </div>
          </div>

          <div className="company-onboarding-accept-fields">
            <label htmlFor="companyName">Company Name</label>
            <input
              id="companyName"
              type="text"
              className="company-onboarding-accept-input"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              autoComplete="organization"
              required
            />

            <label>Business Type</label>

            <div className="company-onboarding-accept-business-toggle">
              <div
                className="company-onboarding-accept-business-pill"
                role="radiogroup"
                aria-label="Business Type"
              >
                <button
                  type="button"
                  className={`company-onboarding-accept-business-option ${
                    companyType === "distributor" ? "is-active" : ""
                  }`}
                  onClick={() => setCompanyType("distributor")}
                  aria-pressed={companyType === "distributor"}
                >
                  Distributor
                </button>

                <button
                  type="button"
                  className={`company-onboarding-accept-business-option ${
                    companyType === "supplier" ? "is-active" : ""
                  }`}
                  onClick={() => setCompanyType("supplier")}
                  aria-pressed={companyType === "supplier"}
                >
                  Supplier
                </button>

                <div
                  className={`company-onboarding-accept-business-slider ${
                    companyType === "supplier" ? "is-right" : "is-left"
                  }`}
                  aria-hidden="true"
                />
              </div>
            </div>

            <label htmlFor="firstName">First Name</label>
            <input
              id="firstName"
              type="text"
              className="company-onboarding-accept-input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              required
            />

            <label htmlFor="lastName">Last Name</label>
            <input
              id="lastName"
              type="text"
              className="company-onboarding-accept-input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              required
            />

            <label htmlFor="password">Password</label>
            <div className="company-onboarding-accept-password-field">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="company-onboarding-accept-input"
                disabled={submitting}
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                autoComplete="new-password"
                required
              />
              <IconButton
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="company-onboarding-accept-password-toggle"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </div>

            {passwordError && (
              <p className="company-onboarding-accept-field-error">
                {passwordError}
              </p>
            )}

            <label htmlFor="verifyPassword">Verify Password</label>
            <div className="company-onboarding-accept-password-field">
              <input
                id="verifyPassword"
                type={showPassword ? "text" : "password"}
                disabled={submitting}
                className="company-onboarding-accept-input"
                value={verifyPassword}
                onChange={(e) => handleVerifyPasswordChange(e.target.value)}
                autoComplete="new-password"
                required
              />
              <IconButton
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="company-onboarding-accept-password-toggle"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </div>

            {verifyPasswordError && (
              <p className="company-onboarding-accept-field-error">
                {verifyPasswordError}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="company-onboarding-accept-submit"
            disabled={submitting || !!passwordError || !!verifyPasswordError}
          >
            {submitting ? "Activating…" : "Activate Account"}
          </button>

          <p className="company-onboarding-accept-login-note">
            Already have a Displaygram account with this email?{" "}
            <button
              type="button"
              onClick={() =>
                navigate(`/login?email=${encodeURIComponent(invite.email)}`)
              }
            >
              Sign in instead
            </button>
          </p>
        </form>
      </section>
    </main>
  );
}
