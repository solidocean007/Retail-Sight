import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { Link, useNavigate, useParams } from "react-router-dom";
import { showMessage } from "../../Slices/snackbarSlice";
import { useAppDispatch } from "../../utils/store";
import { AccessRequestDraft } from "../DeveloperDashboard/deverloperTypes";
// import { Eye, EyeOff } from "lucide-react"; // nice minimal icons
import { getFunctions, httpsCallable } from "firebase/functions";
import "./signUpLogIn.css";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";
import { checkUserExists } from "../../utils/validation/checkUserExists";
import "./requestAccessForm.css";

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
    "createCompanyOrRequest",
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [website, setWebsite] = useState("");
  const formStartedAt = useRef(Date.now());
  const navigate = useNavigate();

  const { inviteId } = useParams();
  const location = useLocation();

  // 🔵 Invite context
  const [inviteData, setInviteData] = useState<any>(null);

  function invertCompanyType(
    type: "supplier" | "distributor",
  ): "supplier" | "distributor" {
    return type === "supplier" ? "distributor" : "supplier";
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const plan = params.get("plan");

    if (!plan) return;

    setForm((prev) => ({
      ...prev,
      notes: `Interested in the ${plan} plan.`,
    }));
  }, [location.search]);

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
      if (
        !form.firstName.trim() ||
        !form.lastName.trim() ||
        !form.companyName.trim()
      ) {
        throw new Error("Complete your name and company information.");
      }

      if (!/^\S+@\S+\.\S+$/.test(form.workEmail.trim())) {
        throw new Error("Enter a valid work email.");
      }

      const normalizedEmail = form.workEmail.trim().toLowerCase();

      // 🚨 Prevent duplicate requests for existing accounts
      const exists = await checkUserExists(normalizedEmail);

      if (exists) {
        setSubmitting(false); // prevent stuck loading state

        dispatch(
          showMessage(
            "An account already exists for this email. Try logging in or resetting your password.",
          ),
        );

        navigate(`/login?email=${encodeURIComponent(normalizedEmail)}`);
        return;
      }

      // Build request payload dynamically
      const payload: any = {
        ...form,
        website,
        formStartedAt: formStartedAt.current,
        userTypeHint: form.userTypeHint,
      };

      // Add invite metadata if applicable
      if (inviteData && inviteId) {
        payload.inviteId = inviteId;
        payload.invitedByCompanyId = inviteData.fromCompanyId;
        payload.inferredCompanyType = invertCompanyType(
          inviteData.fromCompanyType,
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
      const errorMsg =
        err?.code === "functions/resource-exhausted"
          ? "We received several requests from this network. Please try again tomorrow or contact support."
          : err?.message || "Request failed. Please try again.";
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
    setWebsite("");
    formStartedAt.current = Date.now();
    setError(null);
  };

  if (currentUser) {
    return (
      <main className="request-access-page">
        <section className="request-access-session-card">
          <img
            src="/displaygram-logo-long-BLUE.svg"
            alt="Displaygram"
            className="request-access-session-logo"
          />
          <h1>You’re already signed in</h1>
          <p>
            You’re signed in as <strong>{currentUser.email}</strong>. To request
            access with another work email, log out first.
          </p>
          <button type="button" onClick={handleLogout}>
            Log out and continue
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="request-access-page">
      <div className="request-access-shell">
        <aside className="request-access-story" aria-label="About Displaygram">
          <Link to="/" className="request-access-brand-link">
            <img
              src="/displaygram-logo-long-BLUE.svg"
              alt="Displaygram"
              className="request-access-logo"
            />
          </Link>

          <div className="request-access-story-copy">
            <p className="request-access-eyebrow">Company access</p>
            <h1>Make retail execution visible to the whole team.</h1>
            <p className="request-access-lede">
              Displaygram helps distributors and suppliers document displays,
              align on brand goals, and see what is happening in market.
            </p>
          </div>

          <ol className="request-access-steps" aria-label="What happens next">
            <li>
              <span>1</span>
              <div>
                <strong>Tell us about your company</strong>
                <p>Use your work email so we can verify the organization.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>We review the request</strong>
                <p>
                  Every new company is checked before an account is created.
                </p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Activate your workspace</strong>
                <p>Approved contacts receive a secure setup invitation.</p>
              </div>
            </li>
          </ol>

          <div className="request-access-trust">
            <span aria-hidden="true">✓</span>
            <p>
              <strong>Private by default.</strong> Your details are used only to
              review and respond to this request.
            </p>
          </div>
        </aside>

        <section
          className="request-access-card"
          aria-labelledby="request-access-title"
        >
          <header className="request-access-header">
            {inviteData && (
              <div className="request-access-invite-banner">
                <h3>You were invited to join Displaygram</h3>

                {inviteData.fromCompanyName && (
                  <p>
                    <strong>{inviteData.fromCompanyName}</strong> invited you to
                    join Displaygram and start a shared-brand connection.
                  </p>
                )}

                {inviteData.pendingBrands?.length > 0 && (
                  <div className="request-access-brand-preview">
                    <p>They proposed these brands to collaborate on:</p>
                    <div className="request-access-brand-list">
                      {inviteData.pendingBrands.map((b: { brand: string }) => (
                        <span key={b.brand}>{b.brand}</span>
                      ))}
                    </div>
                  </div>
                )}

                <p className="request-access-invite-note">
                  Your company request will be reviewed and approved before
                  onboarding.
                </p>
              </div>
            )}

            <p className="request-access-form-eyebrow">
              {inviteData
                ? "Invitation details"
                : "Request a company workspace"}
            </p>
            <h2 id="request-access-title">
              {inviteData ? "Complete Your Company Request" : "Request Access"}
            </h2>
            <p>
              Tell us who you are and how your team works. Most requests are
              reviewed within one business day.
            </p>
          </header>

          {error && (
            <div
              className="request-access-error"
              role="alert"
              aria-live="polite"
            >
              {error}
            </div>
          )}
          {new URLSearchParams(location.search).get("plan") && (
            <div className="request-access-plan-banner">
              You’re requesting access for the{" "}
              <strong>
                {new URLSearchParams(location.search).get("plan")}
              </strong>{" "}
              plan.
            </div>
          )}

          <form
            className="request-access-form"
            onSubmit={submitAccessRequest}
            noValidate
          >
            <div className="request-access-honeypot" aria-hidden="true">
              <label htmlFor="request-website">Leave this field blank</label>
              <input
                id="request-website"
                name="website"
                type="text"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div className="request-access-field-grid">
              <div className="request-access-field">
                <label htmlFor="request-first-name">First name</label>
                <input
                  id="request-first-name"
                  placeholder="Clinton"
                  value={form.firstName}
                  onChange={(e) => setField("firstName", e.target.value)}
                  autoComplete="given-name"
                  maxLength={60}
                  required
                />
              </div>

              <div className="request-access-field">
                <label htmlFor="request-last-name">Last name</label>
                <input
                  id="request-last-name"
                  placeholder="Williams"
                  value={form.lastName}
                  onChange={(e) => setField("lastName", e.target.value)}
                  autoComplete="family-name"
                  maxLength={60}
                  required
                />
              </div>
            </div>

            <div className="request-access-field">
              <label htmlFor="request-email">Work email</label>
              <input
                id="request-email"
                type="email"
                placeholder="you@company.com"
                value={form.workEmail}
                onChange={(e) => setField("workEmail", e.target.value)}
                disabled={!!inviteData}
                autoComplete="email"
                inputMode="email"
                maxLength={254}
                required
              />
              <small>Use an email address associated with your company.</small>
            </div>

            <div className="request-access-field">
              <label htmlFor="request-company">Company name</label>
              <input
                id="request-company"
                placeholder="Your company’s legal or trading name"
                value={form.companyName}
                onChange={(e) => setField("companyName", e.target.value)}
                autoComplete="organization"
                maxLength={120}
                required
              />
            </div>

            <fieldset className="request-access-company-type">
              <legend>Which best describes your company?</legend>
              <p>Choose the role your company plays in the retail network.</p>

              <div className="request-access-type-options">
                {COMPANY_TYPES.map((type) => {
                  const isDistributor = type === "distributor";
                  const checked = form.userTypeHint === type;

                  return (
                    <label
                      key={type}
                      className={`request-access-type-card ${
                        checked ? "is-selected" : ""
                      } ${inviteData ? "is-disabled" : ""}`}
                    >
                      <input
                        type="radio"
                        name="company-type"
                        value={type}
                        checked={checked}
                        onChange={() => setField("userTypeHint", type)}
                        disabled={!!inviteData}
                      />
                      <span
                        className="request-access-type-icon"
                        aria-hidden="true"
                      >
                        {isDistributor ? "D" : "S"}
                      </span>
                      <span className="request-access-type-copy">
                        <strong>
                          {isDistributor ? "Distributor" : "Supplier / brand"}
                        </strong>
                        <span>
                          {isDistributor
                            ? "We sell and deliver products to retail accounts, and manage field sales execution."
                            : "We own or represent brands and collaborate with distributors on retail execution."}
                        </span>
                      </span>
                      <span
                        className="request-access-radio-mark"
                        aria-hidden="true"
                      />
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {inviteData?.fromCompanyType && (
              <p className="request-access-role-hint">
                Suggested based on your invitation:{" "}
                {invertCompanyType(inviteData.fromCompanyType)}.
              </p>
            )}

            <div className="request-access-field-grid request-access-optional-grid">
              <div className="request-access-field">
                <label htmlFor="request-phone">
                  Phone <span>Optional</span>
                </label>
                <input
                  id="request-phone"
                  type="tel"
                  placeholder="(555) 555-5555"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  autoComplete="tel"
                  maxLength={32}
                />
              </div>

              <div className="request-access-field">
                <label htmlFor="request-notes">
                  Anything else? <span>Optional</span>
                </label>
                <textarea
                  id="request-notes"
                  placeholder="Team size, brands, or anything helpful"
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  rows={3}
                  maxLength={800}
                />
              </div>
            </div>

            <button
              className="request-access-submit"
              type="submit"
              disabled={submitting}
            >
              <span>
                {submitting && !error ? "Submitting…" : "Submit request"}
              </span>
              <span aria-hidden="true">→</span>
            </button>

            <p className="request-access-consent">
              By submitting, you confirm that you’re authorized to request
              access for this company. We’ll only use these details to review
              your request.
            </p>
          </form>

          <footer className="request-access-footer">
            <p>
              Already have a Displaygram account?{" "}
              <Link to="/login">Log in instead</Link>
            </p>
            <button type="button" onClick={handleClearForm}>
              Clear form
            </button>
          </footer>
        </section>
      </div>
    </main>
  );
}
