import React, { useMemo, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../signUpLogIn.css";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../utils/firebase";

/**
 * SignupRequestForm
 * ---------------------------------------------------------------------------
 * Uninvited signup path. Collects a request and stores it in Firestore
 * under `pendingUsers`. An admin will review and send an invite.
 *
 * Reuses the same card styles as Login (auth-page/auth-card/etc.).
 * Optionally accepts query params to prefill companyName/companyType.
 */

export type CompanyType = "distributor" | "supplier";

const COMPANY_TYPES: CompanyType[] = ["distributor", "supplier"];

const fieldError = (v?: string) => (!v || !v.trim() ? "Required" : "");
const emailError = (v?: string) =>
  !v || !v.trim()
    ? "Required"
    : /[^@\s]+@[^@\s]+\.[^@\s]+/.test(v)
    ? ""
    : "Invalid email";

const SignupRequestForm: React.FC = () => {
  const { search } = useLocation();
  const navigate = useNavigate();

  const params = useMemo(() => new URLSearchParams(search), [search]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState<CompanyType | "">("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  // Prefill from query params if present
  useEffect(() => {
    const prefillCompany = params.get("companyName");
    const prefillType = params.get("companyType") as CompanyType | null;
    const prefillEmail = params.get("email");
    if (prefillCompany) setCompanyName(prefillCompany);
    if (prefillType && COMPANY_TYPES.includes(prefillType)) setCompanyType(prefillType);
    if (prefillEmail) setEmail(prefillEmail);
  }, [params]);

  const validate = () => {
    const errors = {
      firstName: fieldError(firstName),
      lastName: fieldError(lastName),
      email: emailError(email),
      companyName: fieldError(companyName),
      companyType: companyType ? "" : "Required",
    } as const;

    const firstBad = Object.values(errors).find(Boolean);
    return { ok: !firstBad, errors };
  };

//   // inside SignupRequestForm submit handler
// const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL}/submitSignupRequest`, {
//   method: 'POST',
//   headers: { 'Content-Type': 'application/json' },
//   body: JSON.stringify({
//     firstName, lastName, email, companyName, requestedCompanyType, phone, notes
//   }),
// });
// const json = await resp.json();

// switch (json.code) {
//   case 'OK':
//     // show success screen (already in your component)
//     break;
//   case 'ALREADY_USER':
//     // show “you already have an account — log in / reset password”
//     break;
//   case 'ALREADY_PENDING':
//     // show “we already have a request on file”
//     break;
//   case 'BAD_INPUT':
//   default:
//     // show error toast
// }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const { ok } = validate();
    if (!ok) {
      setErr("Please complete the required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, "pendingUsers"), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        companyName: companyName.trim(),
        requestedCompanyType: companyType,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
        status: "pending",
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        source: "signup-request",
      });
      setSuccessId(docRef.id);
    } catch (e: any) {
      console.error("SignupRequestForm error:", e);
      setErr("Could not submit your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (successId) {
    return (
      <div className="auth-page">
        <div className="auth-card" role="status" aria-live="polite">
          <header className="auth-header">
            <h1 className="auth-welcome">Request received</h1>
            <h2 className="auth-title">Thanks for contacting <span>Displaygram</span></h2>
          </header>
          <p style={{ marginTop: 8 }}>
            We emailed the team and logged your request (ID: <code>{successId}</code>). 
            You'll get an invite once an admin approves your access.
          </p>
          <div className="auth-actions" style={{ marginTop: 16 }}>
            <Link to="/login" className="btn auth-submit" style={{ textAlign: "center" }}>Back to Login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <header className="auth-header">
          <h1 className="auth-welcome">Request Access</h1>
          <h2 className="auth-title">Sign up for <span>Displaygram</span></h2>
        </header>

        {err && (
          <div className="auth-alert" role="alert" aria-live="polite">{err}</div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="auth-label" htmlFor="firstName">First name</label>
          <input
            id="firstName"
            className="auth-input"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            required
          />

          <label className="auth-label" htmlFor="lastName">Last name</label>
          <input
            id="lastName"
            className="auth-input"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
            required
          />

          <label className="auth-label" htmlFor="email">Work email</label>
          <input
            id="email"
            type="email"
            className="auth-input"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <label className="auth-label" htmlFor="companyName">Company</label>
          <input
            id="companyName"
            className="auth-input"
            placeholder="Your company name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            autoComplete="organization"
            required
          />

          <label className="auth-label" htmlFor="companyType">Company type</label>
          <select
            id="companyType"
            className="auth-input"
            value={companyType}
            onChange={(e) => setCompanyType(e.target.value as CompanyType)}
            required
          >
            <option value="" disabled>
              Select one
            </option>
            {COMPANY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>

          <label className="auth-label" htmlFor="phone">Phone (optional)</label>
          <input
            id="phone"
            className="auth-input"
            placeholder="555-555-5555"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />

          <label className="auth-label" htmlFor="notes">Notes (optional)</label>
          <textarea
            id="notes"
            className="auth-input"
            placeholder="Anything we should know?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />

          <div className="auth-actions">
            <button className="btn auth-submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit request"}
            </button>
          </div>

          <div className="auth-divider"><span>or</span></div>
          <div className="auth-footnote">
            Already have an invite? {" "}
            <Link to="/use-invite" className="auth-link">Use your invite link</Link>
            {" "}or {" "}
            <Link to="/login" className="auth-link">log in</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignupRequestForm;
