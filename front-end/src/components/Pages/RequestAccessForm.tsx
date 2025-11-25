import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import { showMessage } from "../../Slices/snackbarSlice";
import { useAppDispatch } from "../../utils/store";
import { AccessRequestDraft } from "../DeveloperDashboard/deverloperTypes";
// import { Eye, EyeOff } from "lucide-react"; // nice minimal icons
import { getFunctions, httpsCallable } from "firebase/functions";
import "./signUpLogIn.css";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";

type UserTypeHint = "distributor" | "supplier";

const COMPANY_TYPES: UserTypeHint[] = ["distributor", "supplier"];

export default function RequestAccessForm({
  inviteMode,
}: {
  inviteMode?: boolean;
}) {
  const dispatch = useAppDispatch();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [form, setForm] = useState<AccessRequestDraft>({
    workEmail: "",
    firstName: "",
    lastName: "",
    phone: "",
    notes: "",
    userTypeHint: "distributor" as UserTypeHint,
    companyName: "",
  });
  const functions = getFunctions();

  const createCompanyOrRequest = httpsCallable(
    functions,
    "createCompanyOrRequest"
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const { inviteId } = useParams();

  // 🔵 Invite context
  const [inviteData, setInviteData] = useState<any>(null);

  function invertCompanyType(
    type: "supplier" | "distributor"
  ): "supplier" | "distributor" {
    return type === "supplier" ? "distributor" : "supplier";
  }

  // Load pendingInvite context if inviteId exists
  useEffect(() => {
    if (!inviteId) return;

    (async () => {
      try {
        const snap = await getDoc(doc(db, "pendingInvites", inviteId));
        if (!snap.exists()) {
          dispatch(showMessage("Invite not found or expired."));
          return;
        }

        const data = snap.data();
        setInviteData(data);
        console.log(inviteData);
        // PREFILL FIELDS
        setForm((prev) => ({
          ...prev,
          workEmail: data.email || prev.workEmail,
          companyName: data.inferredCompanyName || prev.companyName,
          firstName: data.firstName || prev.firstName,
          lastName: data.lastName || prev.lastName,
          userTypeHint: data.fromCompanyType
            ? invertCompanyType(data.fromCompanyType)
            : prev.userTypeHint,
        }));
      } catch (err) {
        console.error("Failed to load invite:", err);
        dispatch(showMessage("Failed to load invite details."));
      }
    })();
  }, [inviteId]);

  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
  }, []);

  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    setCurrentUser(null);
  };

  const setField = (name: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [name]: value }));

  const submitAccessRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!form.workEmail.includes("@")) {
        throw new Error("Enter a valid work email.");
      }

      // Build request payload dynamically
      const payload: any = {
        ...form,
        userTypeHint: form.userTypeHint,
      };

      // Add invite metadata if applicable
      if (inviteData && inviteId) {
        payload.inviteId = inviteId;
        payload.invitedByCompanyId = inviteData.fromCompanyId;
        payload.inferredCompanyType = invertCompanyType(
          inviteData.fromCompanyType
        );
      }

      const result = await createCompanyOrRequest(payload);
      const data = result.data as { ok?: boolean; error?: string };

      if (data.ok) {
        localStorage.setItem("showOnboardingModal", "true");
        navigate("/request-submitted");
        return;
      }

      throw new Error(data.error || "Request failed.");
    } catch (err: any) {
      const errorMsg = err?.message || "❌ Request failed.";
      setError(errorMsg);
      dispatch(showMessage(errorMsg));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearForm = () => {
    setForm({
      workEmail: "",
      firstName: "",
      lastName: "",
      phone: "",
      notes: "",
      userTypeHint: "distributor" as UserTypeHint,
      companyName: "",
    });
    setError(null);
  };

  if (currentUser) {
    return (
      <div className="auth-page">
        <div className="auth-alert">
          <strong>You are already logged in</strong> as{" "}
          <b>{currentUser.email}</b>.
          <br />
          <br />
          If you meant to sign up with a new email,{" "}
          <button onClick={handleLogout}>log out first</button>.
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <header className="auth-header">
          {/* INVITE BANNER */}
          {inviteData && (
            <div className="invite-banner">
              <h3>You were invited to join Displaygram</h3>

              {inviteData.fromCompanyName && (
                <p>
                  <strong>{inviteData.fromCompanyName}</strong> invited you to
                  join Displaygram and start a shared-brand connection.
                </p>
              )}

              {inviteData.pendingBrands?.length > 0 && (
                <div className="brand-preview-box">
                  <p>They proposed these brands to collaborate on:</p>
                  <div className="brand-list">
                    {inviteData.pendingBrands.map((b: string) => (
                      <span key={b} className="brand-pill">
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="invite-note">
                Your company request will be reviewed and approved before
                onboarding.
              </p>
            </div>
          )}
          <h1 className="request-title">
            {inviteData ? "Complete Your Company Request" : "Request Access"}
          </h1>
        </header>

        {error && <div className="auth-alert">{error}</div>}

        <form className="auth-form" onSubmit={submitAccessRequest} noValidate>
          <label className="auth-label">First name</label>
          <input
            title="first name"
            placeholder="First name"
            className="auth-input"
            value={form.firstName}
            onChange={(e) => setField("firstName", e.target.value)}
            required
          />

          <label className="auth-label">Last name</label>
          <input
            title="last name"
            placeholder="Last name"
            className="auth-input"
            value={form.lastName}
            onChange={(e) => setField("lastName", e.target.value)}
            required
          />

          <label className="auth-label">Work email</label>
          <input
            type="email"
            className="auth-input"
            placeholder="you@company.com"
            value={form.workEmail}
            onChange={(e) => setField("workEmail", e.target.value)}
            disabled={!!inviteData}
            required
          />

          <label className="auth-label">Company</label>
          <input
            className="auth-input"
            placeholder="Your company name"
            value={form.companyName}
            onChange={(e) => setField("companyName", e.target.value)}
            required
          />

          <label className="auth-label">Company type</label>
          <select
            title="Customer Type"
            className="auth-input"
            value={form.userTypeHint}
            onChange={(e) =>
              setField("userTypeHint", e.target.value as UserTypeHint)
            }
            disabled={!!inviteData}
            required
          >
            {COMPANY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
          {inviteData?.fromCompanyType && (
            <p className="role-hint">
              Suggested based on your invitation:{" "}
              {invertCompanyType(inviteData.fromCompanyType)}.
            </p>
          )}

          <label className="auth-label">Phone (optional)</label>
          <input
            title="Phone number"
            placeholder="555-555-5555"
            className="auth-input"
            value={form.phone}
            onChange={(e) => setField("phone", e.target.value)}
          />

          <label className="auth-label">Notes (optional)</label>
          <textarea
            className="auth-input"
            placeholder="Anything we should know?"
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
            rows={3}
          />

          <div className="auth-actions submit-request">
            <button className="button-primary" disabled={submitting}>
              {submitting && !error ? "Submitting…" : "Submit request"}
            </button>
          </div>

          {/* <div className="auth-divider">
            <span>or</span>
          </div> */}

          <div className="auth-footnote">
            Already have an invite? Use your link or{" "}
            <Link to="/login">log in</Link>.
          </div>
        </form>

        <button className="button-outline mt-3" onClick={handleClearForm}>
          Clear
        </button>
      </div>
    </div>
  );
}
