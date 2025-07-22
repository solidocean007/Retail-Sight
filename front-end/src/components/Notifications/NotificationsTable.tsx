import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../../utils/store";
import { fetchCompanyNotifications } from "../../thunks/notificationsThunks";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Button,
  TextField,
} from "@mui/material";
import DeveloperNotificationForm from "./DeveloperNotificationForm";
import "./notificationsTable.css";
import { NotificationType } from "../../utils/types";

const DeveloperNotificationsTable: React.FC = () => {
  const dispatch = useAppDispatch();
  const { notifications, loading, error } = useSelector(
    (state: RootState) => state.notifications
  );
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (currentUser?.role === "developer") {
      dispatch(fetchCompanyNotifications("all"));
    } else if (currentUser?.companyId) {
      dispatch(fetchCompanyNotifications(currentUser.companyId));
    }
  }, [dispatch, currentUser?.companyId, currentUser?.role]);

  const filteredNotifications = notifications.filter((notification: NotificationType) =>
    notification.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="spinner-container">
        <CircularProgress />
      </div>
    );
  }

  if (error) {
    return <div className="error-text">Error: {error}</div>;
  }

  return (
    <div className="notifications-table-container">
      <div className="table-header">
        <h2>Developer Notifications</h2>
        <TextField
          size="small"
          variant="outlined"
          placeholder="Search notifications..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Abstracted Notification Form with Audience Picker */}
      <NotificationForm isDeveloper={currentUser?.role === "developer"} />

      <TableContainer component={Paper} style={{ marginTop: "1rem" }}>
        <Table>
          <TableHead>
            <TableRow className="table-header-row">
              <TableCell>Title</TableCell>
              <TableCell>Audience</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Sent Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredNotifications.map((notif) => (
              <TableRow key={notif.id} hover className="table-row">
                <TableCell>{notif.title}</TableCell>
                <TableCell>
                  {notif.recipientsIds?.length === 0
                    ? "All Companies"
                    : `${notif.recipientsIds?.length} Companies`}
                </TableCell>
                <TableCell>{notif.priority || "Normal"}</TableCell>
                <TableCell>
                  {notif.sentAt instanceof Date
                    ? notif.sentAt.toLocaleString()
                    : new Date(notif.sentAt.seconds * 1000).toLocaleString()}
                </TableCell>
                <TableCell className="actions-cell">
                  <Button
                    size="small"
                    variant="contained"
                    className="btn-view"
                    onClick={() => console.log("View", notif.id)}
                  >
                    View
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    className="btn-resend"
                    onClick={() => console.log("Resend", notif.id)}
                  >
                    Resend
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    className="btn-delete"
                    onClick={() => console.log("Delete", notif.id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default DeveloperNotificationsTable;
