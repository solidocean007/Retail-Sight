import { useState, useEffect } from "react";
import { useSelector, useDispatch } from 'react-redux';
import { fetchUserDocFromFirestore } from "../utils/userData/fetchUserDocFromFirestore";
import { closeUserModal, selectIsUserModalOpen, selectSelectedUid } from "../Slices/userModalSlice";
import './userModal.css';
import { UserType } from "../utils/types";

const UserModal = () => {
  const dispatch = useDispatch();
  const [userData, setUserData] = useState<UserType | null>(null);
  const isUserModalOpen = useSelector(selectIsUserModalOpen);
  const selectedUid = useSelector(selectSelectedUid);

  useEffect(() => {
    console.log('UserModal mounts')
    if (isUserModalOpen && selectedUid) {
      fetchUserDocFromFirestore(selectedUid)
        .then(data => {
          console.log("Fetched data:", data);
          setUserData(data as UserType);
        }) // type error with data
        .catch(err => console.error(err));
    }
    return () => {
      console.log('UserModal unmounts')
    }
  }, [isUserModalOpen, selectedUid]);

  const handleClose = () => {
    dispatch(closeUserModal());
  };

  if (!isUserModalOpen) return null;  // Prevent modal from rendering if it's not open.

  return (
    <div className="modal-overlay">
      <div className="modal">
        <span className="close" onClick={handleClose}>&times;</span>
        <h2>{userData?.firstName} {userData?.lastName}</h2>
        <p className="user-company">{userData?.company}</p>
        <p className="user-email"><a href={`mailto:${userData?.email}`}>{userData?.email}</a></p>
      </div>
    </div>
  );
};

export default UserModal;




// How can I use redux or local storage to cache things like the current user
//  logged in, posts fetched, other users info fetched from name clicks?