import React, { useEffect, useMemo, useState, useCallback } from "react";
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
  Box,
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
import DeveloperAnalyticsModal from "./DeveloperAnalyticsModal";

interface Props {
  allCompaniesAndUsers: CompanyWithUsersAndId[];
}

const DeveloperNotificationsTable: React.FC<Props> = ({
  allCompaniesAndUsers,
}) => {
  const dispatch = useAppDispatch();
  const functions = getFunctions();

  const resendSystemNotification = httpsCallable(
    functions,
    "resendSystemNotification"
  );
  const deleteSystemNotification = httpsCallable(
    functions,
    "deleteSystemNotification"
  );

  const { items, loading, error } = useSelector(
    (state: RootState) => state.developerNotifications
  );

  const currentUser = useSelector(
    (state: RootState) => state.user.currentUser
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [analyticsId, setAnalyticsId] = useState<string | null>(null);

  // ---------------------------------------
  // Initial Load
  // ---------------------------------------
  useEffect(() => {
    if (currentUser?.role === "developer") {
      dispatch(fetchDeveloperNotifications());
    }
  }, [dispatch, currentUser?.role]);

  // ---------------------------------------
  // Memoized Filter
  // ---------------------------------------
  const filteredNotifications = useMemo(() => {
    const lower = searchTerm.toLowerCase();
    return items.filter((n) =>
      (n.title ?? "").toLowerCase().includes(lower)
    );
  }, [items, searchTerm]);

  // ---------------------------------------
  // Resend Handler
  // ---------------------------------------
  const handleResend = useCallback(
    async (notif: DeveloperNotificationType) => {
      try {
        dispatch(
          markDeveloperNotificationResent({
            id: notif.id,
            sentAt: new Date().toISOString(),
          })
        );

        await resendSystemNotification({
          notificationId: notif.id,
          sendEmail: true,
        });
      } catch (err) {
        console.error("Resend failed:", err);
        dispatch(fetchDeveloperNotifications());
      }
    },
    [dispatch, resendSystemNotification]
  );

  // ---------------------------------------
  // Delete Handler
  // ---------------------------------------
  const handleDelete = useCallback(
    async (notif: DeveloperNotificationType, status: string) => {
      if (status === "scheduled") {
        const ok = window.confirm(
          "This notification is scheduled but not yet sent. Delete it?"
        );
        if (!ok) return;
      }

      dispatch(removeDeveloperNotification(notif.id));

      try {
        await deleteSystemNotification({
          notificationId: notif.id,
        });
      } catch (err) {
        console.error("Delete failed:", err);
        dispatch(fetchDeveloperNotifications());
      }
    },
    [dispatch, deleteSystemNotification]
  );

  // ---------------------------------------
  // Loading / Error
  // ---------------------------------------
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

  // ---------------------------------------
  // Render
  // ---------------------------------------
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

      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Audience</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Stats</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredNotifications.map((notif) => {
              const status = getNotificationStatus(notif);

              const sent = notif.stats?.sent ?? 0;
              const read = notif.stats?.read ?? 0;
              const clicked = notif.stats?.clicked ?? 0;
              const readRate = sent ? Math.round((read / sent) * 100) : 0;

              return (
                <TableRow key={notif.id} hover>
                  <TableCell>{notif.title}</TableCell>

                  <TableCell>
                    {notif.recipientUserIds?.length
                      ? `${notif.recipientUserIds.length} User${
                          notif.recipientUserIds.length !== 1 ? "s" : ""
                        }`
                      : notif.recipientCompanyIds?.length
                      ? `${notif.recipientCompanyIds.length} Compan${
                          notif.recipientCompanyIds.length !== 1
                            ? "ies"
                            : "y"
                        }`
                      : "All Companies"}
                  </TableCell>

                  <TableCell>{notif.priority ?? "Normal"}</TableCell>

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

                  {/* STATS */}
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      <Chip size="small" label={`Sent ${sent}`} />
                      <Chip
                        size="small"
                        color="primary"
                        label={`Read ${read} (${readRate}%)`}
                      />
                      <Chip
                        size="small"
                        color="secondary"
                        label={`Clicked ${clicked}`}
                      />
                    </Box>
                  </TableCell>

                  {/* ACTIONS */}
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setAnalyticsId(notif.id)}
                      >
                        Analytics
                      </Button>

                      <Button
                        size="small"
                        variant="outlined"
                        disabled={status !== "sent"}
                        onClick={() => handleResend(notif)}
                      >
                        Resend
                      </Button>

                      <Button
                        size="small"
                        color="error"
                        variant="contained"
                        onClick={() => handleDelete(notif, status)}
                      >
                        Delete
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <DeveloperAnalyticsModal
          open={!!analyticsId}
          onClose={() => setAnalyticsId(null)}
          developerNotificationId={analyticsId}
        />
      </TableContainer>
    </div>
  );
};

export default DeveloperNotificationsTable;
