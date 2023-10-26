import { useState, useEffect } from "react";
import { useSelector, useDispatch } from 'react-redux';
import { getUserDataFromFirestore } from "../utils/userData/fetchUserDataFromFirestore";
import { closeUserModal, selectIsUserModalOpen, selectSelectedUid } from "../Slices/userModalSlice";
import './userModal.css';

const UserModal = () => {
  const dispatch = useDispatch();
  const [userData, setUserData] = useState(null);
  const isUserModalOpen = useSelector(selectIsUserModalOpen);
  const selectedUid = useSelector(selectSelectedUid);

  useEffect(() => {
    if (isUserModalOpen && selectedUid) {
      getUserDataFromFirestore(selectedUid)
        .then(data => setUserData(data))
        .catch(err => console.error(err));
    }
  }, [isUserModalOpen, selectedUid]);

  const handleClose = () => {
    dispatch(closeUserModal());
  };

  if (!isUserModalOpen) return null;  // Prevent modal from rendering if it's not open.

  return (
    <div className="modal active">
      <div className="modal-content">
        <span className="close" onClick={handleClose}>&times;</span>
        <h2>{userData?.name}</h2>
        <p>{userData?.company}</p>
        <p><a href={`mailto:${userData?.email}`}>{userData?.email}</a>
</p>
      </div>
    </div>
  );
};

export default UserModal;




// How can I use redux or local storage to cache things like the current user
//  logged in, posts fetched, other users info fetched from name clicks?