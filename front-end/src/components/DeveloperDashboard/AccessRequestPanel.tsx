import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../utils/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Chip } from "@mui/material";
import "./accessRequestPanel.css";

type AccessRequest = {
  id: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  workPhone?: string;
  companyName: string;
  userTypeHint: "supplier" | "distributor";
  status:
    | "pending-approval"
    | "approved-pending-user"
    | "completed"
    | "rejected";
  createdAt?: any;
};

export default function AccessRequestsPanel() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const functions = getFunctions();
  const approveAccessRequest = httpsCallable(functions, "approveAccessRequest");

  useEffect(() => {
    const q = query(
      collection(db, "accessRequests"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as AccessRequest),
      }));
      setRequests(items);
    });
    return () => unsub();
  }, []);

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      await approveAccessRequest({ requestId: id });
    } catch (e) {
      console.error("Approval error", e);
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updateDoc(doc(db, "accessRequests", id), { status: "rejected" });
    } catch (e) {
      console.error("Reject error", e);
    }
  };

  const renderStatusChip = (status: AccessRequest["status"]) => {
    const color =
      status === "completed"
        ? "success"
        : status === "approved-pending-user"
        ? "warning"
        : status === "pending-approval"
        ? "default"
        : "error";
    return (
      <Chip
        size="small"
        color={color as any}
        label={status.replace(/-/g, " ").toUpperCase()}
      />
    );
  };

  return (
    <section className="access-requests-panel">
      <h2>Access Requests</h2>
      <p className="subtext">Review pending or approved requests below.</p>

      <div className="requests-list">
        {requests.length === 0 && <p>No access requests found.</p>}
        {requests.map((r) => (
          <div key={r.id} className="request-card">
            <div className="request-header">
              <strong>{r.companyName}</strong>
              {renderStatusChip(r.status)}
            </div>

            <p>
              {r.firstName} {r.lastName}
              <br />
              <small>{r.workEmail}</small>
              {r.workPhone && (
                <>
                  <br />
                  <small>{r.workPhone}</small>
                </>
              )}
            </p>

            <p className="user-type">
              <small>Type: {r.userTypeHint}</small>
            </p>

            <div className="actions">
              <button
                className={`btn btn-primary ${
                  approvingId === r.id ? "loading" : ""
                }`}
                disabled={
                  r.status !== "pending-approval" || approvingId === r.id
                }
                onClick={() => handleApprove(r.id)}
              >
                {approvingId === r.id ? "Approving…" : "Approve"}
              </button>

              <button
                className="btn btn-outline"
                disabled={r.status === "rejected" || r.status === "completed"}
                onClick={() => handleReject(r.id)}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
