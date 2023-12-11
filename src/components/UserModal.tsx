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
  

  if (!isUserModalOpen) return null;  // Prevent modal from rendering if it's not open.

  return (
    <div className="modal-overlay">
      <div className="modal">
        <span className="close" onClick={handleClose}>&times;</span> {/*Type 'MouseEvent<HTMLSpanElement, MouseEvent>' is not assignable to type 'void'.ts(2322) */}
        <h2>{userData?.firstName} {userData?.lastName}</h2>
        <p className="user-company">{userData?.company}</p>
        <p className="user-email"><a href={`mailto:${userData?.email}`}>{userData?.email}</a></p>
      </div>
    </div>
  );
};

export default UserModal;