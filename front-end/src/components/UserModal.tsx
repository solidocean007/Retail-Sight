import { useDispatch, useSelector } from "react-redux";
import {
  closeUserModal,
  selectIsUserModalOpen,
  selectUserModalData,
} from "../Slices/userModalSlice";
import { useRef } from "react";
import "./userModal.css";
import { useOutsideAlerter } from "../utils/useOutsideAlerter";

const UserModal = () => {
  const dispatch = useDispatch();
  const modalRef = useRef<HTMLDivElement>(null);
  const isOpen = useSelector(selectIsUserModalOpen);
  const { postId, userEmail, fullName } = useSelector(selectUserModalData);

  useOutsideAlerter(modalRef, () => dispatch(closeUserModal()));

  if (!isOpen || !postId || !userEmail || !fullName) return null;

  const postLink = `${window.location.origin}/view-post/${postId}`;
  const mailBody = `Hi ${fullName},\n\nNice work on your recent post! Just wanted to reach out and say thanks for sharing your display.\n\nYou can view it here: ${postLink}\n\nBest,\n[Your Name]`;

  const mailtoLink = `mailto:${userEmail}?subject=${encodeURIComponent("Nice job on your display!")}&body=${encodeURIComponent(mailBody)}`;

  return (
    <div className="user-modal-overlay">
      <div className="user-modal" ref={modalRef}>
        <button className="close" onClick={() => dispatch(closeUserModal())}>
          <span>&times;</span>
        </button>
        <h2>{fullName}</h2>
        <p className="user-email">
          <a href={`mailto:${userEmail}`}>{userEmail}</a>
        </p>
        <p style={{ marginTop: "0.5rem" }}>
          Want to encourage or thank them directly?
        </p>
        <a className="cta-email-button" href={mailtoLink}>
          Send them a message
        </a>
      </div>
    </div>
  );
};

export default UserModal;

