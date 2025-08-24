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
import "./notifications/notificationsTable.css";
import { CompanyWithUsersAndId, NotificationType } from "../../utils/types";
import ViewDeveloperNotification from "./ViewDeveloperNotification";

interface DeveloperNotificationsTableProps {
  allCompaniesAndUsers: CompanyWithUsersAndId[];
}

const DeveloperNotificationsTable: React.FC<
  DeveloperNotificationsTableProps
> = ({ allCompaniesAndUsers }) => {
  const dispatch = useAppDispatch();
  const { userNotifications, companyNotifications, loading, error } =
    useSelector((state: RootState) => state.notifications);
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNotif, setSelectedNotif] = useState<NotificationType | null>(
    null
  );
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (currentUser?.role === "developer") {
      dispatch(fetchCompanyNotifications("all"));
    } else if (currentUser?.companyId) {
      dispatch(fetchCompanyNotifications(currentUser.companyId));
    }
  }, [dispatch, currentUser?.companyId, currentUser?.role]);

  const filteredNotifications = userNotifications.filter(
    (notification: NotificationType) =>
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
                  {notif.recipientCompanyIds?.length === 0
                    ? "All Companies"
                    : `${notif.recipientCompanyIds?.length} Companies`}
                </TableCell>
                <TableCell>{notif.priority || "Normal"}</TableCell>
                <TableCell>
                  {(() => {
                    const sentAt = notif.sentAt;

                    if (sentAt instanceof Date) {
                      return sentAt.toLocaleString();
                    }

                    if (typeof sentAt === "string") {
                      return new Date(sentAt).toLocaleString();
                    }

                    if (sentAt && "seconds" in sentAt) {
                      // Firestore Timestamp
                      return new Date(sentAt.seconds * 1000).toLocaleString();
                    }

                    return "—"; // fallback
                  })()}
                </TableCell>

                <TableCell className="actions-cell">
                  <Button
                    size="small"
                    variant="contained"
                    className="btn-view"
                    onClick={() => {
                      setSelectedNotif(notif);
                      setModalOpen(true);
                    }}
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
        <ViewDeveloperNotification
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          notification={selectedNotif}
          allCompaniesAndUsers={allCompaniesAndUsers}
        />
      </TableContainer>
    </div>
  );
};

export default DeveloperNotificationsTable;
