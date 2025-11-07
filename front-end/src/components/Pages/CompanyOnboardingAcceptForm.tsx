import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  AuthCredential,
  signInWithPopup,
  linkWithCredential,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../../utils/firebase";
import { showMessage } from "../../Slices/snackbarSlice";
import { useAppDispatch } from "../../utils/store";
import { IconButton } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { getFunctions, httpsCallable } from "firebase/functions";
import "./CompanyOnboardingAcceptForm.css";

const toIso = (v: any): string =>
  v?.toDate?.()
    ? v.toDate().toISOString()
    : v instanceof Date
    ? v.toISOString()
    : typeof v === "string"
    ? v
    : new Date().toISOString();

export default function CompanyOnboardingAcceptForm() {
  const { inviteId, companyId } = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [password, setPassword] = useState("");
  const [verifyPassword, setVerifyPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [verifyPasswordError, setVerifyPasswordError] = useState<string | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const functions = getFunctions();
  const markAccessRequestComplete = httpsCallable(
    functions,
    "markAccessRequestComplete"
  );

  useEffect(() => {
    if (!inviteId || !companyId) return;

    (async () => {
      try {
        const inviteSnap = await getDoc(
          doc(db, `companies/${companyId}/invites/${inviteId}`)
        );
        if (!inviteSnap.exists()) {
          setError("Invite not found or already used.");
          return;
        }

        const inviteData = inviteSnap.data();
        if (inviteData.accepted) {
          setError("This invite has already been accepted.");
          return;
        }

        setInvite(inviteData);

        // Prefill names from the access request
        const qSnap = await getDocs(
          query(
            collection(db, "accessRequests"),
            where("inviteId", "==", inviteId),
            limit(1)
          )
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
  }, [inviteId, companyId]);

  const [pendingLink, setPendingLink] = useState<{
    email: string;
    cred: AuthCredential;
  } | null>(null);

  const handleGoogleSignIn = async () => {
    if (!invite) return;

    setSubmitting(true);
    setError(null);
    const auth = getAuth();
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user.email?.toLowerCase() !== invite.inviteeEmail.toLowerCase()) {
        await auth.signOut();
        throw new Error("Signed-in Google account does not match invited email.");
      }

      const nowIso = new Date().toISOString();
      const createdAtIso = toIso(invite.createdAt);

      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          email: user.email,
          firstName,
          lastName,
          company: invite.companyName,
          companyName: invite.companyName,
          companyId: invite.companyId,
          role: "admin",
          approvedViaRequest: true,
          createdAt: createdAtIso,
          updatedAt: nowIso,
        },
        { merge: true }
      );

      await updateDoc(doc(db, `companies/${companyId}/invites/${inviteId}`), {
        accepted: true,
        acceptedBy: user.uid,
        acceptedAt: nowIso,
        status: "accepted",
      });

      dispatch(showMessage("✅ Account activated!"));
      navigate("/user-home-page");
    } catch (e: any) {
      if (e.code === "auth/account-exists-with-different-credential") {
        const cred = GoogleAuthProvider.credentialFromError(e);
        const email = e.customData?.email;
        if (cred && email) {
          setPendingLink({ email, cred });
          setError("This email already has a password login.");
        } else {
          setError("An account already exists for this email.");
        }
      } else {
        setError(e.message || "Google sign-in failed.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordError(
      value.length < 8 ? "Password must be at least 8 characters." : null
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
      password && value !== password ? "Passwords do not match." : null
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordError || verifyPasswordError) return;
    setSubmitting(true);
    setError(null);

    try {
      const auth = getAuth();
      let userCred;
      try {
        userCred = await createUserWithEmailAndPassword(
          auth,
          invite.inviteeEmail,
          password
        );
      } catch (err: any) {
        if (err.code === "auth/email-already-in-use") {
          userCred = await signInWithEmailAndPassword(
            auth,
            invite.inviteeEmail,
            password
          );

          if (
            pendingLink &&
            auth.currentUser?.email?.toLowerCase() ===
              pendingLink.email.toLowerCase()
          ) {
            await linkWithCredential(auth.currentUser, pendingLink.cred);
            dispatch(showMessage("✅ Google account linked."));
            setPendingLink(null);
          }
        } else {
          throw err;
        }
      }

      const nowIso = new Date().toISOString();
      const createdAtIso = toIso(invite.createdAt);

      await setDoc(
        doc(db, "users", userCred.user.uid),
        {
          uid: userCred.user.uid,
          email: invite.inviteeEmail,
          firstName,
          lastName,
          company: invite.companyName,
          companyName: invite.companyName,
          companyId: invite.companyId,
          role: "admin",
          approvedViaRequest: true,
          createdAt: createdAtIso,
          updatedAt: nowIso,
        },
        { merge: true }
      );

      await updateDoc(doc(db, `companies/${companyId}/invites/${inviteId}`), {
        accepted: true,
        acceptedBy: userCred.user.uid,
        acceptedAt: nowIso,
      });

      await markAccessRequestComplete({
        companyId: invite.companyId,
        inviteId: inviteId,
        inviteeEmail: invite.inviteeEmail,
      });

      dispatch(showMessage("✅ Company activated! Redirecting..."));
      setTimeout(() => navigate("/user-home-page"), 800);
    } catch (err: any) {
      setError(err.message || "Failed to accept invite.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="onboarding-loading">Loading company setup…</div>;
  if (error) return <div className="onboarding-error">{error}</div>;
  if (!invite) return null;

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        <h1>Activate Your Company Account</h1>
        <p>
          <strong>{invite.companyName}</strong> is now approved and live on Displaygram.
        </p>
        <p>You’re being registered as the company admin.</p>

        <div className="plan-summary">
          <h3>Plan: Free</h3>
          <p>Includes up to <strong>5 users</strong> and <strong>1 connection</strong>.</p>
        </div>

        <form onSubmit={handleSubmit} className="onboarding-form">
          <div className="readonly-field">
            <label>Email</label>
            <div className="readonly-value">{invite.inviteeEmail}</div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="btn-google"
            disabled={submitting}
          >
            Continue with Google
          </button>

          <div className="auth-divider">or</div>

          <label>Password</label>
          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              className="auth-input"
              disabled={submitting}
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
            />
            <IconButton
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </div>
          {passwordError && <div className="onboarding-error">{passwordError}</div>}

          <label>Verify Password</label>
          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              disabled={submitting}
              className="auth-input"
              value={verifyPassword}
              onChange={(e) => handleVerifyPasswordChange(e.target.value)}
            />
            {verifyPasswordError && (
              <div className="onboarding-error">{verifyPasswordError}</div>
            )}
            <IconButton
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting || !!passwordError || !!verifyPasswordError}
          >
            {submitting ? "Activating…" : "Activate Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
