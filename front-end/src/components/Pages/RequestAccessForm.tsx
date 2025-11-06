import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { showMessage } from "../../Slices/snackbarSlice";
import { useAppDispatch } from "../../utils/store";
import { AccessRequestDraft } from "../DeveloperDashboard/deverloperTypes";
// import { Eye, EyeOff } from "lucide-react"; // nice minimal icons
import { getFunctions, httpsCallable } from "firebase/functions";
import "./signUpLogIn.css";

type UserTypeHint = "distributor" | "supplier";

const COMPANY_TYPES: UserTypeHint[] = ["distributor", "supplier"];

export default function RequestAccessForm() {
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
      if (!form.workEmail.includes("@"))
        throw new Error("Enter a valid work email.");

      const result = await createCompanyOrRequest({
        ...form,
        userTypeHint: form.userTypeHint,
      });
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
          <h1 className="auth-welcome">Request Access</h1>
          <h2 className="auth-title">
            Sign up for <span>Displaygram</span>
          </h2>
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
            required
          >
            {COMPANY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>

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

          <div className="auth-actions">
            <button className="button-primary" disabled={submitting}>
              {submitting && !error ? "Submitting…" : "Submit request"}
            </button>
          </div>

          <div className="auth-divider">
            <span>or</span>
          </div>

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
