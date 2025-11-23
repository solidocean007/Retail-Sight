import React, { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import "./companyConnectionsManager.css";

interface IdentifyCompanyProps {
  fromCompanyId: string;
  currentUser: any;
  currentCompany: any;
  currentConnections: any[];
  onContinue: (email: string, lookup: any) => void;
  onInvite: (email: string) => void;
  onClose?: () => void;
}

const IdentifyCompany: React.FC<IdentifyCompanyProps> = ({
  fromCompanyId,
  currentUser,
  currentCompany,
  currentConnections,
  onContinue,
  onInvite,
  onClose,
}) => {
  const functions = getFunctions();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [companyPreview, setCompanyPreview] = useState<{
    companyName: string;
    companyType: string;
  } | null>(null);

  const triggerShake = () => {
    const el = document.querySelector(".error-banner");
    if (!el) return;
    el.classList.remove("shake");
    void el.offsetWidth;
    el.classList.add("shake");
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    triggerShake();
  };

  const handleLookup = async () => {
    setErrorMessage(null);
    setCompanyPreview(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      showError("Please enter an email.");
      return;
    }

    // SELF EMAIL
    if (cleanEmail === currentUser.email?.toLowerCase()) {
      showError("You cannot connect with yourself.");
      return;
    }

    // SAME COMPANY EMAIL
    const companyEmails =
      currentCompany?.users?.map((u: any) => u.email?.toLowerCase()) || [];

    if (companyEmails.includes(cleanEmail)) {
      showError("This email belongs to someone already inside your company.");
      return;
    }

    setLoading(true);

    try {
      const fn = httpsCallable(functions, "lookupConnectionTarget");
      const res: any = await fn({ email: cleanEmail, fromCompanyId });

      console.log(
        "%c[lookup raw result]",
        "color: cyan; font-weight: bold;",
        res
      );
      console.log(
        "%c[lookup data]",
        "color: cyan; font-weight: bold;",
        res?.data
      );
      console.log(
        "%c[lookup mode]",
        "color: yellow; font-weight: bold;",
        res?.data?.mode
      );

      const data = res.data;

      if (!data) {
        showError("Unexpected server response.");
        return;
      }

      // INVITE MODE
      if (data.mode === "invite" || data.mode === "invitable") {
        console.log(
          "%c[invite mode triggered]",
          "color: lightgreen; font-weight: bold;"
        );
        onInvite(cleanEmail);
        return;
      }

      // USER FOUND MODE
      if (data.companyName) {
        console.log(
          "%c[company preview]",
          "color: lightblue; font-weight: bold;",
          {
            name: data.companyName,
            type: data.companyType,
          }
        );

        setCompanyPreview({
          companyName: data.companyName,
          companyType: data.companyType,
        });
      }

      // 3️⃣ CHECK LOCAL DUPLICATES
      const duplicate = currentConnections.some((c: any) => {
        return (
          (c.requestFromCompanyId === fromCompanyId &&
            c.requestToCompanyId === data.companyId) ||
          (c.requestToCompanyId === fromCompanyId &&
            c.requestFromCompanyId === data.companyId)
        );
      });

      if (duplicate) {
        showError(`You already have a connection with ${data.companyName}.`);
        return;
      }

      // Invite flow → do NOT call Step 2
      if (data.mode === "invitable") {
        onInvite(cleanEmail);
        return;
      }

      // Continue to Step 2 with mode
      onContinue(cleanEmail, data);
    } catch (err: any) {
      console.error("Lookup error:", err);

      // Firebase callable errors use: "functions/<code>"
      if (err?.code === "functions/failed-precondition") {
        showError(err.message);
        return;
      }

      if (err?.code === "functions/invalid-argument") {
        showError(err.message);
        return;
      }

      showError("Unable to look up email. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className="connection-builder"
      onSubmit={(e) => {
        e.preventDefault(); // prevent page reload
        handleLookup();
      }}
    >
      <h3>Step 1 — Identify the Company</h3>

      <p className="section-hint">
        Enter a partner company admin’s email. We'll check if they are already
        on Displaygram.
      </p>

      <input
        type="email"
        value={email}
        placeholder="Company admin email"
        onChange={(e) => {
          setEmail(e.target.value);
          setErrorMessage(null);
          setCompanyPreview(null);
        }}
        className="connection-email-input"
        disabled={loading}
        autoFocus
      />

      {errorMessage && <div className="error-banner shake">{errorMessage}</div>}

      {companyPreview && (
        <div className="company-preview-box fade-in">
          <p className="preview-title">Company Found:</p>
          <p className="preview-name">{companyPreview.companyName}</p>
          <p className="preview-type">{companyPreview.companyType}</p>
        </div>
      )}

      <div className="modal-actions">
        {onClose && (
          <button className="button-secondary" type="button" onClick={onClose}>
            Close
          </button>
        )}

        <button
          className="button-primary"
          type="submit" // ⭐ Enter key now triggers this
          disabled={loading}
        >
          {loading ? "Checking..." : "Continue"}
        </button>
      </div>
    </form>
  );
};

export default IdentifyCompany;
