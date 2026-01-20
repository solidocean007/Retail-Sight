import React, { useCallback, useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../utils/firebase";

type Props = {
  companyId?: string | null;
  show?: boolean; // gate it behind admin/dev UI
};

type ClaimRole = string | undefined;

function isBillingAdminRole(role: ClaimRole) {
  return (
    role === "admin" ||
    role === "owner" ||
    role === "super-admin" ||
    role === "developer"
  );
}

export default function AuthClaimsDebug({ companyId, show = true }: Props) {
  const [loading, setLoading] = useState(true);
  const [fsRole, setFsRole] = useState<string | null>(null);
  const [claimRole, setClaimRole] = useState<string | null>(null);
  const [claimCompanyId, setClaimCompanyId] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadClaims = useCallback(async (force = false) => {
    setError(null);
    setLoading(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        setUid(null);
        setClaimRole(null);
        setClaimCompanyId(null);
        setLoading(false);
        return;
      }

      setUid(user.uid);
      const token = await user.getIdTokenResult(force);
      const role = (token.claims as any)?.role ?? null;
      const cId = (token.claims as any)?.companyId ?? null;

      setClaimRole(role);
      setClaimCompanyId(cId);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load token claims.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial token claim load
  useEffect(() => {
    if (!show) return;
    loadClaims(false);
  }, [show, loadClaims]);

  // Firestore role watcher (source of truth)
  useEffect(() => {
    if (!show) return;
    const auth = getAuth();
    const u = auth.currentUser;
    if (!u) return;

    const ref = doc(db, "users", u.uid);
    return onSnapshot(
      ref,
      (snap) => {
        const data = snap.data() as any;
        setFsRole(data?.role ?? null);
      },
      () => {
        // ignore watcher errors here, keep widget lightweight
      }
    );
  }, [show]);

  if (!show) return null;

  const billingOk = isBillingAdminRole(claimRole ?? undefined);

  return (
    <div
      style={{
        border: "1px solid var(--border-color, #e5e7eb)",
        borderRadius: 10,
        padding: 12,
        background: "var(--dashboard-card, #fff)",
        color: "var(--text-color, #111)",
        fontSize: 13,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Billing Auth Check</div>

      {error && (
        <div style={{ color: "var(--error-color, #b42318)", marginBottom: 8 }}>
          {error}
        </div>
      )}

      <div>UID: {uid ?? "—"}</div>
      <div>Company: {companyId ?? "—"}</div>

      <div style={{ marginTop: 8 }}>
        Firestore role: <b>{fsRole ?? "—"}</b>
      </div>
      <div>
        Role claim: <b>{claimRole ?? "—"}</b>{" "}
        {claimRole === "pending" ? (
          <span style={{ color: "orange" }}>⚠️</span>
        ) : null}
      </div>
      <div>
        Claim companyId: <b>{claimCompanyId ?? "—"}</b>
      </div>

      <div style={{ marginTop: 8 }}>
        Billing access:{" "}
        {billingOk ? (
          <b style={{ color: "var(--success-color, #107f3f)" }}>✅ ADMIN</b>
        ) : (
          <b style={{ color: "var(--error-color, #b42318)" }}>❌ NOT ADMIN</b>
        )}
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <button
          onClick={() => loadClaims(true)}
          disabled={loading}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid var(--border-color, #e5e7eb)",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          {loading ? "Refreshing..." : "Refresh token claims"}
        </button>

        <button
          onClick={() => loadClaims(false)}
          disabled={loading}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid var(--border-color, #e5e7eb)",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          Re-read (no force)
        </button>
      </div>
    </div>
  );
}
