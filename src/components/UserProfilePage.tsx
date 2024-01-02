import { Container } from "@mui/material";
import { ProfileEditPage } from "./ProfileEditPage";
import { useState } from "react";
import './userProfilePage.css';
import { useSelector } from "react-redux";
import { RootState } from "../utils/store";
import { UserProfilePosts } from "./UserProfilePosts/UserProfilePosts";
import { useNavigate } from "react-router-dom";

export const UserProfilePage = () => {
  const [openEdit, setOpenEdit] = useState(false);
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const navigate = useNavigate();

  const openProfileEdit = () => {
    setOpenEdit(!openEdit);
  };

  const closeProfilePage = () => {
    navigate('/');
  };

  return (
    <Container>
      <div className="user-profile-page-header">
        <div className="user-edit-section">
          <div className="user-name">
            {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "Loading..."}
          </div>
          <button onClick={openProfileEdit}>Edit Profile</button>
          {openEdit && <ProfileEditPage setOpenEdit={setOpenEdit}/>}
        </div>
        <div className="close-profile-page">
          <button onClick={closeProfilePage}>Close Page</button>
        </div>
      </div>
      <div className="user-posts">
        <h3>Your Posts</h3>
        <UserProfilePosts currentUser={currentUser} />
      </div>
      <div className="user-saved-stores">
        <h3>Your Saved Stores</h3>
        {/* Components or elements to display the user's saved stores */}
      </div>
    </Container>
  );
};
