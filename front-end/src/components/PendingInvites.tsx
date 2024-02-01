// PendingInvites.tsx
import { useEffect, useState } from 'react';
import { db } from '../utils/firebase'; // Import your firebase configuration
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import './pendingInvites.css'

interface Invite {
  id: string;
  email: string;
  companyName: string;
}

const PendingInvites = () => {
  const [invites, setInvites] = useState<Invite[]>([]);

  useEffect(() => {
    const fetchInvites = async () => {
      try {
        const q = query(collection(db, 'invites'), where('status', '==', 'pending'));
        const querySnapshot = await getDocs(q);
        const fetchedInvites = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Invite[];
        setInvites(fetchedInvites);
      } catch (error) {
        console.error('Error fetching invites:', error);
      }
    };

    fetchInvites();
  }, []);

  const cancelInvite = async (inviteId: string) => {
    try {
      await deleteDoc(doc(db, 'invites', inviteId));
      setInvites(invites.filter(invite => invite.id !== inviteId));
    } catch (error) {
      console.error('Error cancelling invite:', error);
    }
  };

  return (
    <div>
      <h2>Pending Invites</h2>
      <ul>
        {invites.map(invite => (
          <li key={invite.id}>
            {invite.email} for {invite.companyName}
            <button onClick={() => cancelInvite(invite.id)}>Cancel Invite</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PendingInvites;
