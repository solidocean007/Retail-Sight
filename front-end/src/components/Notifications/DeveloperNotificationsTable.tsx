import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../../utils/store";
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
  Chip,
} from "@mui/material";
import "./notifications/notificationsTable.css";
import {
  CompanyWithUsersAndId,
  DeveloperNotificationType,
} from "../../utils/types";
import ViewDeveloperNotification from "./ViewDeveloperNotification";
import { fetchDeveloperNotifications } from "../../thunks/developerNotificationsThunks";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getNotificationStatus } from "./utils/getNotificationStatus";
import {
  markDeveloperNotificationResent,
  removeDeveloperNotification,
} from "../../Slices/developerNotificationSlice";

interface DeveloperNotificationsTableProps {
  allCompaniesAndUsers: CompanyWithUsersAndId[];
}

const DeveloperNotificationsTable: React.FC<
  DeveloperNotificationsTableProps
> = ({ allCompaniesAndUsers }) => {
  const dispatch = useAppDispatch();
  const functions = getFunctions();

  const { items, loading, error } = useSelector(
    (state: RootState) => state.developerNotifications,
  );

  const currentUser = useSelector((state: RootState) => state.user.currentUser);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNotif, setSelectedNotif] =
    useState<DeveloperNotificationType | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (currentUser?.role === "developer") {
      dispatch(fetchDeveloperNotifications());
    }
  }, [dispatch, currentUser?.role]);

  const filteredNotifications = items.filter((n) =>
    (n.title ?? "").toLowerCase().includes(searchTerm.toLowerCase()),
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

  const resendSystemNotification = httpsCallable(
    functions,
    "resendSystemNotification",
  );

  const deleteSystemNotification = httpsCallable(
    functions,
    "deleteSystemNotification",
  );

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
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredNotifications.map((notif) => {
              const status = getNotificationStatus(notif);

              return (
                <TableRow key={notif.id} hover className="table-row">
                  <TableCell>{notif.title}</TableCell>

                  <TableCell>
                    {notif.recipientUserIds?.length
                      ? `${notif.recipientUserIds.length} Direct User${
                          notif.recipientUserIds.length !== 1 ? "s" : ""
                        }`
                      : notif.recipientCompanyIds?.length
                        ? `${notif.recipientCompanyIds.length} Compan${
                            notif.recipientCompanyIds.length !== 1 ? "ies" : "y"
                          }`
                        : "All Companies"}
                  </TableCell>

                  <TableCell>{notif.priority || "Normal"}</TableCell>

                  <TableCell>
                    <Chip
                      size="small"
                      label={
                        status === "sent"
                          ? "Sent"
                          : status === "scheduled"
                            ? "Scheduled"
                            : "Draft"
                      }
                      color={
                        status === "sent"
                          ? "success"
                          : status === "scheduled"
                            ? "warning"
                            : "default"
                      }
                    />
                  </TableCell>

                  <TableCell className="actions-cell">
                    <Button
                      size="small"
                      variant="contained"
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
                      disabled={status !== "sent"}
                      onClick={async () => {
                        dispatch(
                          markDeveloperNotificationResent({
                            id: notif.id,
                            sentAt: new Date().toISOString(),
                          }),
                        );

                        try {
                          await resendSystemNotification({
                            notificationId: notif.id,
                            sendEmail: true,
                          });
                        } catch {
                          dispatch(fetchDeveloperNotifications());
                        }
                      }}
                    >
                      Resend
                    </Button>
                  </TableCell>

                  <TableCell>
                    <Button
                      size="small"
                      color="error"
                      variant="contained"
                      onClick={async () => {
                        if (status === "scheduled") {
                          const ok = window.confirm(
                            "This notification is scheduled but not yet sent. Delete it?",
                          );
                          if (!ok) return;
                        }

                        dispatch(removeDeveloperNotification(notif.id));

                        try {
                          await deleteSystemNotification({
                            notificationId: notif.id,
                          });
                        } catch (err) {
                          // optional: refetch on failure
                          dispatch(fetchDeveloperNotifications());
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
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
