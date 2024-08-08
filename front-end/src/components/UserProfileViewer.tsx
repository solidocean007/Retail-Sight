import { CircularProgress, Container } from "@mui/material";
import { ProfileEditPage } from "./ProfileEditPage";
import React, { useState } from "react";
import './userProfilePage.css';
import { UserProfilePosts } from "./UserProfilePosts/UserProfilePosts";
import { useNavigate } from "react-router-dom";
import LogOutButton from "./LogOutButton";
import { UserType } from "../utils/types";
// import { UserProfilePageHelmet } from "../utils/helmetConfigurations";

interface UserProfileViewerProps {
  user: UserType | null;
}

const UserProfileViewer: React.FC<UserProfileViewerProps> = ({user}) => {
  const [openEdit, setOpenEdit] = useState(false);
  const navigate = useNavigate();

  const openProfileEdit = () => {
    setOpenEdit(!openEdit);
  };

  const closeProfilePage = () => {
    navigate('/user-home-page');
  };

  return (
    <>
    {/* <UserProfilePageHelmet /> */}
    <Container>
      <div className="user-profile-page-header">
      <LogOutButton />

        <div className="user-edit-section">
          <div className="user-name">
            {user ? `${user.firstName} ${user.lastName}` : <CircularProgress />}
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
        <UserProfilePosts currentUser={user} />
      </div>
      <div className="user-saved-stores">
        <h3>Your Saved Stores</h3>
        {/* Components or elements to display the user's saved stores */}
      </div>
    </Container>
    </>
  );
};

export default UserProfileViewer;
