// components/Auth/InviteAcceptForm.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { IconButton } from "@mui/material";

import { db, functions } from "../../utils/firebase";
import { showMessage } from "../../Slices/snackbarSlice";
import { useAppDispatch } from "../../utils/store";
import "./inviteAcceptForm.css";
import { refreshCurrentUserProfile } from "../../thunks/currentUserThunk";

type InviteDoc = {
  inviteeEmail: string;
  companyName?: string;
  role?: string;
  status?: string;
};

export default function InviteAcceptForm() {
  const { inviteId, companyId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  const [invite, setInvite] = useState<InviteDoc | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accountExists, setAccountExists] = useState<boolean | null>(null);
  const [signInMethods, setSignInMethods] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [verifyPassword, setVerifyPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [verifyPasswordError, setVerifyPasswordError] = useState<string | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);

  const redirectPath = useMemo(
    () => `${location.pathname}${location.search}`,
    [location.pathname, location.search],
  );

  const isDevMockInvite =
    import.meta.env.DEV &&
    companyId === "demo-company" &&
    inviteId === "demo-invite";

  const invitedEmail = invite?.inviteeEmail?.toLowerCase() || "";
  const signedInEmail = currentUser?.email?.toLowerCase() || "";
  const isSignedInAsInvitedUser =
    !!currentUser && signedInEmail === invitedEmail;
  const isSignedInAsDifferentUser =
    !!currentUser && !!invitedEmail && signedInEmail !== invitedEmail;

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isDevMockInvite) {
      setInvite({
        inviteeEmail: "demo.rep@displaygram.com",
        companyName: "Demo Beverage Co.",
        role: "employee",
        status: "pending",
      });

      setFirstName("Demo");
      setLastName("Rep");

      // Change this to test different page states:
      setAccountExists(false); // false = new user form, true = sign in panel

      setLoading(false);
      return;
    }
    if (!inviteId || !companyId) {
      setError("Missing invite details.");
      setLoading(false);
      return;
    }

    const loadInvite = async () => {
      try {
        const snap = await getDoc(
          doc(db, `companies/${companyId}/invites/${inviteId}`),
        );

        if (!snap.exists()) {
          setError("Invite not found or already used.");
          return;
        }

        const data = snap.data() as InviteDoc;

        if (data.status === "accepted") {
          setError("This invite has already been accepted.");
          return;
        }

        setInvite(data);

        const checkUserExists = httpsCallable(functions, "checkUserExists");
        const res = await checkUserExists({
          email: data.inviteeEmail,
          companyId,
        });

        const payload = res.data as {
          exists: boolean;
          signInMethods?: string[];
        };

        setAccountExists(payload.exists);
        setSignInMethods(payload.signInMethods || []);
      } catch (err: any) {
        console.error("Failed to load invite:", err);

        if (err.code === "failed-precondition") {
          setError(
            "This email is already associated with another company. Please contact support.",
          );
          return;
        }

        setError("Failed to load invite.");
      } finally {
        setLoading(false);
      }
    };

    loadInvite();
  }, [inviteId, companyId, isDevMockInvite]);

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

  const acceptInvite = async () => {
    if (isDevMockInvite) {
      dispatch(showMessage("Demo view only. No invite was accepted."));
      return;
    }
    if (!invite || !inviteId || !companyId) return;

    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const acceptTeamInvite = httpsCallable(functions, "acceptTeamInvite");

      await acceptTeamInvite({
        inviteId,
        companyId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      const authUser = getAuth().currentUser;

      if (authUser) {
        await authUser.getIdToken(true);
        const refreshedUser = await dispatch(
          refreshCurrentUserProfile(authUser.uid),
        );

        if (!refreshedUser?.companyId) {
          throw new Error(
            "Your account was created, but your company profile did not finish loading.",
          );
        }
      }

      dispatch(showMessage("✅ Invite accepted. Welcome!"));
      navigate("/user-home-page");
    } catch (err: any) {
      console.error("Accept invite failed:", err);
      setError(err.message || "Failed to accept invite.");
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAccountAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invite) return;

    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required.");
      return;
    }

    if (passwordError || verifyPasswordError) return;

    if (!password || !verifyPassword) {
      setError("Password and verification are required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    let createdAuthUserThisAttempt = false;

    try {
      const auth = getAuth();

      await createUserWithEmailAndPassword(auth, invite.inviteeEmail, password);
      createdAuthUserThisAttempt = true;

      await acceptInvite();
    } catch (err: any) {
      console.error("Create account invite failed:", err);

      if (createdAuthUserThisAttempt) {
        try {
          await getAuth().currentUser?.delete();
          await signOut(getAuth());
        } catch (cleanupErr) {
          console.warn(
            "Failed to cleanup newly created auth user:",
            cleanupErr,
          );
        }
      }

      if (err.code === "auth/email-already-in-use") {
        setError(
          "This email already has an account. Please sign in to accept.",
        );
        setAccountExists(true);
        return;
      }

      setError(err.message || "Failed to create account.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToLogin = () => {
    if (!invite) return;

    navigate(
      `/login?redirect=${encodeURIComponent(
        redirectPath,
      )}&email=${encodeURIComponent(invite.inviteeEmail)}`,
    );
  };

  const handleSwitchAccount = async () => {
    await signOut(getAuth());
    handleGoToLogin();
  };

  if (loading || authLoading) {
    return (
      <main className="team-invite-accept-page">
        <section className="team-invite-accept-status-card">
          Loading invite…
        </section>
      </main>
    );
  }

  if (error && !invite) {
    const inviteDebugCode = inviteId?.slice(0, 6).toUpperCase();

    return (
      <main className="team-invite-accept-page">
        <section className="team-invite-accept-status-card team-invite-accept-status-card--error">
          <h1>Invite link is no longer active</h1>

          <p>
            This invite may have expired, already been accepted, or been
            replaced by a newer invite.
          </p>

          {inviteDebugCode && (
            <p className="team-invite-accept-debug-code">
              Invite code: <strong>{inviteDebugCode}</strong>
            </p>
          )}

          <p>
            Please open the newest Displaygram invite email, or ask your admin
            to send a new invite.
          </p>
        </section>
      </main>
    );
  }

  if (!invite) return null;

  return (
    <main
      className="team-invite-accept-page"
      aria-labelledby="team-invite-accept-title"
    >
      <section className="team-invite-accept-card">
        <header className="team-invite-accept-header">
          <img
            src="/displaygram-logo-long-BLUE.svg"
            alt="Displaygram"
            className="team-invite-accept-logo"
          />

          <p className="team-invite-accept-eyebrow">Team invite</p>

          <h1
            id="team-invite-accept-title"
            className="team-invite-accept-title"
          >
            Join {invite.companyName || "your company"}
          </h1>

          <p className="team-invite-accept-subtitle">
            You were invited to join this company on Displaygram.
          </p>
        </header>

        {error && (
          <div className="team-invite-accept-alert" role="alert">
            {error}
          </div>
        )}

        <div className="team-invite-accept-readonly-field">
          <label>Invited email</label>
          <div className="team-invite-accept-readonly-value">
            {invite.inviteeEmail}
          </div>
        </div>

        {isSignedInAsDifferentUser && (
          <div className="team-invite-accept-panel">
            <p>
              You are signed in as <strong>{currentUser?.email}</strong>, but
              this invite was sent to <strong>{invite.inviteeEmail}</strong>.
            </p>

            <button
              type="button"
              className="team-invite-accept-submit"
              onClick={handleSwitchAccount}
              disabled={submitting}
            >
              Sign in with invited email
            </button>
          </div>
        )}

        {!currentUser && accountExists && (
          <div className="team-invite-accept-panel">
            <p>
              This email already has a Displaygram account. Sign in first, then
              you can accept the invite.
            </p>

            <button
              type="button"
              className="team-invite-accept-submit"
              onClick={handleGoToLogin}
              disabled={submitting}
            >
              Sign in to accept invite
            </button>
          </div>
        )}

        {isSignedInAsInvitedUser && (
          <form
            className="team-invite-accept-form"
            onSubmit={(e) => {
              e.preventDefault();
              acceptInvite();
            }}
          >
            <div className="team-invite-accept-fields">
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                type="text"
                className="team-invite-accept-input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                required
              />

              <label htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                type="text"
                className="team-invite-accept-input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                required
              />
            </div>

            <button
              type="submit"
              className="team-invite-accept-submit"
              disabled={submitting}
            >
              {submitting ? "Accepting…" : "Accept Invite"}
            </button>
          </form>
        )}

        {!currentUser && accountExists === false && (
          <form
            className="team-invite-accept-form"
            onSubmit={handleCreateAccountAndAccept}
            noValidate
          >
            <div className="team-invite-accept-fields">
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                type="text"
                className="team-invite-accept-input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                required
              />

              <label htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                type="text"
                className="team-invite-accept-input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                required
              />

              <label htmlFor="password">Password</label>
              <div className="team-invite-accept-password-field">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="team-invite-accept-input"
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
                  className="team-invite-accept-password-toggle"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </div>

              {passwordError && (
                <p className="team-invite-accept-field-error">
                  {passwordError}
                </p>
              )}

              <label htmlFor="verifyPassword">Verify Password</label>
              <div className="team-invite-accept-password-field">
                <input
                  id="verifyPassword"
                  type={showPassword ? "text" : "password"}
                  className="team-invite-accept-input"
                  disabled={submitting}
                  value={verifyPassword}
                  onChange={(e) => handleVerifyPasswordChange(e.target.value)}
                  autoComplete="new-password"
                  required
                />

                <IconButton
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="team-invite-accept-password-toggle"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </div>

              {verifyPasswordError && (
                <p className="team-invite-accept-field-error">
                  {verifyPasswordError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="team-invite-accept-submit"
              disabled={submitting || !!passwordError || !!verifyPasswordError}
            >
              {submitting ? "Creating…" : "Create account and accept invite"}
            </button>

            <p className="team-invite-accept-login-note">
              Already have an account?{" "}
              <button type="button" onClick={handleGoToLogin}>
                Sign in instead
              </button>
            </p>
          </form>
        )}
      </section>
    </main>
  );
}
