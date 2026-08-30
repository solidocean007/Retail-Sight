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
import AccessPageShell from "./AccessPageShell";
import { refreshCurrentUserProfile } from "../../thunks/currentUserThunk";

type InviteDoc = {
  inviteeEmail: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
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
        setFirstName(data.firstName || "");
        setLastName(data.lastName || "");

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
        // acceptTeamInvite's Firestore transaction (create users/{uid},
        // mark the invite accepted) can commit successfully even when a
        // step AFTER it (setCustomUserClaims / company count recompute)
        // throws — which makes this whole call reject even though the
        // invite actually went through. Blindly deleting the Auth account
        // we just created would strand that committed Firestore doc with
        // no Auth account behind it (this has happened in production: an
        // "already used" invite with no matching Firebase Auth user).
        // So before rolling back, check whether the write actually landed.
        let alreadyCommitted = false;

        try {
          const authUser = getAuth().currentUser;
          if (authUser) {
            const userSnap = await getDoc(doc(db, "users", authUser.uid));
            if (userSnap.exists() && userSnap.data()?.companyId) {
              alreadyCommitted = true;

              await authUser.getIdToken(true);
              const refreshedUser = await dispatch(
                refreshCurrentUserProfile(authUser.uid),
              );

              if (refreshedUser?.companyId) {
                dispatch(showMessage("✅ Invite accepted. Welcome!"));
                navigate("/user-home-page");
                return;
              }
            }
          }
        } catch (checkErr) {
          console.warn("Post-failure commit check failed:", checkErr);
          // Couldn't confirm either way — fall through to the normal,
          // safe-by-default rollback below.
          alreadyCommitted = false;
        }

        if (!alreadyCommitted) {
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
      <AccessPageShell
        storyEyebrow="Team invitation"
        storyTitle="A shared view of what is happening in market."
        storyDescription="Displaygram connects field activity, retail displays, and company goals in one workspace."
        highlights={[
          { label: "Verify the invitation", detail: "We confirm the company, email, and invite status." },
          { label: "Use the invited email", detail: "Invitations can only be accepted by the intended recipient." },
          { label: "Join the workspace", detail: "Your company permissions are applied automatically." },
        ]}
        panelEyebrow="Team invite"
        panelTitle="Checking your invitation"
        panelDescription="This should only take a moment."
      >
        <div className="access-shell-status" role="status">
          <div className="access-shell-status-icon" aria-hidden="true">…</div>
          <p>Loading the company and invitation details.</p>
        </div>
      </AccessPageShell>
    );
  }

  if (error && !invite) {
    const inviteDebugCode = inviteId?.slice(0, 6).toUpperCase();

    return (
      <AccessPageShell
        storyEyebrow="Team invitation"
        storyTitle="A shared view of what is happening in market."
        storyDescription="Displaygram invitations are tied to one company, one email, and a limited activation window."
        highlights={[
          { label: "Check the newest email", detail: "A newer invitation may have replaced this link." },
          { label: "Ask your company admin", detail: "An admin can send a fresh invitation to your work email." },
          { label: "Keep the link private", detail: "Invitation links should not be forwarded or shared." },
        ]}
        panelEyebrow="Team invite"
        panelTitle="This invitation is not active"
        panelDescription="It may have expired, already been accepted, or been replaced."
      >
        <div className="access-shell-status">
          <div className="access-shell-status-icon" aria-hidden="true">!</div>
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
        </div>
      </AccessPageShell>
    );
  }

  if (!invite) return null;

  return (
    <AccessPageShell
      storyEyebrow="Team invitation"
      storyTitle="Your team’s retail work, in one shared view."
      storyDescription="Join the approved company workspace where your team documents displays, follows goals, and sees field activity."
      highlights={[
        { label: "Company-scoped access", detail: "This invitation only grants access to the named workspace." },
        { label: "Identity matched", detail: "Use the same work email that received the invitation." },
        { label: "Ready after activation", detail: "Your role and company permissions are applied automatically." },
      ]}
      panelEyebrow="Team invite"
      panelTitle={`Join ${invite.companyName || "your company"}`}
      panelDescription="Confirm the invited account details to enter the workspace."
    >
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
    </AccessPageShell>
  );
}
