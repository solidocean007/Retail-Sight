// UserProfileViewer.tsx (Refactored)
import React, { useState } from "react";
import {
  Container,
  Avatar,
  Typography,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@mui/material";
import { useSelector } from "react-redux";
import { RootState } from "../utils/store";
import { UserType } from "../utils/types";
import { useNavigate } from "react-router-dom";
import LogOutButton from "./LogOutButton";
import "./userProfileViewer.css";
import UploadAvatar from "./UploadAvatar";

interface AccountDisplayCount {
  accountName: string;
  accountAddress: string;
  displayCount: number;
}

interface UserProfileViewerProps {
  user: UserType | null;
  // accountDisplayData: AccountDisplayCount[]; // passed in from parent or selector
}

// const UserProfileViewer: React.FC<UserProfileViewerProps> = ({ user, accountDisplayData }) => {
const UserProfileViewer: React.FC<UserProfileViewerProps> = ({ user }) => {
  const navigate = useNavigate();
  const [editingPicture, setEditingPicture] = useState(false);

  if (!user) return <Typography>Loading...</Typography>;

  return (
    <Container className="user-profile-container">
      <div className="user-info-section">
        <div className="avatar-box">
          <Avatar
            src={user.pictureUrl || undefined}
            sx={{ width: 96, height: 96 }}
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
