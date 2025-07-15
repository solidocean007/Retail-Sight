// UserProfileViewer.tsx (Refactored)
import React, { useState } from "react";
import {
  Container,
  Avatar,
  Typography,
  Button,
  // Table,
  // TableHead,
  // TableBody,
  // TableRow,
  // TableCell,
} from "@mui/material";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../utils/store";
import { UserType } from "../utils/types";
import { useNavigate } from "react-router-dom";
import LogOutButton from "./LogOutButton";
import "./userProfileViewer.css";
import UploadAvatar from "./UploadAvatar";
import { resetApp } from "../utils/resetApp";

// interface AccountDisplayCount {
//   accountName: string;
//   accountAddress: string;
//   displayCount: number;
// }

// const UserProfileViewer: React.FC<UserProfileViewerProps> = ({ user, accountDisplayData }) => {
const UserProfileViewer: React.FC = () => {
  // const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [editingPicture, setEditingPicture] = useState(false);
  const user = useSelector(
    (state: RootState) => state.user.currentUser
  ) as UserType;

  const handleReset = async () => {
    if (
      window.confirm(
        "Are you sure you want to reset the app? This will clear all stored data."
      )
    ) {
      await resetApp(dispatch);
    }
  };

  if (!user) return <Typography>Loading...</Typography>;

  return (
    <Container className="user-profile-container">
      <div className="user-info-section">
        <div className="reset-app-box">
          <button className="btn-outline danger-button" onClick={handleReset}>
            Reset App
          </button>
        </div>
        <div className="avatar-box">
          <Avatar
            src={user.profileUrlThumbnail}
            sx={{
              width: 120,
              height: 120,
              borderRadius: "50%", // Ensures it's round
              objectFit: "cover",
              boxShadow: "0 0 6px rgba(0, 0, 0, 0.2)", // optional
            }}
          />

          <Button
            onClick={() => setEditingPicture(!editingPicture)}
            variant="outlined"
          >
            {editingPicture ? "Cancel" : "Change Avatar"}
          </Button>
        </div>

        <div className="user-details">
          <Typography variant="h5">
            {user.firstName} {user.lastName}
          </Typography>
          <Typography variant="body1">{user.email}</Typography>
          <Typography variant="body2">Company: {user.company}</Typography>
          <Typography variant="body2">Role: {user.role}</Typography>
        </div>

        {editingPicture && (
          <UploadAvatar user={user} setEditingPicture={setEditingPicture} />
        )}
      </div>

      {/* <div className="account-summary-section">
        <Typography variant="h6">Displays by Account</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Account</TableCell>
              <TableCell>Address</TableCell>
              <TableCell>Displays</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {accountDisplayData.map((acc) => (
              <TableRow key={acc.accountName}>
                <TableCell>{acc.accountName}</TableCell>
                <TableCell>{acc.accountAddress}</TableCell>
                <TableCell>{acc.displayCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div> */}

      {/* <div className="profile-footer">
        <Button variant="contained" onClick={() => navigate("/user-home-page")}>Go to Feed</Button>
        <LogOutButton />
      </div> */}
    </Container>
  );
};

export default UserProfileViewer;
