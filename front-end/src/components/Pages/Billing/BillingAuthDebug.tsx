import { useEffect, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";

type ClaimResult = {
  uid: string;
  role: string | null;
  isAdmin: boolean;
  claims: Record<string, any>;
};

export default function BillingAuthDebug() {
  const functions = getFunctions();
  const [data, setData] = useState<ClaimResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const fn = httpsCallable(functions, "getMyAuthClaims");
        const res = await fn();
        setData(res.data as ClaimResult);
      } catch (e: any) {
        setError(e.message ?? "Failed to load claims");
      }
    };
    run();
  }, []);

  if (error) return <pre style={{ color: "red" }}>{error}</pre>;
  if (!data) return <div>Checking billing permissions…</div>;

  return (
    <div
      style={{
        padding: 12,
        marginBottom: 12,
        borderRadius: 8,
        background: data.isAdmin ? "#e6f4ea" : "#fdecea",
        border: "1px solid #ccc",
        fontSize: 13,
      }}
    >
      <strong>Billing Auth Check</strong>
      <div>UID: {data.uid}</div>
      <div>Role claim: {data.role ?? "❌ none"}</div>
      <div>
        Billing access:{" "}
        {data.isAdmin ? "✅ ADMIN" : "❌ NOT ADMIN"}
      </div>
    </div>
  );
}
