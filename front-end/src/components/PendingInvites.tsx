import { useEffect, useState } from 'react';
import { db } from '../utils/firebase';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import './pendingInvites.css';
import isUserEmailRegistered from '../utils/userData/isUserEmailRegistered';

interface Invite {
  id: string;
  email: string;
  companyName: string;
}

const PendingInvites = () => {
  const [invites, setInvites] = useState<Invite[]>([]);

  useEffect(() => {
    const fetchUsersAndInvites = async () => {
      try {
        // Fetch pending invites
        const invitesQuery = query(collection(db, 'invites'), where('status', '==', 'pending'));
        const invitesSnapshot = await getDocs(invitesQuery);
        const fetchedInvites = invitesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Invite[];

        // Ideally, limit this to likely candidates based on the invites you've fetched
        const usersQuery = query(collection(db, 'users'));
        const usersSnapshot = await getDocs(usersQuery);
        const users = usersSnapshot.docs.map(doc => doc.data());

        // Filter invites against registered users
        const filteredInvites = fetchedInvites.filter(invite => {
          // Perform a case-insensitive check to see if the invite email matches any user email
          return !users.some(user => user.email?.toLowerCase() === invite.email.toLowerCase());
        });

        setInvites(filteredInvites);
      } catch (error) {
        console.error('Error fetching invites and users:', error);
      }
    };

    fetchUsersAndInvites();
  }, []);

  const cancelInvite = async (inviteId: string) => {
    try {
      await deleteDoc(doc(db, 'invites', inviteId));
      setInvites(prevInvites => prevInvites.filter(invite => invite.id !== inviteId));
    } catch (error) {
      console.error('Error cancelling invite:', error);
    }
  };

  return (
    <div className='pending-invites-container'>
      <h2>Pending Invites</h2>
      <ul>
        {invites.map(invite => (
          <li key={invite.id}>
            {invite.email} <button onClick={() => cancelInvite(invite.id)}>Cancel Invite</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PendingInvites;
