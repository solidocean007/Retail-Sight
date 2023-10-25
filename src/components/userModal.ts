import { useState, useEffect } from "react";
import { getUserDataFromFirestore } from "../utils/userData/fetchUserDataFromFirestore";

interface UserModalProps {
  uid: string,
  isOpen: boolean,
  onClose: 
}



const UserModal = ({ uid, isOpen, onClose }) => {
  const [userData, setUserData] = useState(null);
  const [selectedUid, setSelectedUid] = useState(null);

  export const handleUsernameClick = (uid) => {
    setSelectedUid(uid);
    setIsUserModalOpen(true);
  };

  useEffect(() => {
    if (isOpen && uid) {
      getUserDataFromFirestore(uid)
        .then(data => setUserData(data))
        .catch(err => console.error(err));
    }
  }, [isOpen, uid]);

  return (
    <div className={isOpen ? "modal active" : "modal"}>
      <div className="modal-content">
        <span className="close" onClick={onClose}>&times;</span>
        <h2>{userData?.name}</h2>
        <p>{userData?.company}</p>
        <p>{userData?.email}</p>
      </div>
    </div>
  );
};

export default UserModal;

// How can I use redux or local storage to cache things like the current user
//  logged in, posts fetched, other users info fetched from name clicks?