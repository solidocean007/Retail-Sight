import { useDispatch, useSelector} from 'react-redux';
import { closeUserModal, selectIsUserModalOpen, selectUserData } from "../Slices/userModalSlice";
import './userModal.css';

const UserModal = () => {
  const dispatch = useDispatch();
  const userData = useSelector(selectUserData);
  const isUserModalOpen = useSelector(selectIsUserModalOpen);

  const handleClose = () => {
    dispatch(closeUserModal());
  };
  console.log(userData, ": userData")

  if (!isUserModalOpen) return null;

  return (
    <div className="user-modal-overlay">
      <div className="user-modal">
        <button className="close" onClick={handleClose} ><span >&times;</span></button>
        {/* <span className="close" onClick={handleClose}>&times;</span> */}
        <h2>{userData?.postUserName}</h2>
        <p className="user-company">{userData?.postUserCompany}</p>
        <p className="user-email"><a href={`mailto:${userData?.postUserEmail}`}>{userData?.postUserEmail}</a></p>
      </div>
    </div>
  );
};

export default UserModal;