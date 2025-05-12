import { useDispatch, useSelector } from "react-redux";
import {
  closeUserModal,
  selectIsUserModalOpen,
  selectUserEmail,
  selectUserName,
} from "../Slices/userModalSlice";
import "./userModal.css";

const UserModal = () => {
  const dispatch = useDispatch();
  const userName = useSelector(selectUserName);
  const userEmail = useSelector(selectUserEmail);
  const isUserModalOpen = useSelector(selectIsUserModalOpen);

  const handleClose = () => {
    dispatch(closeUserModal());
  };

  if (!isUserModalOpen) return null;

  return (
    <div className="user-modal-overlay">
      <div className="user-modal">
        <button className="close" onClick={handleClose}>
          <span>&times;</span>
        </button>
        {/* <span className="close" onClick={handleClose}>&times;</span> */}
        <h2>{userName}</h2>
        {/* <p className="user-company">{userData?.postUserCompany}</p> */}
        <p className="user-email">
          <a href={`mailto:${userEmail}`}>{userEmail}</a>
        </p>
      </div>
    </div>
  );
};

export default UserModal;
