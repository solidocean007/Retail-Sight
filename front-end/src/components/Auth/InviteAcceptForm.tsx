// components/Auth/InviteAcceptForm.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";
import { showMessage } from "../../Slices/snackbarSlice";
import { useAppDispatch } from "../../utils/store";

const toIso = (v: any): string =>
  v?.toDate?.()
    ? v.toDate().toISOString()
    : v instanceof Date
    ? v.toISOString()
    : typeof v === "string"
    ? v
    : new Date().toISOString();

export default function InviteAcceptForm() {
  const { inviteId } = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [verifyPassword, setVerifyPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [verifyPasswordError, setVerifyPasswordError] = useState<string | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!inviteId) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "invites", inviteId));
        if (!snap.exists()) {
          setError("Invite not found or already used.");
        } else {
          const data = snap.data();
          if (data.accepted) {
            setError("This invite has already been accepted.");
          } else {
            setInvite(data);
          }
        }
      } catch (err) {
        setError("Failed to load invite.");
      } finally {
        setLoading(false);
      }
    })();
  }, [inviteId]);

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
      // Try creating the user (if not already exists)
      let userCred;
      try {
        userCred = await createUserWithEmailAndPassword(
          auth,
          invite.email,
          password
        );
      } catch (err: any) {
        if (err.code === "auth/email-already-in-use") {
          userCred = await signInWithEmailAndPassword(
            auth,
            invite.email,
            password
          );
        } else {
          throw err;
        }
      }

      const nowIso = new Date().toISOString();
      const createdAtIso = toIso(invite.createdAt);

      // Add to Firestore `users`
      await setDoc(
        doc(db, "users", userCred.user.uid),
        {
          uid: userCred.user.uid,
          email: invite.email,
          firstName: invite.firstName,
          lastName: invite.lastName,
          companyId: invite.companyId,
          role: invite.role || "employee",
          createdAt: createdAtIso, // ✅ always ISO string
          updatedAt: nowIso, // ✅ add this if you want an updatedAt
        },
        { merge: true }
      );

      // Mark invite as accepted (strings)
      await updateDoc(doc(db, "invites", inviteId!), {
        accepted: true,
        acceptedBy: userCred.user.uid,
        acceptedAt: nowIso, // ✅ string
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
        <form onSubmit={handleSubmit}>
          <div>
            Email: <strong>{invite.email}</strong>
          </div>
          <div>
            Name:{" "}
            <strong>
              {invite.firstName} {invite.lastName}
            </strong>
          </div>

          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
          />
          {passwordError && <div className="auth-error">{passwordError}</div>}

          <label>Verify Password</label>
          <input
            type="password"
            value={verifyPassword}
            onChange={(e) => handleVerifyPasswordChange(e.target.value)}
          />
          {verifyPasswordError && (
            <div className="auth-error">{verifyPasswordError}</div>
          )}

          <button
            disabled={submitting || !!passwordError || !!verifyPasswordError}
          >
            {submitting ? "Accepting…" : "Accept Invite"}
          </button>
        </form>
      </div>
    </div>
  );
}
