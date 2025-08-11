// components/Auth/RequestAccessForm.tsx
import { useState } from "react";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";

type UserTypeHint = "distributor" | "supplier";

const COMPANY_TYPES: UserTypeHint[] = ["distributor", "supplier"];

export default function RequestAccessForm() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    workEmail: "",
    companyName: "",
    userTypeHint: "distributor" as UserTypeHint,
    phone: "",
    notes: "",
  });
  const [password, setPassword] = useState(""); // if you prefer passwordless, replace with email link flow
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const navigate = useNavigate();

  const setField = (name: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [name]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      let uid = currentUser?.uid;
      if (!uid) {
        // create the account now (unverified, free tier)
        const cred = await createUserWithEmailAndPassword(
          auth,
          form.workEmail.trim().toLowerCase(),
          password || crypto.randomUUID().slice(0, 12) // optional: generate temp pwd if you don't want a visible field
        );
        uid = cred.user.uid;
      }

      const resp = await fetch("/api/createCompanyOrRequest", {
        method: "POST",
        headers: { "Content-Type": "application/json" }, // no bearer required
        body: JSON.stringify({ ...form, uid }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${resp.status})`);
      }

      const data = await resp.json();
      setResult(data); // { mode: "created" | "matched", companyId, requestId }
      // optional: route them to a “You’re in (pending)” page
      navigate("/user-home-page");
    } catch (err: any) {
      setError(err?.message || "Request failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <header className="auth-header">
          <h1 className="auth-welcome">Request Access</h1>
          <h2 className="auth-title">Sign up for <span>Displaygram</span></h2>
        </header>

        {error && <div className="auth-alert" role="alert" aria-live="polite">{error}</div>}

        <form className="auth-form" onSubmit={submit} noValidate>
          <label className="auth-label" htmlFor="firstName">First name</label>
          <input id="firstName" className="auth-input"
            value={form.firstName}
            onChange={(e) => setField("firstName", e.target.value)}
            autoComplete="given-name" required />

          <label className="auth-label" htmlFor="lastName">Last name</label>
          <input id="lastName" className="auth-input"
            value={form.lastName}
            onChange={(e) => setField("lastName", e.target.value)}
            autoComplete="family-name" required />

          <label className="auth-label" htmlFor="email">Work email</label>
          <input id="email" type="email" className="auth-input" placeholder="you@company.com"
            value={form.workEmail}
            onChange={(e) => setField("workEmail", e.target.value)}
            autoComplete="email" required />

          <label className="auth-label" htmlFor="companyName">Company</label>
          <input id="companyName" className="auth-input" placeholder="Your company name"
            value={form.companyName}
            onChange={(e) => setField("companyName", e.target.value)}
            autoComplete="organization" required />

          <label className="auth-label" htmlFor="companyType">Company type</label>
          <select id="companyType" className="auth-input"
            value={form.userTypeHint}
            onChange={(e) => setField("userTypeHint", e.target.value as UserTypeHint)} required>
            <option value="" disabled>Select one</option>
            {COMPANY_TYPES.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>

          {/* If you want password-based right now (otherwise remove this field and use email-link) */}
          <label className="auth-label" htmlFor="password">Password</label>
          <input id="password" type="password" className="auth-input" placeholder="••••••••"
            value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password" />

          <label className="auth-label" htmlFor="phone">Phone (optional)</label>
          <input id="phone" className="auth-input" placeholder="555-555-5555"
            value={form.phone} onChange={(e) => setField("phone", e.target.value)}
            autoComplete="tel" />

          <label className="auth-label" htmlFor="notes">Notes (optional)</label>
          <textarea id="notes" className="auth-input" placeholder="Anything we should know?"
            value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={3} />

          <div className="auth-actions">
            <button className="btn auth-submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit request"}
            </button>
          </div>

          <div className="auth-divider"><span>or</span></div>
          <div className="auth-footnote">
            Already have an invite?{" "}
            <Link to="/use-invite" className="auth-link">Use your invite link</Link>{" "}or{" "}
            <Link to="/login" className="auth-link">log in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

