// components/DeveloperDashboard/AccessRequestsPanel.tsx
import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, doc, updateDoc, addDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../utils/firebase";

type AccessRequest = {
  id: string;
  workEmail: string;
  firstName: string;
  lastName: string;
  companyName: string;
  userTypeHint: "distributor" | "supplier";
  status: "pending-approval" | "approved" | "rejected" | "auto-created-company";
  createdAt?: any;
};

export default function AccessRequestsPanel() {
  const [rows, setRows] = useState<AccessRequest[]>([]);
  const functions = getFunctions();
  const approve = httpsCallable(functions, "approveAccessRequest");

  useEffect(() => {
    const q = query(collection(db, "accessRequests"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) =>
      setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
    );
  }, []);

  const reject = async (id: string, toEmail: string) => {
    await updateDoc(doc(db, "accessRequests", id), { status: "rejected" });
    await addDoc(collection(db, "mail"), {
      to: toEmail, subject: "Displaygram access request",
      text: "Thanks for your interest. We’re unable to approve this request at this time."
    });
  };

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {rows.map((r) => (
        <div key={r.id} style={{ border: "1px solid var(--border-color)", borderRadius: 8, padding: 12 }}>
          <strong>{r.companyName}</strong> — {r.firstName} {r.lastName} &lt;{r.workEmail}&gt; — {r.userTypeHint} — <em>{r.status}</em>
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <button className="button-primary" onClick={() => approve({ requestId: r.id })}>Approve</button>
            <button className="btn-outline" onClick={() => reject(r.id, r.workEmail)}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}
