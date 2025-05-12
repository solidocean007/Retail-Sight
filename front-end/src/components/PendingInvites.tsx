import { useEffect, useState } from "react";
import { db } from "../utils/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import "./pendingInvites.css";
import isUserEmailRegistered from "../utils/userData/isUserEmailRegistered";

interface Invite {
  id: string;
  email: string;
  companyName: string;
}

const PendingInvites = () => {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchPendingInvites = async () => {
      try {
        // Fetch pending invites
        const invitesQuery = query(
          collection(db, "invites"),
          where("status", "==", "pending"),
        );
        const invitesSnapshot = await getDocs(invitesQuery);

        // Map fetched invites to state
        const fetchedInvites = invitesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Invite[];

        setInvites(fetchedInvites);
      } catch (error) {
        console.error("Error fetching pending invites:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingInvites();
  }, []);

  const cancelInvite = async (inviteId: string) => {
    try {
      await deleteDoc(doc(db, "invites", inviteId));
      setInvites((prevInvites) =>
        prevInvites.filter((invite) => invite.id !== inviteId),
      );
    } catch (error) {
      console.error("Error cancelling invite:", error);
    }
  };

  return (
    <div className="pending-invites-container">
      <h2 className="title">Pending Invites</h2>
      {loading ? (
        <p className="loading-message">Loading invites...</p>
      ) : invites.length === 0 ? (
        <p className="empty-message">No pending invites found.</p>
      ) : (
        <table className="invites-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Company</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invites.map((invite) => (
              <tr key={invite.id}>
                <td>{invite.email}</td>
                <td>{invite.companyName || "N/A"}</td>
                <td>
                  <button
                    className="cancel-button"
                    onClick={() => cancelInvite(invite.id)}
                  >
                    Cancel Invite
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default PendingInvites;
