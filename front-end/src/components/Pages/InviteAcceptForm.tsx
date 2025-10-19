// components/Auth/InviteAcceptForm.tsx
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
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";
import { showMessage } from "../../Slices/snackbarSlice";
import { useAppDispatch } from "../../utils/store";
import { getFunctions, httpsCallable } from "firebase/functions";
import { IconButton } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

const toIso = (v: any): string =>
  v?.toDate?.()
    ? v.toDate().toISOString()
    : v instanceof Date
    ? v.toISOString()
    : typeof v === "string"
    ? v
    : new Date().toISOString();

export default function InviteAcceptForm() {
  const { inviteId, companyId } = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [invite, setInvite] = useState<any>(null);
  const [signInMethods, setSignInMethods] = useState<string[]>([]);

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

  useEffect(() => {
    if (!inviteId) return;
    (async () => {
      try {
        const snap = await getDoc(
          doc(db, `companies/${companyId}/invites/${inviteId}`)
        );

        if (!snap.exists()) {
          setError("Invite not found or already used.");
        } else {
          const data = snap.data();

          if (data.accepted) {
            setError("This invite has already been accepted.");
          } else {
            try {
              const functions = getFunctions();
              const checkUserExists = httpsCallable(
                functions,
                "checkUserExists"
              );
              const res = await checkUserExists({
                email: data.inviteeEmail,
                companyId,
              });

              const { exists, signInMethods } = res.data as {
                exists: boolean;
                signInMethods: string[];
              };

              setSignInMethods(signInMethods || []);

              if (
                exists &&
                signInMethods.length &&
                !signInMethods.includes("password")
              ) {
                setError(
                  "This account uses Google sign-in. Please continue with Google instead of creating a password."
                );
              } else {
                if (!exists) {
                  setInvite(data); // brand new user, allow password
                } else if (!signInMethods.includes("password")) {
                  setError("Google-only …");
                } else {
                  setInvite(data); // existing user with password
                }
              }
            } catch (err: any) {
              if (err.code === "failed-precondition") {
                setError(
                  "This email is already associated with another company. Please contact support to transfer accounts."
                );
              } else {
                setError("Unable to validate invite. Please try again later.");
              }
            }
          }
        }
      } catch (err) {
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
    if (!invite) return; // Add this line to avoid runtime errors

    setSubmitting(true);
    setError(null);
    const auth = getAuth();
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user.email?.toLowerCase() !== invite.inviteeEmail.toLowerCase()) {
        await auth.signOut(); // clean up auth record
        throw new Error(
          "Signed-in Google account does not match invited email."
        );
      }

      const nowIso = new Date().toISOString();
      const createdAtIso = toIso(invite.createdAt);

      // Create Firestore user
      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          email: user.email,
          firstName,
          lastName,
          company: invite.companyName, // 👈 add this
          companyName: invite.companyName, // 👈 add this
          companyId: invite.companyId,
          role: invite.role || "employee",
          createdAt: createdAtIso,
          updatedAt: nowIso,
        },
        { merge: true }
      );

      // Mark invite as accepted
      await updateDoc(doc(db, `companies/${companyId}/invites/${inviteId}`), {
        accepted: true,
        acceptedBy: user.uid,
        acceptedAt: nowIso,
        status: "accepted",
      });

      dispatch(showMessage("✅ Invite accepted with Google!"));
      navigate("/user-home-page");
    } catch (e: any) {
      if (e.code === "auth/account-exists-with-different-credential") {
        const cred = GoogleAuthProvider.credentialFromError(e);
        const email = e.customData?.email;
        if (cred && email) {
          setPendingLink({ email, cred });
          setError(
            "This email has a password login. Please enter password to link Google."
          );
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
    if (firstName.trim().length === 0 || lastName.trim().length === 0) return;
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

          // ✅ Link Google if pending after sign-in
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
          company: invite.companyName, // 👈 add this
          companyName: invite.companyName, // 👈 add this
          companyId: invite.companyId,
          role: invite.role || "employee",
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

      dispatch(showMessage("✅ Invite accepted. Welcome!"));
      navigate("/user-home-page");
    } catch (err: any) {
      setError(err.message || "Failed to accept invite.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Loading invite…</div>;
  if (error) return <div className="auth-error">{error}</div>;
  if (!invite) return null;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Accept Invite</h1>
        <p>
          You’ve been invited to join <strong>{invite.companyName}</strong> as{" "}
          {invite.role || "employee"}.
        </p>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>First Name</label>
          <input
            type="text"
            className="auth-input"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />

          <label>Last Name</label>
          <input
            type="text"
            className="auth-input"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />

          <div className="auth-email">
            Email: <strong>{invite.inviteeEmail}</strong>
          </div>

          {(!signInMethods.length || signInMethods.includes("google.com")) && (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="btn-google"
              disabled={submitting}
            >
              Continue with Google
            </button>
          )}

          {/* Show password fields if account is new OR supports password */}
          {(!signInMethods.length || signInMethods.includes("password")) && (
            <>
              <label>Password</label>
              <div className="auth-password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  className="auth-input"
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

              {passwordError && (
                <div className="auth-error">{passwordError}</div>
              )}

              <label>Verify Password</label>
              <div className="auth-password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  className="auth-input"
                  value={verifyPassword}
                  onChange={(e) => handleVerifyPasswordChange(e.target.value)}
                />
                {verifyPasswordError && (
                  <div className="auth-error">{verifyPasswordError}</div>
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
                className="auth-submit"
                disabled={
                  submitting || !!passwordError || !!verifyPasswordError
                }
              >
                {submitting ? "Accepting…" : "Accept Invite"}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
